"""fixture_concerto.py — a tiny stand-in Concerto for END-TO-END harness proof.

The live proof of the harness needs a human to sign in to a real customer
instance. Everything AFTER that sign-in — tab navigation, GUID harvesting,
form_view render-race defence, cancel discipline, capture, interpretation,
snapshot assembly, and the Studio's ingest of the result — can be proven
without one, provided the stand-in reproduces the DOM conventions the
adapter actually depends on (recorded in
docs/DISCOVERY-TECHNIQUES-AND-LESSONS.md):

  * a tab strip of `.nav-link` elements switching panels via AJAX (no
    navigation, URL unchanged),
  * grids whose rows carry `input[id="pbl_form_<guid>_0"]` select
    checkboxes — the GUID harvest,
  * `PblActions.nav('form_view', guid)` opening an Edit form in the same
    page, with a DELIBERATE RENDER DELAY so the name-match wait is
    genuinely exercised rather than trivially satisfied,
  * `PblActions.nav('RenderActionSummaryConst', guid)` opening a record
    VIEW page,
  * forms with `label[for]` fields, `<h4>` section headings above
    checkbox groups, and a Cancel button.

This fixture is NOT a Concerto simulator and makes no behavioural claims.
It is a shape harness: it proves the crawler reads the conventions it says
it reads, deterministically. It contains no customer data.
"""

from __future__ import annotations

import http.server
import json
import threading

# Two statuses and two actions is enough to exercise every code path:
# type attribution, default flag, sort order, availability vs user-select
# section attribution, resulting status, and the record VIEW.
STATUSES = {
    "With Helpdesk": {
        "guid": "11111111-1111-4111-8111-111111111111",
        "sort": 10,
        "types": ["Reactive"],
        "default": True,
    },
    "With Contractor - R": {
        "guid": "22222222-2222-4222-8222-222222222222",
        "sort": 30,
        "types": ["Reactive"],
        "default": False,
    },
    "With Maintenance Team": {
        "guid": "33333333-3333-4333-8333-333333333333",
        "sort": 20,
        "types": ["Planned"],
        "default": True,
    },
}

ACTIONS = {
    "RH04. Assign to contractor": {
        "guid": "44444444-4444-4444-8444-444444444444",
        "availableIn": ["With Helpdesk"],
        "resulting": "With Contractor - R",
        "userSelects": [],
        "hidden": False,
    },
    "G001. Add a note": {
        "guid": "55555555-5555-4555-8555-555555555555",
        "availableIn": ["With Helpdesk", "With Contractor - R"],
        "resulting": None,
        "userSelects": [],
        "hidden": False,
    },
    "G003. Cancel": {
        "guid": "66666666-6666-4666-8666-666666666666",
        "availableIn": ["With Helpdesk"],
        "resulting": None,
        "userSelects": ["With Contractor - R"],
        "hidden": False,
    },
}

JOB_TYPES = {
    "Reactive": {"guid": "77777777-7777-4777-8777-777777777777"},
    "Planned": {"guid": "88888888-8888-4888-8888-888888888888"},
}

OPERATIVE = ["Available", "On site", "Travelling"]

ORDER_FAMILIES = {
    "Order status": ["Awaiting acceptance", "Accepted", "Work complete"],
    "Priority": ["Default", "Urgent"],
    "Order types": ["Reactive order"],
    "Budget categories": ["Maintenance"],
}

SUPPLIER_ACTIONS = {
    "SP01. Accept job": {
        "guid": "99999999-9999-4999-8999-999999999999",
        "portal": True,
        "availableIn": ["Awaiting acceptance"],
        "resulting": "Accepted",
    },
    "SP02. Reject job": {
        "guid": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "portal": True,
        "availableIn": ["Awaiting acceptance"],
        "resulting": "Work complete",
    },
}

# A deliberate render delay (ms) so nav_form_view's name-match wait is a
# real wait. Concerto's panels are AJAX and arrive late; a fixture that
# renders instantly would prove nothing about the stale-panel defence.
RENDER_DELAY_MS = 350

_PAGE_SHELL = """<!doctype html>
<html><head><meta charset="utf-8"><title>%(title)s</title></head>
<body>
<div id="tabs">%(tabs)s</div>
<div id="panel">%(first)s</div>
<script>
const DATA = %(data)s;
const DELAY = %(delay)d;
function cell(t){ return '<td>' + t + '</td>'; }
function grid(headers, rows){
  let h = '<table><thead><tr>' + headers.map(x => '<th>' + x + '</th>').join('') + '</tr></thead><tbody>';
  for (const r of rows){
    h += '<tr>' + cell('<input type="checkbox" id="pbl_form_' + r.guid + '_0">') +
         r.cells.map(cell).join('') + '</tr>';
  }
  return h + '</tbody></table>';
}
function showTab(name){
  const t = DATA.tabs[name];
  document.getElementById('panel').innerHTML = grid(t.headers, t.rows);
}
document.querySelectorAll('.nav-link').forEach(function(b){
  b.addEventListener('click', function(){ showTab(b.textContent.trim()); });
});
function field(label, id, value){
  return '<div><label for="' + id + '">' + label + '</label>' +
         '<input type="text" id="' + id + '" value="' + value + '"></div>';
}
function select(label, id, options, chosen){
  let h = '<div><label for="' + id + '">' + label + '</label><select id="' + id + '">';
  h += '<option></option>';
  for (const o of options) h += '<option' + (o === chosen ? ' selected' : '') + '>' + o + '</option>';
  return h + '</select></div>';
}
function checkGroup(section, items){
  let h = '<h4>' + section + '</h4>';
  let n = 0;
  for (const it of items){
    const id = 'chk_' + section.replace(/\\W+/g,'') + '_' + (n++);
    h += '<div><input type="checkbox" id="' + id + '"' + (it.checked ? ' checked' : '') + '>' +
         '<label for="' + id + '">' + it.label + '</label></div>';
  }
  return h;
}
window.PblActions = {
  nav: function(kind, guid){
    const rec = DATA.records[guid];
    if (!rec) { document.getElementById('panel').innerHTML = '<p>unknown record</p>'; return; }
    // AJAX-like: the panel arrives LATE. Until it does the old panel stands,
    // which is exactly the stale-panel hazard the adapter defends against.
    setTimeout(function(){
      document.getElementById('panel').innerHTML =
        (kind === 'form_view') ? rec.form : rec.view;
    }, DELAY);
  }
};
</script>
</body></html>
"""


def _status_form(name: str, s: dict) -> str:
    types = [{"label": t, "checked": t in s["types"]} for t in ("Reactive", "Planned")]
    flags = [{"label": "Default status", "checked": s["default"]},
             {"label": "Display jobs on workforce page", "checked": False}]
    return (
        "<h3>Job status</h3>"
        + f"<div><label for=\"f_name\">Name</label><input type=\"text\" id=\"f_name\" value=\"{name}\"></div>"
        + f"<div><label for=\"f_sort\">Sort order</label><input type=\"text\" id=\"f_sort\" value=\"{s['sort']}\"></div>"
        + _group("Helpdesk types", types)
        + _group("Options", flags)
        + "<button>Cancel</button>"
    )


def _group(section: str, items: list[dict]) -> str:
    out = f"<h4>{section}</h4>"
    for n, it in enumerate(items):
        cid = f"chk_{section.replace(' ', '')}_{n}"
        checked = " checked" if it["checked"] else ""
        out += (f"<div><input type=\"checkbox\" id=\"{cid}\"{checked}>"
                f"<label for=\"{cid}\">{it['label']}</label></div>")
    return out


def _action_form(name: str, a: dict) -> str:
    avail = [{"label": s, "checked": s in a["availableIn"]} for s in STATUSES]
    selects = [{"label": s, "checked": s in a["userSelects"]} for s in STATUSES]
    opts = "".join(
        f"<option{' selected' if s == a['resulting'] else ''}>{s}</option>" for s in STATUSES
    )
    return (
        "<h3>Action</h3>"
        + f"<div><label for=\"f_name\">Name</label><input type=\"text\" id=\"f_name\" value=\"{name}\"></div>"
        + f"<div><label for=\"f_res\">Resulting job status</label>"
          f"<select id=\"f_res\"><option></option>{opts}</select></div>"
        + _group("Available in status", avail)
        + _group("User selects status", selects)
        + _group("Display", [{"label": "Hide this action", "checked": a["hidden"]}])
        + "<button>Cancel</button>"
    )


def _supplier_form(name: str, sa: dict) -> str:
    avail = [{"label": s, "checked": s in sa["availableIn"]}
             for s in ORDER_FAMILIES["Order status"]]
    opts = "".join(
        f"<option{' selected' if s == sa['resulting'] else ''}>{s}</option>"
        for s in ORDER_FAMILIES["Order status"]
    )
    return (
        "<h3>Supplier action</h3>"
        + f"<div><label for=\"f_name\">Name</label><input type=\"text\" id=\"f_name\" value=\"{name}\"></div>"
        + f"<div><label for=\"f_res\">Resulting order status</label>"
          f"<select id=\"f_res\"><option></option>{opts}</select></div>"
        + _group("Available in status", avail)
        + _group("Portal", [{"label": "Show this action on the supplier portal",
                             "checked": sa["portal"]}])
        + "<button>Cancel</button>"
    )


def _job_type_form(name: str) -> str:
    return ("<h3>Helpdesk job type</h3>"
            + f"<div><label for=\"f_name\">Name</label><input type=\"text\" id=\"f_name\" value=\"{name}\"></div>"
            + _group("Options", [{"label": "Active", "checked": True}])
            + "<button>Cancel</button>")


def _helpdesk_data() -> dict:
    records = {}
    for name, s in STATUSES.items():
        records[s["guid"]] = {"form": _status_form(name, s),
                              "view": f"<h3>{name}</h3><p>Job status record view.</p>"}
    for name, a in ACTIONS.items():
        records[a["guid"]] = {"form": _action_form(name, a),
                              "view": f"<h3>{name}</h3><p>Action record view. Button group: General Actions.</p>"}
    for name, j in JOB_TYPES.items():
        records[j["guid"]] = {"form": _job_type_form(name),
                              "view": f"<h3>{name}</h3>"}
    tabs = {
        "Job statuses": {
            "headers": ["", "Name", "Sort order"],
            "rows": [{"guid": s["guid"], "cells": [n, str(s["sort"])]} for n, s in STATUSES.items()],
        },
        "Actions": {
            "headers": ["", "Name", "Resulting status"],
            "rows": [{"guid": a["guid"], "cells": [n, a["resulting"] or ""]} for n, a in ACTIONS.items()],
        },
        "Operative statuses": {
            "headers": ["", "Name"],
            "rows": [{"guid": f"{i:08d}-0000-4000-8000-000000000000", "cells": [n]}
                     for i, n in enumerate(OPERATIVE)],
        },
        "Helpdesk job types": {
            "headers": ["", "Name"],
            "rows": [{"guid": j["guid"], "cells": [n]} for n, j in JOB_TYPES.items()],
        },
    }
    return {"tabs": tabs, "records": records}


def _orders_data() -> dict:
    records = {}
    tabs = {}
    for fam, names in ORDER_FAMILIES.items():
        tabs[fam] = {
            "headers": ["", "Name"],
            "rows": [{"guid": f"{abs(hash(fam + n)) % 10**8:08d}-0000-4000-8000-000000000000",
                      "cells": [n]} for n in names],
        }
    tabs["Supplier actions"] = {
        "headers": ["", "Name", "Resulting order status"],
        "rows": [{"guid": sa["guid"], "cells": [n, sa["resulting"]]}
                 for n, sa in SUPPLIER_ACTIONS.items()],
    }
    for name, sa in SUPPLIER_ACTIONS.items():
        records[sa["guid"]] = {"form": _supplier_form(name, sa),
                               "view": f"<h3>{name}</h3>"}
    return {"tabs": tabs, "records": records}


def _page(data: dict, title: str) -> str:
    tabs = "".join(f'<button class="nav-link">{t}</button>' for t in data["tabs"])
    first = ""
    return _PAGE_SHELL % {
        "title": title, "tabs": tabs, "first": first,
        "data": json.dumps(data), "delay": RENDER_DELAY_MS,
    }


class _Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802 (http.server API)
        path = self.path.split("?")[0].strip("/")
        if path == "helpdesk_admin.aspx":
            body = _page(_helpdesk_data(), "Helpdesk admin")
        elif path == "order_admin.aspx":
            body = _page(_orders_data(), "Order admin")
        else:
            body = "<html><body><h1>Fixture Concerto</h1><p>Signed in.</p></body></html>"
        raw = body.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, *args):  # keep test output clean
        pass


def serve() -> tuple[str, http.server.HTTPServer]:
    """Start the fixture on an ephemeral port. Returns (base_url, server)."""
    srv = http.server.HTTPServer(("127.0.0.1", 0), _Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{srv.server_port}", srv
