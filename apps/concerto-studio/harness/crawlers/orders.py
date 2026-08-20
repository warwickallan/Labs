"""Orders Admin crawler (READ-ONLY). Same capture/interpret split as the
Helpdesk crawler. Priority families per the programme: Order Status,
Priority, Order Types, Budget Categories, Supplier Actions (every record
individually)."""

from __future__ import annotations

import re

from .helpdesk import SECTIONED_CHECKBOXES_JS

CRAWLER_VERSION = "0.1"

# See helpdesk.py: the same tab is worded differently between instances.
TAB_STATUS = ("Order status", "Status", "Order statuses")
TAB_PRIORITY = ("Priority", "Priorities", "Order priority")
TAB_TYPES = ("Order types", "Order type")
TAB_BUDGET = ("Budget categories", "Budget category")
TAB_SUPPLIER = ("Supplier actions", "Supplier action")


def capture(session, progress) -> dict:
    raw: dict = {"warnings": []}
    session.goto_admin("order_admin.aspx")

    def grab_list(tab, key):
        session.click_tab(tab)
        raw[key + "Headers"] = session.grid_headers()
        raw[key + "Rows"] = session.grid_rows()
        raw[key + "Guids"] = session.harvest_grid_guids()

    grab_list(TAB_STATUS, "orderStatus")
    progress("Order statuses", 1, 1)
    grab_list(TAB_PRIORITY, "priority")
    progress("Order priorities", 1, 1)
    grab_list(TAB_TYPES, "orderType")
    progress("Order types", 1, 1)
    grab_list(TAB_BUDGET, "budget")
    progress("Budget categories", 1, 1)

    grab_list(TAB_SUPPLIER, "supplier")
    guids = raw["supplierGuids"]
    raw["supplierForms"] = {}
    names = list(guids.keys())
    progress("Supplier actions", 0, len(names))
    for i, name in enumerate(names):
        session.nav_form_view(guids[name], name)
        raw["supplierForms"][name] = {
            "fields": session.read_form_fields(),
            "sectioned": session.page.evaluate(SECTIONED_CHECKBOXES_JS),
        }
        session.cancel_form()
        session.click_tab(TAB_SUPPLIER)
        progress("Supplier actions", i + 1, len(names))
    return raw


def interpret(raw: dict, not_crawled: list) -> dict:
    warnings = list(raw.get("warnings", []))

    def names_of(key):
        return list(raw.get(key + "Guids", {}).keys())

    order_status_names = names_of("orderStatus")
    order_statuses = []
    for i, name in enumerate(order_status_names):
        order_statuses.append({"name": name, "code": None, "colour": None,
                               "sort": (i + 1) * 10, "isDefault": False,
                               "preventApplication": False, "hubDashboard": False})
    if order_statuses:
        # default flag from the list projection where a column carries it
        headers = [h.lower() for h in raw.get("orderStatusHeaders", [])]
        if any("default" in h for h in headers):
            idx = next(i for i, h in enumerate(headers) if "default" in h)
            for row in raw.get("orderStatusRows", []):
                if len(row) > idx and row[idx] and any(s["name"] == _row_name(row) for s in order_statuses):
                    for s in order_statuses:
                        if s["name"] == _row_name(row):
                            s["isDefault"] = bool(row[idx].strip())
        else:
            not_crawled.append({"family": "Order status default flag",
                                "reason": "no Default column in the list projection; record reads not in crawler v1"})
    else:
        not_crawled.append({"family": "Order statuses", "reason": "grid not captured"})

    priorities = [{"name": n, "isDefault": False, "note": None} for n in names_of("priority")]
    order_types = [{"name": n, "code": None, "isDefault": False} for n in names_of("orderType")]
    budget = [{"name": n, "code": None, "code2": None, "type": None, "rateUnitQty": None}
              for n in names_of("budget")]

    supplier_actions = []
    seen_keys: dict[str, int] = {}
    for display, form in raw.get("supplierForms", {}).items():
        m = re.match(r"^([A-Z]+\d*[A-Z]*)\s+(.*)$", display)
        code = m.group(1) if m else display.split(" ")[0]
        base = code
        n = seen_keys.get(base, 0)
        seen_keys[base] = n + 1
        canonical = base if n == 0 else f"{base}{'abcdefgh'[n]}"

        sectioned = form.get("sectioned", [])
        fields = form.get("fields", {})
        avail = []
        portal = False
        for c in sectioned:
            label = c["label"].strip()
            if c["checked"] and label in order_status_names:
                avail.append(label)
            if re.search(r"supplier portal", label, re.I) and re.search(r"show", label, re.I):
                portal = c["checked"]
        resulting = None
        fires = None
        for lbl, val in fields.get("selects", {}).items():
            if re.search(r"resulting.*order.*status|resulting status", lbl, re.I) and val in order_status_names:
                resulting = val
            if re.search(r"helpdesk", lbl, re.I) and re.search(r"action", lbl, re.I) and val:
                fm = re.match(r"^([A-Z]+\d+[a-z]?)\b", val)
                fires = fm.group(1) if fm else val
        supplier_actions.append({
            "code": code,
            "name": re.sub(r"^[A-Z]+\d*[A-Z]*\s+", "", display),
            "availableIn": sorted(set(avail)),
            "resultingOrderStatus": resulting,
            "firesHelpdeskAction": fires,
            "acknowledge": False,
            "canonicalKey": canonical,
            "observedCode": display,
            "portalVisible": portal,
        })
    if not supplier_actions:
        not_crawled.append({"family": "Supplier actions", "reason": "no forms captured"})

    return {
        "orderStatuses": order_statuses,
        "orderPriorities": priorities,
        "orderTypes": order_types,
        "budgetCategories": budget,
        "supplierActions": supplier_actions,
        "referenceData": {},
        "emptyTabs": [],
        "unknowns": [],
        "warnings": warnings,
        "identities": {
            "orderStatuses": raw.get("orderStatusGuids", {}),
            "supplierActions": raw.get("supplierGuids", {}),
        },
    }


def _row_name(row):
    return next((c for c in row if c and len(c) > 1), "")
