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

  function section(el, title, note, node) {
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
    page.appendChild(section(el, 'Studio', 'Application, model and local storage status.',
      el('table', { class: 'list', style: 'max-width:720px' }, [el('tbody', {}, [
        el('tr', {}, [el('td', { text: 'Canonical model version' }), el('td', { text: 'v' + model.meta.modelVersion + ' · loaded read-only from ../../model/*.json' })]),
        el('tr', {}, [el('td', { text: 'Fidelity invariants' }), el('td', {}, [el('span', { class: failing.length ? 'bad-text' : 'ok-text', style: 'font-weight:600', text: failing.length ? '✘ ' + failing.length + ' failing' : '✔ ' + (invariants || []).length + '/' + (invariants || []).length + ' pass' })])]),
        el('tr', {}, [el('td', { text: 'Harness' }), el('td', {}, [document.createTextNode('read-only by construction (write capability false) · '), el('code', { text: 'apps/concerto-studio/harness/server.py' })])]),
        el('tr', {}, [el('td', { text: 'Projects loaded' }), el('td', { text: projects.length + ' (from the durable project files)' })])
      ])])
    ));

    /* ---- VANILLA BASELINES (registry) ---- */
    var registry = el('table', { class: 'list' }, [
      el('thead', {}, [el('tr', {}, ['Baseline', 'Ratified', 'Fingerprints', 'Source', 'Notes'].map(function (h) { return el('th', { text: h }); }))]),
      el('tbody', {}, [
        el('tr', {}, [
          el('td', {}, [el('b', { text: 'Current (' + model.meta.generatedAt.helpdesk + ')' }), document.createTextNode(' '), el('span', { class: 'conf-chip observed', text: 'active' })]),
          el('td', {}, [el('input', { type: 'date', value: ratified(), style: 'font:inherit;padding:3px 6px;border:1px solid var(--border-strong);border-radius:5px', onchange: function (e) { setRatified(e.target.value); } })]),
          el('td', {}, [el('code', { text: 'hd:' + model.meta.sourceFingerprints.helpdesk }), document.createTextNode(' '), el('code', { text: 'ord:' + model.meta.sourceFingerprints.orders })]),
          el('td', { text: 'Labs discovery deployment' }),
          el('td', { style: 'font-size:12px', text: 'The Labs model baseline. Set the ratified date when this version is adopted as the standard.' })
        ]),
        el('tr', {}, [
          el('td', { text: 'Newer project deployments' }),
          el('td', { text: '—' }),
          el('td', { text: 'per-project' }),
          el('td', { text: 'captured at project Day-One' }),
          el('td', { style: 'font-size:12px', text: 'Vanilla is versioned — newer deployments differ (e.g. Orders re-seeded, 11 supplier actions not 13, healthier Quote/Business Case engines). Each project records the baseline it started from; Compare can show older → newer. See docs/VANILLA-VERSIONING.md.' })
        ])
      ])
    ]);
    page.appendChild(section(el, 'Vanilla baselines', 'Vanilla is the standard Concerto product — a versioned reference, not a project. Projects reference the baseline they started from.', registry));

    /* ---- VANILLA / GENERIC EVIDENCE ---- */
    var rows = model.evidenceIndex.map(function (e) {
      return '<tr><td><code>' + esc(e.id) + '</code></td><td>' + esc(e.description) + '</td><td><code>' + esc(e.path) + '</code></td><td>' + esc(e.capturedAt) + '</td></tr>';
    }).join('');
    page.appendChild(section(el, 'Vanilla & generic evidence',
      'Discovery evidence, model provenance and generic Concerto findings behind the Vanilla baseline. Project-specific evidence lives with each project (open a project → Evidence).',
      el('div', {}, [
        el('table', { class: 'list', style: 'margin-bottom:14px', html: '<thead><tr><th>ID</th><th>Description</th><th>Path</th><th>Captured</th></tr></thead><tbody>' + rows + '</tbody>' }),
        el('details', {}, [
          el('summary', { style: 'cursor:pointer;font-size:13px;color:var(--text-dim)', text: 'Vanilla model, domain stats & generic findings' }),
          (function () { var h = el('div', { style: 'margin-top:10px' }); if (window.StudioOverview) window.StudioOverview.render(h, model, invariants); return h; })()
        ])
      ])
    ));

    /* ---- STORAGE ---- */
    page.appendChild(section(el, 'Storage',
      'Where project data lives.',
      el('ul', { style: 'margin:0;font-size:13px' }, [
        el('li', {}, [document.createTextNode('Durable project files (source of truth): '), el('code', { text: 'apps/concerto-studio/projects/<key>/' }), document.createTextNode(' — git-ignored, so customer data never enters the public Labs repo.')]),
        el('li', { text: 'Browser localStorage mirrors the files for the running session; the files win on load.' }),
        el('li', { class: 'warn-text', text: 'REQUIREMENT (not yet built): a durable PRIVATE backend/backup for project data — git-ignored must not mean "one laptop, no backup". See apps/concerto-studio/docs/ARCHITECTURE.md.' })
      ])
    ));
  }

  window.StudioSettings = { render: render, ratified: ratified };
})();
