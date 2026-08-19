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

    /* Vanilla evolution */
    if (proj.vanillaEvolution && proj.vanillaEvolution.length) {
      page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
        el('h3', { text: 'Vanilla evolution (this project’s baseline vs older Labs Vanilla)' }),
        el('ul', {}, proj.vanillaEvolution.map(function (x) { return el('li', { text: x }); }))
      ]));
    }

    /* snapshot timeline — every capture, time-and-date stamped */
    var SS = window.StudioSnapshots;
    var entries = SS ? SS.list(proj) : [];
    if (entries.length) {
      var selected = SS.selectedEntry(proj);
      page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
        el('h3', { text: 'Snapshot timeline (' + entries.length + ')' }),
        el('p', { class: 'muted', style: 'margin-top:0;font-size:12px', text: 'Click a stamp to render that capture in every view. Turn on “Changes only” in the context bar to ring what moved since the capture before it.' }),
        el('table', { class: 'list' }, [
          el('thead', {}, [el('tr', {}, ['Captured', 'Label', 'How', 'Ingested'].map(function (h) { return el('th', { text: h }); }))]),
          el('tbody', {}, entries.map(function (s) {
            var rec = SS._cache['projects/' + proj.key + '/' + s.path];
            var counts = rec && rec.record.meta.counts;
            return el('tr', {
              style: 'cursor:pointer',
              class: selected && selected.id === s.id ? 'row-on' : '',
              onclick: function () {
                SS.select(proj.key, s.id);
                location.hash = '#diagram';
              }
            }, [
              el('td', {}, [
                el('b', { text: SS.formatStamp(s.capturedAt) }),
                s.precision === 'date' ? el('small', { class: 'muted', text: ' (time not recorded)' }) : null
              ]),
              el('td', { text: s.label || '' }),
              el('td', { style: 'font-size:12px', text: s.source || '' }),
              el('td', { style: 'font-size:12px', text: counts
                ? (counts.statuses + ' statuses · ' + counts.actions + ' actions · ' + counts.availability + ' availability edges')
                : 'not loaded' })
            ]);
          }))
        ]),
        el('p', { class: 'muted', style: 'font-size:12px', text: 'Snapshot files live under this project’s private folder (git-ignored). ' + (proj.receipts ? 'Full receipts: ' + proj.receipts : '') })
      ]));

      /* how the selected capture was turned into a model */
      var srec = SS.recordFor(proj);
      var rep = srec && srec.meta && srec.meta.ingestReport;
      if (rep) {
        page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
          el('h3', { text: 'How this capture was read' }),
          el('p', { class: 'muted', style: 'margin-top:0;font-size:12px', text: rep.crawlMethod || '' }),
          el('p', { style: 'font-size:12px' }, [
            document.createTextNode('Captured fields: '),
            el('code', { text: rep.capturedActionFields.join(', ') }),
            document.createTextNode('. NOT captured by this crawl (so never compared, never shown as a deviation): '),
            el('code', { text: rep.notCaptured.join(', ') }),
            document.createTextNode('.')
          ]),
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
