/* app.js — routing, model loading, shell wiring. The only file that owns
 * global DOM state.
 *
 * Information architecture (2026-08-19, project-centric):
 *  - Left nav: PROJECTS and SETTINGS only.
 *  - VANILLA is the versioned standard-product reference, held in SETTINGS
 *    (baseline registry + ratified date + Vanilla evidence). Not a project.
 *  - Top-bar VIEWS operate on the SELECTED PROJECT (or the Vanilla baseline
 *    when none is open): Diagram · Action Map · Matrix · Configuration ·
 *    Design · Solution Design · Evidence.
 *  - DESIGN hosts the design workflow as internal tabs: Edit · Compare ·
 *    Findings · Build. BUILD is a function of Design, not a destination.
 *  - EVIDENCE (top bar) is PROJECT evidence (crawls, snapshots, changes,
 *    findings, receipts, connect/crawl). Vanilla/generic evidence is in
 *    Settings. The two never mix.
 */
(function () {
  'use strict';

  var app = { model: null, invariants: [], instance: null, loadError: null };
  window.StudioApp = app; /* test hook */

  var PAGES = { 'projects': 'Projects', 'settings': 'Settings' };

  /* the model the read-only views render for the current context */
  function ctxModel() {
    var p = currentProject();
    if (p && p.instance && p.instance.model) return p.instance.model;
    return app.model; /* Vanilla reference when a project has no ingested crawl */
  }
  function currentProject() { return window.StudioProject ? window.StudioProject.current() : null; }

  var VIEWS = [
    { id: 'diagram', label: 'Diagram', ctx: true, render: function (c) { window.StudioDiagram.render(c, ctxModel()); } },
    { id: 'map', label: 'Action Map', ctx: true, render: function (c) { window.StudioActionMap.render(c, ctxModel()); } },
    { id: 'matrix', label: 'Matrix', ctx: true, render: function (c) { window.StudioGrid.render(c, ctxModel()); } },
    { id: 'config', label: 'Configuration', ctx: true, render: function (c) { window.StudioConfig.render(c, ctxModel()); } },
    { id: 'design', label: 'Design', render: function (c) { window.StudioDesign.render(c, app.model); } },
    { id: 'solution-design', label: 'Solution Design', render: function (c) { window.StudioSolutionDesignView.render(c, app.model); } },
    { id: 'evidence', label: 'Evidence', render: function (c) { window.StudioProjectEvidence.render(c, app.model); } }
  ];
  function viewById(id) { return VIEWS.filter(function (v) { return v.id === id; })[0]; }

  function currentRoute() {
    var h = (location.hash || '#projects').slice(1);
    if (PAGES[h]) return { kind: 'page', id: h };
    if (viewById(h)) return { kind: 'view', id: h };
    return { kind: 'page', id: 'projects' };
  }

  function setContext(val) {
    if (val === 'vanilla') { if (window.StudioProject) window.StudioProject.close(); app.instance = null; }
    else if (window.StudioProject) { window.StudioProject.open(val); }
    route();
  }

  function renderContextSelect() {
    var wrap = document.getElementById('ctxWrap');
    var sel = document.getElementById('ctxSelect');
    var r = currentRoute();
    wrap.hidden = r.kind !== 'view';
    if (r.kind !== 'view') return;
    var cur = currentProject();
    var curVal = cur ? cur.key : 'vanilla';
    var opts = [{ v: 'vanilla', t: 'Vanilla baseline' }];
    if (window.StudioProject) window.StudioProject.list().forEach(function (p) { opts.push({ v: p.key, t: p.name }); });
    sel.innerHTML = '';
    opts.forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o.v; opt.textContent = o.t;
      if (o.v === curVal) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.onchange = function () { setContext(sel.value); };
  }

  /* enriched context bar: instance URL · baseline Vanilla · current snapshot */
  function renderContextInfo() {
    var bar = document.getElementById('ctxInfo');
    var r = currentRoute();
    var p = currentProject();
    if (r.kind !== 'view' || !p) { bar.hidden = true; bar.innerHTML = ''; return; }
    bar.hidden = false;
    var baseDate = '';
    try { baseDate = (window.StudioSettings && window.StudioSettings.ratified && window.StudioSettings.ratified()) || app.model.meta.generatedAt.helpdesk; } catch (e) { baseDate = app.model.meta.generatedAt.helpdesk; }
    var snap = (p.instance && p.instance.meta && p.instance.meta.crawledAt) || p.lastCrawlAt || '—';
    var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    bar.innerHTML =
      '<span class="ci-name">' + esc(p.name) + '</span>' +
      '<span class="ci-item">Instance: <a href="' + esc(p.instanceUrl) + '" target="_blank" rel="noopener">' + esc(p.instanceUrl || '—') + '</a></span>' +
      '<span class="ci-item">Baseline Vanilla: ' + esc(baseDate) + '</span>' +
      '<span class="ci-item">Current snapshot: ' + esc(snap) + '</span>' +
      '<span class="ci-item">Changes: ' + ((p.changeLog || []).length) + '</span>';
  }

  function renderViewBar() {
    var bar = document.getElementById('viewbar');
    var r = currentRoute();
    bar.hidden = r.kind !== 'view';
    if (r.kind !== 'view') { bar.innerHTML = ''; return; }
    bar.innerHTML = '';
    VIEWS.forEach(function (v) {
      var b = document.createElement('button');
      b.className = 'viewbtn' + (v.id === r.id ? ' on' : '');
      b.textContent = v.label;
      b.onclick = function () { location.hash = '#' + v.id; };
      bar.appendChild(b);
    });
    var p = currentProject();
    if (p && !(p.instance && p.instance.model) && viewById(r.id).ctx) {
      var note = document.createElement('span');
      note.className = 'viewbar-note';
      note.textContent = 'No crawl ingested for ' + p.name + ' — showing Vanilla baseline for reference.';
      bar.appendChild(note);
    }
  }

  function route() {
    var r = currentRoute();
    document.getElementById('pageTitle').textContent =
      r.kind === 'page' ? PAGES[r.id] : (currentProject() ? currentProject().name + ' · ' + viewById(r.id).label : 'Vanilla · ' + viewById(r.id).label);
    document.querySelectorAll('#sidenav a').forEach(function (a) {
      a.classList.toggle('active', r.kind === 'page' && a.getAttribute('data-page') === r.id);
    });
    updateProjectChip();
    renderContextSelect();
    renderContextInfo();
    renderViewBar();
    var content = document.getElementById('content');
    window.StudioInspector.close();

    if (app.loadError) {
      content.innerHTML = '<div class="page"><div class="stub"><h3>Cannot load canonical models</h3><p>' +
        String(app.loadError) + '</p><p>Serve the Labs repository root (Start Studio.bat) so ../../model/*.json is reachable.</p></div></div>';
      return;
    }
    if (!app.model) { content.innerHTML = '<div class="page"><p class="muted">Loading canonical models…</p></div>'; return; }

    if (r.kind === 'page' && r.id === 'projects') { window.StudioProjects.render(content, app.model); return; }
    if (r.kind === 'page' && r.id === 'settings') { window.StudioSettings.render(content, app.model, app.invariants); return; }
    viewById(r.id).render(content);
  }

  function updateProjectChip() {
    var chip = document.getElementById('projectChip');
    if (!chip) return;
    var cur = currentProject();
    chip.className = 'project-chip' + (cur ? '' : ' empty');
    chip.textContent = cur ? 'Project: ' + cur.name : 'No project open';
    chip.onclick = function () { location.hash = '#projects'; };
  }

  function updateChips() {
    var chip = document.getElementById('srcChip');
    var foot = document.getElementById('navFoot');
    if (app.loadError) { chip.className = 'src-chip bad'; chip.innerHTML = '<b>✘</b> models failed to load'; return; }
    var failing = app.invariants.filter(function (c) { return !c.pass; }).length;
    chip.className = 'src-chip' + (failing ? ' bad' : '');
    chip.innerHTML = failing ? '<b>✘</b> ' + failing + ' invariant(s) failing'
      : '<b>✔</b> Vanilla ' + app.model.meta.generatedAt.helpdesk;
    chip.title = 'Vanilla baseline — see Settings';
    chip.style.cursor = 'pointer';
    chip.onclick = function () { location.hash = '#settings'; };
    if (foot) foot.textContent = 'Vanilla ' + app.model.meta.generatedAt.helpdesk +
      ' · hd:' + app.model.meta.sourceFingerprints.helpdesk + ' · ord:' + app.model.meta.sourceFingerprints.orders;
  }

  /* durable project files are authoritative: seed the store from
   * projects/manifest.json + each projects/<key>/project.json, and drop any
   * stale localStorage project not in the manifest. */
  function loadProjectsFromFiles() {
    if (!window.StudioProject) return Promise.resolve();
    return fetch('projects/manifest.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { projects: [] }; })
      .then(function (man) {
        var keys = (man && man.projects) || [];
        return Promise.all(keys.map(function (k) {
          return fetch('projects/' + k + '/project.json', { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.text() : null; })
            .then(function (text) { if (text) { try { window.StudioProject.importProject(text); } catch (e) { /* */ } } })
            .catch(function () { /* */ });
        })).then(function () {
          try { window.StudioProject.list().forEach(function (p) { if (keys.indexOf(p.key) === -1) window.StudioProject.remove(p.key); }); } catch (e) { /* */ }
        });
      })
      .catch(function () { /* no manifest — leave store as-is */ });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('inspClose').addEventListener('click', function () { window.StudioInspector.close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') window.StudioInspector.close(); });
    window.addEventListener('hashchange', route);
    route();
    window.VanillaLoader.loadAll('../../model/')
      .then(function (res) { app.model = res.model; app.invariants = res.invariants; return loadProjectsFromFiles(); })
      .then(function () {
        var cur = currentProject();
        app.instance = cur && cur.instance ? cur.instance : window.StudioHarness.instanceStore.load();
        updateChips(); route();
      })
      .catch(function (err) { app.loadError = String((err && err.message) || err); updateChips(); route(); });
  });
})();
