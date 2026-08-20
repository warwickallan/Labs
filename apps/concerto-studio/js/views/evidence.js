/* evidence.js — PROJECT evidence (top-bar view). Shows the SELECTED
 * project's own history: crawls/snapshots, change receipts, findings,
 * before/after, Vanilla-evolution, customer decisions — plus the
 * connect/crawl controls to gather more. This is distinct from the
 * Vanilla/generic evidence, which lives in Settings. The two never mix.
 */
(function () {
  'use strict';

  function render(container, vanilla) {
    var el = window.StudioDom.el;
    window.StudioDom.clear(container);
    var P = window.StudioProject;
    var proj = P ? P.current() : null;

    if (!proj) {
      container.appendChild(el('div', { class: 'page' }, [
        el('div', { class: 'stub' }, [
          el('h3', { text: 'Project evidence' }),
          el('p', { text: 'Project evidence — crawls, snapshots, change receipts, findings, before/after, customer decisions — appears when a project is open. Select a project in the top bar.' }),
          el('p', {}, [
            document.createTextNode('Vanilla / generic evidence lives in '),
            el('a', { href: '#settings', text: 'Settings' }),
            document.createTextNode('.')
          ])
        ])
      ]));
      return;
    }

    var page = el('div', { class: 'page' });
    container.appendChild(page);

    /* change receipts */
    var changes = proj.changeLog || [];
    page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
      el('h3', { text: 'Change receipts (' + changes.length + ')' }),
      changes.length ? el('table', { class: 'list' }, [
        el('thead', {}, [el('tr', {}, ['When', 'Ref', 'Object', 'Change', 'Outcome'].map(function (h) { return el('th', { text: h }); }))]),
        el('tbody', {}, changes.map(function (c) {
          return el('tr', {}, [
            el('td', { text: c.at || '' }),
            el('td', {}, [el('code', { text: c.id || '' })]),
            el('td', { text: c.object || '' }),
            el('td', { style: 'font-size:12px', text: c.field ? (c.field + ': ' + JSON.stringify(c.before) + ' → ' + JSON.stringify(c.after)) : (c.fields || '') }),
            el('td', {}, [el('span', { class: 'conf-chip' + (/PASS/.test(c.outcome || '') ? ' observed' : ''), text: c.outcome || '' })])
          ]);
        }))
      ]) : el('p', { class: 'muted', text: 'No changes applied to this project yet.' })
    ]));

    /* findings summary (from the durable record) */
    var fs = proj.findingsSummary;
    if (fs) {
      function list(title, arr, cls) {
        return arr && arr.length ? el('div', { class: 'insp-sec' }, [
          el('h4', { text: title }),
          el('ul', {}, arr.map(function (x) { return el('li', { class: cls || '', text: x }); }))
        ]) : null;
      }
      page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
        el('h3', { text: 'Findings' }),
        list('Resolved', fs.resolved, 'ok-text'),
        list('Confirmed not-defects (engine-driven / by-design)', fs.notDefects),
        list('Customer decisions pending', fs.customerDecisions, 'warn-text'),
        list('Review notes', fs.reviewNotes)
      ]));
    }

    /* Consultant findings — facts observed in the instance by AI inspection,
       each carrying its acquisition method and confidence separately */
    if (proj.aiFindings && proj.aiFindings.length) {
      page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
        el('h3', { text: 'Consultant findings' }),
        el('div', {}, proj.aiFindings.map(function (f) {
          return el('div', { style: 'margin:10px 0;padding:10px;background:var(--surface-2);border-radius:6px' }, [
            el('div', {}, [
              el('b', { text: f.id + ' — ' + f.title }),
              el('span', { class: 'conf-chip', style: 'margin-left:8px', text: f.severity || 'OBSERVATION' })
            ]),
            el('p', { style: 'margin:6px 0;font-size:12.5px', text: f.detail || '' }),
            f.resolution ? el('p', { style: 'margin:6px 0;font-size:12.5px' }, [
              el('b', { text: 'Round 2: ' }), document.createTextNode(f.resolution)
            ]) : null,
            el('p', { class: 'muted', style: 'font-size:11.5px;margin:0', text:
              (f.confidence || '') + ' · acquired by ' + (f.acquiredBy || '?') + ' · ' + (f.recordedAt || '') })
          ]);
        }))
      ]));
    }

    /* Customer decisions raised by this engagement */
    if (proj.decisions && proj.decisions.length) {
      page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
        el('h3', { text: 'Decisions needed from the customer' }),
        el('div', {}, proj.decisions.map(function (d) {
          return el('div', { style: 'margin:10px 0;padding:10px;background:var(--surface-2);border-radius:6px' }, [
            el('b', { text: d.id + ' — ' + d.question }),
            d.recommendation ? el('p', { style: 'margin:6px 0;font-size:12.5px' }, [
              el('b', { text: 'Recommendation: ' }), document.createTextNode(d.recommendation)
            ]) : null,
            d.settledBy ? el('p', { class: 'muted', style: 'font-size:12px;margin:0', text: 'Settled by: ' + d.settledBy }) : null
          ]);
        }))
      ]));
    }

    /* Work summaries — what was done to this project, written for Warwick */
    if (proj.workSummaries && proj.workSummaries.length) {
      page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
        el('h3', { text: 'Work summaries' }),
        el('div', {}, proj.workSummaries.slice().reverse().map(function (w) {
          return el('details', { style: 'margin:8px 0', open: w === proj.workSummaries[proj.workSummaries.length - 1] ? 'open' : null }, [
            el('summary', {}, [el('b', { text: w.title }), el('span', { class: 'muted', text: '  · ' + (w.at || '') })]),
            el('div', { style: 'font-size:12.5px;white-space:pre-wrap;padding:8px 4px 0', text: w.text })
          ]);
        }))
      ]));
    }

    /* Vanilla evolution */
    if (proj.vanillaEvolution && proj.vanillaEvolution.length) {
      page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
        el('h3', { text: 'Vanilla evolution (this project’s baseline vs older Labs Vanilla)' }),
        el('ul', {}, proj.vanillaEvolution.map(function (x) { return el('li', { text: x }); }))
      ]));
    }

    /* HISTORY — every capture, time-and-date stamped. Normal use never
     * needs this: the project's views simply show its current state.
     * From here a past capture can be viewed temporarily (the shell shows
     * a banner and a Return-to-current), or its changes displayed. */
    var SS = window.StudioSnapshots;
    var entries = SS ? SS.list(proj) : [];
    if (entries.length) {
      var viewingNow = SS.viewing(proj);
      page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
        el('h3', { text: 'History (' + entries.length + ')' }),
        el('p', { class: 'muted', style: 'margin-top:0;font-size:12px', text: 'The project’s views always show its current configuration. From here you can look back: view a past capture, or see what changed between captures.' }),
        el('table', { class: 'list' }, [
          el('thead', {}, [el('tr', {}, ['Captured', 'What', 'How', 'Holds', ''].map(function (h) { return el('th', { text: h }); }))]),
          el('tbody', {}, entries.map(function (s) {
            var rec = SS.entryRecord(proj, s);
            var counts = rec && rec.meta && rec.meta.counts;
            var isViewing = viewingNow && viewingNow.id === s.id;
            var isCurrent = s.role === 'current';
            return el('tr', { class: isViewing ? 'row-on' : '' }, [
              el('td', {}, [
                el('b', { text: SS.formatStamp(s.capturedAt) }),
                s.precision === 'date' ? el('small', { class: 'muted', text: ' (time not recorded)' }) : null
              ]),
              el('td', {}, [
                document.createTextNode(s.label || ''),
                isCurrent ? el('span', { class: 'conf-chip observed', style: 'margin-left:6px', text: 'current' }) : null
              ]),
              el('td', { style: 'font-size:12px', text: s.source || '' }),
              el('td', { style: 'font-size:12px', text: counts
                ? (counts.statuses + ' statuses · ' + counts.actions + ' actions')
                : (rec ? 'loaded' : 'not loaded') }),
              el('td', {}, [
                rec && !isCurrent ? el('button', {
                  class: 'btn', text: isViewing ? 'Viewing…' : 'View',
                  title: 'Temporarily show this capture in the views (a banner offers Return to current)',
                  onclick: function () { SS.setMode('full'); SS.setView(proj.key, s.id); location.hash = '#diagram'; }
                }) : null,
                document.createTextNode(' '),
                rec ? el('button', {
                  class: 'btn', text: 'View changes',
                  title: 'Ring what moved since the capture before this one, with a written summary',
                  onclick: function () { SS.select(proj.key, s.id); SS.setView(proj.key, s.id); SS.setMode('changes'); location.hash = '#diagram'; }
                }) : null
              ])
            ]);
          }))
        ]),
        el('p', { class: 'muted', style: 'font-size:12px', text: 'Snapshot files live in the private project store. ' + (proj.receipts ? 'Full receipts: ' + proj.receipts : '') })
      ]));

      /* how the selected capture was turned into a model */
      var srec = SS.recordFor(proj);
      var rep = srec && srec.meta && srec.meta.ingestReport;
      if (rep) {
        page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
          el('h3', { text: 'How this capture was read' }),
          el('p', { class: 'muted', style: 'margin-top:0;font-size:12px', text: rep.crawlMethod || '' }),
          /* A field-limited crawl lists what it read; a full discovery
           * capture has no such limit and must not pretend to one. */
          (rep.capturedActionFields && rep.capturedActionFields.length)
            ? el('p', { style: 'font-size:12px' }, [
              document.createTextNode('Captured fields: '),
              el('code', { text: rep.capturedActionFields.join(', ') }),
              document.createTextNode('. NOT captured by this crawl (so never compared, never shown as a deviation): '),
              el('code', { text: (rep.notCaptured || []).join(', ') }),
              document.createTextNode('.')
            ])
            : el('p', { style: 'font-size:12px', text: 'Full configuration capture — no per-field limit recorded for this acquisition.' }),
          (rep.knownDeltas && rep.knownDeltas.length) ? el('div', {}, [
            el('h4', { class: 'warn-text', text: 'Known to have changed since this capture (' + rep.knownDeltas.length + ')' }),
            el('ul', {}, rep.knownDeltas.map(function (d) {
              return el('li', { style: 'font-size:12px', text: d.kind + ' · ' + d.object + ' — ' + d.detail });
            }))
          ]) : null,
          (rep.appliedChanges && rep.appliedChanges.length) ? el('div', {}, [
            el('h4', { text: 'Verified changes applied to build this state (' + rep.appliedChanges.length + ')' }),
            el('ul', {}, rep.appliedChanges.map(function (c) {
              return el('li', { style: 'font-size:12px' }, [
                el('code', { text: c.ref || '' }),
                document.createTextNode(' ' + c.object + ' · ' + c.field + ': ' +
                  JSON.stringify(c.from) + ' → ' + JSON.stringify(c.to))
              ]);
            }))
          ]) : null,
          rep.unresolved.length ? el('div', {}, [
            el('h4', { class: 'warn-text', text: 'Unresolved in the source (' + rep.unresolved.length + ')' }),
            el('ul', {}, rep.unresolved.map(function (u) {
              return el('li', { style: 'font-size:12px', text: u.item + ' — ' + u.reason });
            }))
          ]) : el('p', { class: 'ok-text', style: 'font-size:12px', text: 'Nothing in this capture was left unresolved.' }),
          rep.resolutions.length ? el('details', {}, [
            el('summary', { text: 'Abbreviations expanded and how (' + rep.resolutions.length + ')' }),
            el('ul', {}, rep.resolutions.map(function (r) {
              return el('li', { style: 'font-size:12px', text: r.item + ': “' + r.from + '” → ' + r.to + ' (' + r.how + ')' });
            }))
          ]) : null,
          rep.notes.length ? el('details', {}, [
            el('summary', { text: 'Reading notes (' + rep.notes.length + ')' }),
            el('ul', {}, rep.notes.map(function (n) { return el('li', { style: 'font-size:12px', text: n }); }))
          ]) : null,
          Object.keys(rep.statusFlags || {}).length ? el('details', {}, [
            el('summary', { text: 'Record-level status flags observed (' + Object.keys(rep.statusFlags).length + ' statuses)' }),
            el('ul', {}, Object.keys(rep.statusFlags).map(function (n) {
              return el('li', { style: 'font-size:12px', text: n + ': ' + (rep.statusFlags[n].join(', ') || '(none ticked)') });
            }))
          ]) : null
        ]));
      }
    }

    /* connect / crawl — gather more evidence (read-only harness) */
    page.appendChild(el('div', { class: 'tile' }, [
      el('h3', { text: 'Crawl & connect (read-only)' }),
      el('p', { class: 'muted', style: 'margin-top:0', text: 'Connect to this project’s instance and crawl it read-only to capture a fresh snapshot. The harness never enters credentials; a human signs in.' }),
      (function () { var host = el('div', {}); window.StudioInstance.render(host, vanilla); return host; })()
    ]));
  }

  window.StudioProjectEvidence = { render: render };
})();
