/* app.js — routing, model loading, shell wiring. The only file that owns
 * global DOM state. Views receive (container, model) and render themselves.
 */
(function () {
  'use strict';

  var app = {
    model: null,
    invariants: [],
    loadError: null
  };
  window.StudioApp = app; /* test hook */

  var PAGES = {
    'overview': { title: 'Overview' },
    'vanilla-diagram': { title: 'Vanilla · Workflow Diagram' },
    'vanilla-map': { title: 'Vanilla · Action Map' },
    'vanilla-matrix': { title: 'Vanilla · Matrix' },
    'vanilla-config': { title: 'Vanilla · Configuration' },
    'instance': { title: 'Instance' },
    'compare': { title: 'Compare' },
    'findings': { title: 'Findings' },
    'design': { title: 'Design' },
    'solution-design': { title: 'Solution Design' },
    'build': { title: 'Build' },
    'evidence': { title: 'Evidence' },
    'settings': { title: 'Settings & Connection' }
  };

  var STUBS = {
    'settings': 'Instance URL and connection live on the Instance page. This page will hold harness-adapter settings (service endpoint, session detection) once the adapter exists — a human signs in; the Studio never enters credentials.'
  };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function currentPage() {
    var h = (location.hash || '#overview').slice(1);
    return PAGES[h] ? h : 'overview';
  }

  function renderStub(container, pageId) {
    var el = window.StudioDom.el;
    window.StudioDom.clear(container);
    container.appendChild(el('div', { class: 'page' }, [
      el('div', { class: 'stub' }, [
        el('h3', { text: PAGES[pageId].title }),
        el('p', { text: STUBS[pageId] || 'Planned.' }),
        el('p', { class: 'muted', text: 'Honest stub — this section is designed but not yet built.' })
      ])
    ]));
  }

  function renderEvidence(container) {
    var el = window.StudioDom.el;
    window.StudioDom.clear(container);
    var rows = app.model.evidenceIndex.map(function (e) {
      return '<tr><td><code>' + esc(e.id) + '</code></td><td>' + esc(e.description) + '</td>' +
        '<td><code>' + esc(e.path) + '</code></td><td>' + esc(e.capturedAt) + '</td></tr>';
    }).join('');
    container.appendChild(el('div', { class: 'page' }, [
      el('p', { class: 'muted', text: 'Evidence index carried by the canonical Helpdesk model. Paths resolve inside the Labs repository. Crawls, builds and receipts will join this section later.' }),
      el('table', { class: 'list', html: '<thead><tr><th>ID</th><th>Description</th><th>Path</th><th>Captured</th></tr></thead><tbody>' + rows + '</tbody>' })
    ]));
  }

  function route() {
    var pageId = currentPage();
    document.getElementById('pageTitle').textContent = PAGES[pageId].title;
    document.querySelectorAll('#sidenav a').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-page') === pageId);
    });
    var content = document.getElementById('content');
    window.StudioInspector.close();

    if (app.loadError) {
      content.innerHTML = '<div class="page"><div class="stub"><h3>Cannot load canonical models</h3><p>' +
        esc(app.loadError) + '</p><p>Serve the Labs repository root (Start Studio.bat) so ../../model/*.json is reachable.</p></div></div>';
      return;
    }
    if (!app.model) { content.innerHTML = '<div class="page"><p class="muted">Loading canonical models…</p></div>'; return; }

    switch (pageId) {
      case 'overview': window.StudioOverview.render(content, app.model, app.invariants); break;
      case 'vanilla-diagram': window.StudioDiagram.render(content, app.model); break;
      case 'vanilla-map': window.StudioActionMap.render(content, app.model); break;
      case 'vanilla-matrix': window.StudioGrid.render(content, app.model); break;
      case 'vanilla-config': window.StudioConfig.render(content, app.model); break;
      case 'design': window.StudioDesign.render(content, app.model); break;
      case 'findings': window.StudioFindings.render(content, app.model); break;
      case 'compare': window.StudioCompare.render(content, app.model); break;
      case 'solution-design': window.StudioSolutionDesignView.render(content, app.model); break;
      case 'instance': window.StudioInstance.render(content); break;
      case 'build': window.StudioBuild.render(content, app.model); break;
      case 'evidence': renderEvidence(content); break;
      default: renderStub(content, pageId);
    }
  }

  function updateChips() {
    var chip = document.getElementById('srcChip');
    var foot = document.getElementById('navFoot');
    if (app.loadError) {
      chip.className = 'src-chip bad';
      chip.innerHTML = '<b>✘</b> models failed to load';
      return;
    }
    var failing = app.invariants.filter(function (c) { return !c.pass; }).length;
    chip.className = 'src-chip' + (failing ? ' bad' : '');
    chip.innerHTML = failing
      ? '<b>✘</b> ' + failing + ' fidelity invariant(s) failing'
      : '<b>✔</b> Vanilla loaded · invariants ' + app.invariants.length + '/' + app.invariants.length;
    foot.textContent = 'Vanilla ' + app.model.meta.generatedAt.helpdesk +
      ' · hd:' + app.model.meta.sourceFingerprints.helpdesk +
      ' · ord:' + app.model.meta.sourceFingerprints.orders;
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.addEventListener('hashchange', route);
    route();
    window.VanillaLoader.loadAll('../../model/')
      .then(function (res) {
        app.model = res.model;
        app.invariants = res.invariants;
        updateChips();
        route();
      })
      .catch(function (err) {
        app.loadError = String(err.message || err);
        updateChips();
        route();
      });
  });
})();
