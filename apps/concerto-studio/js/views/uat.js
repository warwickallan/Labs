/* views/uat.js — the project-level UAT view.
 *
 * Simple UX over a rich engine (per the report): the consultant sees
 *   Library | Requirements | Test Suite | Runs | Results
 * The model resolution, provenance and generation live underneath in
 * StudioUAT. The UAT TARGET is the DESIRED model; the SYSTEM UNDER TEST is
 * CURRENT. Generation is deterministic and model-derived — drafts for human
 * review, never authoritative.
 */
(function () {
  'use strict';

  var state = { tab: 'library', pack: 'smoke', open: null, render: 'customer' };

  function render(container, vanilla) {
    var el = window.StudioDom.el;
    if (window.StudioSchema && window.StudioSchema.completeModel) vanilla = window.StudioSchema.completeModel(vanilla);
    window.StudioDom.clear(container);
    var P = window.StudioProject;
    var proj = P ? P.current() : null;
    var page = el('div', { class: 'page' });
    container.appendChild(page);

    if (!proj) {
      page.appendChild(el('div', { class: 'stub' }, [
        el('h3', { text: 'UAT' }),
        el('p', { text: 'Open a project. UAT tests the DESIRED (agreed) model against the CURRENT instance, using reusable journeys derived from the configuration.' })
      ]));
      return;
    }

    function rerender() { render(container, vanilla); }

    /* resolve the models: target = desired (or current if no design yet),
       system under test = current */
    var SS = window.StudioSnapshots;
    var current = (SS && SS.currentModel(proj)) || (proj.instance && proj.instance.model) || vanilla;
    var M = window.StudioModel;
    var target = (M && M.hasFork()) ? M.desired() : current;
    var ctx = {
      projectKey: proj.key,
      vanillaId: vanilla && vanilla.meta && vanilla.meta.version,
      findings: proj.aiFindings || [],
      source: 'model-derived'
    };
    var packs = window.StudioUAT.library(target, ctx);
    var total = window.StudioUAT.countPacks(packs);

    /* header + tab strip */
    page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:14px' }, [
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px' }, [
        el('div', {}, [
          el('h3', { text: 'UAT — ' + proj.name, style: 'margin:0' }),
          el('p', { class: 'muted', style: 'margin:2px 0 0;font-size:12.5px', text:
            'Target: DESIRED (' + (M && M.hasFork() ? 'agreed design' : 'current — no design forked yet') + ') · System under test: CURRENT instance · ' + total + ' scenarios generated' })
        ]),
        el('span', { class: 'seg' }, ['library', 'requirements', 'suite', 'runs', 'results'].map(function (t) {
          return el('button', { class: state.tab === t ? 'on' : '', text: t.charAt(0).toUpperCase() + t.slice(1),
            onclick: function () { state.tab = t; rerender(); } });
        }))
      ])
    ]));

    if (state.tab === 'library') return libraryTab(page, el, packs, rerender);
    if (state.tab === 'suite') return suiteTab(page, el, packs, proj, rerender);
    if (state.tab === 'requirements') return requirementsTab(page, el, proj);
    if (state.tab === 'runs') return runsTab(page, el, proj);
    if (state.tab === 'results') return resultsTab(page, el, proj);
  }

  function libraryTab(page, el, packs, rerender) {
    var packNames = Object.keys(packs).filter(function (k) { return packs[k].length; });
    if (!packNames.length) {
      page.appendChild(el('div', { class: 'tile' }, [el('p', { class: 'muted', text: 'No journeys could be derived — the model has no reachable status transitions yet. Crawl or inspect the instance first.' })]));
      return;
    }
    if (packNames.indexOf(state.pack) === -1) state.pack = packNames[0];
    page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:12px' }, [
      el('span', { class: 'seg' }, packNames.map(function (k) {
        return el('button', { class: state.pack === k ? 'on' : '', text: k.charAt(0).toUpperCase() + k.slice(1) + ' (' + packs[k].length + ')',
          onclick: function () { state.pack = k; state.open = null; rerender(); } });
      }))
    ]));
    var list = packs[state.pack] || [];
    page.appendChild(el('div', { class: 'tile' }, [
      el('table', { class: 'list' }, [
        el('thead', {}, [el('tr', {}, ['Scenario', 'Module', 'Priority', 'Anchors'].map(function (h) { return el('th', { text: h }); }))]),
        el('tbody', {}, list.map(function (sc) {
          var openRow = el('tr', { style: 'cursor:pointer', onclick: function () { state.open = state.open === sc.id ? null : sc.id; rerender(); } }, [
            el('td', {}, [el('b', { text: sc.id }), el('div', { class: 'muted', style: 'font-size:12px', text: sc.title })]),
            el('td', { text: sc.module }),
            el('td', {}, [el('span', { class: 'conf-chip' + ((sc.risk && sc.risk.priority) === 'high' ? '' : ''), text: (sc.risk && sc.risk.priority) || '' })]),
            el('td', { style: 'font-size:12px', text: (sc.traceability && sc.traceability.technicalDesign || []).join(' · ') || (sc.oracleNote ? 'regression' : '') })
          ]);
          if (state.open !== sc.id) return openRow;
          var detail = el('tr', {}, [el('td', { colspan: '4' }, [detailPanel(el, sc)])]);
          var frag = document.createDocumentFragment(); frag.appendChild(openRow); frag.appendChild(detail); return frag;
        }))
      ])
    ]));
  }

  function detailPanel(el, sc) {
    var box = el('div', { style: 'padding:6px 2px' });
    box.appendChild(el('span', { class: 'seg', style: 'margin-bottom:8px' }, [
      ['customer', 'Customer'], ['gherkin', 'Gherkin'], ['json', 'Canonical']
    ].map(function (p) {
      return el('button', { class: state.render === p[0] ? 'on' : '', text: p[1], onclick: function () { state.render = p[0]; rerenderDetail(box, el, sc); } });
    })));
    var body = el('pre', { style: 'white-space:pre-wrap;font-size:12px;margin:0;background:var(--surface-2);padding:10px;border-radius:6px', 'data-body': '1' });
    box.appendChild(body);
    fillBody(body, sc);
    if (sc.oracleNote) box.appendChild(el('p', { class: 'warn-text', style: 'font-size:12px;margin:8px 0 0', text: sc.oracleNote }));
    return box;
  }
  function rerenderDetail(box, el, sc) { fillBody(box.querySelector('[data-body]'), sc); box.querySelectorAll('.seg button').forEach(function (b) { b.className = b.textContent.toLowerCase().indexOf(state.render) === 0 || (state.render === 'json' && /Canonical/.test(b.textContent)) ? 'on' : ''; }); }
  function fillBody(body, sc) {
    body.textContent = state.render === 'gherkin' ? window.StudioUAT.renderGherkin(sc)
      : state.render === 'json' ? JSON.stringify(sc, null, 2)
        : window.StudioUAT.renderCustomer(sc);
  }

  function suiteTab(page, el, packs, proj, rerender) {
    var all = [];
    Object.keys(packs).forEach(function (k) { packs[k].forEach(function (sc) { if (all.map(function (x) { return x.id; }).indexOf(sc.id) === -1) all.push(sc); }); });
    var rows = window.StudioUAT.toExcelRows(all);
    page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:12px' }, [
      el('h3', { text: 'Test suite (' + all.length + ')', style: 'margin-top:0' }),
      el('p', { class: 'muted', style: 'font-size:12.5px', text: 'The full generated suite, resolved against this project. This is the human-execution view — the same shape as the Concerto UAT workbook, ready to export.' }),
      el('button', { class: 'btn', text: 'Download suite (CSV)', onclick: function () { downloadCsv(rows, proj.key); } })
    ]));
    page.appendChild(el('div', { class: 'tile', style: 'overflow-x:auto' }, [
      el('table', { class: 'list', style: 'min-width:820px' }, [
        el('thead', {}, [el('tr', {}, ['ID', 'Pri', 'Role', 'Scenario', 'Steps', 'Expected', 'Anchors'].map(function (h) { return el('th', { text: h }); }))]),
        el('tbody', {}, rows.map(function (r) {
          return el('tr', {}, [
            el('td', {}, [el('b', { text: r.id })]),
            el('td', { text: r.priority }),
            el('td', { text: r.role }),
            el('td', { text: r.scenario, style: 'font-size:12px' }),
            el('td', { style: 'font-size:11.5px;white-space:pre-wrap', text: r.steps }),
            el('td', { style: 'font-size:11.5px;white-space:pre-wrap', text: r.expected }),
            el('td', { style: 'font-size:11px', text: r.traceability })
          ]);
        }))
      ])
    ]));
  }

  function requirementsTab(page, el, proj) {
    page.appendChild(el('div', { class: 'tile' }, [
      el('h3', { text: 'Requirements (SRD / tender)', style: 'margin-top:0' }),
      el('p', { style: 'font-size:13px', text: 'The second feeder: a customer SRD or tender is decomposed into atomic requirements, mapped to Concerto capabilities and this project’s Desired model, reviewed, then compiled into the same canonical scenarios as the Vanilla library.' }),
      el('p', { class: 'muted', style: 'font-size:12.5px', text: 'Not yet wired: paste or import an SRD to extract requirements with clause citations for review. This is the next build increment — the Library route above is live now.' }),
      (proj.requirements || []).length ? el('table', { class: 'list' }, [
        el('thead', {}, [el('tr', {}, ['Ref', 'Requirement', 'Mapped to', 'Status'].map(function (h) { return el('th', { text: h }); }))]),
        el('tbody', {}, proj.requirements.map(function (r) {
          return el('tr', {}, [el('td', { text: r.ref }), el('td', { text: r.text }), el('td', { text: (r.mappedTo || []).join(', ') }), el('td', { text: r.status || 'unreviewed' })]);
        }))
      ]) : el('p', { class: 'muted', text: 'No requirements imported yet.' })
    ]));
  }

  function runsTab(page, el, proj) {
    var runs = proj.uatRuns || [];
    page.appendChild(el('div', { class: 'tile' }, [
      el('h3', { text: 'Runs', style: 'margin-top:0' }),
      el('p', { style: 'font-size:13px', text: 'Each run executes the suite against CURRENT — guided-human, browser, or hybrid — capturing before/after read-back and evidence receipts per step.' }),
      el('p', { class: 'muted', style: 'font-size:12.5px', text: 'Execution engine is the increment after Requirements. For now the suite exports for manual execution; results are recorded in Results.' }),
      runs.length ? el('table', { class: 'list' }, [
        el('thead', {}, [el('tr', {}, ['Run', 'When', 'Mode', 'Pass', 'Fail'].map(function (h) { return el('th', { text: h }); }))]),
        el('tbody', {}, runs.map(function (r) { return el('tr', {}, [el('td', { text: r.id }), el('td', { text: r.at }), el('td', { text: r.mode }), el('td', { text: String(r.pass || 0) }), el('td', { text: String(r.fail || 0) })]); }))
      ]) : el('p', { class: 'muted', text: 'No runs recorded yet.' })
    ]));
  }

  function resultsTab(page, el, proj) {
    page.appendChild(el('div', { class: 'tile' }, [
      el('h3', { text: 'Results & sign-off', style: 'margin-top:0' }),
      el('p', { style: 'font-size:13px', text: 'Traceability from requirement → scenario → run → evidence, and the formal customer sign-off. Rolls up into the UAT report and Project Evidence.' }),
      el('p', { class: 'muted', style: 'font-size:12.5px', text: 'Populated once runs exist. Nothing is asserted here without a recorded run — no result is ever assumed.' })
    ]));
  }

  function downloadCsv(rows, key) {
    var cols = ['id', 'priority', 'role', 'scenario', 'preconditions', 'steps', 'expected', 'traceability', 'evidence', 'actual', 'result', 'defect', 'tester', 'date'];
    var esc = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var csv = [cols.join(',')].concat(rows.map(function (r) { return cols.map(function (c) { return esc(r[c]); }).join(','); })).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'uat-' + key + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  window.StudioUATView = { render: render };
})();
