/* buildplan.js — the build-plan compiler: a diff (desired vs actual)
 * becomes a dependency-ordered, staged operation plan plus validation
 * results. Pure — no I/O, no DOM. Execution belongs to the harness
 * adapter (not built); this module produces the artefact it will consume.
 *
 * Staged passes (designed for circular relationships; the exact sequencing
 * stays adjustable until execution evidence pins it):
 *   1 CREATE   — object shells (statuses, then actions)
 *   2 RESOLVE  — read back created objects' environment GUIDs
 *   3 RELATE   — availability / result relationship changes + field updates
 *   4 DEFAULTS — defaults and cross-references
 *   5 READBACK — full re-read of touched objects
 *   6 VERIFY   — desired vs actual re-diff must be EMPTY
 */
(function () {
  'use strict';

  function compile(diff, opts) {
    opts = opts || {};
    var ops = [];
    var warnings = [];
    var unresolved = [];

    /* pass 1 — creates (statuses before actions: actions reference statuses) */
    diff.statuses.added.forEach(function (x) {
      ops.push({ pass: 1, op: 'CREATE', objectType: 'Status', target: x.key, detail: 'Create status "' + x.key + '" (types: ' + x.object.types.join(', ') + ')' });
      unresolved.push({ objectType: 'Status', key: x.key, reason: 'GUID minted by Concerto at create; resolved in pass 2' });
    });
    diff.actions.added.forEach(function (x) {
      ops.push({ pass: 1, op: 'CREATE', objectType: 'Action', target: x.key, detail: 'Create action "' + x.key + '" (group: ' + (x.object.buttonGroup || 'none') + ')' });
      unresolved.push({ objectType: 'Action', key: x.key, reason: 'GUID minted by Concerto at create; resolved in pass 2' });
    });

    /* pass 2 — identity resolution */
    if (unresolved.length) {
      ops.push({ pass: 2, op: 'RESOLVE', objectType: '—', target: unresolved.length + ' object(s)', detail: 'Read back created records; record canonicalKey → GUID in the instance identity map' });
    }

    /* pass 3 — relationships and field updates
     * removals first (freeing references), then adds; field updates after */
    diff.results.removed.forEach(function (r) {
      ops.push({ pass: 3, op: 'UNSET', objectType: 'Result', target: r.action, detail: r.action + ' no longer → ' + r.toStatus + ' (' + r.type + ')' });
    });
    diff.availability.removed.forEach(function (e) {
      ops.push({ pass: 3, op: 'UNTICK', objectType: 'Availability', target: e.action, detail: 'Remove "' + e.action + '" from ' + e.status + ' (' + e.type + ')' });
    });
    diff.availability.added.forEach(function (e) {
      ops.push({ pass: 3, op: 'TICK', objectType: 'Availability', target: e.action, detail: 'Make "' + e.action + '" available in ' + e.status + ' (' + e.type + ')' });
    });
    diff.results.added.forEach(function (r) {
      ops.push({ pass: 3, op: 'SET', objectType: 'Result', target: r.action, detail: r.action + ' → ' + (r.kind === 'userSelects' ? 'user selects ' : '') + r.toStatus + ' (' + r.type + ')' });
    });
    diff.actions.modified.forEach(function (x) {
      x.changes.forEach(function (c) {
        ops.push({ pass: 3, op: 'UPDATE', objectType: 'Action', target: x.key, detail: c.field + ': ' + JSON.stringify(c.base) + ' → ' + JSON.stringify(c.desired) });
      });
    });

    /* pass 4 — defaults and cross-references */
    diff.statuses.modified.forEach(function (x) {
      x.changes.forEach(function (c) {
        ops.push({ pass: 4, op: 'UPDATE', objectType: 'Status', target: x.key, detail: c.field + ': ' + JSON.stringify(c.base) + ' → ' + JSON.stringify(c.desired) });
      });
    });

    /* deletes last — deliberately flagged, never silent */
    diff.statuses.removed.forEach(function (x) {
      ops.push({ pass: 4, op: 'DELETE', objectType: 'Status', target: x.key, detail: 'Remove status "' + x.key + '" (relationship removals in pass 3 must complete first)' });
      warnings.push({ severity: 'WARNING', text: 'Plan deletes Vanilla status "' + x.key + '" — deletions of baseline objects need deliberate confirmation at execution time.' });
    });
    diff.actions.removed.forEach(function (x) {
      ops.push({ pass: 4, op: 'DELETE', objectType: 'Action', target: x.key, detail: 'Remove action "' + x.key + '"' });
      warnings.push({ severity: 'WARNING', text: 'Plan deletes Vanilla action "' + x.key + '" — deletions of baseline objects need deliberate confirmation at execution time.' });
    });

    /* passes 5/6 — always present when anything precedes them */
    if (ops.length) {
      ops.push({ pass: 5, op: 'READBACK', objectType: '—', target: 'all touched objects', detail: 'Re-read every touched record from the instance' });
      ops.push({ pass: 6, op: 'VERIFY', objectType: '—', target: 'desired vs actual', detail: 'Re-diff must be EMPTY; anything else fails the build with the residual diff attached' });
    }

    /* ---- validation ---- */
    diff.actions.added.forEach(function (x) {
      var hasAvail = diff.availability.added.some(function (e) { return e.action === x.key; });
      if (!hasAvail) warnings.push({ severity: 'WARNING', text: 'New action "' + x.key + '" has no availability — it will render nowhere unless machine-fired.' });
      if (!x.object.buttonGroup) warnings.push({ severity: 'INFO', text: 'New action "' + x.key + '" has no button group (only machine-fired actions normally omit one — VI-004).' });
    });
    diff.statuses.added.forEach(function (x) {
      var reachable = diff.results.added.some(function (r) { return r.toStatus === x.object.name; });
      if (!reachable) warnings.push({ severity: 'WARNING', text: 'New status "' + x.key + '" is unreachable — no action results in it (creation defaults/engines aside).' });
      var exits = diff.availability.added.some(function (e) { return e.status === x.object.name; });
      if (!exits) warnings.push({ severity: 'WARNING', text: 'New status "' + x.key + '" offers no actions — jobs arriving there would strand (compare VI-002).' });
    });

    return {
      kind: 'BUILD-PLAN',
      generatedAt: new Date().toISOString(),
      target: opts.target || 'none connected (previewed against the Vanilla baseline)',
      executable: false,
      executableReason: 'No execution adapter exists; execution additionally requires explicit per-plan authorisation, instance scope gating, receipts and read-back verification.',
      operationCount: ops.length,
      operations: ops,
      unresolvedIdentities: unresolved,
      warnings: warnings,
      passes: [
        { pass: 1, title: 'Create object shells' },
        { pass: 2, title: 'Resolve environment identities (GUIDs)' },
        { pass: 3, title: 'Relationships and field updates' },
        { pass: 4, title: 'Defaults, cross-references, gated deletions' },
        { pass: 5, title: 'Read back' },
        { pass: 6, title: 'Verify desired vs actual (must re-diff empty)' }
      ]
    };
  }

  var api = { compile: compile };
  if (typeof window !== 'undefined') window.StudioBuildPlan = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
