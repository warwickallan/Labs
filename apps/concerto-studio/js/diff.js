/* diff.js — the pure differ: (base model, desired model) → Added / Removed /
 * Modified / Unchanged at object and field level. No I/O, no DOM, no state.
 *
 * One differ serves three consumers: COMPARE (instance vs Vanilla, later),
 * the DESIGN Deviation Schedule (desired vs Vanilla), and BUILD planning.
 * Determinism: output order is fixed (statuses, then actions, then edges,
 * each sorted by key) so two runs over the same inputs are identical.
 */
(function () {
  'use strict';

  var S = (typeof window !== 'undefined' ? window.StudioSchema : require('./studio-schema.js'));

  /* Fields compared per object type. Anything outside these lists (evidence,
   * confidence, provenance) is metadata, not configuration — never diffed. */
  var STATUS_FIELDS = ['types', 'isDefaultFor', 'displayOrder'];
  var ACTION_FIELDS = ['code', 'active', 'applicability', 'mobileAvailable', 'types',
    'buttonGroup', 'flags', 'addsTags', 'removesTags', 'resultingType'];

  function indexBy(list, keyFn) {
    var m = {};
    list.forEach(function (x) { m[keyFn(x)] = x; });
    return m;
  }

  function fieldDiff(a, b, fields) {
    var changes = [];
    fields.forEach(function (f) {
      if (!S.deepEqual(a[f], b[f])) changes.push({ field: f, base: a[f], desired: b[f] });
    });
    return changes;
  }

  function diffObjects(baseList, desiredList, keyFn, fields) {
    var baseIdx = indexBy(baseList, keyFn);
    var desIdx = indexBy(desiredList, keyFn);
    var out = { added: [], removed: [], modified: [], unchanged: [] };
    Object.keys(desIdx).sort().forEach(function (k) {
      if (!baseIdx[k]) out.added.push({ key: k, object: desIdx[k] });
      else {
        var changes = fieldDiff(baseIdx[k], desIdx[k], fields);
        if (changes.length) out.modified.push({ key: k, changes: changes, base: baseIdx[k], desired: desIdx[k] });
        else out.unchanged.push({ key: k });
      }
    });
    Object.keys(baseIdx).sort().forEach(function (k) {
      if (!desIdx[k]) out.removed.push({ key: k, object: baseIdx[k] });
    });
    return out;
  }

  function edgeKeyAvail(e) { return e.action + ' | ' + e.status + ' | ' + e.type; }
  function edgeKeyResult(r) { return r.action + ' | ' + r.kind + ' | ' + r.toStatus + ' | ' + r.type; }

  function diffEdges(baseList, desiredList, keyFn) {
    var baseIdx = indexBy(baseList, keyFn);
    var desIdx = indexBy(desiredList, keyFn);
    var out = { added: [], removed: [], unchanged: 0 };
    Object.keys(desIdx).sort().forEach(function (k) {
      if (!baseIdx[k]) out.added.push(desIdx[k]); else out.unchanged++;
    });
    Object.keys(baseIdx).sort().forEach(function (k) {
      if (!desIdx[k]) out.removed.push(baseIdx[k]);
    });
    return out;
  }

  /* compare two models (normalised Studio shape). Currently the Helpdesk
   * domain — the editable surface; Orders joins when DESIGN covers it. */
  function compare(base, desired) {
    var d = {
      statuses: diffObjects(base.helpdesk.statuses, desired.helpdesk.statuses,
        function (s) { return s.name; }, STATUS_FIELDS),
      actions: diffObjects(base.helpdesk.actions, desired.helpdesk.actions,
        function (a) { return a.name; }, ACTION_FIELDS),
      availability: diffEdges(base.helpdesk.availability, desired.helpdesk.availability, edgeKeyAvail),
      results: diffEdges(base.helpdesk.results, desired.helpdesk.results, edgeKeyResult)
    };
    d.summary = {
      added: d.statuses.added.length + d.actions.added.length + d.availability.added.length + d.results.added.length,
      removed: d.statuses.removed.length + d.actions.removed.length + d.availability.removed.length + d.results.removed.length,
      modified: d.statuses.modified.length + d.actions.modified.length
    };
    d.isEmpty = d.summary.added === 0 && d.summary.removed === 0 && d.summary.modified === 0;
    return d;
  }

  /* Deviation schedule: the diff flattened into ordered human-readable
   * rows — consumed by the DESIGN panel and, later, the Solution Design
   * document generator. */
  function deviationSchedule(diff) {
    var rows = [];
    diff.statuses.added.forEach(function (x) { rows.push({ kind: 'ADDED', object: 'Status', detail: x.key }); });
    diff.statuses.removed.forEach(function (x) { rows.push({ kind: 'REMOVED', object: 'Status', detail: x.key }); });
    diff.statuses.modified.forEach(function (x) {
      x.changes.forEach(function (c) {
        rows.push({ kind: 'MODIFIED', object: 'Status', detail: x.key + ' · ' + c.field + ': ' + JSON.stringify(c.base) + ' → ' + JSON.stringify(c.desired) });
      });
    });
    diff.actions.added.forEach(function (x) { rows.push({ kind: 'ADDED', object: 'Action', detail: x.key }); });
    diff.actions.removed.forEach(function (x) { rows.push({ kind: 'REMOVED', object: 'Action', detail: x.key }); });
    diff.actions.modified.forEach(function (x) {
      x.changes.forEach(function (c) {
        rows.push({ kind: 'MODIFIED', object: 'Action', detail: x.key + ' · ' + c.field + ': ' + JSON.stringify(c.base) + ' → ' + JSON.stringify(c.desired) });
      });
    });
    diff.availability.added.forEach(function (e) { rows.push({ kind: 'ADDED', object: 'Availability', detail: e.action + ' available in ' + e.status + ' (' + e.type + ')' }); });
    diff.availability.removed.forEach(function (e) { rows.push({ kind: 'REMOVED', object: 'Availability', detail: e.action + ' no longer available in ' + e.status + ' (' + e.type + ')' }); });
    diff.results.added.forEach(function (r) { rows.push({ kind: 'ADDED', object: 'Result', detail: r.action + ' → ' + (r.kind === 'userSelects' ? 'user selects ' : '') + r.toStatus + ' (' + r.type + ')' }); });
    diff.results.removed.forEach(function (r) { rows.push({ kind: 'REMOVED', object: 'Result', detail: r.action + ' no longer → ' + r.toStatus + ' (' + r.type + ')' }); });
    return rows;
  }

  var api = { compare: compare, deviationSchedule: deviationSchedule };
  if (typeof window !== 'undefined') window.StudioDiff = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
