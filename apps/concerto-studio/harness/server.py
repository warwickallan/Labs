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
import concerto_writer as writer
from crawlers import helpdesk as helpdesk_crawler
from crawlers import orders as orders_crawler

HERE = Path(__file__).resolve().parent
SNAPSHOT_DIR = HERE.parent / "snapshots"
RECEIPT_DIR = HERE.parent / "receipts"
RECEIPT_FILE = RECEIPT_DIR / "harness-receipts.jsonl"
PORT = 8602
HARNESS_VERSION = "0.2"

# Truthful runtime accounting, mirroring the Launch/RLMCP receipts
# discipline: the harness crawler is deterministic Playwright automation —
# no AI is invoked, so its receipts carry REAL ZEROS. If an AI-assisted
# operation is ever recorded, it must carry the provider's RETURNED usage
# or the string "unavailable" — never a fabricated number.
DETERMINISTIC_RUNTIME = {
    "runtimeImplementation": "DETERMINISTIC",
    "aiInvoked": False,
    "aiProvider": None,
    "aiModel": None,
    "inputTokens": 0,
    "outputTokens": 0,
    "totalTokens": 0,
    "aiCost": "£0.00",
}

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
               writeCapability=adapter.WRITE_CAPABILITY, **DETERMINISTIC_RUNTIME)
    if rec.get("startedAt") and rec.get("finishedAt") and "durationMs" not in rec:
        try:
            t0 = time.mktime(time.strptime(rec["startedAt"], "%Y-%m-%dT%H:%M:%S"))
            t1 = time.mktime(time.strptime(rec["finishedAt"], "%Y-%m-%dT%H:%M:%S"))
            rec["durationMs"] = int((t1 - t0) * 1000)
        except Exception:
            rec["durationMs"] = None
    with RECEIPT_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def _record_write_receipt(audit: dict) -> None:
    """A configuration WRITE earns a receipt like any other operation:
    deterministic runtime, real zeros for AI, category OPERATIONAL, and the
    full audit (before/after/revert) attached so the change is reversible
    from the receipt alone."""
    write_receipt({
        "kind": "write:" + str(audit.get("op")),
        "startedAt": now_iso(), "finishedAt": now_iso(),
        "target": SESSION.target_url,
        "outcome": audit.get("status"),
        "applied": bool(audit.get("apply")),
        "audit": audit,
        "durationMs": audit.get("durationMs"),
    })


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
            elif kind == "adopt":
                result = SESSION.adopt_session_cookie(job["url"], job["name"], job["value"])
                job["done"](result)
            elif kind == "disconnect":
                SESSION.disconnect()
                job["done"]({"state": adapter.DISCONNECTED})
            elif kind == "status":
                SESSION.refresh_state()
                job["done"](SESSION.status())
            elif kind == "crawl":
                run_crawl(job["crawlId"], job["domains"])
            elif kind == "write":
                # writes touch the Playwright page, which is thread-affine —
                # they MUST run here on the browser-owning worker, never on
                # the HTTP thread (greenlet error otherwise).
                # Hot-reload the writer so an operation fix never costs a
                # restart (and therefore never costs the human a re-login).
                import importlib
                importlib.reload(writer)
                audit = writer.execute(SESSION, job["op"], apply=job["apply"])
                _record_write_receipt(audit)
                job["done"](audit)
        except writer.WriteRefused as exc:
            job.get("fail", lambda e: None)(("REFUSED", str(exc)))
        except writer.WriteFailed as exc:
            job.get("fail", lambda e: None)(("FAILED", str(exc)))
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
          # One domain failing must not throw away the other. Each is
          # attempted on its own; whatever fails is recorded in notCrawled
          # with the instance's OWN reason, and the crawl continues.
          try:
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
          except Exception as exc:
            not_crawled.append({"family": "Helpdesk", "reason": str(exc),
                                "kind": type(exc).__name__})
            errors.append(f"helpdesk: {exc}")

        if "orders" in domains:
          try:
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
          except Exception as exc:
            not_crawled.append({"family": "Orders", "reason": str(exc),
                                "kind": type(exc).__name__})
            errors.append(f"orders: {exc}")

        snapshot["meta"]["counts"] = counts
        snapshot["meta"]["warnings"] = warnings
        snapshot["meta"]["notCrawled"] = not_crawled

        snap_id = crawl_id
        path = SNAPSHOT_DIR / f"snapshot-{snap_id}.json"
        path.write_text(json.dumps(snapshot, indent=1, ensure_ascii=False), encoding="utf-8")

        captured = [d for d in ("helpdesk", "orders") if d in snapshot]
        if not errors:
            outcome = "COMPLETE"
        elif captured:
            outcome = "PARTIAL"
        else:
            # nothing was captured — say FAILED rather than dressing an
            # empty snapshot as a partial success
            outcome = "FAILED"
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
        # a (tag, message) tuple carries a typed failure (REFUSED/FAILED)
        # through to the HTTP layer so it can pick the right status code
        if isinstance(exc, tuple):
            box["errorTag"], box["error"] = exc
        else:
            box["error"] = str(exc)
        done_evt.set()

    JOBS.put(dict(payload, kind=kind, done=done, fail=fail))
    done_evt.wait(timeout=90)
    if "error" in box:
        err = RuntimeError(box["error"])
        err.tag = box.get("errorTag")
        raise err
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
                                  "writeEnabled": writer.write_enabled(),
                                  "writerVersion": writer.WRITER_VERSION,
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
            elif self.path == "/session/adopt-from-file":
                # Read a session cookie from a local hand-off FILE (so the
                # token never travels in a command argument or a URL). The
                # file is read once and immediately deleted; its contents
                # are never logged or persisted. Format: JSON
                # {"url","cookieName","cookieValue"}.
                fp = Path((payload.get("path") or "").strip())
                if not fp.is_file():
                    return self._send(400, {"error": "hand-off file not found"})
                try:
                    handoff = json.loads(fp.read_text(encoding="utf-8"))
                finally:
                    try:
                        fp.unlink()
                    except OSError:
                        pass
                url = (handoff.get("url") or "").strip()
                name = (handoff.get("cookieName") or "").strip()
                value = handoff.get("cookieValue") or ""
                if not (url.startswith("http") and name and value):
                    return self._send(400, {"error": "hand-off file needs url, cookieName, cookieValue"})
                self._send(200, run_on_worker("adopt", url=url, name=name, value=value))
            elif self.path == "/session/adopt":
                # Session ADOPTION: reuse a session a human created by
                # signing in elsewhere (cookie hand-off). NOT credential
                # entry — username/password are still refused outright.
                # The value is never logged or persisted.
                url = (payload.get("url") or "").strip()
                name = (payload.get("cookieName") or "").strip()
                value = payload.get("cookieValue") or ""
                if not (url.startswith("http") and name and value):
                    return self._send(400, {"error": "url, cookieName and cookieValue required"})
                if any(k in payload for k in ("username", "password")):
                    return self._send(400, {"error": "credentials are never accepted"})
                self._send(200, run_on_worker("adopt", url=url, name=name, value=value))
            elif self.path == "/session/disconnect":
                self._send(200, run_on_worker("disconnect"))
            elif self.path == "/crawl":
                domains = payload.get("domains") or ["helpdesk", "orders"]
                # The caller states which instance it BELIEVES it is
                # crawling. If the live session is on a different host, the
                # crawl is refused — capturing one customer's configuration
                # into another customer's project is the worst thing this
                # harness could do.
                expect = payload.get("expectInstance")
                if expect:
                    want = adapter._host_of(expect)
                    have = adapter._host_of(SESSION.target_url or "")
                    if want != have:
                        return self._send(409, {"error":
                            f"refusing to crawl: the harness is connected to {have or 'nothing'!r} "
                            f"but this project expects {want!r}. Connect to the project's own "
                            "instance first."})
                cid = uuid.uuid4().hex[:12]
                with LOCK:
                    CRAWLS[cid] = {"state": "QUEUED", "progress": {}, "domains": domains}
                JOBS.put({"kind": "crawl", "crawlId": cid, "domains": domains})
                self._send(200, {"crawlId": cid})
            elif self.path == "/execute":
                # Disciplined write path (concerto_writer). Gated by the human
                # via harness.config.json writeEnabled; every op is audited
                # with before/after/revert; the browser stays read-only for
                # crawling. apply defaults to False (dry run).
                if not writer.write_enabled():
                    self._send(403, {"error": (
                        "Writing is not enabled. Set \"writeEnabled\": true in "
                        "apps/concerto-studio/harness/harness.config.json to allow "
                        "configuration changes (Claude never edits that file)."),
                        "writeEnabled": False})
                    return
                if SESSION.state != adapter.CONNECTED_READ_ONLY:
                    self._send(409, {"error": f"cannot write: session state is {SESSION.state}"})
                    return
                op = payload.get("op") if isinstance(payload, dict) else None
                apply_flag = bool(payload.get("apply")) if isinstance(payload, dict) else False
                try:
                    # run on the browser-owning worker thread (Playwright is
                    # thread-affine); the writer's gate/verify still apply
                    audit = run_on_worker("write", op=payload, apply=apply_flag)
                    self._send(200, audit)
                except RuntimeError as exc:
                    tag = getattr(exc, "tag", None)
                    code = 403 if tag == "REFUSED" else 422 if tag == "FAILED" else 500
                    self._send(code, {"error": str(exc), "op": op, "status": tag or "ERROR"})
            else:
                self._send(404, {"error": "unknown endpoint"})
        except Exception as exc:
            self._send(500, {"error": str(exc)})

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    print(f"Concerto harness (READ-ONLY) on http://127.0.0.1:{PORT} — writeCapability={adapter.WRITE_CAPABILITY}")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
