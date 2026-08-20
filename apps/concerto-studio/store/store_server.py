"""store_server.py — the DURABLE PRIVATE PROJECT STORE for Concerto Studio.

Customer project data (instance URLs, captured configuration, findings,
change receipts) must never enter the PUBLIC Labs repository — but
"git-ignored" must not mean "one copy on one laptop with no backup". This
service owns that data OUTSIDE the repository and makes it durable.

What it is
----------
A small local HTTP service (port 8603) that:
  * owns a STORE ROOT outside the Labs working tree,
  * serves the Studio its projects (GET /projects, /project/<key>),
  * accepts saves from the Studio (POST /project/<key>),
  * keeps EVERY version of every project file, timestamped, so a bad save
    or a corrupted browser store can be rolled back (POST never destroys),
  * commits to a PRIVATE git repository when the store root is one, so the
    data has an off-machine copy the moment a remote is configured,
  * reports its own durability honestly to the Studio: where the data is,
    how many versions exist, whether a private git remote is actually
    configured, and when it last reached that remote.

What it is NOT
--------------
It has no connection to Concerto and no browser. It cannot read a customer
instance; it only holds what the Studio gives it. It also never deletes:
`prune` is not implemented, deliberately — durability first.

Store root resolution, in order:
  1. CONCERTO_STUDIO_STORE environment variable
  2. store-config.json next to this file, key "root"
  3. %LOCALAPPDATA%/ConcertoStudio/projects  (Windows)
     ~/.local/share/concerto-studio/projects (elsewhere)

Run:  python apps/concerto-studio/store/store_server.py
"""

from __future__ import annotations

import datetime as _dt
import json
import os
import pathlib
import shutil
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = pathlib.Path(__file__).resolve().parent
CONFIG_FILE = HERE / "store-config.json"
PORT = 8603
STORE_VERSION = "0.2"

# The store must never live inside the public repository.
REPO_ROOT = HERE.parent.parent.parent


def now_iso() -> str:
    return _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def default_root() -> pathlib.Path:
    if os.name == "nt":
        base = os.environ.get("LOCALAPPDATA") or os.path.expanduser("~")
        return pathlib.Path(base) / "ConcertoStudio" / "projects"
    return pathlib.Path(os.path.expanduser("~")) / ".local" / "share" / "concerto-studio" / "projects"


def resolve_root() -> pathlib.Path:
    env = os.environ.get("CONCERTO_STUDIO_STORE")
    if env:
        return pathlib.Path(env).expanduser()
    if CONFIG_FILE.exists():
        try:
            cfg = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
            if cfg.get("root"):
                return pathlib.Path(cfg["root"]).expanduser()
        except Exception:
            pass
    return default_root()


ROOT = resolve_root()


def inside_repo(path: pathlib.Path) -> bool:
    try:
        path.resolve().relative_to(REPO_ROOT.resolve())
        return True
    except Exception:
        return False


def ensure_root() -> None:
    if inside_repo(ROOT):
        raise SystemExit(
            f"REFUSING TO START: store root {ROOT} is inside the public repository "
            f"({REPO_ROOT}). Customer data must live outside it. Set "
            f"CONCERTO_STUDIO_STORE or store/store-config.json to a path outside the repo."
        )
    (ROOT / "versions").mkdir(parents=True, exist_ok=True)


# ---- git (optional, for off-machine durability) --------------------------

def git(*args: str, cwd: pathlib.Path | None = None) -> tuple[int, str]:
    try:
        p = subprocess.run(["git", *args], cwd=str(cwd or ROOT),
                           capture_output=True, text=True, timeout=30)
        return p.returncode, (p.stdout + p.stderr).strip()
    except Exception as exc:
        return 1, str(exc)


def git_state() -> dict:
    """Honest report: is this store actually backed up anywhere?"""
    code, _ = git("rev-parse", "--is-inside-work-tree")
    if code != 0:
        return {"repo": False, "remote": None, "lastPush": None,
                "warning": "The store is NOT a git repository — it exists on this machine only."}
    code, remote = git("remote", "get-url", "origin")
    remote = remote if code == 0 and remote else None
    last = None
    code, out = git("log", "-1", "--format=%cI %s")
    if code == 0 and out:
        last = out
    warning = None
    if not remote:
        warning = "The store is a git repository but has NO REMOTE — still one machine only."
    return {"repo": True, "remote": remote, "lastCommit": last, "lastPush": None, "warning": warning}


def commit(message: str) -> dict:
    state = git_state()
    if not state["repo"]:
        return {"committed": False, "reason": "store is not a git repository"}
    git("add", "-A")
    code, out = git("commit", "-m", message)
    if code != 0 and "nothing to commit" in out.lower():
        return {"committed": False, "reason": "nothing to commit"}
    if code != 0:
        return {"committed": False, "reason": out[:400]}
    pushed = None
    if state.get("remote"):
        pcode, pout = git("push")
        pushed = {"ok": pcode == 0, "detail": pout[:400]}
    return {"committed": True, "pushed": pushed}


# ---- project files -------------------------------------------------------

def project_dir(key: str) -> pathlib.Path:
    safe = "".join(c for c in key if c.isalnum() or c in "-_")
    if not safe or safe != key:
        raise ValueError(f"unsafe project key: {key!r}")
    return ROOT / safe


def list_projects() -> list[dict]:
    out = []
    if not ROOT.exists():
        return out
    for d in sorted(ROOT.iterdir()):
        if not d.is_dir() or d.name == "versions":
            continue
        f = d / "project.json"
        if not f.exists():
            continue
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            rec = data.get("project", {})
            out.append({
                "key": rec.get("key", d.name),
                "name": rec.get("name", d.name),
                "savedAt": _dt.datetime.fromtimestamp(f.stat().st_mtime, _dt.timezone.utc)
                    .replace(microsecond=0).isoformat().replace("+00:00", "Z"),
                "versions": len(list((ROOT / "versions").glob(f"{d.name}-*.json"))),
            })
        except Exception as exc:
            out.append({"key": d.name, "name": d.name, "error": str(exc)})
    return out


def read_project(key: str) -> dict:
    f = project_dir(key) / "project.json"
    if not f.exists():
        raise FileNotFoundError(key)
    return json.loads(f.read_text(encoding="utf-8"))


def _version_path(key: str) -> pathlib.Path:
    """A never-colliding name for a banked version. Second-precision stamps
    collide when two saves land in the same second — which would silently
    discard the older version, the exact loss this store exists to prevent.
    So a suffix is added until the name is free."""
    stamp = now_iso().replace(":", "").replace("-", "")
    base = ROOT / "versions"
    n = 0
    # The counter is always present and zero-padded so that sorting the
    # directory by NAME is the same as sorting it by TIME — an optional
    # suffix would sort the second save of a second before the first.
    candidate = base / f"{key}-{stamp}-{n:03d}.json"
    while candidate.exists():
        n += 1
        candidate = base / f"{key}-{stamp}-{n:03d}.json"
    return candidate


def write_project(key: str, payload: dict) -> dict:
    """Save a project — keeping every previous version. Never destructive."""
    if payload.get("kind") != "CONCERTO-STUDIO-PROJECT":
        raise ValueError("not a CONCERTO-STUDIO-PROJECT payload")
    d = project_dir(key)
    d.mkdir(parents=True, exist_ok=True)
    f = d / "project.json"
    if f.exists():
        shutil.copy2(f, _version_path(key))
    f.write_text(json.dumps(payload, indent=1, ensure_ascii=False), encoding="utf-8")
    result = commit(f"Studio: save project {key} ({now_iso()})")
    return {"saved": True, "path": str(f), "savedAt": now_iso(), "git": result}


def read_file(key: str, rel: str) -> str:
    """Read a companion file (snapshot, changelog) from a project folder."""
    d = project_dir(key)
    target = (d / rel).resolve()
    if not str(target).startswith(str(d.resolve())):
        raise ValueError("path escapes the project folder")
    return target.read_text(encoding="utf-8")


RECEIPTS_FILE_NAME = "receipts.jsonl"


def receipts_path() -> pathlib.Path:
    return ROOT / RECEIPTS_FILE_NAME


def append_receipt(entry: dict) -> dict:
    """Append one operation receipt. TRUTHFUL OR NOTHING:
    totalTokens must be a real reading (with its basis stated) or the
    string 'unavailable'. Estimates are refused by shape."""
    if not isinstance(entry.get("operation"), str) or not entry["operation"].strip():
        raise ValueError("a receipt needs an operation")
    tokens = entry.get("totalTokens", "unavailable")
    if isinstance(tokens, bool) or not isinstance(tokens, (int, str)):
        raise ValueError("totalTokens must be an integer reading or 'unavailable'")
    if isinstance(tokens, int):
        if tokens < 0:
            raise ValueError("a token reading cannot be negative")
        if not isinstance(entry.get("tokenBasis"), str) or not entry["tokenBasis"].strip():
            raise ValueError("a numeric token figure must state its basis (where the reading came from)")
    elif tokens != "unavailable":
        raise ValueError("totalTokens must be an integer reading or the string 'unavailable'")
    category = entry.get("category", "OPERATIONAL")
    if category not in ("OPERATIONAL", "BUILD"):
        raise ValueError("category must be OPERATIONAL (project/instance work) or BUILD (work on the Studio itself)")
    rec = dict(entry, recordedAt=now_iso(), storeVersion=STORE_VERSION, category=category)
    rec.setdefault("totalTokens", "unavailable")
    rec.setdefault("aiCost", "unavailable" if rec["totalTokens"] != 0 else "£0.00")
    with receipts_path().open("a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + chr(10))
    commit(f"Studio: receipt — {rec['operation'][:60]}")
    return rec


def list_receipts() -> list[dict]:
    if not receipts_path().exists():
        return []
    out = []
    for line in receipts_path().read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            try:
                out.append(json.loads(line))
            except Exception:
                out.append({"unparseable": line})
    return out


def health() -> dict:
    versions = list((ROOT / "versions").glob("*.json")) if (ROOT / "versions").exists() else []
    g = git_state()
    warnings = []
    if g.get("warning"):
        warnings.append(g["warning"])
    if not versions:
        warnings.append("No previous versions banked yet — the first save will start the history.")
    return {
        "ok": True,
        "storeVersion": STORE_VERSION,
        "root": str(ROOT),
        "insideRepository": inside_repo(ROOT),
        "projects": len(list_projects()),
        "versionsKept": len(versions),
        "git": g,
        "warnings": warnings,
        "durability": _durability(g, versions),
    }


def _durability(g: dict, versions: list) -> str:
    """One honest word for the Settings panel."""
    if g.get("repo") and g.get("remote"):
        return "OFF-MACHINE"      # committed and a remote exists
    if g.get("repo"):
        return "LOCAL-HISTORY"    # versioned + git, but no remote
    if versions:
        return "LOCAL-VERSIONS"   # file versions only
    return "SINGLE-COPY"          # nothing banked yet


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, obj) -> None:
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):  # noqa: N802
        self._send(204, {})

    def do_GET(self):  # noqa: N802
        path = self.path.split("?")[0].rstrip("/")
        try:
            if path in ("", "/health"):
                return self._send(200, health())
            if path == "/projects":
                return self._send(200, {"projects": list_projects()})
            if path.startswith("/project/"):
                parts = path[len("/project/"):].split("/", 1)
                key = parts[0]
                if len(parts) == 2 and parts[1]:
                    return self._send(200, {"key": key, "path": parts[1],
                                            "content": read_file(key, parts[1])})
                return self._send(200, read_project(key))
            if path == "/receipts":
                return self._send(200, {"receipts": list_receipts()})
            if path == "/versions":
                vs = sorted((ROOT / "versions").glob("*.json"))
                return self._send(200, {"versions": [v.name for v in vs]})
            return self._send(404, {"error": "unknown endpoint"})
        except FileNotFoundError as exc:
            return self._send(404, {"error": f"not found: {exc}"})
        except Exception as exc:
            return self._send(500, {"error": str(exc)})

    def do_POST(self):  # noqa: N802
        path = self.path.split("?")[0].rstrip("/")
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length).decode("utf-8") if length else "{}"
        try:
            payload = json.loads(body)
            if path.startswith("/project/"):
                key = path[len("/project/"):]
                return self._send(200, write_project(key, payload))
            if path == "/receipt":
                return self._send(200, append_receipt(payload))
            if path == "/commit":
                return self._send(200, commit(payload.get("message") or f"Studio: manual commit {now_iso()}"))
            return self._send(404, {"error": "unknown endpoint"})
        except Exception as exc:
            return self._send(400, {"error": str(exc)})

    def log_message(self, *args):
        pass


def main() -> None:
    ensure_root()
    h = health()
    print(f"Concerto Studio project store on http://127.0.0.1:{PORT}")
    print(f"  store root : {h['root']}")
    print(f"  durability : {h['durability']}")
    for w in h["warnings"]:
        print(f"  WARNING    : {w}")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()


if __name__ == "__main__":
    if "--health" in sys.argv:
        ensure_root()
        print(json.dumps(health(), indent=1))
    else:
        main()
