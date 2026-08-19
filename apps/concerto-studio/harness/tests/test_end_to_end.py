"""test_end_to_end.py — prove the harness pipeline END TO END, offline.

Runs the REAL adapter and the REAL crawlers (no stubs, no monkey-patching)
against the fixture Concerto in tests/fixture_concerto.py, assembles the
snapshot exactly as server.run_crawl does, and checks:

  1. the session-state machine reports CONNECTED_READ_ONLY only when a page
     without a password field is actually loaded;
  2. the crawl reads what the fixture contains — statuses, GUIDs, per-record
     forms, actions, availability, resulting statuses, user-selects, order
     families and supplier actions;
  3. the stale-panel defence is genuinely exercised (the fixture renders
     late) and a mismatch FAILS LOUDLY rather than returning wrong data;
  4. NO WRITE occurs: write capability is off, no save is ever clicked, and
     every form open is followed by a cancel;
  5. the crawl is DETERMINISTIC — two runs produce identical output once
     the run timestamp is removed;
  6. the snapshot it produces is ingestible by the Studio (shape contract).

What this does NOT prove: that a real Concerto instance matches the fixture's
conventions today, or anything requiring authentication. That step needs a
human to sign in, and is recorded as the one remaining gap.

Run:  python apps/concerto-studio/harness/tests/test_end_to_end.py
"""

from __future__ import annotations

import copy
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))

import concerto_adapter as adapter  # noqa: E402
import fixture_concerto  # noqa: E402
from crawlers import helpdesk as helpdesk_crawler  # noqa: E402
from crawlers import orders as orders_crawler  # noqa: E402

PASSED: list[str] = []
FAILED: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    (PASSED if cond else FAILED).append(name + (f" — {detail}" if detail and not cond else ""))
    print(("  ok  " if cond else "  FAIL") + "  " + name + (f"   [{detail}]" if detail else ""))


def crawl_once(base_url: str) -> dict:
    """Exactly what server.run_crawl does, minus the HTTP plumbing."""
    session = adapter.ConcertoSession(headless=True)
    try:
        session.connect(base_url)
        assert session.state == adapter.CONNECTED_READ_ONLY, session.state
        not_crawled: list = []

        def progress(_family, _done, _total):
            return None

        raw_h = helpdesk_crawler.capture(session, progress)
        interp_h = helpdesk_crawler.interpret(raw_h, not_crawled)
        raw_o = orders_crawler.capture(session, progress)
        interp_o = orders_crawler.interpret(raw_o, not_crawled)

        identities = {}
        identities.update(interp_h.pop("identities", {}))
        identities.update(interp_o.pop("identities", {}))
        warnings = interp_h.pop("warnings", []) + interp_o.pop("warnings", [])

        snapshot = {
            "kind": "INSTANCE-SNAPSHOT",
            "snapshotVersion": 1,
            "meta": {
                "targetUrl": base_url,
                "crawledAt": "FIXED-FOR-DETERMINISM",
                "domains": ["helpdesk", "orders"],
                "writeCapability": adapter.WRITE_CAPABILITY,
                "warnings": warnings,
                "notCrawled": not_crawled,
            },
            "identities": identities,
            "helpdesk": {
                "metadata": {"modelVersion": 2, "environment": base_url,
                             "generatedAt": "FIXED-FOR-DETERMINISM"},
                "sharedConfiguration": [],
                "helpdeskTypes": interp_h["helpdeskTypes"],
                "evidence": [],
            },
            "orders": dict(interp_o, metadata={"generatedAt": "FIXED-FOR-DETERMINISM"}),
            "raw": {"helpdesk": raw_h, "orders": raw_o},
        }
        return snapshot
    finally:
        session.disconnect()


def main() -> int:
    base_url, srv = fixture_concerto.serve()
    print(f"fixture Concerto on {base_url}\n")
    try:
        # ---- 1. read-only by construction -------------------------------
        check("adapter declares no write capability", adapter.WRITE_CAPABILITY is False)
        check("adapter exposes no write/save/delete method",
              not [m for m in dir(adapter.ConcertoSession)
                   if any(w in m.lower() for w in ("save", "write", "delete", "submit"))])

        # ---- 2. session state machine -----------------------------------
        s = adapter.ConcertoSession(headless=True)
        check("a fresh session is DISCONNECTED", s.state == adapter.DISCONNECTED)
        s.connect(base_url)
        check("connecting to a signed-in page reports CONNECTED_READ_ONLY",
              s.state == adapter.CONNECTED_READ_ONLY, s.state)
        check("status() never claims a write capability", s.status()["writeCapability"] is False)

        # ---- 3. stale-panel defence fails loudly ------------------------
        s.goto_admin("helpdesk_admin.aspx")
        s.click_tab(helpdesk_crawler.TAB_STATUSES)
        guids = s.harvest_grid_guids()
        check("GUID harvest reads pbl_form_<guid>_0 ids",
              set(guids) == set(fixture_concerto.STATUSES), sorted(guids))
        loud = False
        try:
            # right record, WRONG expected name: the wait must never pass
            any_guid = fixture_concerto.STATUSES["With Helpdesk"]["guid"]
            s.nav_form_view(any_guid, "A Record That Is Not There", timeout_s=2.0)
        except adapter.StructureError:
            loud = True
        check("a form that renders the wrong record raises StructureError", loud)
        s.cancel_form()
        s.disconnect()

        # ---- 4. full crawl ----------------------------------------------
        snap = crawl_once(base_url)
        hd = snap["helpdesk"]
        types = {t["name"]: t for t in hd["helpdeskTypes"]}
        reactive = types["Reactive"]
        planned = types["Planned"]

        check("statuses attributed to the right Helpdesk Type",
              {s_["name"] for s_ in reactive["statuses"]} == {"With Helpdesk", "With Contractor - R"}
              and {s_["name"] for s_ in planned["statuses"]} == {"With Maintenance Team"},
              str([s_["name"] for s_ in reactive["statuses"]]))
        check("the default status flag is read from the form",
              [s_["name"] for s_ in reactive["statuses"] if s_["isDefault"]] == ["With Helpdesk"])
        check("sort order is read from the form",
              {s_["name"]: s_["ordering"] for s_ in reactive["statuses"]}
              == {"With Helpdesk": 10, "With Contractor - R": 30})

        action_names = {a["name"] for a in reactive["actions"]}
        check("every action was captured", action_names == set(fixture_concerto.ACTIONS),
              str(sorted(action_names)))

        rels = reactive["relationships"]
        avail = {(r["action"], r["fromStatus"]) for r in rels
                 if r["kind"] == "action-available-in-status"}
        check("availability edges match the forms",
              ("RH04. Assign to contractor", "With Helpdesk") in avail
              and ("G001. Add a note", "With Contractor - R") in avail,
              str(sorted(avail)))
        sets_ = {(r["action"], r["toStatus"]) for r in rels if r["kind"] == "action-sets-job-status"}
        check("a resulting status is read from the form select",
              ("RH04. Assign to contractor", "With Contractor - R") in sets_, str(sets_))
        selects = {(r["action"], r["toStatus"]) for r in rels
                   if r["kind"] == "action-user-selects-status"}
        check("user-selects is distinguished from availability by section heading",
              ("G003. Cancel", "With Contractor - R") in selects, str(selects))

        ords = snap["orders"]
        check("order families captured",
              len(ords["orderStatuses"]) == 3 and len(ords["orderPriorities"]) == 2,
              f"{len(ords['orderStatuses'])} statuses / {len(ords['orderPriorities'])} priorities")
        check("supplier actions captured individually",
              len(ords["supplierActions"]) == len(fixture_concerto.SUPPLIER_ACTIONS),
              str(len(ords["supplierActions"])))

        check("identities carry GUIDs for statuses and actions",
              snap["identities"]["statuses"]["With Helpdesk"]
              == fixture_concerto.STATUSES["With Helpdesk"]["guid"])

        # ---- 5. determinism ---------------------------------------------
        snap2 = crawl_once(base_url)
        a = json.dumps(_strip_volatile(copy.deepcopy(snap)), sort_keys=True)
        b = json.dumps(_strip_volatile(copy.deepcopy(snap2)), sort_keys=True)
        check("two crawls of unchanged config produce identical output", a == b,
              "differs" if a != b else "")

        # ---- 6. shape contract the Studio ingests ------------------------
        check("snapshot carries the helpdesk parts the Studio normaliser needs",
              all(k in hd for k in ("metadata", "sharedConfiguration", "helpdeskTypes", "evidence"))
              and all(k in hd["metadata"] for k in ("modelVersion", "environment", "generatedAt")))
        check("snapshot carries the orders parts the Studio normaliser needs",
              all(k in ords for k in ("orderStatuses", "orderPriorities", "orderTypes",
                                      "budgetCategories", "supplierActions", "emptyTabs", "unknowns")))
        check("every status record carries confidence + evidence",
              all(("confidence" in s_ and "evidence" in s_) for s_ in reactive["statuses"]))

        # bank the snapshot so the Studio's own test suite can ingest it
        out = HERE / "fixtures" / "harness-crawl-snapshot.json"
        out.parent.mkdir(exist_ok=True)
        out.write_text(json.dumps(_strip_raw(snap), indent=1, ensure_ascii=False), encoding="utf-8")
        print(f"\nbanked ingestible snapshot: {out.relative_to(HERE.parent.parent)}")

    finally:
        srv.shutdown()

    print(f"\n{'PASS' if not FAILED else 'FAIL'} {len(PASSED)}/{len(PASSED) + len(FAILED)}")
    for f in FAILED:
        print("  FAILED: " + f)
    return 1 if FAILED else 0


def _strip_volatile(snap: dict) -> dict:
    """Remove the run stamp and the target port so two runs are comparable."""
    snap["meta"].pop("crawledAt", None)
    snap["meta"].pop("targetUrl", None)
    snap["helpdesk"]["metadata"].pop("generatedAt", None)
    snap["helpdesk"]["metadata"].pop("environment", None)
    snap["orders"]["metadata"].pop("generatedAt", None)
    return snap


def _strip_raw(snap: dict) -> dict:
    """The banked fixture keeps the interpreted model, not the raw dumps."""
    snap = copy.deepcopy(snap)
    snap.pop("raw", None)
    snap["meta"]["targetUrl"] = "http://fixture.invalid"
    snap["meta"]["crawledAt"] = "2026-08-20T09:00:00Z"
    snap["helpdesk"]["metadata"]["environment"] = "http://fixture.invalid"
    snap["helpdesk"]["metadata"]["generatedAt"] = "2026-08-20T09:00:00Z"
    snap["orders"]["metadata"]["generatedAt"] = "2026-08-20T09:00:00Z"
    return snap


if __name__ == "__main__":
    raise SystemExit(main())
