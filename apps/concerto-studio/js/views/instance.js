/* instance.js — INSTANCE: target-instance connection, crawl controls and
 * snapshot history. Honest about capability: the harness adapter does not
 * exist yet, so Connect/Crawl report that instead of pretending. The URL
 * and the snapshot model are real and persist.
 */
(function () {
  'use strict';

  var URL_KEY = 'concerto-studio-instance-url';

  function render(container) {
    var el = window.StudioDom.el;
    window.StudioDom.clear(container);
    var page = el('div', { class: 'page' });
    container.appendChild(page);

    var savedUrl = '';
    try { savedUrl = localStorage.getItem(URL_KEY) || ''; } catch (e) { /* */ }

    var urlInput = el('input', {
      type: 'text', value: savedUrl,
      placeholder: 'https://customer.concertodemo.co.uk',
      style: 'font:inherit;font-size:13px;padding:7px 12px;border:1px solid var(--border-strong);border-radius:6px;width:420px',
      onchange: function (ev) {
        try { localStorage.setItem(URL_KEY, ev.target.value.trim()); } catch (e) { /* */ }
      }
    });

    var statusLine = el('span', { class: 'src-chip', html: '<b>●</b> disconnected — harness adapter not built' });

    page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
      el('h3', { text: 'Target instance' }),
      el('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' }, [
        urlInput,
        el('button', {
          class: 'btn', text: 'Connect (read-only)',
          onclick: function () {
            var url = urlInput.value.trim();
            if (!url) return void window.alert('Enter the instance URL first.');
            window.StudioHarness.probe().then(function (p) {
              window.alert('Cannot connect: ' + p.reason + '\n\nWhen the adapter exists, the first connection will be strictly read-only: a human signs in inside the harness browser (the Studio never enters credentials), the harness fingerprints the Concerto build, verifies access, and only then may a crawl be started.');
            });
          }
        }),
        el('button', { class: 'btn', text: 'Crawl', disabled: 'disabled', title: 'Requires a read-only connection first' }),
        el('button', { class: 'btn', text: 'Refresh', disabled: 'disabled', title: 'Requires a previous crawl' }),
        statusLine
      ]),
      el('ul', { class: 'muted', style: 'font-size:12.5px;margin-top:12px' }, [
        el('li', { text: 'First connection is READ-ONLY; a human signs in — the Studio never enters credentials.' }),
        el('li', { text: 'A crawl produces an ACTUAL-INSTANCE snapshot (same normalised shape as the Vanilla model) plus a canonicalKey → GUID identity map for that environment.' }),
        el('li', { text: 'Compare then runs the same diff engine: instance vs Vanilla = Added / Removed / Modified / Unchanged; a customer becomes describable as Vanilla + explicit deviations.' }),
        el('li', { text: 'Snapshots and identity maps are Studio-local (git-ignored) — instance data never enters the public repository.' })
      ])
    ]));

    var snaps = window.StudioHarness.snapshots.list();
    page.appendChild(el('div', { class: 'tile' }, [
      el('h3', { text: 'Snapshot history' }),
      snaps.length
        ? el('table', { class: 'list' }, [
            el('thead', {}, [el('tr', {}, ['Captured', 'Instance', 'Status'].map(function (h) { return el('th', { text: h }); }))]),
            el('tbody', {}, snaps.map(function (s) {
              return el('tr', {}, [el('td', { text: s.capturedAt }), el('td', { text: s.url }), el('td', { text: s.status })]);
            }))
          ])
        : el('p', { class: 'muted', text: 'No snapshots yet — crawling requires the harness adapter.' })
    ]));
  }

  window.StudioInstance = { render: render };
})();
