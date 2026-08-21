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

  var state = { tab: 'library', pack: 'smoke', open: null, render: 'customer', run: null, si: 0, sti: 0 };

  /* a runnable step: plain instruction + expected, whatever the scenario's
     origin (generated keyword step or imported manual step). */
  function runnableSteps(sc) {
    return (sc.steps || []).map(function (st, i) {
      var instruction = st.parameters && st.parameters.instruction
        ? st.parameters.instruction
        : (st.parameters && st.parameters.action ? (st.actor || 'User') + ': ' + (st.parameters.action || '').replace(/^[A-Z]{1,3}\d{2,3}[a-z]?[.\s-]+/, '') + (st.parameters.fromStatus ? ' (from ' + st.parameters.fromStatus + ')' : '') : (st.keyword || 'Step ' + (i + 1)));
      var expected = (st.assertions || []).map(function (a) {
        return a.keyword === 'JOB_STATUS_EQUALS' ? 'Job status → ' + a.value
          : a.keyword === 'ORDER_RAISED_FOR_JOB' ? 'An order is raised'
            : a.keyword === 'NOTIFICATION_SENT' ? 'Notification sent (' + a.value + ')'
              : a.keyword === 'MANUAL_CHECK' ? a.value
                : a.keyword + (a.value ? ': ' + a.value : '');
      }).join('; ') || '—';
      return { n: i + 1, instruction: instruction, expected: expected, channel: st.channel || '', result: '', note: '' };
    });
  }

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
      customScenarios: proj.uatScenarios || [],
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
        el('span', { class: 'seg' }, ['library', 'requirements', 'suite', 'preflight', 'runs', 'results'].map(function (t) {
          return el('button', { class: state.tab === t ? 'on' : '', text: t.charAt(0).toUpperCase() + t.slice(1),
            onclick: function () { state.tab = t; rerender(); } });
        }))
      ])
    ]));

    if (state.tab === 'library') return libraryTab(page, el, packs, rerender);
    if (state.tab === 'suite') return suiteTab(page, el, packs, proj, rerender);
    if (state.tab === 'preflight') return preflightTab(page, el, packs, current, rerender);
    if (state.tab === 'requirements') return requirementsTab(page, el, proj, rerender);
    if (state.tab === 'runs') return runsTab(page, el, proj, packs, rerender);
    if (state.tab === 'results') return resultsTab(page, el, proj, rerender);
  }

  function libraryTab(page, el, packs, rerender) {
    var packNames = Object.keys(packs).filter(function (k) { return packs[k].length; });
    if (!packNames.length) {
      page.appendChild(el('div', { class: 'tile' }, [el('p', { class: 'muted', text: 'No journeys could be derived — the model has no reachable status transitions yet. Crawl or inspect the instance first.' })]));
      return;
    }
    if (packNames.indexOf(state.pack) === -1) state.pack = packNames[0];
    var packLabel = { smoke: 'Smoke', core: 'Core', negative: 'Negative', regression: 'Regression', customer: 'Customer', vanillaProvided: 'Vanilla pack' };
    page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:12px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px' }, [
      el('span', { class: 'seg' }, packNames.map(function (k) {
        return el('button', { class: state.pack === k ? 'on' : '', text: (packLabel[k] || k) + ' (' + packs[k].length + ')',
          onclick: function () { state.pack = k; state.open = null; rerender(); } });
      })),
      el('span', { style: 'display:flex;gap:6px' }, [
        el('label', { class: 'btn', style: 'cursor:pointer;font-size:12px' }, [
          document.createTextNode('Import customer scenarios…'),
          el('input', { type: 'file', accept: '.json,.csv,.txt,.md', style: 'display:none',
            onchange: function (e) { importScenarioFile(e.target.files[0], 'customer', rerender); } })
        ]),
        el('label', { class: 'btn', style: 'cursor:pointer;font-size:12px' }, [
          document.createTextNode('Import Vanilla test pack…'),
          el('input', { type: 'file', accept: '.json,.csv,.txt,.md', style: 'display:none',
            onchange: function (e) { importScenarioFile(e.target.files[0], 'vanilla', rerender); } })
        ])
      ])
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

  /* ---- pre-flight: which scenarios can the CONFIGURATION even permit? ---- */
  function preflightTab(page, el, packs, current, rerender) {
    var X = window.StudioUatExec;
    var all = [];
    Object.keys(packs).forEach(function (k) {
      packs[k].forEach(function (sc) { if (all.map(function (x) { return x.id; }).indexOf(sc.id) === -1) all.push(sc); });
    });
    var out = X.preflightSuite(all, current);
    var s = out.summary;

    page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:12px' }, [
      el('h3', { text: 'Pre-flight against the CURRENT configuration', style: 'margin-top:0' }),
      el('p', { class: 'muted', style: 'font-size:12.5px', text:
        'Checks what the configuration alone decides — is the action allocated where the scenario takes it, does it lead to the status the scenario expects. ' +
        'It is NOT a test run: runtime facts (emails delivered, orders raised, engines firing) are marked NEEDS-HUMAN and never passed off as proof. ' +
        'A CONFIG-FAIL scenario cannot pass on this instance today — fix the configuration or the scenario before anyone executes it.' }),
      el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;margin-top:8px' }, [
        el('span', { class: 'conf-chip observed', text: s.configOk + ' config-OK' }),
        el('span', { class: 'conf-chip', text: s.configFail + ' CONFIG-FAIL' }),
        el('span', { class: 'conf-chip parsed', text: s.needsHuman + ' needs a human' }),
        s.notEvaluated ? el('span', { class: 'conf-chip', text: s.notEvaluated + ' not evaluated' }) : null
      ].filter(Boolean))
    ]));

    if (out.broken.length) {
      page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:12px' }, [
        el('h4', { text: 'Broken before anyone starts (' + out.broken.length + ')', style: 'margin-top:0' }),
        el('table', { class: 'list' }, [
          el('thead', {}, [el('tr', {}, ['Scenario', 'Why the configuration forbids it'].map(function (h) { return el('th', { text: h }); }))]),
          el('tbody', {}, out.broken.map(function (r) {
            return el('tr', {}, [
              el('td', {}, [el('b', { text: r.scenarioId }), el('div', { class: 'muted', style: 'font-size:11.5px', text: r.title })]),
              el('td', { style: 'font-size:12px', text: r.blockers.join(' · ') })
            ]);
          }))
        ])
      ]));
    }

    page.appendChild(el('div', { class: 'tile' }, [
      el('h4', { text: 'All scenarios', style: 'margin-top:0' }),
      el('div', {}, out.results.map(function (r) {
        var cls = r.verdict === X.VERDICT.OK ? 'observed' : r.verdict === X.VERDICT.HUMAN ? 'parsed' : '';
        return el('details', { class: 'cfg-sec' }, [
          el('summary', {}, [
            el('span', { class: 'conf-chip ' + cls, text: r.verdict }),
            document.createTextNode(' ' + r.scenarioId + ' — ' + r.title)
          ]),
          el('table', { class: 'list' }, [
            el('tbody', {}, r.steps.map(function (st) {
              return el('tr', {}, [
                el('td', { style: 'width:70px', text: st.id }),
                el('td', {}, st.checks.map(function (c) {
                  return el('div', { style: 'font-size:12px' }, [
                    el('span', { class: 'conf-chip ' + (c.verdict === X.VERDICT.OK ? 'observed' : c.verdict === X.VERDICT.HUMAN ? 'parsed' : ''), text: c.verdict }),
                    document.createTextNode(' ' + c.what + ' — ' + c.why)
                  ]);
                }))
              ]);
            }))
          ])
        ]);
      }))
    ]));

    var gaps = {};
    all.forEach(function (sc) { X.harnessGap(sc).forEach(function (g) { gaps[g] = true; }); });
    page.appendChild(el('div', { class: 'tile', style: 'margin-top:12px' }, [
      el('h4', { text: 'What unattended execution would still need', style: 'margin-top:0' }),
      el('p', { class: 'muted', style: 'font-size:12.5px', text: 'The harness can read configuration and make audited writes. It cannot yet read a live JOB. Until these exist, execution stays human-run with pre-flight in front of it:' }),
      el('ul', {}, Object.keys(gaps).map(function (g) { return el('li', { style: 'font-size:12.5px', text: g }); }))
    ]));
  }

  function importScenarioFile(file, pack, rerender) {
    if (!file) return;
    var proj = window.StudioProject.current();
    var r = new FileReader();
    r.onload = function () {
      var scs = window.StudioUAT.importScenarios(String(r.result || ''), { pack: pack });
      if (!scs.length) { alert('No scenarios could be read from that file. Accepted: canonical JSON, CSV (id/scenario/steps/expected), or plain-text blocks.'); return; }
      proj.uatScenarios = (proj.uatScenarios || []).concat(scs);
      window.StudioProject.save(proj.key, { uatScenarios: proj.uatScenarios });
      if (window.StudioProject.persist) window.StudioProject.persist(proj.key);
      alert('Imported ' + scs.length + ' scenario' + (scs.length > 1 ? 's' : '') + ' into the ' + pack + ' pack.');
      state.pack = pack === 'customer' ? 'customer' : 'vanillaProvided';
      rerender();
    };
    r.readAsText(file);
  }

  function requirementsTab(page, el, proj, rerender) {
    var reqs = (proj.srd && proj.srd.requirements) || [];
    page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:12px' }, [
      el('h3', { text: 'Requirements → UAT', style: 'margin-top:0' }),
      el('p', { style: 'font-size:13px', text: 'The second feeder. Requirements come from the SRD tab in Design (assessed against the baseline as Present / Not-present / Unknown). Compile them into UAT scenarios so every requirement is traced requirement → scenario → run → result.' }),
      !reqs.length ? el('p', { class: 'muted', style: 'font-size:12.5px' }, [
        document.createTextNode('No requirements yet. Add them in '),
        el('a', { href: '#design', text: 'Design → SRD' }),
        document.createTextNode(' (paste or drop a tender / SRD).')
      ]) : el('button', { class: 'btn', text: 'Compile ' + reqs.length + ' requirements into UAT scenarios', onclick: function () {
        var compiled = reqs.map(function (r) { return compileRequirement(r); });
        var existing = {}; (proj.uatScenarios || []).forEach(function (s) { existing[s.id] = true; });
        var fresh = compiled.filter(function (s) { return !existing[s.id]; });
        proj.uatScenarios = (proj.uatScenarios || []).concat(fresh);
        window.StudioProject.save(proj.key, { uatScenarios: proj.uatScenarios }); if (window.StudioProject.persist) window.StudioProject.persist(proj.key);
        alert('Compiled ' + fresh.length + ' requirement scenario' + (fresh.length === 1 ? '' : 's') + ' into the Customer pack (traced to their SRD refs).');
        state.tab = 'library'; state.pack = 'customer'; rerender();
      } })
    ]));
    if (reqs.length) {
      page.appendChild(el('div', { class: 'tile', style: 'overflow-x:auto' }, [
        el('table', { class: 'list' }, [
          el('thead', {}, [el('tr', {}, ['Ref', 'Requirement', 'Baseline verdict', 'Priority'].map(function (h) { return el('th', { text: h }); }))]),
          el('tbody', {}, reqs.map(function (r) {
            var tone = r.verdict === 'PRESENT' ? 'background:#e7f5ee;color:#1e6b4f' : r.verdict === 'NOT-PRESENT' ? 'background:#fdeaea;color:var(--danger)' : 'background:#fef6e6;color:#8a6d1a';
            return el('tr', {}, [el('td', {}, [el('b', { text: r.ref })]), el('td', { style: 'font-size:12.5px', text: r.text }),
              el('td', {}, [el('span', { class: 'conf-chip', style: tone, text: r.verdict })]), el('td', { text: r.priority || '' })]);
          }))
        ])
      ]));
    }
  }

  /* a requirement becomes a UAT scenario scaffold: one manual step to verify
     the requirement, traced to its SRD ref. Where it maps to a specific
     configured element the step names it; otherwise it is an explicit manual
     check for the tester — never a fabricated system action. */
  function compileRequirement(r) {
    return {
      id: 'UAT-REQ-' + (r.ref || '').replace(/[^A-Z0-9]+/gi, '-'),
      version: 1,
      title: r.text.slice(0, 90),
      module: 'Requirement acceptance',
      risk: { priority: r.priority === 'mandatory' ? 'high' : 'medium' },
      target: { expectedModel: 'desired', executeAgainstModel: 'current' },
      traceability: { requirements: [r.ref] },
      steps: [{ id: 'step-1', keyword: 'MANUAL', channel: 'As appropriate',
        parameters: { instruction: 'Verify the system meets: “' + r.text + '”' },
        assertions: [{ keyword: 'MANUAL_CHECK', value: r.verdict === 'NOT-PRESENT' ? 'Requires configuration — confirm the agreed change is in place and works' : 'Confirm the behaviour is present and correct' }] }],
      provenance: { generatedBy: 'requirement-compile', reviewStatus: 'draft', acquiredFrom: 'srd:' + (r.ref || ''), pack: 'customer' },
      pack: 'customer'
    };
  }

  function runsTab(page, el, proj, packs, rerender) {
    function save() { window.StudioProject.save(proj.key, { uatRuns: proj.uatRuns }); if (window.StudioProject.persist) window.StudioProject.persist(proj.key); }

    /* an active run in progress: step through, record per-step result */
    if (state.run) {
      var run = state.run;
      var sc = run.scenarios[state.si];
      var step = sc.steps[state.sti];
      var totalSteps = run.scenarios.reduce(function (n, s) { return n + s.steps.length; }, 0);
      var doneSteps = run.scenarios.reduce(function (n, s, i) { return n + (i < state.si ? s.steps.length : i === state.si ? state.sti : 0); }, 0);
      page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:12px' }, [
        el('div', { style: 'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px' }, [
          el('div', {}, [
            el('h3', { text: 'Running: ' + run.id, style: 'margin:0' }),
            el('p', { class: 'muted', style: 'margin:2px 0 0;font-size:12px', text: 'Scenario ' + (state.si + 1) + ' of ' + run.scenarios.length + ' · step ' + doneSteps + '/' + totalSteps + ' · executed against CURRENT' })
          ]),
          el('button', { class: 'btn', text: 'Pause & save', onclick: function () { finishRun(proj, run, false, save); state.run = null; state.tab = 'runs'; rerender(); } })
        ]),
        el('div', { style: 'background:var(--surface-2);height:6px;border-radius:3px;margin-top:8px' }, [
          el('div', { style: 'background:var(--accent);height:6px;border-radius:3px;width:' + Math.round(100 * doneSteps / Math.max(1, totalSteps)) + '%' })
        ])
      ]));
      page.appendChild(el('div', { class: 'tile' }, [
        el('div', { class: 'muted', style: 'font-size:12px', text: sc.title }),
        el('h3', { text: 'Step ' + step.n + (step.channel ? ' · ' + step.channel : ''), style: 'margin:6px 0' }),
        el('p', { style: 'font-size:14px;margin:0 0 4px' }, [el('b', { text: 'Do: ' }), document.createTextNode(step.instruction)]),
        el('p', { style: 'font-size:14px;margin:0 0 10px' }, [el('b', { text: 'Expect: ' }), document.createTextNode(step.expected)]),
        (function () {
          var note = el('textarea', { placeholder: 'Evidence / note (what you saw, screenshot ref, defect id)…', style: 'width:100%;min-height:52px;box-sizing:border-box;font-family:inherit;font-size:12.5px;padding:6px' });
          note.value = step.note || '';
          var advance = function (result) {
            step.result = result; step.note = note.value;
            if (state.sti + 1 < sc.steps.length) { state.sti++; }
            else if (state.si + 1 < run.scenarios.length) { sc.result = scenarioResult(sc); state.si++; state.sti = 0; }
            else { sc.result = scenarioResult(sc); finishRun(proj, run, true, save); state.run = null; state.tab = 'results'; }
            rerender();
          };
          return el('div', {}, [
            note,
            el('div', { style: 'display:flex;gap:8px;margin-top:8px;flex-wrap:wrap' }, [
              el('button', { class: 'btn', style: 'background:#e7f5ee;border-color:#1e6b4f;color:#1e6b4f', text: '✓ Pass', onclick: function () { advance('PASS'); } }),
              el('button', { class: 'btn', style: 'background:#fdeaea;border-color:var(--danger);color:var(--danger)', text: '✗ Fail', onclick: function () { advance('FAIL'); } }),
              el('button', { class: 'btn', text: '⊘ Blocked', onclick: function () { advance('BLOCKED'); } }),
              el('button', { class: 'btn', text: 'Skip', onclick: function () { advance('SKIPPED'); } })
            ])
          ]);
        })()
      ]));
      return;
    }

    /* no active run: choose what to run + past runs */
    var packNames = Object.keys(packs).filter(function (k) { return packs[k].length; });
    page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:12px' }, [
      el('h3', { text: 'Start a run', style: 'margin-top:0' }),
      el('p', { class: 'muted', style: 'font-size:12.5px', text: 'Guided execution against CURRENT — step through each scenario, record Pass / Fail / Blocked and evidence per step. Browser and hybrid execution build on this.' }),
      el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, packNames.map(function (k) {
        return el('button', { class: 'btn', text: 'Run ' + (({ smoke: 'Smoke', core: 'Core', regression: 'Regression', customer: 'Customer', vanillaProvided: 'Vanilla' }[k]) || k) + ' (' + packs[k].length + ')',
          onclick: function () { startRun(packs[k], k); rerender(); } });
      }))
    ]));

    var runs = proj.uatRuns || [];
    page.appendChild(el('div', { class: 'tile' }, [
      el('h3', { text: 'Past runs (' + runs.length + ')', style: 'margin-top:0' }),
      runs.length ? el('table', { class: 'list' }, [
        el('thead', {}, [el('tr', {}, ['Run', 'When', 'Pack', 'Pass', 'Fail', 'Blocked', 'Status'].map(function (h) { return el('th', { text: h }); }))]),
        el('tbody', {}, runs.slice().reverse().map(function (r) {
          return el('tr', { style: 'cursor:pointer', onclick: function () { state.tab = 'results'; state.viewRun = r.id; rerender(); } }, [
            el('td', {}, [el('b', { text: r.id })]), el('td', { text: r.at }), el('td', { text: r.pack }),
            el('td', { text: String(r.pass) }), el('td', {}, [el('span', { style: r.fail ? 'color:var(--danger);font-weight:600' : '', text: String(r.fail) })]),
            el('td', { text: String(r.blocked || 0) }),
            el('td', {}, [el('span', { class: 'conf-chip' + (r.complete ? ' observed' : ''), text: r.complete ? 'complete' : 'partial' })])
          ]);
        }))
      ]) : el('p', { class: 'muted', text: 'No runs yet. Start one above.' })
    ]));

    function startRun(scenarios, pack) {
      var n = (proj.uatRuns || []).length + 1;
      state.run = {
        id: 'RUN-' + ('00' + n).slice(-3), at: new Date().toISOString().slice(0, 16).replace('T', ' '),
        mode: 'guided', pack: pack, target: 'CURRENT',
        scenarios: scenarios.map(function (sc) { return { id: sc.id, title: sc.title, requirements: (sc.traceability && sc.traceability.requirements) || [], steps: runnableSteps(sc), result: '' }; })
      };
      state.si = 0; state.sti = 0;
    }
  }

  function scenarioResult(sc) {
    if (sc.steps.some(function (s) { return s.result === 'FAIL'; })) return 'FAIL';
    if (sc.steps.some(function (s) { return s.result === 'BLOCKED'; })) return 'BLOCKED';
    if (sc.steps.every(function (s) { return s.result === 'PASS'; })) return 'PASS';
    return 'PARTIAL';
  }

  function finishRun(proj, run, complete, save) {
    run.complete = complete;
    run.pass = run.scenarios.filter(function (s) { return scenarioResult(s) === 'PASS'; }).length;
    run.fail = run.scenarios.filter(function (s) { return scenarioResult(s) === 'FAIL'; }).length;
    run.blocked = run.scenarios.filter(function (s) { return scenarioResult(s) === 'BLOCKED'; }).length;
    run.scenarios.forEach(function (s) { s.result = scenarioResult(s); });
    proj.uatRuns = proj.uatRuns || [];
    var existing = proj.uatRuns.filter(function (r) { return r.id === run.id; })[0];
    if (existing) proj.uatRuns[proj.uatRuns.indexOf(existing)] = run; else proj.uatRuns.push(run);
    if (save) save();
  }

  function resultsTab(page, el, proj, rerender) {
    var runs = proj.uatRuns || [];
    if (!runs.length) {
      page.appendChild(el('div', { class: 'tile' }, [
        el('h3', { text: 'Results & sign-off', style: 'margin-top:0' }),
        el('p', { class: 'muted', text: 'No runs yet. Start a run in the Runs tab; results and traceability appear here. Nothing is asserted without a recorded run.' })
      ]));
      return;
    }
    var run = runs.filter(function (r) { return r.id === state.viewRun; })[0] || runs[runs.length - 1];
    var total = run.scenarios.length;
    var passRate = total ? Math.round(100 * run.pass / total) : 0;
    page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:12px' }, [
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px' }, [
        el('div', {}, [
          el('h3', { text: 'Results — ' + run.id, style: 'margin:0' }),
          el('p', { class: 'muted', style: 'margin:2px 0 0;font-size:12px', text: run.at + ' · ' + run.pack + ' pack · guided vs CURRENT · ' + (run.complete ? 'complete' : 'partial') })
        ]),
        el('div', { style: 'text-align:right' }, [
          el('div', { style: 'font-size:26px;font-weight:700;color:' + (run.fail ? 'var(--danger)' : '#1e6b4f'), text: passRate + '%' }),
          el('div', { class: 'muted', style: 'font-size:11px', text: run.pass + ' pass · ' + run.fail + ' fail · ' + (run.blocked || 0) + ' blocked' })
        ])
      ]),
      runs.length > 1 ? el('div', { style: 'margin-top:8px' }, [el('label', { style: 'font-size:12px', text: 'View run: ' }),
        (function () { var sel = el('select', { onchange: function (e) { state.viewRun = e.target.value; rerender(); } }, runs.slice().reverse().map(function (r) { return el('option', { value: r.id, text: r.id + ' (' + r.at + ')' }); })); sel.value = run.id; return sel; })()
      ]) : null
    ]));

    /* per-scenario results with traceability + expandable steps */
    page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:12px' }, [
      el('h3', { text: 'Scenarios', style: 'margin-top:0' }),
      el('table', { class: 'list' }, [
        el('thead', {}, [el('tr', {}, ['Scenario', 'Result', 'Requirements', 'Steps'].map(function (h) { return el('th', { text: h }); }))]),
        el('tbody', {}, run.scenarios.map(function (s) {
          var pass = s.steps.filter(function (x) { return x.result === 'PASS'; }).length;
          return el('tr', {}, [
            el('td', {}, [el('b', { text: s.id }), el('div', { class: 'muted', style: 'font-size:12px', text: s.title })]),
            el('td', {}, [resChip(el, s.result)]),
            el('td', { style: 'font-size:11px', text: (s.requirements || []).join(', ') || '—' }),
            el('td', { style: 'font-size:12px', text: pass + '/' + s.steps.length + ' passed' })
          ]);
        }))
      ])
    ]));

    /* requirement traceability rollup: which requirements a run covers */
    var reqCover = {};
    run.scenarios.forEach(function (s) { (s.requirements || []).forEach(function (rq) { reqCover[rq] = reqCover[rq] || { pass: 0, fail: 0 }; if (s.result === 'PASS') reqCover[rq].pass++; else reqCover[rq].fail++; }); });
    if (Object.keys(reqCover).length) {
      page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:12px' }, [
        el('h3', { text: 'Requirement coverage', style: 'margin-top:0' }),
        el('table', { class: 'list' }, [el('tbody', {}, Object.keys(reqCover).map(function (rq) {
          return el('tr', {}, [el('td', {}, [el('b', { text: rq })]), el('td', {}, [resChip(el, reqCover[rq].fail ? 'FAIL' : 'PASS')])]);
        }))])
      ]));
    }

    /* the formal UAT report — self-contained HTML for the customer file */
    page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:12px' }, [
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, [
        el('h3', { text: 'UAT report', style: 'margin:0' }),
        el('button', { class: 'btn', text: 'Download report (HTML)', onclick: function () { downloadReport(proj, run); } })
      ]),
      el('p', { class: 'muted', style: 'font-size:12px;margin:6px 0 0', text: 'Self-contained document: summary, every scenario with step results and evidence notes, requirement coverage, and the sign-off record.' })
    ]));

    /* sign-off */
    page.appendChild(el('div', { class: 'tile' }, [
      el('h3', { text: 'Customer sign-off', style: 'margin-top:0' }),
      run.signOff ? el('p', { class: 'ok-text', text: '✔ Signed off by ' + run.signOff.by + ' on ' + run.signOff.at + (run.signOff.note ? ' — ' + run.signOff.note : '') })
        : run.fail ? el('p', { class: 'warn-text', style: 'font-size:12.5px', text: run.fail + ' scenario(s) failed — resolve and re-run before sign-off, or sign off with noted exceptions.' })
          : el('p', { class: 'muted', style: 'font-size:12.5px', text: 'All scenarios passed. Record the customer sign-off to close this UAT.' }),
      !run.signOff ? el('button', { class: 'btn', text: 'Record sign-off', onclick: function () {
        var by = window.prompt('Signed off by (name / role):'); if (!by) return;
        var note = window.prompt('Note (optional — e.g. exceptions accepted):') || '';
        run.signOff = { by: by, at: new Date().toISOString().slice(0, 10), note: note };
        window.StudioProject.save(proj.key, { uatRuns: proj.uatRuns }); if (window.StudioProject.persist) window.StudioProject.persist(proj.key);
        rerender();
      } }) : null
    ]));
  }

  function downloadReport(proj, run) {
    var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    var passRate = run.scenarios.length ? Math.round(100 * run.pass / run.scenarios.length) : 0;
    var h = '<!doctype html><meta charset="utf-8"><title>UAT Report — ' + esc(proj.name) + ' — ' + esc(run.id) + '</title>' +
      '<style>body{font-family:Segoe UI,Arial,sans-serif;max-width:900px;margin:32px auto;color:#222;line-height:1.45}' +
      'h1{color:#0e3e33;border-bottom:3px solid #1e6b4f;padding-bottom:6px}h2{color:#0e3e33;margin-top:28px}' +
      'table{border-collapse:collapse;width:100%;font-size:13px}th,td{border:1px solid #d5dbd8;padding:6px 8px;text-align:left;vertical-align:top}' +
      'th{background:#eef4f1}.pass{color:#1e6b4f;font-weight:600}.fail{color:#b02a2a;font-weight:600}.blocked{color:#8a6d1a;font-weight:600}' +
      '.big{font-size:30px;font-weight:700}.muted{color:#68727d;font-size:12px}</style>' +
      '<h1>UAT Report — ' + esc(proj.name) + '</h1>' +
      '<p class="muted">Run ' + esc(run.id) + ' · ' + esc(run.at) + ' · ' + esc(run.pack) + ' pack · guided execution against the CURRENT instance (' + esc(proj.instanceUrl || '') + ') · ' + (run.complete ? 'complete' : 'partial') + '</p>' +
      '<p class="big ' + (run.fail ? 'fail' : 'pass') + '">' + passRate + '% passed</p>' +
      '<p>' + run.pass + ' passed · ' + run.fail + ' failed · ' + (run.blocked || 0) + ' blocked, of ' + run.scenarios.length + ' scenarios.</p>';
    h += '<h2>Scenario results</h2>';
    run.scenarios.forEach(function (s) {
      h += '<h3>' + esc(s.id) + ' — ' + esc(s.title) + ' <span class="' + (s.result || '').toLowerCase() + '">' + esc(s.result || '') + '</span></h3>';
      if ((s.requirements || []).length) h += '<p class="muted">Traces to: ' + esc(s.requirements.join(', ')) + '</p>';
      h += '<table><tr><th style="width:34%">Step</th><th style="width:30%">Expected</th><th>Result</th><th>Evidence / note</th></tr>';
      s.steps.forEach(function (st) {
        h += '<tr><td>' + esc(st.instruction) + '</td><td>' + esc(st.expected) + '</td><td class="' + (st.result || '').toLowerCase() + '">' + esc(st.result || '—') + '</td><td>' + esc(st.note || '') + '</td></tr>';
      });
      h += '</table>';
    });
    var reqCover = {};
    run.scenarios.forEach(function (s) { (s.requirements || []).forEach(function (rq) { reqCover[rq] = reqCover[rq] || []; reqCover[rq].push(s.result); }); });
    if (Object.keys(reqCover).length) {
      h += '<h2>Requirement coverage</h2><table><tr><th>Requirement</th><th>Outcome</th></tr>';
      Object.keys(reqCover).forEach(function (rq) {
        var ok = reqCover[rq].every(function (r) { return r === 'PASS'; });
        h += '<tr><td>' + esc(rq) + '</td><td class="' + (ok ? 'pass' : 'fail') + '">' + (ok ? 'PROVEN' : 'NOT PROVEN') + '</td></tr>';
      });
      h += '</table>';
    }
    h += '<h2>Sign-off</h2>' + (run.signOff
      ? '<p>Signed off by <b>' + esc(run.signOff.by) + '</b> on ' + esc(run.signOff.at) + (run.signOff.note ? ' — ' + esc(run.signOff.note) : '') + '</p>'
      : '<p class="muted">Not yet signed off.</p>');
    h += '<p class="muted">Generated by Concerto Configuration Studio · nothing in this report is asserted without a recorded run step.</p>';
    var blob = new Blob([h], { type: 'text/html' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'UAT-' + proj.key + '-' + run.id + '.html'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function resChip(el, r) {
    var tone = r === 'PASS' ? 'background:#e7f5ee;color:#1e6b4f' : r === 'FAIL' ? 'background:#fdeaea;color:var(--danger)' : r === 'BLOCKED' ? 'background:#fef6e6;color:#8a6d1a' : '';
    return el('span', { class: 'conf-chip', style: tone, text: r || '—' });
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
