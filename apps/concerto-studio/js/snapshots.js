/* snapshots.js — the project's SNAPSHOT TIMELINE.
 *
 * Every crawl of a customer instance is banked as a time-and-date stamped
 * snapshot. Pick a stamp and every view (Diagram, Action Map, Matrix,
 * Configuration) renders THAT capture. Switch to CHANGES and the same views
 * render the same capture with everything that moved since the previous
 * stamp ringed, alongside a written summary of the deltas.
 *
 * Honesty rules:
 *  - A stamp is displayed at the precision it was actually recorded. A crawl
 *    that only ever recorded a date is shown as a date and labelled as such;
 *    no clock time is invented for it.
 *  - The earliest snapshot has no predecessor, so its CHANGES view compares
 *    against the Vanilla baseline and says so.
 *  - Two snapshots with identical content are reported as identical rather
 *    than silently drawn as two separate captures.
 */
(function () {
  'use strict';

  var S = window.StudioSchema;
  var MODE_KEY = 'concerto-studio-snapshot-mode';
  var SEL_KEY = 'concerto-studio-snapshot-sel';

  var cache = {};   /* path -> {record, report, fingerprint} */
  var state = {
    mode: 'full',   /* full | changes */
    selected: {}    /* projectKey -> snapshotId */
  };
  try {
    state.mode = localStorage.getItem(MODE_KEY) || 'full';
    state.selected = JSON.parse(localStorage.getItem(SEL_KEY) || '{}');
  } catch (e) { /* private mode */ }

  function persist() {
    try {
      localStorage.setItem(MODE_KEY, state.mode);
      localStorage.setItem(SEL_KEY, JSON.stringify(state.selected));
    } catch (e) { /* */ }
  }

  /* ---- stamps ---------------------------------------------------------- */

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function precisionOf(stamp) {
    return /T\d{2}:\d{2}/.test(String(stamp || '')) ? 'datetime' : 'date';
  }

  /* "2026-08-19T14:07:33Z" → "19 Aug 2026 14:07"; date-only stays a date. */
  function formatStamp(stamp) {
    var s = String(stamp || '');
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
    if (!m) return s || '—';
    var out = String(parseInt(m[3], 10)) + ' ' + MONTHS[parseInt(m[2], 10) - 1] + ' ' + m[1];
    if (m[4]) out += ' ' + m[4] + ':' + m[5];
    return out;
  }

  function stampLabel(entry) {
    return formatStamp(entry.capturedAt) +
      (entry.precision === 'date' ? ' (time not recorded)' : '');
  }

  /* ---- registry -------------------------------------------------------- */

  /* Snapshot entries as declared by the project, newest capture first. */
  function list(project) {
    if (!project || !project.snapshots) return [];
    return project.snapshots.map(function (s) {
      var stamp = s.capturedAt || s.at || project.lastCrawlAt || null;
      return {
        id: s.id,
        label: s.label || s.id,
        path: s.path,
        capturedAt: stamp,
        precision: precisionOf(stamp),
        source: s.source || 'captured crawl'
      };
    }).sort(function (a, b) {
      return String(b.capturedAt).localeCompare(String(a.capturedAt)) ||
        a.id.localeCompare(b.id);
    });
  }

  function projectDir(project) { return 'projects/' + project.key + '/'; }

  /* Fetch + ingest every snapshot the project declares. Idempotent. */
  function ensureLoaded(project, baseline) {
    var entries = list(project);
    return Promise.all(entries.map(function (e) {
      if (!e.path) return Promise.resolve();
      var url = projectDir(project) + e.path;
      if (cache[url]) return Promise.resolve();
      return fetch(url, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (snap) {
          if (!snap) return;
          var rec = window.StudioIngest.toInstanceRecord(e.id, snap, baseline);
          cache[url] = {
            record: rec,
            report: rec.meta.ingestReport || null,
            fingerprint: S.fingerprint(snap)
          };
        })
        .catch(function () { /* unreadable snapshot — stays absent, never faked */ });
    })).then(function () { return entries; });
  }

  /* A capture is either banked as a project file or held as the live
   * ingested crawl from this session — both belong on the timeline. */
  function entryRecord(project, entry) {
    if (!entry) return null;
    if (!entry.path) {
      var live = project && project.instance;
      return live && live.snapshotId === entry.id ? live : null;
    }
    var hit = cache[projectDir(project) + entry.path];
    return hit ? hit.record : null;
  }

  function entryFingerprint(project, entry) {
    if (!entry || !entry.path) return null;
    var hit = cache[projectDir(project) + entry.path];
    return hit ? hit.fingerprint : null;
  }

  function selectedEntry(project) {
    var entries = list(project);
    if (!entries.length) return null;
    var want = state.selected[project.key];
    var hit = entries.filter(function (e) { return e.id === want; })[0];
    return hit || entries[0]; /* default: the most recent capture */
  }

  function select(projectKey, id) { state.selected[projectKey] = id; persist(); }
  function mode() { return state.mode; }
  function setMode(m) { state.mode = (m === 'changes' ? 'changes' : 'full'); persist(); }

  /* The model the views should render for this project right now. */
  function modelFor(project) {
    var rec = entryRecord(project, selectedEntry(project));
    if (rec) return rec.model;
    return (project && project.instance && project.instance.model) || null;
  }

  function recordFor(project) { return entryRecord(project, selectedEntry(project)); }

  /* ---- changes --------------------------------------------------------- */

  /* Compare the selected capture with the one before it. The earliest
   * capture has no predecessor — compare against the Vanilla baseline and
   * label it honestly. */
  function changesFor(project, baseline) {
    var entries = list(project);
    var cur = selectedEntry(project);
    if (!cur) return null;
    var curRec = entryRecord(project, cur);
    if (!curRec) return null;
    var idx = entries.map(function (e) { return e.id; }).indexOf(cur.id);
    var prevEntry = entries[idx + 1] || null; /* list is newest-first */
    var prevRec = prevEntry ? entryRecord(project, prevEntry) : null;

    var againstModel = prevRec ? prevRec.model : baseline;
    var against = prevRec
      ? { kind: 'snapshot', id: prevEntry.id, label: stampLabel(prevEntry), entry: prevEntry }
      : { kind: 'baseline', id: 'vanilla', label: 'Vanilla baseline (no earlier capture)' };

    var identical = prevEntry &&
      entryFingerprint(project, cur) === entryFingerprint(project, prevEntry);

    var diff = window.StudioDiff.compare(againstModel, curRec.model);
    return {
      current: cur,
      currentLabel: stampLabel(cur),
      against: against,
      identical: !!identical,
      diff: diff,
      rows: window.StudioDiff.deviationSchedule(diff)
    };
  }

  /* Which objects to ring in the views. */
  function highlight(diff) {
    var out = { statuses: {}, actions: {}, availability: [] };
    if (!diff) return out;
    diff.statuses.added.forEach(function (x) { out.statuses[x.key] = 'added'; });
    diff.statuses.removed.forEach(function (x) { out.statuses[x.key] = 'removed'; });
    diff.statuses.modified.forEach(function (x) { out.statuses[x.key] = 'modified'; });
    diff.actions.added.forEach(function (x) { out.actions[x.key] = 'added'; });
    diff.actions.removed.forEach(function (x) { out.actions[x.key] = 'removed'; });
    diff.actions.modified.forEach(function (x) { out.actions[x.key] = 'modified'; });
    diff.availability.added.forEach(function (e) {
      out.availability.push({ action: e.action, status: e.status, kind: 'added' });
      if (!out.actions[e.action]) out.actions[e.action] = 'modified';
    });
    diff.availability.removed.forEach(function (e) {
      out.availability.push({ action: e.action, status: e.status, kind: 'removed' });
    });
    diff.results.added.forEach(function (r) { if (!out.actions[r.action]) out.actions[r.action] = 'modified'; });
    diff.results.removed.forEach(function (r) { if (!out.actions[r.action]) out.actions[r.action] = 'modified'; });
    return out;
  }

  /* Ring what the current view actually drew. Objects that were REMOVED are
   * not in this capture and therefore cannot be ringed — they are carried by
   * the written summary instead, which is why the summary is not optional. */
  function applyHighlight(container, sets) {
    if (!container || !sets) return 0;
    var painted = 0;
    var byAction = {};
    sets.availability.forEach(function (a) {
      (byAction[a.action] = byAction[a.action] || {})[a.status] = a.kind;
    });
    var nodes = container.querySelectorAll('[data-action],[data-status]');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var act = n.getAttribute('data-action');
      var st = n.getAttribute('data-status');
      var kind = null;
      if (act && st && byAction[act] && byAction[act][st]) kind = byAction[act][st];
      else if (act && sets.actions[act]) kind = sets.actions[act];
      else if (!act && st && sets.statuses[st]) kind = sets.statuses[st];
      if (kind) {
        n.classList.add('chg-ring', 'chg-' + kind);
        n.setAttribute('title', (n.getAttribute('title') ? n.getAttribute('title') + ' · ' : '') +
          'CHANGED since the previous snapshot: ' + kind);
        painted++;
      }
    }
    return painted;
  }

  /* Written summary — plain sentences, not a field dump. */
  function summarise(changes) {
    if (!changes) return [];
    var d = changes.diff, out = [];
    function line(n, one, many) { if (n) out.push(n + ' ' + (n === 1 ? one : many)); }
    line(d.statuses.added.length, 'status added', 'statuses added');
    line(d.statuses.removed.length, 'status removed', 'statuses removed');
    line(d.statuses.modified.length, 'status changed', 'statuses changed');
    line(d.actions.added.length, 'action added', 'actions added');
    line(d.actions.removed.length, 'action removed', 'actions removed');
    line(d.actions.modified.length, 'action changed', 'actions changed');
    line(d.availability.added.length, 'action made available in a status', 'action-availability edges added');
    line(d.availability.removed.length, 'action availability withdrawn', 'action-availability edges removed');
    line(d.results.added.length, 'new status outcome', 'new status outcomes');
    line(d.results.removed.length, 'status outcome removed', 'status outcomes removed');
    return out;
  }

  var api = {
    list: list, ensureLoaded: ensureLoaded, selectedEntry: selectedEntry,
    select: select, mode: mode, setMode: setMode,
    modelFor: modelFor, recordFor: recordFor,
    changesFor: changesFor, highlight: highlight, applyHighlight: applyHighlight,
    summarise: summarise, formatStamp: formatStamp, stampLabel: stampLabel,
    _cache: cache, _state: state
  };
  if (typeof window !== 'undefined') window.StudioSnapshots = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
