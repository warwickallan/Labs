/* project.js — PROJECT persistence and the CURRENT PROJECT context.
 *
 * A project pins one customer engagement: which instance it targets, the
 * last ingested crawl, the desired-state design forked from Vanilla, and
 * a change log. Projects live in localStorage under
 * 'concerto-studio-projects-v1' as { currentKey, projects: {key: record} }.
 * exportProject(key) emits the same record wrapped in a file envelope so
 * it can be persisted OUTSIDE the browser under
 * apps/concerto-studio/projects/<key>/project.json (git-ignored — customer
 * project data never enters the public Labs repository). This module never
 * writes files itself.
 *
 * projectRecord (formatVersion 1):
 *   {
 *     formatVersion: 1,
 *     key:            string   — stable slug, unique within the store
 *     name:           string   — display name (e.g. 'Kirklees')
 *     instanceUrl:    string   — target Concerto instance URL
 *     domains:        string[] — e.g. ['Reactive Helpdesk']
 *     createdAt:      ISO string
 *     lastOpenedAt:   ISO string | null
 *     lastCrawlAt:    ISO string | null (stamped from instance.meta.crawledAt)
 *     concertoBuild:  string | null    (from instance.meta.concertoBuild)
 *     basedOnVanilla: {fingerprints} | null — the Vanilla baseline pinned
 *                     at last captureContext (model.meta.sourceFingerprints)
 *     instance:       {snapshotId, meta, model} | null — the ingested
 *                     instance record exactly as views read it from
 *                     window.StudioApp.instance
 *     desiredHelpdesk:parsed CUSTOMER-DESIRED-STATE export (StudioModel
 *                     exportJson) | null
 *     findingsState:  {} — per-finding triage state (reserved; empty today)
 *     notes:          string
 *     changeLog:      [{at, ...entry}] — appended via addChange()
 *   }
 *
 * open(key) restores the project's context into the running Studio:
 * window.StudioApp.instance (+ the harness instanceStore mirror) and, if a
 * desiredHelpdesk is carried, StudioModel via its existing public
 * importJson API. Everything is defensive: missing pieces never throw.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'concerto-studio-projects-v1';
  var FORMAT_VERSION = 1;
  var FILE_KIND = 'CONCERTO-STUDIO-PROJECT';

  /* read-through on every call — no in-memory cache to drift */
  function loadStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var store = raw ? JSON.parse(raw) : null;
      if (!store || typeof store !== 'object' || !store.projects || typeof store.projects !== 'object') {
        return { currentKey: null, projects: {} };
      }
      if (!('currentKey' in store)) store.currentKey = null;
      return store;
    } catch (e) { return { currentKey: null, projects: {} }; }
  }

  function saveStore(store) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch (e) { /* private mode / quota — session-only */ }
  }

  function slug(name) {
    var k = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return k || ('project-' + Date.now());
  }

  function list() {
    var store = loadStore();
    return Object.keys(store.projects).map(function (k) { return store.projects[k]; })
      .sort(function (a, b) {
        return String(b.lastOpenedAt || b.createdAt || '').localeCompare(String(a.lastOpenedAt || a.createdAt || ''));
      });
  }

  function get(key) {
    return loadStore().projects[key] || null;
  }

  function create(spec) {
    spec = spec || {};
    var store = loadStore();
    var key = spec.key || slug(spec.name);
    if (store.projects[key]) throw new Error('A project with key "' + key + '" already exists');
    var now = new Date().toISOString();
    var rec = {
      formatVersion: FORMAT_VERSION,
      key: key,
      name: spec.name || key,
      instanceUrl: spec.instanceUrl || '',
      domains: (spec.domains || ['Reactive Helpdesk']).slice(),
      createdAt: now,
      lastOpenedAt: null,
      lastCrawlAt: null,
      concertoBuild: null,
      basedOnVanilla: null,
      instance: null,
      desiredHelpdesk: null,
      findingsState: {},
      notes: '',
      changeLog: [],
      /* cleared once the durable store confirms a save; while true the
       * startup prune must leave this project alone */
      unsaved: true
    };
    store.projects[key] = rec;
    saveStore(store);
    return rec;
  }

  function save(key, patch) {
    var store = loadStore();
    var rec = store.projects[key];
    if (!rec) return null;
    Object.keys(patch || {}).forEach(function (k) {
      if (k === 'key' || k === 'formatVersion') return; /* identity is immutable */
      rec[k] = patch[k];
    });
    saveStore(store);
    return rec;
  }

  /* restore a project's context into the running Studio — defensive by
   * construction: any missing global is simply skipped */
  function restoreContext(rec) {
    var app = window.StudioApp;
    if (app) {
      app.instance = rec.instance || null;
      try {
        if (window.StudioHarness && window.StudioHarness.instanceStore) {
          if (rec.instance) window.StudioHarness.instanceStore.save(rec.instance);
          else window.StudioHarness.instanceStore.clear();
        }
      } catch (e) { /* storage unavailable */ }
    }
    var M = window.StudioModel;
    if (M) {
      try {
        if (rec.desiredHelpdesk && app && app.model) {
          M.importJson(JSON.stringify(rec.desiredHelpdesk), app.model);
        } else if (!rec.desiredHelpdesk && M.hasFork()) {
          M.discard(); /* this project carries no design — do not leak another's */
        }
      } catch (e) { /* a damaged desired-state must not block opening the project */ }
    }
  }

  function open(key) {
    var store = loadStore();
    var rec = store.projects[key];
    if (!rec) return null;
    rec.lastOpenedAt = new Date().toISOString();
    store.currentKey = key;
    saveStore(store);
    restoreContext(rec);
    return rec;
  }

  function close() {
    var store = loadStore();
    store.currentKey = null;
    saveStore(store);
  }

  function current() {
    var store = loadStore();
    return (store.currentKey && store.projects[store.currentKey]) || null;
  }

  /* pull the live Studio context (instance + desired design + Vanilla
   * fingerprints) into the CURRENT project record and persist it */
  function captureContext() {
    var store = loadStore();
    var rec = store.currentKey ? store.projects[store.currentKey] : null;
    if (!rec) return null;
    var app = window.StudioApp || {};
    if (app.instance) {
      rec.instance = app.instance;
      var meta = app.instance.meta || {};
      if (meta.crawledAt) rec.lastCrawlAt = meta.crawledAt;
      if (meta.concertoBuild) rec.concertoBuild = meta.concertoBuild;
      if (meta.targetUrl && !rec.instanceUrl) rec.instanceUrl = meta.targetUrl;
    }
    try {
      var M = window.StudioModel;
      rec.desiredHelpdesk = (M && M.hasFork()) ? JSON.parse(M.exportJson()) : null;
    } catch (e) { /* keep whatever was stored before */ }
    try {
      if (app.model && app.model.meta && app.model.meta.sourceFingerprints) {
        rec.basedOnVanilla = app.model.meta.sourceFingerprints;
      }
    } catch (e) { /* frozen model quirks must not block capture */ }
    saveStore(store);
    return rec;
  }

  function addChange(entry) {
    var store = loadStore();
    var rec = store.currentKey ? store.projects[store.currentKey] : null;
    if (!rec) return null;
    var e = { at: null };
    if (typeof entry === 'string') e.text = entry;
    else Object.keys(entry || {}).forEach(function (k) { e[k] = entry[k]; });
    if (!e.at) e.at = new Date().toISOString();
    if (!Array.isArray(rec.changeLog)) rec.changeLog = [];
    rec.changeLog.push(e);
    saveStore(store);
    return rec;
  }

  function remove(key) {
    var store = loadStore();
    if (!store.projects[key]) return false;
    delete store.projects[key];
    if (store.currentKey === key) store.currentKey = null;
    saveStore(store);
    return true;
  }

  /* Persist a project to the DURABLE PRIVATE STORE. localStorage is only a
   * session mirror; without this the work exists in one browser profile and
   * nowhere else. Returns a promise resolving to the store's receipt, or to
   * a refusal explaining why nothing was banked — never silently nothing. */
  function persist(key) {
    var S = window.StudioStore;
    if (!S) return Promise.resolve({ saved: false, reason: 'store client not loaded' });
    if (!S.available()) return Promise.resolve({ saved: false, reason: 'the durable store is not running' });
    var rec = get(key);
    if (!rec) return Promise.resolve({ saved: false, reason: 'no such project' });
    var payload;
    try { payload = JSON.parse(exportProject(key)); }
    catch (e) { return Promise.resolve({ saved: false, reason: 'export failed: ' + e.message }); }
    var work = function () {
      return S.save(key, payload).then(function (res) {
        try { save(key, { unsaved: false }); } catch (e) { /* */ }
        return res;
      }).catch(function (e) {
        return { saved: false, reason: 'store refused the save: ' + e.message };
      });
    };
    /* a save is deterministic — receipt with a measured duration */
    if (window.StudioReceipts) return window.StudioReceipts.timed('SAVE PROJECT', key, work);
    return work();
  }

  /* file-shaped export — persisted by persist() into the private store, or
   * written by hand under apps/concerto-studio/projects/<key>/project.json */
  function exportProject(key) {
    var rec = get(key);
    if (!rec) throw new Error('No project with key "' + key + '"');
    return JSON.stringify({
      kind: FILE_KIND,
      formatVersion: FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      project: rec
    }, null, 2);
  }

  function importProject(text) {
    var data = JSON.parse(text);
    if (data.kind !== FILE_KIND) throw new Error('Not a ' + FILE_KIND + ' file');
    if (data.formatVersion !== FORMAT_VERSION) throw new Error('Unknown formatVersion ' + data.formatVersion);
    var rec = data.project;
    if (!rec || !rec.key) throw new Error('Project file carries no project record');
    var store = loadStore();
    store.projects[rec.key] = rec; /* import wins — it is the durable copy */
    saveStore(store);
    return rec;
  }

  window.StudioProject = {
    list: list,
    get: get,
    create: create,
    save: save,
    open: open,
    close: close,
    current: current,
    captureContext: captureContext,
    addChange: addChange,
    remove: remove,
    exportProject: exportProject,
    importProject: importProject,
    persist: persist,
    STORAGE_KEY: STORAGE_KEY
  };
})();
