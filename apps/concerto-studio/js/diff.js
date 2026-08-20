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
    'buttonGroup', 'flags', 'addsTags', 'removesTags', 'resultingType',
    'hidden', 'constraints', 'timer', 'hold', 'orderStatusTrigger',
    'ordersEffects', 'emails', 'defaultOrdersProject', 'routesTo'];

  function indexBy(list, keyFn) {
    var m = {};
    /* Model families are arrays canonically, but a record written by an
     * external tool (or an older ingest) may arrive keyed by canonical key.
     * Both carry the same truth; refusing one shape turned a stored project
     * into a boot failure blamed on the canonical models. Tolerate both. */
    if (list && !Array.isArray(list)) list = Object.keys(list).map(function (k) { return list[k]; });
    (list || []).forEach(function (x) { m[keyFn(x)] = x; });
    return m;
  }

  function emptyish(v) {
    return v === undefined || v === null || (Array.isArray(v) && v.length === 0) ||
      (typeof v === 'object' && !Array.isArray(v) && v !== null && Object.keys(v).length === 0);
  }

  function fieldDiff(a, b, fields) {
    var changes = [];
    fields.forEach(function (f) {
      /* an absent field and an empty one carry the same truth — a record
         normalised by completeModel must not read as modified */
      if (emptyish(a[f]) && emptyish(b[f])) return;
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
  /* A model may declare which fields its SOURCE captured (meta.capture — set
   * by an instance crawl). Fields nobody captured on either side are not
   * comparable: they are excluded and listed in summary.notCompared rather
   * than reported as deviations. Silence here would read as "identical". */
  function capturedFields(model, which, all) {
    var cap = model && model.meta && model.meta.capture;
    if (!cap || !cap[which]) return all;
    return all.filter(function (f) { return cap[which].indexOf(f) !== -1; });
  }

  /* A crawl may cover only some Helpdesk Types. Comparing a Reactive-only
   * capture against the full model would read every Planned action as
   * "removed" and every dual-type action as "changed" — coverage artefacts,
   * not deviations. Both sides are therefore scoped to the covered Types
   * before diffing, and the scope is reported. */
  function coveredTypes(base, desired) {
    var a = base && base.meta && base.meta.capture && base.meta.capture.types;
    var b = desired && desired.meta && desired.meta.capture && desired.meta.capture.types;
    if (!a && !b) return null;
    if (!a) return b.slice();
    if (!b) return a.slice();
    return a.filter(function (t) { return b.indexOf(t) !== -1; });
  }

  function scope(model, types) {
    var hd = model.helpdesk;
    if (!types) return hd;
    function inScope(o) { return (o.types || []).some(function (t) { return types.indexOf(t) !== -1; }); }
    function narrow(o) {
      var c = Object.assign({}, o);
      c.types = (o.types || []).filter(function (t) { return types.indexOf(t) !== -1; });
      if (o.isDefaultFor) c.isDefaultFor = o.isDefaultFor.filter(function (t) { return types.indexOf(t) !== -1; });
      return c;
    }
    function edgeInScope(e) { return types.indexOf(e.type) !== -1; }
    return {
      statuses: hd.statuses.filter(inScope).map(narrow),
      actions: hd.actions.filter(inScope).map(narrow),
      availability: hd.availability.filter(edgeInScope),
      results: hd.results.filter(edgeInScope)
    };
  }

  function compare(base, desired) {
    var actionFields = capturedFields(desired, 'actionFields',
      capturedFields(base, 'actionFields', ACTION_FIELDS));
    var statusFields = capturedFields(desired, 'statusFields',
      capturedFields(base, 'statusFields', STATUS_FIELDS));
    var notCompared = ACTION_FIELDS.filter(function (f) { return actionFields.indexOf(f) === -1; })
      .concat(STATUS_FIELDS.filter(function (f) { return statusFields.indexOf(f) === -1; }));

    var types = coveredTypes(base, desired);
    var b = scope(base, types), t = scope(desired, types);

    /* A crawl that reads actions from the grouped-BY-STATUS view can only
     * ever see actions that are available somewhere. Actions nobody can see
     * there — engine-fired ones, and actions attached to no status at all —
     * are invisible to it by construction, so comparing them would report
     * "removed" for something the crawl was never able to look at. Both
     * sides are narrowed to actions with at least one availability edge. */
    var availabilityOnly = [base, desired].some(function (m) {
      return m && m.meta && m.meta.capture && m.meta.capture.actionsFrom === 'status-grouped-view';
    });
    var invisible = [];
    if (availabilityOnly) {
      var seen = {};
      b.availability.concat(t.availability).forEach(function (e) { seen[e.action] = true; });
      invisible = b.actions.filter(function (a) { return !seen[a.name]; })
        .map(function (a) { return a.name; });
      b = Object.assign({}, b, { actions: b.actions.filter(function (a) { return seen[a.name]; }) });
      t = Object.assign({}, t, { actions: t.actions.filter(function (a) { return seen[a.name]; }) });
    }

    /* A grouped-by-status crawl records an action's resulting status only
     * where the view actually drew one. An action listed without an arrow
     * proves nothing about its result, so silence there must not be read as
     * "the outcome was deleted". Result edges are compared only for actions
     * the crawl DID record an outcome for. */
    var bResults = b.results, tResults = t.results, resultsNotObserved = 0;
    var resultsPartial = [base, desired].some(function (m) {
      return m && m.meta && m.meta.capture && m.meta.capture.resultsFrom === 'status-grouped-view-arrows';
    });
    if (resultsPartial) {
      var withResult = {};
      t.results.forEach(function (r) { withResult[r.action] = true; });
      var before = b.results.length;
      bResults = b.results.filter(function (r) { return withResult[r.action]; });
      resultsNotObserved = before - bResults.length;
    }

    var d = {
      statuses: diffObjects(b.statuses, t.statuses,
        function (s) { return s.name; }, statusFields),
      actions: diffObjects(b.actions, t.actions,
        function (a) { return a.name; }, actionFields),
      availability: diffEdges(b.availability, t.availability, edgeKeyAvail),
      results: diffEdges(bResults, tResults, edgeKeyResult)
    };
    d.summary = {
      added: d.statuses.added.length + d.actions.added.length + d.availability.added.length + d.results.added.length,
      removed: d.statuses.removed.length + d.actions.removed.length + d.availability.removed.length + d.results.removed.length,
      modified: d.statuses.modified.length + d.actions.modified.length,
      notCompared: notCompared,
      scopedToTypes: types,
      invisibleToCrawl: invisible,
      resultsNotObserved: resultsNotObserved
    };
    d.isEmpty = d.summary.added === 0 && d.summary.removed === 0 && d.summary.modified === 0;
    return d;
  }

  /* Deviation schedule: the diff flattened into ordered human-readable
   * rows — consumed by the DESIGN panel and, later, the Solution Design
   * document generator. */
  function deviationSchedule(diff) {
    var rows = [];
    /* A RENAME arrives as added+removed plus an availability/result storm
       for every edge touching the status. It is ONE change. Detect it via
       the renamedFrom marker the design editor writes, emit one row, and
       silence the storm for both names. */
    var renamed = {};
    diff.statuses.added.forEach(function (x) {
      var from = x.object && x.object.renamedFrom;
      if (from && diff.statuses.removed.some(function (r) { return r.key === from; })) {
        renamed[x.key] = from; renamed[from] = x.key;
        rows.push({ kind: 'RENAMED', object: 'Status', detail: from + ' -> ' + x.key + ' (all references follow)' });
      }
    });
    diff.statuses.added.forEach(function (x) { if (!renamed[x.key]) rows.push({ kind: 'ADDED', object: 'Status', detail: x.key }); });
    diff.statuses.removed.forEach(function (x) { if (!renamed[x.key]) rows.push({ kind: 'REMOVED', object: 'Status', detail: x.key }); });
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

  /* One LOGICAL change per row. Removing an action that was available in
   * three statuses is ONE change (its edges travel with it); making an
   * action available in three statuses is one change with three details. */
  function groupDeviations(diff) {
    var rows = [];
    var addedActs = {}, removedActs = {};
    diff.actions.added.forEach(function (x) { addedActs[x.key] = true; });
    diff.actions.removed.forEach(function (x) { removedActs[x.key] = true; });
    var renamed = {};
    diff.statuses.added.forEach(function (x) {
      var from = x.object && x.object.renamedFrom;
      if (from && diff.statuses.removed.some(function (r) { return r.key === from; })) {
        renamed[x.key] = from; renamed[from] = x.key;
        rows.push({ kind: 'RENAMED', object: 'Status', detail: from + ' -> ' + x.key + ' (all references follow)' });
      }
    });
    diff.statuses.added.forEach(function (x) { if (!renamed[x.key]) rows.push({ kind: 'ADDED', object: 'Status', detail: x.key }); });
    diff.statuses.removed.forEach(function (x) { if (!renamed[x.key]) rows.push({ kind: 'REMOVED', object: 'Status', detail: x.key }); });
    diff.statuses.modified.forEach(function (x) {
      var rn = x.changes.filter(function (c) { return c.field === 'name'; })[0];
      if (rn) rows.push({ kind: 'RENAMED', object: 'Status', detail: JSON.stringify(rn.base) + ' -> ' + JSON.stringify(rn.desired) });
      x.changes.filter(function (c) { return c.field !== 'name'; }).forEach(function (c) {
        rows.push({ kind: 'MODIFIED', object: 'Status', detail: x.key + ' \u00b7 ' + c.field + ': ' + JSON.stringify(c.base) + ' -> ' + JSON.stringify(c.desired) });
      });
    });
    diff.actions.added.forEach(function (x) {
      var av = diff.availability.added.filter(function (e) { return e.action === x.key; }).map(function (e) { return e.status; });
      rows.push({ kind: 'ADDED', object: 'Action', detail: x.key + (av.length ? ' (available in ' + av.join(', ') + ')' : '') });
    });
    diff.actions.removed.forEach(function (x) {
      var av = diff.availability.removed.filter(function (e) { return e.action === x.key; }).map(function (e) { return e.status; });
      rows.push({ kind: 'REMOVED', object: 'Action', detail: x.key + (av.length ? ' (was available in ' + av.join(', ') + ')' : '') });
    });
    diff.actions.modified.forEach(function (x) {
      x.changes.forEach(function (c) {
        rows.push({ kind: 'MODIFIED', object: 'Action', detail: x.key + ' \u00b7 ' + c.field + ': ' + JSON.stringify(c.base) + ' -> ' + JSON.stringify(c.desired) });
      });
    });
    var groupAv = function (list, verb, skip) {
      var byAction = {};
      list.forEach(function (e) { if (skip[e.action] || renamed[e.status]) return; (byAction[e.action] = byAction[e.action] || []).push(e.status); });
      Object.keys(byAction).sort().forEach(function (a) {
        rows.push({ kind: verb === 'available' ? 'ADDED' : 'REMOVED', object: 'Availability',
          detail: a + ' ' + (verb === 'available' ? 'made available in ' : 'no longer available in ') +
            byAction[a].length + ' status' + (byAction[a].length > 1 ? 'es' : '') + ' (' + byAction[a].join(', ') + ')' });
      });
    };
    groupAv(diff.availability.added, 'available', addedActs);
    groupAv(diff.availability.removed, 'unavailable', removedActs);
    var groupRes = function (list, verb) {
      var by = {};
      list.forEach(function (r) { if (addedActs[r.action] || removedActs[r.action] || renamed[r.toStatus]) return; var k = r.action + ' -> ' + r.toStatus; (by[k] = by[k] || []).push(r.type); });
      Object.keys(by).sort().forEach(function (k) {
        rows.push({ kind: verb, object: 'Result', detail: k + ' (' + by[k].join(', ') + ')' });
      });
    };
    groupRes(diff.results.added, 'ADDED');
    groupRes(diff.results.removed, 'REMOVED');
    return rows;
  }

  var api = { compare: compare, deviationSchedule: deviationSchedule, groupDeviations: groupDeviations };
  if (typeof window !== 'undefined') window.StudioDiff = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
