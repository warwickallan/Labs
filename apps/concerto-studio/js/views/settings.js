/* settings.js — SETTINGS: Studio, the versioned VANILLA BASELINES registry,
 * Vanilla/generic evidence, and storage. Vanilla is the standard-product
 * reference (not a project); projects reference the baseline they started
 * from. Kept calm — not a developer control panel.
 */
(function () {
  'use strict';

  var RATIFIED_KEY = 'concerto-studio-vanilla-ratified';
  function ratified() { try { return localStorage.getItem(RATIFIED_KEY) || ''; } catch (e) { return ''; } }
  function setRatified(v) { try { localStorage.setItem(RATIFIED_KEY, v); } catch (e) { /* */ } }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* Every Settings section folds to its title — the page reads as four calm
     lines; detail on click. A `summaryText` (4th arg via note object) can add
     a right-hand hint. */
  function section(el, title, note, node) {
    var d = el('details', { class: 'tile cfg-sec', style: 'margin-bottom:12px' });
    d.appendChild(el('summary', { style: 'cursor:pointer;list-style:none' }, [el('b', { text: title })]));
    d.appendChild(el('div', { style: 'padding-top:8px' }, [
      note ? el('p', { class: 'muted', style: 'margin:0 0 10px;font-size:12px', text: note }) : null,
      node
    ]));
    return d;
  }

  function sectionOld(el, title, note, node) {
    return el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
      el('h3', { text: title }),
      note ? el('p', { class: 'muted', style: 'margin-top:0', text: note }) : null,
      node
    ]);
  }

  function render(container, model, invariants) {
    var el = window.StudioDom.el;
    window.StudioDom.clear(container);
    var page = el('div', { class: 'page' });
    container.appendChild(page);
    var failing = (invariants || []).filter(function (c) { return !c.pass; });
    var projects = window.StudioProject ? window.StudioProject.list() : [];

    /* ---- STUDIO ---- */
    page.appendChild(section(el, 'Studio', null,
      el('div', {}, [
        el('p', { style: 'margin:0 0 8px', text: projects.length + ' project' + (projects.length === 1 ? '' : 's') + ' · standard product model loaded' +
          (failing.length ? '' : ' and verified') + (window.StudioStore && window.StudioStore.source() === 'store' ? ' · private store connected' : '') },
        ),
        failing.length ? el('p', { class: 'bad-text', text: '✘ ' + failing.length + ' model check(s) failing — the loaded model may not match the Labs source.' }) : null,
        el('details', {}, [
          el('summary', { style: 'cursor:pointer;font-size:12.5px;color:var(--text-dim)', text: 'Technical detail' }),
          el('table', { class: 'list', style: 'max-width:720px;margin-top:8px' }, [el('tbody', {}, [
            el('tr', {}, [el('td', { text: 'Canonical model version' }), el('td', { text: 'v' + model.meta.modelVersion + ' · loaded read-only from ../../model/*.json' })]),
            el('tr', {}, [el('td', { text: 'Fidelity invariants' }), el('td', {}, [el('span', { class: failing.length ? 'bad-text' : 'ok-text', style: 'font-weight:600', text: failing.length ? '✘ ' + failing.length + ' failing' : '✔ ' + (invariants || []).length + '/' + (invariants || []).length + ' pass' })])]),
            el('tr', {}, [el('td', { text: 'Harness' }), el('td', {}, [document.createTextNode('read-only by construction (write capability false) · '), el('code', { text: 'apps/concerto-studio/harness/server.py' })])]),
            el('tr', {}, [el('td', { text: 'Model fingerprints' }), el('td', {}, [el('code', { text: 'hd:' + model.meta.sourceFingerprints.helpdesk + ' ord:' + model.meta.sourceFingerprints.orders })])])
          ])])
        ])
      ])
    ));

    /* ---- VANILLA ---- */
    var rows = model.evidenceIndex.map(function (e) {
      return '<tr><td><code>' + esc(e.id) + '</code></td><td>' + esc(e.description) + '</td><td><code>' + esc(e.path) + '</code></td><td>' + esc(e.capturedAt) + '</td></tr>';
    }).join('');

    /* Baselines actually held: the Labs model, plus each project Day-One a
     * model is loaded for. Nothing conceptual, nothing implied. */
    var baselines = [{
      name: 'Labs discovery baseline (' + model.meta.generatedAt.helpdesk + ')',
      state: ratified() ? 'RATIFIED' : 'CAPTURED',
      ratifiedControl: true,
      fingerprints: 'hd:' + model.meta.sourceFingerprints.helpdesk + ' ord:' + model.meta.sourceFingerprints.orders,
      source: 'Discovery of warwick.concertodemo.co.uk (evidence E-001..E-024 / EO-001..EO-006)'
    }];
    (projects || []).forEach(function (p) {
      var SS = window.StudioSnapshots;
      if (!SS) return;
      var entry = SS.byRole(p, 'baseline');
      if (!entry) return;
      var rec = SS.entryRecord(p, entry);
      baselines.push({
        name: p.name + ' Day-One (' + SS.formatStamp(entry.capturedAt) + ')',
        state: rec ? 'CAPTURED' : 'PARTIAL',
        fingerprints: rec ? 'project baseline' : '—',
        source: entry.source || 'project capture'
      });
    });

    page.appendChild(section(el, 'Vanilla',
      'The standard Concerto product — the reference every project is measured against. Not a project.',
      el('div', {}, [
        el('p', { style: 'margin:0 0 8px' }, [
          document.createTextNode('Baseline ' + model.meta.generatedAt.helpdesk + ' · ratified: '),
          el('input', {
            type: 'date', value: ratified(),
            style: 'font:inherit;padding:3px 6px;border:1px solid var(--border-strong);border-radius:5px',
            onchange: function (e) { setRatified(e.target.value); }
          }),
          document.createTextNode('  '),
          el('button', {
            class: 'btn', text: 'Vanilla Technical Design',
            title: 'The full generated reference document for the standard product',
            onclick: function () {
              var doc = window.StudioSolDesign.generate(model, {
                edition: 'vanilla',
                findings: window.StudioRules.runAll(model)
              });
              var w = window.open('', '_blank');
              w.document.write(doc); w.document.close();
            }
          })
        ]),
        el('details', {}, [
          el('summary', { style: 'cursor:pointer;font-size:12.5px;color:var(--text-dim)', text: 'Baseline registry (' + baselines.length + ')' }),
          el('table', { class: 'list', style: 'margin-top:8px' }, [
            el('thead', {}, [el('tr', {}, ['Baseline', 'State', 'Fingerprints', 'Source'].map(function (h) { return el('th', { text: h }); }))]),
            el('tbody', {}, baselines.map(function (b) {
              return el('tr', {}, [
                el('td', {}, [el('b', { text: b.name })]),
                el('td', {}, [el('span', { class: 'conf-chip' + (b.state === 'RATIFIED' ? ' observed' : b.state === 'PARTIAL' ? '' : ' structural'), text: b.state })]),
                el('td', {}, [el('code', { text: b.fingerprints })]),
                el('td', { style: 'font-size:12px', text: b.source })
              ]);
            }))
          ])
        ]),
        el('details', {}, [
          el('summary', { style: 'cursor:pointer;font-size:12.5px;color:var(--text-dim)', text: 'Discovery evidence & provenance' }),
          el('table', { class: 'list', style: 'margin:8px 0 14px', html: '<thead><tr><th>ID</th><th>Description</th><th>Path</th><th>Captured</th></tr></thead><tbody>' + rows + '</tbody>' })
        ]),
        el('details', {}, [
          el('summary', { style: 'cursor:pointer;font-size:12.5px;color:var(--text-dim)', text: 'Vanilla model, domain stats & generic findings' }),
          (function () { var h = el('div', { style: 'margin-top:10px' }); if (window.StudioOverview) window.StudioOverview.render(h, model, invariants); return h; })()
        ])
      ])
    ));

    /* ---- STORAGE ---- */
    page.appendChild(storageSection(el));

    /* ---- RECEIPTS ---- */
    page.appendChild(receiptsSection(el, projects));
  }

  /* ---- RECEIPTS: what each operation actually cost --------------------
   * Time taken and tokens burned, per operation, newest first. Truthful or
   * nothing: deterministic operations carry measured durations and REAL
   * ZEROS for AI; AI-assisted work the Studio cannot meter is shown as
   * 'unavailable' — counted, never estimated into a total. */
  function receiptsSection(el, projects) {
    var host = el('div', { id: 'receiptsHostSettings' }, [el('p', { class: 'muted', text: 'Loading receipts…' })]);
    var node = section(el, 'Receipts',
      'What each operation cost — time taken and tokens burned. Deterministic work (the harness crawler, ingests, saves) uses no AI: real zeros. AI-assisted work burns Claude tokens the Studio cannot meter — shown as unavailable, never estimated.',
      host);
    if (!window.StudioReceipts) {
      window.StudioDom.clear(host);
      host.appendChild(el('p', { class: 'muted', text: 'Receipts module not loaded.' }));
      return node;
    }
    window.StudioReceipts.all(projects).then(function (list) {
      renderReceipts(el, host, list);
    });
    return node;
  }

  /* the filter state survives re-renders within the session */
  var receiptFilter = { category: null, runtime: null };

  function renderReceipts(el, host, list) {
    var R = window.StudioReceipts;
    window.StudioDom.clear(host);
    var s = R.summarise(list);

    /* the split that matters: what running projects costs vs what building
     * the Studio costs — never blended into one number */
    host.appendChild(el('p', { style: 'margin:0 0 8px' }, [
      el('b', { text: 'Operational: ' + s.byCategory.OPERATIONAL.knownTokens + ' tokens known' }),
      document.createTextNode(' across ' + s.byCategory.OPERATIONAL.operations + ' operation' + (s.byCategory.OPERATIONAL.operations === 1 ? '' : 's') +
        (s.byCategory.OPERATIONAL.unmetered ? ' (' + s.byCategory.OPERATIONAL.unmetered + ' unmetered)' : '') + '   ·   '),
      el('b', { text: 'Studio build: ' + s.byCategory.BUILD.knownTokens + ' tokens known' }),
      document.createTextNode(' across ' + s.byCategory.BUILD.operations + ' operation' + (s.byCategory.BUILD.operations === 1 ? '' : 's') +
        (s.byCategory.BUILD.unmetered ? ' (' + s.byCategory.BUILD.unmetered + ' unmetered)' : '') +
        ' · ' + R.fmtDuration(s.timedMs) + ' measured time')
    ]));

    function chip(label, active, onclick) {
      return el('button', { class: 'snapbtn' + (active ? ' on' : ''), text: label, onclick: onclick });
    }
    function setFilter(k, v) {
      receiptFilter[k] = receiptFilter[k] === v ? null : v;
      renderReceipts(el, host, list);
    }
    host.appendChild(el('p', { style: 'margin:0 0 10px;display:flex;gap:6px;flex-wrap:wrap;align-items:center' }, [
      el('span', { class: 'muted', style: 'font-size:12px', text: 'Show:' }),
      chip('All', !receiptFilter.category && !receiptFilter.runtime, function () { receiptFilter.category = null; receiptFilter.runtime = null; renderReceipts(el, host, list); }),
      chip('Operational', receiptFilter.category === 'OPERATIONAL', function () { setFilter('category', 'OPERATIONAL'); }),
      chip('Studio build', receiptFilter.category === 'BUILD', function () { setFilter('category', 'BUILD'); }),
      el('span', { class: 'muted', style: 'font-size:12px;margin-left:8px', text: 'Runtime:' }),
      chip('AI-assisted', receiptFilter.runtime === 'AI', function () { setFilter('runtime', 'AI'); }),
      chip('Deterministic', receiptFilter.runtime === 'DETERMINISTIC', function () { setFilter('runtime', 'DETERMINISTIC'); })
    ]));

    var filtered = R.filter(list, receiptFilter.category, receiptFilter.runtime);
    if ((receiptFilter.category || receiptFilter.runtime) && filtered.length !== list.length) {
      var fs = R.summarise(filtered);
      host.appendChild(el('p', { class: 'muted', style: 'margin:0 0 8px;font-size:12px', text:
        'Filtered: ' + fs.operations + ' operation' + (fs.operations === 1 ? '' : 's') + ' · ' +
        fs.knownTokens + ' tokens known' + (fs.unmetered ? ' · ' + fs.unmetered + ' unmetered' : '') }));
    }

    if (!filtered.length) {
      host.appendChild(el('p', { class: 'muted', text: list.length
        ? 'Nothing matches this filter.'
        : 'No operations recorded yet. Harness crawls, snapshot ingests and project saves will appear here as they happen.' }));
      return;
    }

    var shown = filtered.slice(0, 40);
    host.appendChild(el('table', { class: 'list' }, [
      el('thead', {}, [el('tr', {}, ['When', 'Category', 'Operation', 'Target', 'Duration', 'Runtime', 'Tokens', 'AI cost', 'Outcome'].map(function (h) { return el('th', { text: h }); }))]),
      el('tbody', {}, shown.map(function (r) {
        var det = null;
        var row = el('tr', { style: 'cursor:pointer', title: 'Click for the full receipt' }, [
          el('td', { style: 'white-space:nowrap', text: String(r.when).replace('T', ' ').slice(0, 19) }),
          el('td', {}, [el('span', {
            class: 'conf-chip' + (r.category === 'BUILD' ? ' parsed' : ' structural'),
            text: r.category === 'BUILD' ? 'BUILD' : 'OPERATIONAL'
          })]),
          el('td', {}, [el('b', { style: 'font-size:12px', text: r.operation || '' })]),
          el('td', { style: 'font-size:12px', text: r.target || '' }),
          el('td', { text: R.fmtDuration(r.durationMs) }),
          el('td', {}, [el('span', {
            class: 'conf-chip' + (r.aiInvoked ? '' : ' observed'),
            text: r.aiInvoked ? 'AI-ASSISTED' : 'DETERMINISTIC'
          })]),
          el('td', { text: typeof r.totalTokens === 'number' ? String(r.totalTokens) : 'unavailable' }),
          el('td', { text: r.aiCost == null ? '—' : String(r.aiCost) }),
          el('td', {}, [el('span', {
            class: 'conf-chip' + (/COMPLETE|VERIFIED/.test(r.outcome || '') ? ' observed' : ''),
            style: /FAIL/.test(r.outcome || '') ? 'background:#fdeaea;color:var(--danger)' : '',
            text: r.outcome || ''
          })])
        ]);
        row.addEventListener('click', function () {
          if (det) { det.remove(); det = null; return; }
          var c = Object.assign({}, r); delete c.raw;
          det = el('tr', {}, [el('td', { colspan: '9' }, [
            el('pre', { style: 'margin:0;font-size:10.5px;white-space:pre-wrap', text: JSON.stringify(r.raw || c, null, 1) })
          ])]);
          row.after(det);
        });
        return row;
      }))
    ]));
    if (filtered.length > shown.length) {
      host.appendChild(el('p', { class: 'muted', style: 'font-size:12px', text: shown.length + ' of ' + filtered.length + ' shown — download the full set below.' }));
    }
    host.appendChild(el('p', {}, [
      el('button', {
        class: 'btn', text: 'Download all (JSONL)',
        onclick: function () {
          var blob = new Blob([R.toJsonl(filtered)], { type: 'application/jsonl' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'studio-receipts.jsonl';
          a.click();
          URL.revokeObjectURL(a.href);
        }
      })
    ]));
  }

  /* ---- STORAGE: report the real state, never the intended one ---- */
  function storageSection(el) {
    var S = window.StudioStore;
    var host = el('div', { id: 'storageHost' });
    var node = el('div', {}, [host]);
    renderStorage(el, host);
    if (S && !S._state.probed) S.probe().then(function () { renderStorage(el, host); });
    return section(el, 'Storage', 'Where project data lives, and how durable that is.', node);
  }

  function renderStorage(el, host) {
    window.StudioDom.clear(host);
    var S = window.StudioStore;
    var h = S && S.health();
    var live = S && S.available();
    var bad = { 'SINGLE-COPY': 1, 'LOCAL-VERSIONS': 1 };
    var cls = !live ? 'bad-text' : (h.durability === 'OFF-MACHINE' ? 'ok-text' : 'warn-text');

    host.appendChild(el('p', { style: 'margin-top:0' }, [
      el('span', {
        class: 'conf-chip' + (live && h.durability === 'OFF-MACHINE' ? ' observed' : ''),
        style: live ? '' : 'background:#fdeaea;color:var(--danger)',
        text: live ? h.durability : 'STORE OFFLINE'
      }),
      document.createTextNode(' '),
      el('span', { class: cls, text: S ? S.durabilityLine() : 'store client not loaded' })
    ]));

    /* the sentence above is the whole story; the internals live below the fold */
    var rows = [
      ['Project source', !S ? 'unknown' : (S.source() === 'store' ? 'the private store (authoritative)'
        : S.source() === 'files' ? 'repository projects/ folder (fallback — the store is not running)'
          : 'not yet resolved')],
      ['Store root', live ? h.root : '—'],
      ['Inside the public repository?', live ? (h.insideRepository ? 'YES — this must be fixed' : 'no') : '—'],
      ['Projects held', live ? String(h.projects) : '—'],
      ['Previous versions kept', live ? String(h.versionsKept) : '—'],
      ['Private git repository', live ? (h.git.repo ? 'yes' : 'no') : '—'],
      ['Off-machine remote', live ? (h.git.remote || 'NONE — add one to get a backup') : '—'],
      ['Last commit', live && h.git.lastCommit ? h.git.lastCommit : '—']
    ];
    host.appendChild(el('details', {}, [
      el('summary', { style: 'cursor:pointer;font-size:12.5px;color:var(--text-dim)', text: 'Technical detail & how to add a backup' }),
      el('table', { class: 'list', style: 'max-width:760px;margin-top:8px' }, [
        el('tbody', {}, rows.map(function (r) {
          return el('tr', {}, [el('td', { text: r[0] }), el('td', { text: r[1] })]);
        }))
      ]),
      el('ul', { style: 'margin:10px 0 0;font-size:12.5px' }, [
        el('li', {}, [document.createTextNode('Start the store: '), el('code', { text: 'python apps/concerto-studio/store/store_server.py' })]),
        el('li', {}, [document.createTextNode('Get an off-machine copy: create a PRIVATE repo, then in the store root '),
          el('code', { text: 'git remote add origin <private-url> && git push -u origin main' })]),
        el('li', { text: 'Browser localStorage only mirrors the session; whichever source loaded wins on startup.' })
      ])
    ]));
    void bad;
  }

  window.StudioSettings = { render: render, ratified: ratified };
})();
