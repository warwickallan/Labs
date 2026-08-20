"""test_store.py — the durable private project store, offline.

Proves the properties the store exists for: customer data outside the public
repository, every save versioned before it is overwritten, nothing ever
deleted, unsafe keys and path escapes refused, and an HONEST durability
report (a store with no remote must say so rather than imply a backup).

Run:  python apps/concerto-studio/store/tests/test_store.py
"""

from __future__ import annotations

import json
import pathlib
import sys
import tempfile
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from threading import Thread

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

PASSED: list[str] = []
FAILED: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    (PASSED if cond else FAILED).append(name)
    print(("  ok  " if cond else "  FAIL") + "  " + name + (f"   [{detail}]" if detail else ""))


def payload(key: str, name: str, note: str = "") -> dict:
    return {
        "kind": "CONCERTO-STUDIO-PROJECT",
        "formatVersion": 1,
        "project": {"formatVersion": 1, "key": key, "name": name, "notes": note,
                    "instanceUrl": "https://example.invalid", "changeLog": []},
    }


def get(base: str, path: str):
    with urllib.request.urlopen(base + path, timeout=10) as r:
        return json.loads(r.read().decode("utf-8"))


def post(base: str, path: str, obj: dict):
    req = urllib.request.Request(base + path, data=json.dumps(obj).encode("utf-8"),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


def main() -> int:
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="studio-store-test-"))
    import os
    os.environ["CONCERTO_STUDIO_STORE"] = str(tmp)

    import store_server as store
    store.ROOT = tmp  # module read the env at import; be explicit anyway

    # ---- refuses to live inside the public repository --------------------
    check("a store root inside the repository is refused",
          store.inside_repo(store.HERE.parent / "projects") is True)
    check("the configured store root is outside the repository",
          store.inside_repo(tmp) is False, str(tmp))

    store.ensure_root()

    # ---- unsafe keys and path escapes ------------------------------------
    for bad in ("../escape", "a/b", "with space", ""):
        try:
            store.project_dir(bad)
            check(f"unsafe key {bad!r} refused", False)
        except ValueError:
            check(f"unsafe key {bad!r} refused", True)

    store.write_project("proj-a", payload("proj-a", "Project A", "first"))
    try:
        store.read_file("proj-a", "../../secret.txt")
        check("a path escaping the project folder is refused", False)
    except Exception:
        check("a path escaping the project folder is refused", True)

    # ---- versioning: a save never destroys the previous state ------------
    store.write_project("proj-a", payload("proj-a", "Project A", "second"))
    store.write_project("proj-a", payload("proj-a", "Project A", "third"))
    versions = sorted((tmp / "versions").glob("proj-a-*.json"))
    check("every overwrite banks the previous version first", len(versions) == 2,
          f"{len(versions)} versions")
    first = json.loads(versions[0].read_text(encoding="utf-8"))
    check("the banked version holds the OLD content, not the new",
          first["project"]["notes"] == "first", first["project"]["notes"])
    check("sorting versions by name orders them by time",
          [json.loads(v.read_text(encoding="utf-8"))["project"]["notes"] for v in versions]
          == ["first", "second"],
          str([v.name for v in versions]))
    check("the live file holds the newest content",
          store.read_project("proj-a")["project"]["notes"] == "third")

    # ---- nothing is deletable through the API ----------------------------
    check("the store exposes no delete/prune operation",
          not [n for n in dir(store) if any(w in n.lower() for w in ("delete", "prune", "purge"))])

    # ---- a malformed payload is rejected, not stored ----------------------
    try:
        store.write_project("proj-b", {"kind": "SOMETHING-ELSE"})
        check("a foreign payload is refused", False)
    except ValueError:
        check("a foreign payload is refused", True)
    check("and nothing was created for it", not (tmp / "proj-b").exists())

    # ---- honest durability reporting -------------------------------------
    h = store.health()
    check("a store with no git repository reports SINGLE-COPY or LOCAL-VERSIONS",
          h["durability"] in ("SINGLE-COPY", "LOCAL-VERSIONS"), h["durability"])
    check("and warns that it exists on one machine only",
          any("only" in w or "not a git" in w.lower() for w in h["warnings"]), str(h["warnings"]))
    check("health never reports the root as inside the repository",
          h["insideRepository"] is False)

    store.git("init")
    store.git("checkout", "-b", "main")
    store.git("-c", "user.email=t@t", "-c", "user.name=t", "add", "-A")
    store.git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-m", "test")
    h2 = store.health()
    check("a git store with NO REMOTE still refuses to claim a backup",
          h2["durability"] == "LOCAL-HISTORY" and "NO REMOTE" in (h2["git"].get("warning") or ""),
          h2["durability"])

    # ---- receipts: truthful or refused ------------------------------------
    r = store.append_receipt({"operation": "ASSISTED SESSION — test", "aiInvoked": True,
                              "totalTokens": 1234, "tokenBasis": "session budget meter delta"})
    check("a receipt with a real reading and its basis is accepted", r["totalTokens"] == 1234)
    r2 = store.append_receipt({"operation": "ASSISTED SESSION — unmetered", "aiInvoked": True})
    check("a receipt without a reading defaults to 'unavailable', never zero",
          r2["totalTokens"] == "unavailable" and r2["aiCost"] == "unavailable")
    try:
        store.append_receipt({"operation": "bad", "totalTokens": 500})
        check("a numeric figure WITHOUT its basis is refused (no unexplained numbers)", False)
    except ValueError:
        check("a numeric figure WITHOUT its basis is refused (no unexplained numbers)", True)
    try:
        store.append_receipt({"operation": "bad", "totalTokens": 12.5, "tokenBasis": "x"})
        check("a non-integer token figure is refused (readings are integers)", False)
    except ValueError:
        check("a non-integer token figure is refused (readings are integers)", True)
    check("receipts are append-only JSONL, newest last",
          [x["operation"] for x in store.list_receipts()][-2:] ==
          ["ASSISTED SESSION — test", "ASSISTED SESSION — unmetered"])
    check("there is no way to delete a receipt",
          not [n for n in dir(store) if "receipt" in n.lower() and any(w in n.lower() for w in ("delete", "remove", "prune"))])

    # receipts carry a category so build overhead never blends into
    # operational cost
    rc = store.append_receipt({"operation": "op-default"})
    check("a receipt defaults to OPERATIONAL", rc["category"] == "OPERATIONAL")
    rb = store.append_receipt({"operation": "build work", "category": "BUILD"})
    check("BUILD is accepted as a category", rb["category"] == "BUILD")
    try:
        store.append_receipt({"operation": "bad", "category": "MISC"})
        check("an unknown category is refused", False)
    except ValueError:
        check("an unknown category is refused", True)

    # ---- over HTTP, as the Studio uses it --------------------------------
    srv = ThreadingHTTPServer(("127.0.0.1", 0), store.Handler)
    Thread(target=srv.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{srv.server_port}"
    try:
        keys = [p["key"] for p in get(base, "/projects")["projects"]]
        check("GET /projects lists what is on disk", keys == ["proj-a"], str(keys))
        check("GET /project/<key> returns the record",
              get(base, "/project/proj-a")["project"]["name"] == "Project A")
        r = post(base, "/project/proj-c", payload("proj-c", "Project C"))
        check("POST /project/<key> saves and reports where", r["saved"] is True and r["path"])
        check("the save is immediately readable back",
              get(base, "/project/proj-c")["project"]["name"] == "Project C")
        code = 0
        try:
            post(base, "/project/proj-d", {"kind": "NOPE"})
        except urllib.error.HTTPError as e:
            code = e.code
        check("a foreign payload is refused over HTTP too", code == 400, str(code))
        check("GET /health is readable by the Studio", get(base, "/health")["ok"] is True)
    finally:
        srv.shutdown()

    print(f"\n{'PASS' if not FAILED else 'FAIL'} {len(PASSED)}/{len(PASSED) + len(FAILED)}")
    for f in FAILED:
        print("  FAILED: " + f)
    return 1 if FAILED else 0


if __name__ == "__main__":
    raise SystemExit(main())
