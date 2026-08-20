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

  /* The model the read-only views render.
   *
   * THERE IS NO SILENT FALLBACK. With a project open, the views render that
   * PROJECT's model or nothing at all: a customer view that quietly draws
   * Vanilla while wearing the customer's name is worse than an empty view,
   * because it is believed. Vanilla is rendered only when no project is
   * open — i.e. when the context selector says "Vanilla baseline". */
  function ctxModel() {
    var p = currentProject();
    if (!p) return app.model;
    if (window.StudioSnapshots) {
      var m = window.StudioSnapshots.modelFor(p);
      if (m) return m;
    }
    if (p.instance && p.instance.model) return p.instance.model;
    return null; /* not ingested — the view must say so, not substitute */
  }

  function ctxIsSnapshot() {
    var p = currentProject();
    return !!(p && window.StudioSnapshots && window.StudioSnapshots.modelFor(p));
  }

  /* The panel shown instead of a view when a project has no model yet. */
  function renderNotIngested(container) {
    var el = window.StudioDom.el;
    var p = currentProject();
    window.StudioDom.clear(container);
    container.appendChild(el('div', { class: 'page' }, [
      el('div', { class: 'stub not-ingested' }, [
        el('h3', { text: 'PROJECT MODEL NOT YET INGESTED' }),
        el('p', {}, [
          document.createTextNode('Nothing has been ingested for '),
          el('b', { text: p.name }),
          document.createTextNode(', so there is no configuration to draw. The Vanilla baseline is NOT shown here — a view carrying this project’s name must never contain another instance’s configuration.')
        ]),
        el('p', {}, [
          el('button', {
            class: 'btn', text: 'BUILD FROM SAVED EVIDENCE',
            title: 'Turn evidence already captured for this project into a model',
            onclick: function () { location.hash = '#evidence'; }
          }),
          document.createTextNode('  '),
          el('button', {
            class: 'btn', text: 'CRAWL / REFRESH INSTANCE',
            title: 'Connect to the instance read-only and capture a fresh snapshot',
            onclick: function () { location.hash = '#evidence'; }
          }),
          document.createTextNode('  '),
          el('button', {
            class: 'btn', text: 'Show the Vanilla baseline instead',
            title: 'Switch the context to Vanilla — explicitly, and labelled as Vanilla',
            onclick: function () { setContext('vanilla'); }
          })
        ]),
        el('p', { class: 'muted', style: 'font-size:12px' , text:
          'Evidence can reach a project by any of four routes — browser crawl, assisted/manual discovery, import, or build read-back. All four produce the same snapshot format.' })
      ])
    ]));
  }

  /* The changes overlay has exactly two triggers, both explicit:
   *  - the "Show differences from Vanilla" toggle on a current view;
   *  - "View changes" on a history entry (Evidence → History), which uses
   *    the snapshot-vs-previous comparison.
   * There is no standing "mode" the user has to know about. */
  function changesContext() {
    var p = currentProject();
    if (!p || !window.StudioSnapshots) return null;
    var m = window.StudioSnapshots.modelFor(p);
    if (!m) return null;
    if (window.StudioSnapshots.viewing(p) && window.StudioSnapshots.mode() === 'changes') {
      return window.StudioSnapshots.changesFor(p, app.model);
    }
    if (uxState.compareVanilla && !window.StudioSnapshots.viewing(p)) {
      var diff = window.StudioDiff.compare(app.model, m);
      return {
        current: null,
        currentLabel: p.name + ' current configuration',
        against: { kind: 'vanilla', label: 'the standard product (Vanilla ' + app.model.meta.generatedAt.helpdesk + ')' },
        identical: false,
        diff: diff,
        rows: window.StudioDiff.deviationSchedule(diff)
      };
    }
    return null;
  }

  function renderChangeSummary(container, ch) {
    var el = window.StudioDom.el;
    var lines = window.StudioSnapshots.summarise(ch);
    var panel = el('div', { class: 'chg-summary' }, [
      el('h4', {}, [
        document.createTextNode('Changes in ' + ch.currentLabel + ' vs ' + ch.against.label),
        ch.identical ? el('span', { class: 'chg-note', text: ' — byte-identical capture' }) : null
      ]),
      lines.length
        ? el('p', { text: lines.join(' · ') + '. Changed objects are ringed below.' })
        : el('p', { text: 'Nothing changed between these two captures.' }),
      ch.diff.summary.scopedToTypes
        ? el('p', {
          class: 'chg-note',
          text: 'Scope: ' + ch.diff.summary.scopedToTypes.join(', ') + ' only — the other Helpdesk Types were not crawled, so they are not compared.'
        }) : null,
      ch.diff.summary.resultsNotObserved
        ? el('p', {
          class: 'chg-note',
          text: ch.diff.summary.resultsNotObserved + ' status outcome(s) the crawl did not record either way are left out — silence is not evidence of deletion.'
        }) : null,
      ch.diff.summary.invisibleToCrawl && ch.diff.summary.invisibleToCrawl.length
        ? el('p', {
          class: 'chg-note',
          text: 'Out of view (' + ch.diff.summary.invisibleToCrawl.length + '): actions attached to no status — engine-fired ones included — cannot appear in a grouped-by-status crawl, so their absence is not read as a deletion.'
        }) : null,
      ch.diff.summary.notCompared && ch.diff.summary.notCompared.length
        ? el('p', {
          class: 'chg-note',
          text: 'Not compared (not captured by these crawls): ' + ch.diff.summary.notCompared.join(', ') + '.'
        }) : null,
      ch.rows.length ? el('details', {}, [
        el('summary', { text: 'Every change in words (' + ch.rows.length + ')' }),
        el('ul', { class: 'chg-list' }, ch.rows.map(function (r) {
          return el('li', {}, [
            el('span', { class: 'chg-kind ' + r.kind.toLowerCase(), text: r.kind }),
            document.createTextNode(' ' + r.object + ' · ' + r.detail)
          ]);
        }))
      ]) : null
    ]);
    container.insertBefore(panel, container.firstChild);
  }
  function currentProject() { return window.StudioProject ? window.StudioProject.current() : null; }

  /* DESIGN forks the project's CURRENT configuration, not Vanilla: a
   * customer's desired state is "what we change from where they are now".
   * Vanilla stays available as a comparison baseline, never as the parent. */
  function designBase() {
    var p = currentProject();
    if (!p) return app.model;
    if (window.StudioSnapshots) {
      var cur = window.StudioSnapshots.currentModel(p);
      if (cur) return cur;
    }
    return (p.instance && p.instance.model) || null;
  }

  var VIEWS = [
    { id: 'diagram', label: 'Diagram', ctx: true, needsModel: true, render: function (c) { window.StudioDiagram.render(c, ctxModel()); } },
    { id: 'map', label: 'Action Map', ctx: true, needsModel: true, render: function (c) { window.StudioActionMap.render(c, ctxModel()); } },
    { id: 'matrix', label: 'Matrix', ctx: true, needsModel: true, render: function (c) { window.StudioGrid.render(c, ctxModel()); } },
    { id: 'config', label: 'Configuration', ctx: true, needsModel: true, render: function (c) { window.StudioConfig.render(c, ctxModel()); } },
    {
      id: 'design', label: 'Design', needsModel: true, base: designBase,
      render: function (c) { window.StudioDesign.render(c, designBase(), { vanilla: app.model, project: currentProject() }); }
    },
    {
      id: 'solution-design', label: 'Solution Design', needsModel: true, base: designBase,
      render: function (c) {
        window.StudioSolutionDesignView.render(c, designBase(), {
          vanilla: app.model,
          project: currentProject()
        });
      }
    },
    {
      id: 'technical-design', label: 'Technical Design', needsModel: true, base: designBase,
      render: function (c) {
        window.StudioTechnicalDesignView.render(c, designBase(), {
          vanilla: app.model,
          project: currentProject()
        });
      }
    },
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
    uxState.compareVanilla = false;
    if (val === 'vanilla') { if (window.StudioProject) window.StudioProject.close(); app.instance = null; }
    else if (window.StudioProject) { window.StudioProject.open(val); }
    route();
    loadSnapshots();
  }

  /* Fetch + ingest the open project's captures, then redraw once. */
  function loadSnapshots() {
    var p = currentProject();
    if (!p || !window.StudioSnapshots || !app.model) return Promise.resolve();
    return window.StudioSnapshots.ensureLoaded(p, app.model).then(function () { route(); });
  }

  /* Left-hand tree: every project, and under it every snapshot stamp.
   * Click a project = open it at its CURRENT truth. Click a stamp = the
   * whole right-hand side renders exactly as the instance stood then. */
  function renderNavTree() {
    var box = document.getElementById('navProjects');
    if (!box || !window.StudioProject) return;
    var cur = currentProject();
    var SS = window.StudioSnapshots;
    var html = '';
    window.StudioProject.list().forEach(function (p) {
      var on = cur && cur.key === p.key;
      html += '<span class="np-proj' + (on ? ' on' : '') + '" data-k="' + p.key + '">' + p.name + '</span>';
      var snaps = (SS && p.snapshots) ? SS.list(p) : [];
      snaps.forEach(function (sn) {
        var viewingId = on && SS.viewing(p) && SS.viewing(p).id;
        var stamp = (sn.capturedAt || '').slice(0, 16).replace('T', ' ') || sn.id;
        html += '<span class="np-snap' + (viewingId === sn.id ? ' on' : '') + '" data-k="' + p.key + '" data-s="' + sn.id + '">' +
          stamp + ' <small>' + (sn.source === 'BROWSER CRAWL' ? 'crawl' : /AI/.test(sn.source || '') ? 'inspect' : (sn.role || '')) + '</small></span>';
      });
    });
    box.innerHTML = html;
    box.querySelectorAll('.np-proj').forEach(function (el2) {
      el2.onclick = function () {
        var k = el2.getAttribute('data-k');
        if (window.StudioSnapshots) window.StudioSnapshots.clearView(k);
        setContext(k);
        if (currentRoute().kind !== 'view') location.hash = '#diagram';
      };
    });
    box.querySelectorAll('.np-snap').forEach(function (el2) {
      el2.onclick = function () {
        var k = el2.getAttribute('data-k'), id = el2.getAttribute('data-s');
        if (!currentProject() || currentProject().key !== k) setContext(k);
        var p2 = currentProject();
        loadSnapshots().then(function () {
          window.StudioSnapshots.setView(k, id);
          if (currentRoute().kind !== 'view') location.hash = '#diagram'; else route();
        });
      };
    });
  }

  function renderContextSelect() {
    var wrap = document.getElementById('ctxWrap');
    var sel = document.getElementById('ctxSelect');
    var r = currentRoute();
    wrap.hidden = r.kind !== 'view';
    if (r.kind !== 'view') return;
    var cur = currentProject();
    var curVal = cur ? cur.key : 'vanilla';
    /* Projects are the real choices. The no-project state shows the standard
     * product for reference — labelled as what it is, not offered as another
     * operating mode of a project. */
    var opts = [{ v: 'vanilla', t: 'Standard product (reference)' }];
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

  /* The context bar is ONE calm line: whose system, where it lives. The
   * machinery underneath (snapshots, baselines, capture states) stays out
   * of it — a project simply IS its current configuration. Two things may
   * join the line, each only when true: a history banner while a past
   * snapshot is being viewed, and the compare-with-Vanilla toggle. */
  var uxState = { compareVanilla: false };

  function renderContextInfo() {
    var bar = document.getElementById('ctxInfo');
    var r = currentRoute();
    var p = currentProject();
    if (r.kind !== 'view' || !p) { bar.hidden = true; bar.innerHTML = ''; return; }
    bar.hidden = false;
    var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    var viewingPast = window.StudioSnapshots ? window.StudioSnapshots.viewing(p) : null;
    bar.innerHTML =
      '<span class="ci-name">' + esc(p.name) + '</span>' +
      '<span class="ci-item"><a href="' + esc(p.instanceUrl) + '" target="_blank" rel="noopener">' + esc(p.instanceUrl || '') + '</a></span>';

    var elh = window.StudioDom.el;
    if (viewingPast) {
      bar.appendChild(elh('span', { class: 'ci-history' }, [
        document.createTextNode('Viewing history: ' + viewingPast.label + ' (' + window.StudioSnapshots.stampLabel(viewingPast) + ') '),
        elh('button', {
          class: 'snapbtn on', text: 'Return to current',
          onclick: function () { window.StudioSnapshots.clearView(p.key); window.StudioSnapshots.setMode('full'); uxState.compareVanilla = false; route(); }
        })
      ]));
    }
    var viewIsCtx = viewById(r.id) && viewById(r.id).ctx;
    if (viewIsCtx && !viewingPast && ctxModel()) {
      bar.appendChild(elh('button', {
        class: 'snapbtn' + (uxState.compareVanilla ? ' on' : ''),
        text: uxState.compareVanilla ? 'Differences from Vanilla ●' : 'Show differences from Vanilla',
        title: 'Ring what differs from the standard product, with a written summary',
        style: 'margin-left:auto',
        onclick: function () { uxState.compareVanilla = !uxState.compareVanilla; route(); }
      }));
    }
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
    var v = viewById(r.id);
    if (p && (v.ctx || v.needsModel)) bar.appendChild(truthIndicator(p, v));
    else if (!p && (v.ctx || v.needsModel)) {
      var vanillaNote = document.createElement('span');
      vanillaNote.className = 'truth vanilla';
      vanillaNote.innerHTML = '<b>Vanilla baseline</b><span>standard product reference · not a customer instance</span>';
      bar.appendChild(vanillaNote);
    }
  }

  /* Subtle, always-present statement of WHAT is on screen. Three lines at
   * most: whose configuration, which state of it, and what it is measured
   * against. Ambiguity here is how a customer ends up looking at someone
   * else's system. */
  function truthIndicator(p, view) {
    var el = window.StudioDom.el;
    var isDesign = view.id === 'design' || view.id === 'solution-design';
    var viewingPast = window.StudioSnapshots ? window.StudioSnapshots.viewing(p) : null;
    var hasModel = !!ctxModel();
    var state, line;
    if (!hasModel) { state = 'NOT INGESTED'; line = 'No model for this project yet'; }
    else if (viewingPast) { state = 'HISTORY'; line = viewingPast.label; }
    else if (isDesign && window.StudioModel && window.StudioModel.hasFork()) {
      state = 'PROPOSED'; line = 'Proposed design — forked from the current configuration';
    } else { state = 'CURRENT'; line = 'Current configuration'; }
    return el('span', { class: 'truth' + (state === 'NOT INGESTED' ? ' missing' : state === 'HISTORY' ? ' history' : '') }, [
      el('b', { text: p.name }),
      el('span', { class: 'truth-state', text: state }),
      el('span', { text: line })
    ]);
  }

  function route() {
    try { renderNavTree(); } catch (e) { /* nav tree must never break routing */ }
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

    var v = viewById(r.id);
    /* No silent substitution: a project view with no project model says so. */
    if (v.needsModel && currentProject()) {
      var m = v.base ? v.base() : ctxModel();
      if (!m) { renderNotIngested(content); return; }
    }
    v.render(content);

    /* snapshot CHANGES overlay — only over the views that draw the model */
    applyOverlay();
  }

  /* The overlay is re-applied whenever a view redraws itself (filters, zoom,
   * selection) — otherwise the rings would vanish on the first interaction. */
  var overlay = { applying: false, observer: null };

  function applyOverlay() {
    var r = currentRoute();
    var content = document.getElementById('content');
    if (!content) return;
    if (r.kind !== 'view' || !viewById(r.id).ctx) return;
    var ch = changesContext();
    if (!ch) return;
    var page = content.querySelector('.page') || content;
    if (page.querySelector('.chg-summary')) return; /* already overlaid */
    overlay.applying = true;
    window.StudioSnapshots.applyHighlight(page, window.StudioSnapshots.highlight(ch.diff));
    renderChangeSummary(page, ch);
    Promise.resolve().then(function () {
      if (overlay.observer) overlay.observer.takeRecords();
      overlay.applying = false;
    });
  }

  function installOverlayObserver() {
    var content = document.getElementById('content');
    if (!content || typeof MutationObserver === 'undefined') return;
    overlay.observer = new MutationObserver(function () {
      if (overlay.applying) return;
      applyOverlay();
    });
    overlay.observer.observe(content, { childList: true, subtree: true });
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
  /* Project data comes from the DURABLE PRIVATE STORE when it is running,
   * and from the repo-side projects/ folder otherwise. Either way the
   * chosen source is authoritative over localStorage, and which one is in
   * use is reported — never left to be assumed. */
  function loadProjects() {
    if (!window.StudioProject) return Promise.resolve();
    if (!window.StudioStore) return loadProjectsFromFiles();
    return window.StudioStore.probe().then(function () {
      if (!window.StudioStore.available()) {
        window.StudioStore.setSource('files');
        return loadProjectsFromFiles();
      }
      return window.StudioStore.list().then(function (rows) {
        var keys = rows.map(function (r) { return r.key; });
        if (!keys.length) { /* an empty store is not an authority */
          window.StudioStore.setSource('files');
          return loadProjectsFromFiles();
        }
        window.StudioStore.setSource('store');
        return Promise.all(keys.map(function (k) {
          return window.StudioStore.get(k)
            .then(function (payload) {
              try { window.StudioProject.importProject(JSON.stringify(payload)); } catch (e) { /* */ }
            })
            .catch(function () { /* a single unreadable project must not blank the list */ });
        })).then(function () {
          /* STUDIO NEVER SILENTLY DELETES A PROJECT. Anything the store
           * does not know about is marked unsaved and shown with a way to
           * save it — deleting someone's work to tidy a list is the worse
           * failure by a wide margin. Removal is a deliberate act. */
          try {
            window.StudioProject.list().forEach(function (p) {
              if (keys.indexOf(p.key) !== -1) {
                if (p.unsaved) window.StudioProject.save(p.key, { unsaved: false });
                return;
              }
              if (!p.unsaved) window.StudioProject.save(p.key, { unsaved: true });
            });
          } catch (e) { /* */ }
        });
      });
    });
  }

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
      .then(function (res) { app.model = res.model; app.invariants = res.invariants; return loadProjects(); })
      .then(function () {
        var cur = currentProject();
        app.instance = cur && cur.instance ? cur.instance : window.StudioHarness.instanceStore.load();
        updateChips(); route();
        installOverlayObserver();
        return loadSnapshots();
      })
      .catch(function (err) { app.loadError = String((err && err.message) || err); updateChips(); route(); });
  });
})();
