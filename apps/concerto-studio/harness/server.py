"""server.py — the Concerto harness API (localhost only, READ-ONLY).

Studio (http://localhost:8600) talks to this service; this service talks
to Concerto through concerto_adapter. There is NO write endpoint and no
hidden write path: WRITE_CAPABILITY is False by construction and /health
says so.

API:
  GET  /health                 -> {ok, writeCapability:false, versions}
  POST /session/connect        {"url": "..."} -> session status
  GET  /session/status         -> live session status (re-detected)
  POST /session/disconnect
  POST /crawl                  {"domains": ["helpdesk","orders"]} -> {crawlId}
  GET  /crawl/<id>/status      -> {state, progress{family:{done,total}}, ...}
  GET  /snapshot/<id>          -> the INSTANCE-SNAPSHOT json
  GET  /receipts               -> receipt index
  GET  /receipts/<id>          -> one receipt

Run:  python server.py   (port 8602)

Every crawl appends one truthful receipt (COMPLETE / PARTIAL / FAILED,
counts, warnings, errors) to ../receipts/harness-receipts.jsonl and
files the snapshot under ../snapshots/ — both git-ignored.
"""

from __future__ import annotations

import json
import queue
import re
import threading
import time
import traceback
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import concerto_adapter as adapter
from crawlers import helpdesk as helpdesk_crawler
from crawlers import orders as orders_crawler

HERE = Path(__file__).resolve().parent
SNAPSHOT_DIR = HERE.parent / "snapshots"
RECEIPT_DIR = HERE.parent / "receipts"
RECEIPT_FILE = RECEIPT_DIR / "harness-receipts.jsonl"
PORT = 8602
HARNESS_VERSION = "0.1"

SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
RECEIPT_DIR.mkdir(parents=True, exist_ok=True)

# ---- shared state -----------------------------------------------------

LOCK = threading.Lock()
SESSION = adapter.ConcertoSession()
JOBS: "queue.Queue" = queue.Queue()
CRAWLS: dict[str, dict] = {}  # crawlId -> {state, progress, snapshotId, error}


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S")


def write_receipt(rec: dict) -> None:
    rec = dict(rec, recordedAt=now_iso(), harnessVersion=HARNESS_VERSION,
               writeCapability=adapter.WRITE_CAPABILITY)
    with RECEIPT_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def read_receipts() -> list[dict]:
    if not RECEIPT_FILE.exists():
        return []
    out = []
    for line in RECEIPT_FILE.read_text(encoding="utf-8").splitlines():
        if line.strip():
            out.append(json.loads(line))
    return out


# ---- the single browser-owning worker thread ---------------------------

def worker() -> None:
    while True:
        job = JOBS.get()
        kind = job["kind"]
        try:
            if kind == "connect":
                result = SESSION.connect(job["url"])
                job["done"](result)
            elif kind == "disconnect":
                SESSION.disconnect()
                job["done"]({"state": adapter.DISCONNECTED})
            elif kind == "status":
                SESSION.refresh_state()
                job["done"](SESSION.status())
            elif kind == "crawl":
                run_crawl(job["crawlId"], job["domains"])
        except Exception as exc:  # surface, never swallow
            job.get("fail", lambda e: None)(exc)


def run_crawl(crawl_id: str, domains: list[str]) -> None:
    crawl = CRAWLS[crawl_id]
    started = now_iso()
    counts: dict[str, int] = {}
    not_crawled: list = []
    warnings: list = []
    errors: list = []

    def progress(family: str, done: int, total: int) -> None:
        with LOCK:
            crawl["progress"][family] = {"done": done, "total": total}

    try:
        SESSION.refresh_state()
        if SESSION.state != adapter.CONNECTED_READ_ONLY:
            raise RuntimeError(f"cannot crawl: session state is {SESSION.state}")

        snapshot: dict = {
            "kind": "INSTANCE-SNAPSHOT",
            "snapshotVersion": 1,
            "meta": {
                "targetUrl": SESSION.target_url,
                "crawledAt": started,
                "domains": domains,
                "sessionState": SESSION.state,
                "crawlerVersions": {
                    "harness": HARNESS_VERSION,
                    "helpdesk": helpdesk_crawler.CRAWLER_VERSION,
                    "orders": orders_crawler.CRAWLER_VERSION,
                },
                "concertoBuild": SESSION.concerto_build,
                "writeCapability": adapter.WRITE_CAPABILITY,
            },
            "identities": {},
            "raw": {},
        }

        if "helpdesk" in domains:
            with LOCK:
                crawl["state"] = "CRAWLING helpdesk"
            raw = helpdesk_crawler.capture(SESSION, progress)
            snapshot["raw"]["helpdesk"] = raw
            interp = helpdesk_crawler.interpret(raw, not_crawled)
            warnings.extend(interp.pop("warnings", []))
            snapshot["identities"].update(interp.pop("identities", {}))
            snapshot["helpdesk"] = {
                "metadata": {"modelVersion": 2, "environment": SESSION.target_url,
                              "mode": "DISCOVER", "generatedAt": started,
                              "notes": "Automated read-only crawl (harness v" + HARNESS_VERSION + ")"},
                "sharedConfiguration": [],
                "helpdeskTypes": interp["helpdeskTypes"],
                "evidence": [{"id": "E-000", "path": "CRAWL", "capturedAt": started,
                               "description": "Automated crawl artefacts retained in snapshot.raw"}],
            }
            counts["helpdeskStatuses"] = len(snapshot["identities"].get("statuses", {}))
            counts["helpdeskActions"] = len(snapshot["identities"].get("actions", {}))

        if "orders" in domains:
            with LOCK:
                crawl["state"] = "CRAWLING orders"
            raw_o = orders_crawler.capture(SESSION, progress)
            snapshot["raw"]["orders"] = raw_o
            interp_o = orders_crawler.interpret(raw_o, not_crawled)
            warnings.extend(interp_o.pop("warnings", []))
            snapshot["identities"].update(interp_o.pop("identities", {}))
            interp_o["metadata"] = {"modelVersion": 1, "domain": "Orders",
                                     "environment": SESSION.target_url, "mode": "DISCOVER",
                                     "generatedAt": started,
                                     "notes": "Automated read-only crawl"}
            snapshot["orders"] = interp_o
            counts["orderStatuses"] = len(interp_o["orderStatuses"])
            counts["orderPriorities"] = len(interp_o["orderPriorities"])
            counts["supplierActions"] = len(interp_o["supplierActions"])

        snapshot["meta"]["counts"] = counts
        snapshot["meta"]["warnings"] = warnings
        snapshot["meta"]["notCrawled"] = not_crawled

        snap_id = crawl_id
        path = SNAPSHOT_DIR / f"snapshot-{snap_id}.json"
        path.write_text(json.dumps(snapshot, indent=1, ensure_ascii=False), encoding="utf-8")

        outcome = "COMPLETE" if not errors else "PARTIAL"
        with LOCK:
            crawl["state"] = outcome
            crawl["snapshotId"] = snap_id
            crawl["counts"] = counts
            crawl["warnings"] = warnings
            crawl["notCrawled"] = not_crawled
        write_receipt({"id": crawl_id, "kind": "crawl", "startedAt": started,
                        "finishedAt": now_iso(), "target": SESSION.target_url,
                        "domains": domains, "outcome": outcome, "counts": counts,
                        "warnings": warnings, "notCrawled": not_crawled,
                        "errors": errors, "snapshotPath": str(path)})
    except Exception as exc:
        tb = traceback.format_exc()
        with LOCK:
            crawl["state"] = "FAILED"
            crawl["error"] = f"{exc}"
        write_receipt({"id": crawl_id, "kind": "crawl", "startedAt": started,
                        "finishedAt": now_iso(), "target": SESSION.target_url,
                        "domains": domains, "outcome": "FAILED", "counts": counts,
                        "warnings": warnings, "notCrawled": not_crawled,
                        "errors": [str(exc)], "traceback": tb})


threading.Thread(target=worker, daemon=True).start()


# ---- HTTP layer ---------------------------------------------------------

def run_on_worker(kind: str, **payload) -> dict:
    """Enqueue a job and wait for the worker (browser owner) to finish it."""
    done_evt = threading.Event()
    box: dict = {}

    def done(result):
        box["result"] = result
        done_evt.set()

    def fail(exc):
        box["error"] = str(exc)
        done_evt.set()

    JOBS.put(dict(payload, kind=kind, done=done, fail=fail))
    done_evt.wait(timeout=90)
    if "error" in box:
        raise RuntimeError(box["error"])
    if "result" not in box:
        raise RuntimeError("worker timeout")
    return box["result"]


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, obj) -> None:
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send(204, {})

    def do_GET(self):
        try:
            if self.path == "/health":
                self._send(200, {"ok": True, "writeCapability": adapter.WRITE_CAPABILITY,
                                  "harnessVersion": HARNESS_VERSION,
                                  "adapterVersion": adapter.ADAPTER_VERSION,
                                  "session": SESSION.status()})
            elif self.path == "/session/status":
                self._send(200, run_on_worker("status"))
            elif self.path.startswith("/crawl/") and self.path.endswith("/status"):
                cid = self.path.split("/")[2]
                with LOCK:
                    crawl = CRAWLS.get(cid)
                    self._send(200 if crawl else 404, dict(crawl or {"error": "unknown crawl"}))
            elif self.path.startswith("/snapshot/"):
                sid = re.sub(r"[^A-Za-z0-9-]", "", self.path.split("/")[2])
                path = SNAPSHOT_DIR / f"snapshot-{sid}.json"
                if not path.exists():
                    self._send(404, {"error": "no such snapshot"})
                else:
                    self._send(200, json.loads(path.read_text(encoding="utf-8")))
            elif self.path == "/receipts":
                self._send(200, {"receipts": read_receipts()})
            elif self.path.startswith("/receipts/"):
                rid = self.path.split("/")[2]
                recs = [r for r in read_receipts() if r.get("id") == rid]
                self._send(200 if recs else 404, recs[-1] if recs else {"error": "unknown receipt"})
            else:
                self._send(404, {"error": "unknown endpoint"})
        except Exception as exc:
            self._send(500, {"error": str(exc)})

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length) or b"{}")
            if self.path == "/session/connect":
                url = (payload.get("url") or "").strip()
                if not url.startswith("http"):
                    return self._send(400, {"error": "url required"})
                if any(k in payload for k in ("username", "password", "credentials")):
                    return self._send(400, {"error": "this harness NEVER accepts credentials; sign in at the browser window"})
                self._send(200, run_on_worker("connect", url=url))
            elif self.path == "/session/disconnect":
                self._send(200, run_on_worker("disconnect"))
            elif self.path == "/crawl":
                domains = payload.get("domains") or ["helpdesk", "orders"]
                cid = uuid.uuid4().hex[:12]
                with LOCK:
                    CRAWLS[cid] = {"state": "QUEUED", "progress": {}, "domains": domains}
                JOBS.put({"kind": "crawl", "crawlId": cid, "domains": domains})
                self._send(200, {"crawlId": cid})
            elif self.path == "/execute":
                # Deliberately explicit: no write capability exists.
                self._send(403, {"error": "WRITE_CAPABILITY is false: this harness is read-only by construction. Execution requires a future, separately authorised adapter."})
            else:
                self._send(404, {"error": "unknown endpoint"})
        except Exception as exc:
            self._send(500, {"error": str(exc)})

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    print(f"Concerto harness (READ-ONLY) on http://127.0.0.1:{PORT} — writeCapability={adapter.WRITE_CAPABILITY}")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
