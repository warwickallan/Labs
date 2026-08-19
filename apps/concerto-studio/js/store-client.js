/* store-client.js — talks to the DURABLE PRIVATE PROJECT STORE
 * (store/store_server.py, port 8603).
 *
 * Where project data comes from, in order of authority:
 *   1. THE STORE — a folder outside the repository, versioned on every save
 *      and committed to a private git repository. Authoritative when it is
 *      running.
 *   2. The repo-side projects/ folder — the previous arrangement, still
 *      readable so the Studio works with the store switched off.
 *   3. localStorage — a session mirror only, never an authority.
 *
 * The Studio must always be able to say WHICH of these it is using, and how
 * durable that is; a browser that quietly falls back to localStorage while
 * the user believes their work is banked is the failure this guards against.
 */
(function () {
  'use strict';

  var BASE = 'http://127.0.0.1:8603';
  var state = { health: null, probed: false, source: 'unknown' };

  function req(path, opts) {
    return fetch(BASE + path, Object.assign({ cache: 'no-store' }, opts || {}))
      .then(function (r) {
        if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || r.status); });
        return r.json();
      });
  }

  function probe() {
    return req('/health')
      .then(function (h) { state.health = h; state.probed = true; return h; })
      .catch(function (e) {
        state.health = { ok: false, reason: 'store offline (' + e.message + ')' };
        state.probed = true;
        return state.health;
      });
  }

  function available() { return !!(state.health && state.health.ok); }
  function health() { return state.health; }
  function source() { return state.source; }
  function setSource(s) { state.source = s; }

  function list() { return req('/projects').then(function (r) { return r.projects || []; }); }
  function get(key) { return req('/project/' + encodeURIComponent(key)); }

  function save(key, payload) {
    return req('/project/' + encodeURIComponent(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  /* Read a companion file (snapshot, changelog) belonging to a project,
   * from whichever source that project came from. */
  function readFile(key, rel) {
    if (available() && state.source === 'store') {
      return req('/project/' + encodeURIComponent(key) + '/' + rel)
        .then(function (r) { return r.content; });
    }
    return fetch('projects/' + key + '/' + rel, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('not found: ' + rel); return r.text(); });
  }

  /* One honest sentence for the Settings panel and the nav footer. */
  function durabilityLine() {
    if (!state.probed) return 'checking where project data lives…';
    if (!available()) {
      return state.source === 'files'
        ? 'Project data is being read from the repository folder — the durable store is not running, so nothing you change in the Studio is being banked outside this browser.'
        : 'No project source is available: the store is not running and no repository project files were found.';
    }
    var h = state.health;
    var map = {
      'OFF-MACHINE': 'Project data is in the private store and committed to a remote — there is a copy off this machine.',
      'LOCAL-HISTORY': 'Project data is in the private store and versioned in a local git repository — but there is NO REMOTE, so it is still only on this machine.',
      'LOCAL-VERSIONS': 'Project data is in the private store with file versions kept, but it is not a git repository and has no off-machine copy.',
      'SINGLE-COPY': 'Project data is in the private store but nothing has been versioned yet.'
    };
    return map[h.durability] || ('Store durability: ' + h.durability);
  }

  var api = {
    base: BASE, probe: probe, available: available, health: health,
    list: list, get: get, save: save, readFile: readFile,
    source: source, setSource: setSource, durabilityLine: durabilityLine,
    _state: state
  };
  if (typeof window !== 'undefined') window.StudioStore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
