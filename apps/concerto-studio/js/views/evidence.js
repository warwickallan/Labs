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

    /* snapshots */
    if (proj.snapshots && proj.snapshots.length) {
      page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
        el('h3', { text: 'Snapshots' }),
        el('table', { class: 'list' }, [
          el('thead', {}, [el('tr', {}, ['Snapshot', 'Label', 'Path'].map(function (h) { return el('th', { text: h }); }))]),
          el('tbody', {}, proj.snapshots.map(function (s) {
            return el('tr', {}, [el('td', {}, [el('code', { text: s.id })]), el('td', { text: s.label || '' }), el('td', {}, [el('code', { text: s.path || '' })])]);
          }))
        ]),
        el('p', { class: 'muted', style: 'font-size:12px', text: 'Snapshot files live under this project’s private folder (git-ignored). ' + (proj.receipts ? 'Full receipts: ' + proj.receipts : '') })
      ]));
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
