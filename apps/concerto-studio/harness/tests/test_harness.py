"""Offline harness acceptance tests — no Concerto contact required.

Run with the harness up:  python tests/test_harness.py
Prints PASS n/n (exit 0) or FAIL details (exit 1).

Gates covered here: health; write capability explicitly false; execute
endpoint refuses; credentials refused; unauthenticated session detected;
crawl without a session produces an honest FAILED receipt; receipts are
append-only JSONL.
"""

from __future__ import annotations

import json
import sys
import time
import urllib.request

BASE = "http://127.0.0.1:8602"
results = []


def call(method: str, path: str, payload=None):
    req = urllib.request.Request(BASE + path, method=method)
    data = None
    if payload is not None:
        data = json.dumps(payload).encode()
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, data=data, timeout=120) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())


def test(name):
    def deco(fn):
        results.append((name, fn))
        return fn
    return deco


@test("health reports ok and writeCapability=false")
def t1():
    code, body = call("GET", "/health")
    assert code == 200 and body["ok"] is True, body
    assert body["writeCapability"] is False, "write capability must be FALSE"


@test("execute endpoint refuses (no hidden write path)")
def t2():
    code, body = call("POST", "/execute", {"plan": {}})
    assert code == 403 and "read-only" in body["error"], body


@test("connect refuses credentials outright")
def t3():
    code, body = call("POST", "/session/connect",
                      {"url": "https://example.invalid", "username": "x", "password": "y"})
    assert code == 400 and "NEVER accepts credentials" in body["error"], body


@test("session status reports honestly when disconnected")
def t4():
    code, body = call("GET", "/session/status")
    assert code == 200, body
    assert body["state"] in ("DISCONNECTED", "LOGIN_REQUIRED", "CONNECTED_READ_ONLY"), body


@test("crawl without a read-only session fails loudly with a FAILED receipt")
def t5():
    code, body = call("GET", "/session/status")
    if body["state"] == "CONNECTED_READ_ONLY":
        print("   (skipped: a live session exists)")
        return
    code, body = call("POST", "/crawl", {"domains": ["helpdesk"]})
    assert code == 200 and body.get("crawlId"), body
    cid = body["crawlId"]
    for _ in range(40):
        code, status = call("GET", f"/crawl/{cid}/status")
        if status.get("state") in ("FAILED", "COMPLETE", "PARTIAL"):
            break
        time.sleep(0.5)
    assert status["state"] == "FAILED", status
    code, receipt = call("GET", f"/receipts/{cid}")
    assert code == 200 and receipt["outcome"] == "FAILED", receipt
    assert receipt["errors"], "failed receipt must carry the error"


@test("receipt index is readable and append-only shaped")
def t6():
    code, body = call("GET", "/receipts")
    assert code == 200 and isinstance(body["receipts"], list), body
    for r in body["receipts"]:
        assert r.get("outcome") in ("COMPLETE", "PARTIAL", "FAILED"), r
        assert r.get("writeCapability") is False, "receipts must record writeCapability=false"


def main() -> int:
    passed = failed = 0
    for name, fn in results:
        try:
            fn()
            passed += 1
            print(f"PASS {name}")
        except AssertionError as exc:
            failed += 1
            print(f"FAIL {name}: {exc}")
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"FAIL {name}: {type(exc).__name__}: {exc}")
    print(f"{'PASS' if not failed else 'FAIL'} {passed}/{passed + failed}")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
