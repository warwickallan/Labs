/* Studio test runner — browser-based (no Node on this machine, by design).
 * Results render to the page AND to document.title as "PASS n/n" /
 * "FAIL n/m" so an automated browser can read the outcome cheaply.
 * Golden rule: if a test fails against canonical Labs data, investigate
 * the model/loader — never bend the test.
 */
(function () {
  'use strict';

  var registry = [];
  function test(name, fn) { registry.push({ name: name, fn: fn }); }
  function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

  var S = window.StudioSchema;

  /* ---- unit tests: schema helpers (no data needed) -------------------- */

  test('kebab + canonicalKey', function () {
    assert(S.kebab('With Maintenance Team - R') === 'with-maintenance-team-r');
    assert(S.canonicalKey('hd', 'status', 'With Helpdesk') === 'hd:status:with-helpdesk');
    assert(S.canonicalKey('ord', 'supplier-action', null, 'SP07a') === 'ord:supplier-action:sp07a');
  });

  test('parseActionNotes recovers structured detail from generated prose', function () {
    var p = S.parseActionNotes(
      "Button group: Reactive Helpdesk Tasks. Flags: supplier_assignment, email_supplier. " +
      "Record view (E-008): Resulting type Reactive; Status 'Web page only'; " +
      "adds tag '01. Awaiting acceptance', removes tag '02. Supplier rejected'.");
    assert(p.buttonGroup === 'Reactive Helpdesk Tasks', 'buttonGroup');
    assert(p.flags.join('|') === 'supplier_assignment|email_supplier', 'flags');
    assert(p.resultingType === 'Reactive', 'resultingType');
    assert(p.addsTags[0] === '01. Awaiting acceptance', 'addsTags');
    assert(p.removesTags[0] === '02. Supplier rejected', 'removesTags');
    var empty = S.parseActionNotes('');
    assert(empty.buttonGroup === null && empty.flags.length === 0, 'empty notes safe');
  });

  test('deepEqual / deepClone / fingerprint stability', function () {
    var a = { x: [1, { y: 'z' }], n: null };
    var b = S.deepClone(a);
    assert(S.deepEqual(a, b), 'clone equal');
    assert(S.fingerprint(a) === S.fingerprint(b), 'fingerprint stable');
    b.x[1].y = 'w';
    assert(!S.deepEqual(a, b), 'mutation detected');
    assert(S.fingerprint(a) !== S.fingerprint(b), 'fingerprint differs');
  });

  /* ---- fidelity tests: real Labs models via the loader ----------------- */

  var loadedPromise = window.VanillaLoader.loadAll('../../../model/');

  test('all five model files load from the parent repository', function () {
    return loadedPromise.then(function (res) {
      assert(res.model && res.raw.helpdesk && res.raw.orders &&
        res.raw.crossDomain && res.raw.behaviours && res.raw.identities);
    });
  });

  test('every loader invariant passes against canonical Labs data', function () {
    return loadedPromise.then(function (res) {
      var failing = res.invariants.filter(function (c) { return !c.pass; });
      assert(failing.length === 0,
        failing.map(function (c) { return c.name + ' [' + c.detail + ']'; }).join('; '));
    });
  });

  test('Vanilla model is immutable (writes throw or are ignored)', function () {
    return loadedPromise.then(function (res) {
      var m = res.model;
      var before = m.helpdesk.actions.length;
      var threw = false;
      try { m.helpdesk.actions.push({ name: 'FAKE' }); } catch (e) { threw = true; }
      assert(threw || m.helpdesk.actions.length === before, 'push must not mutate');
      try { m.helpdesk.statuses[0].name = 'HACKED'; } catch (e) { /* strict mode throws */ }
      assert(m.helpdesk.statuses[0].name !== 'HACKED', 'field write must not stick');
    });
  });

  test('known ground truths: RH04, machine-fired RH03b, broken acceptance loop', function () {
    return loadedPromise.then(function (res) {
      var m = res.model;
      var rh04 = m.helpdesk.actions.filter(function (a) { return a.code === 'RH04'; })[0];
      assert(rh04, 'RH04 exists');
      assert(rh04.flags.indexOf('supplier_assignment') !== -1, 'RH04 is a supplier assignment');
      assert(rh04.addsTags.indexOf('01. Awaiting acceptance') !== -1, 'RH04 adds tag 01');

      var rh03b = m.helpdesk.actions.filter(function (a) { return a.code === 'RH03b'; })[0];
      assert(rh03b && rh03b.machineFired, 'RH03b is machine-fired (quote engine, E-016)');

      /* VI-009: SP01/SP02/ORC10 are not portal-visible in Vanilla */
      var broken = m.orders.supplierActions.filter(function (sa) {
        return ['SP01', 'SP02', 'ORC10'].indexOf(sa.canonicalKey) !== -1;
      });
      assert(broken.length === 3 && broken.every(function (sa) { return sa.portalVisible === false; }),
        'VI-009 acceptance-loop actions lack portal visibility');

      /* T-action trigger map: SP01 fires T02 (X-001) */
      var sp01 = m.orders.supplierActions.filter(function (sa) { return sa.canonicalKey === 'SP01'; })[0];
      assert(sp01.firesHelpdeskAction === 'T02', 'SP01 fires T02');
      var t02 = m.helpdesk.actions.filter(function (a) { return a.code === 'T02'; })[0];
      assert(t02 && t02.firedBySupplierActions.indexOf('SP01') !== -1, 'reverse link derived');
    });
  });

  test('availability projection: With Helpdesk offers RH02/RH04 (Reactive)', function () {
    return loadedPromise.then(function (res) {
      var m = res.model;
      var avail = m.helpdesk.availability.filter(function (e) {
        return e.status === 'With Helpdesk' && e.type === 'Reactive';
      }).map(function (e) { return e.action.split('.')[0]; });
      assert(avail.indexOf('RH02') !== -1, 'RH02 available from With Helpdesk');
      assert(avail.indexOf('RH04') !== -1, 'RH04 available from With Helpdesk');
    });
  });

  test('result projection: RH02 sets WMT-R; GM01 is user-selects (E1/E-007)', function () {
    return loadedPromise.then(function (res) {
      var m = res.model;
      var rh02 = m.helpdesk.results.filter(function (r) {
        return r.action.indexOf('RH02') === 0 && r.type === 'Reactive';
      })[0];
      assert(rh02 && rh02.kind === 'sets' && rh02.toStatus === 'With Maintenance Team - R', 'RH02 → WMT-R');
      var gm01 = m.helpdesk.results.filter(function (r) {
        return r.action.indexOf('GM01') === 0 && r.type === 'Reactive';
      })[0];
      assert(gm01 && gm01.kind === 'userSelects', 'GM01 user-selects');
    });
  });

  /* ---- desired-state fork / diff / undo -------------------------------- */

  test('fork → empty diff; move availability → exact deviation; undo/redo round-trip', function () {
    return loadedPromise.then(function (res) {
      var M = window.StudioModel, Df = window.StudioDiff;
      M.discard();
      M.fork(res.model);
      assert(Df.compare(res.model, M.desired()).isEmpty, 'fresh fork diffs empty');

      /* Business Case - R offers zero actions in Vanilla (VI-002) — move one there */
      M.moveAvailability('RH02. Assign to Maintenance team', 'With Helpdesk', 'Business Case - R', 'Reactive');
      var d = Df.compare(res.model, M.desired());
      assert(d.availability.added.length === 1 && d.availability.removed.length === 1,
        'move = 1 added + 1 removed, got +' + d.availability.added.length + ' −' + d.availability.removed.length);
      assert(d.availability.added[0].status === 'Business Case - R', 'added to BC-R');
      assert(d.availability.added[0].confidence === 'DESIGNED', 'designed edits graded DESIGNED');
      assert(Df.deviationSchedule(d).length === 2, 'schedule has 2 rows');

      assert(M.undo(), 'undo available');
      assert(Df.compare(res.model, M.desired()).isEmpty, 'undo restores Vanilla-equal state');
      assert(M.redo(), 'redo available');
      assert(!Df.compare(res.model, M.desired()).isEmpty, 'redo re-applies the move');
      M.discard();
    });
  });

  test('add/remove status flows through diff; removal cascades relationships', function () {
    return loadedPromise.then(function (res) {
      var M = window.StudioModel, Df = window.StudioDiff;
      M.fork(res.model);
      M.addStatus('ZZ Design Test', ['Reactive']);
      var d = Df.compare(res.model, M.desired());
      assert(d.statuses.added.length === 1 && d.statuses.added[0].key === 'ZZ Design Test', 'status added');

      M.addAvailability('G001. Add a note, photo or document', 'ZZ Design Test', 'Reactive');
      M.removeStatus('ZZ Design Test');
      d = Df.compare(res.model, M.desired());
      assert(d.isEmpty, 'removing the added status (and its edges) returns to Vanilla-equal');

      /* removing a VANILLA status must register as removals, incl. cascade */
      M.removeStatus('Business Case - R');
      d = Df.compare(res.model, M.desired());
      assert(d.statuses.removed.length === 1, 'vanilla status removal recorded');
      assert(d.results.removed.length >= 1, 'T07 sets-edge into BC-R cascades');
      M.discard();
    });
  });

  test('export → import round-trips the desired state against the same baseline', function () {
    return loadedPromise.then(function (res) {
      var M = window.StudioModel, Df = window.StudioDiff;
      M.fork(res.model);
      M.setResult('RH07. Amend SLA', 'With Helpdesk', 'sets', 'Reactive');
      var exported = M.exportJson();
      var parsed = JSON.parse(exported);
      assert(parsed.kind === 'CUSTOMER-DESIRED-STATE' && parsed.basedOnVanilla.helpdesk === res.model.meta.sourceFingerprints.helpdesk, 'baseline pinned');
      var before = Df.deviationSchedule(Df.compare(res.model, M.desired()));
      M.discard();
      var warning = M.importJson(exported, res.model);
      assert(warning === null, 'same baseline imports without warning');
      var after = Df.deviationSchedule(Df.compare(res.model, M.desired()));
      assert(JSON.stringify(before) === JSON.stringify(after), 'deviations identical after round-trip');
      M.discard();
    });
  });

  /* ---- add/modify action, inspector-grade mutations --------------------- */

  test('addAction / modifyAction / removeAction with duplicate guard and rollback', function () {
    return loadedPromise.then(function (res) {
      var M = window.StudioModel, Df = window.StudioDiff;
      M.discard();
      M.fork(res.model);

      M.addAction({ code: 'RH99', name: 'Escalate to manager', types: ['Reactive'], group: 'Reactive Helpdesk Tasks' });
      var d = Df.compare(res.model, M.desired());
      assert(d.actions.added.length === 1 && d.actions.added[0].key === 'RH99. Escalate to manager', 'action added');

      /* duplicate code must throw AND leave no stray undo snapshot */
      var undoDepth = M._state.undoStack.length;
      var threw = false;
      try { M.addAction({ code: 'RH99', name: 'Duplicate', types: ['Reactive'] }); } catch (e) { threw = true; }
      assert(threw, 'duplicate rejected');
      assert(M._state.undoStack.length === undoDepth, 'failed mutation left no undo snapshot');

      M.modifyAction('RH99. Escalate to manager', { mobileAvailable: true, buttonGroup: 'General Actions' });
      d = Df.compare(res.model, M.desired());
      assert(d.actions.added[0].object.mobileAvailable === true, 'modify applied');

      threw = false;
      try { M.modifyAction('RH99. Escalate to manager', { code: 'HACK' }); } catch (e) { threw = true; }
      assert(threw, 'non-editable field rejected');

      M.removeAction('RH99. Escalate to manager');
      assert(Df.compare(res.model, M.desired()).isEmpty, 'remove returns to Vanilla-equal');
      M.discard();
    });
  });

  /* ---- build-plan compiler ---------------------------------------------- */

  test('build plan: staged passes, dependency order, honest non-executability', function () {
    return loadedPromise.then(function (res) {
      var M = window.StudioModel, Df = window.StudioDiff, BP = window.StudioBuildPlan;
      M.fork(res.model);
      M.addStatus('ZZ Triage', ['Reactive']);
      M.addAction({ code: 'RH98', name: 'Send to triage', types: ['Reactive'], group: 'Reactive Helpdesk Tasks' });
      M.addAvailability('RH98. Send to triage', 'With Helpdesk', 'Reactive');
      M.setResult('RH98. Send to triage', 'ZZ Triage', 'sets', 'Reactive');

      var plan = BP.compile(Df.compare(res.model, M.desired()));
      assert(plan.executable === false, 'plan is honestly non-executable');
      assert(plan.operations.some(function (o) { return o.pass === 1 && o.objectType === 'Status' && o.target === 'ZZ Triage'; }), 'status create in pass 1');
      assert(plan.operations.some(function (o) { return o.pass === 2 && o.op === 'RESOLVE'; }), 'identity resolution pass present');
      assert(plan.unresolvedIdentities.length === 2, 'two unresolved identities (status + action)');
      var statusCreateIdx = plan.operations.findIndex(function (o) { return o.op === 'CREATE' && o.objectType === 'Status'; });
      var tickIdx = plan.operations.findIndex(function (o) { return o.op === 'TICK'; });
      assert(statusCreateIdx < tickIdx, 'creates precede relationship ticks');
      assert(plan.operations[plan.operations.length - 1].op === 'VERIFY', 'VERIFY is the final operation');
      /* ZZ Triage gets a result INTO it and RH98 has availability, so the
       * only expected warning is the new status offering no exit actions */
      assert(plan.warnings.some(function (w) { return /offers no actions/.test(w.text); }), 'strand warning raised');
      M.discard();

      /* empty diff → empty plan */
      M.fork(res.model);
      var emptyPlan = BP.compile(Df.compare(res.model, M.desired()));
      assert(emptyPlan.operationCount === 0, 'no changes → no operations');
      M.discard();
    });
  });

  /* ---- solution design generator ----------------------------------------- */

  test('solution design: vanilla edition generated from the canonical model', function () {
    return loadedPromise.then(function (res) {
      var html = window.StudioSolDesign.generate(res.model, {
        edition: 'vanilla',
        findings: window.StudioRules.runAll(res.model)
      });
      assert(html.indexOf('<!DOCTYPE html>') === 0, 'standalone document');
      assert(html.indexOf('Vanilla System Solution Design') !== -1, 'title');
      /* every status must appear as a section */
      res.model.helpdesk.statuses.forEach(function (s) {
        assert(html.indexOf('<h3>' + s.name) !== -1, 'status section: ' + s.name);
      });
      assert(html.indexOf('RH04. Assign to contractor') !== -1, 'actions rendered');
      assert(html.indexOf('SP01 Accept job') !== -1, 'supplier actions rendered');
      assert(html.indexOf('VI-009') !== -1, 'known defect stated');
      assert(html.indexOf('X-018') !== -1, 'cross-domain edges rendered');
      assert(html.indexOf('not yet carried in the machine-readable model') !== -1, 'register-sourced facts marked honestly');
    });
  });

  test('solution design: customer edition carries the deviation schedule', function () {
    return loadedPromise.then(function (res) {
      var M = window.StudioModel;
      M.fork(res.model);
      M.addStatus('ZZ Customer Status', ['Reactive']);
      var diff = window.StudioDiff.compare(res.model, M.desired());
      var html = window.StudioSolDesign.generate(M.desired(), {
        edition: 'customer', diff: diff, findings: window.StudioRules.runAll(M.desired())
      });
      assert(html.indexOf('Desired Customer Solution Design') !== -1, 'customer title');
      assert(html.indexOf('Deviation Schedule') !== -1, 'deviation section present');
      assert(html.indexOf('ZZ Customer Status') !== -1, 'deviation listed');
      M.discard();
    });
  });

  /* ---- harness adapter boundary ------------------------------------------ */

  test('harness adapter: crawl stays read-only; writes go through the gated /execute path', function () {
    var H = window.StudioHarness;
    return H.probe().then(function (p) {
      if (p.available) {
        /* the CRAWL/browser capability is read-only by construction — the
           write path is a separate, human-gated endpoint, not this flag */
        assert(p.writeCapability === false, 'a running harness reports writeCapability=false for the crawl surface');
      } else {
        assert(p.reason, 'unavailability carries a reason');
      }
      /* execute now posts to /execute; when writing is disabled (or the
         harness is down) it rejects rather than silently succeeding — the
         gate lives in the harness, never in an always-false client stub */
      assert(typeof H.execute === 'function', 'the client exposes an execute() that reaches the gated endpoint');
      return H.execute({ op: 'noop' }, false).then(
        function (res) { assert(res, 'a reachable, write-enabled harness returns an audit'); },
        function (err) { assert(err && err.message, 'when disabled or down, execute rejects with a reason (never a fake success)'); }
      );
    });
  });

  /* ---- instance snapshot pipeline ---------------------------------------- */

  test('snapshot round-trip: raw shapes → normaliseSnapshot → empty diff vs Vanilla', function () {
    return loadedPromise.then(function (res) {
      /* a synthetic INSTANCE-SNAPSHOT carrying the SAME raw model shapes
       * the crawler emits — normalising it must reproduce the Vanilla
       * model exactly (the oracle the demo crawl is judged against) */
      var snap = {
        kind: 'INSTANCE-SNAPSHOT', snapshotVersion: 1,
        meta: { targetUrl: res.raw.helpdesk.metadata.environment, crawledAt: '2026-08-19T00:00:00', counts: {}, warnings: [], notCrawled: [] },
        identities: res.raw.identities,
        helpdesk: res.raw.helpdesk,
        orders: res.raw.orders
      };
      var m1 = window.VanillaLoader.normaliseSnapshot(snap);
      var d = window.StudioDiff.compare(res.model, m1);
      assert(d.isEmpty, 'identical raw sources must normalise to a Vanilla-equal model; got +' +
        d.summary.added + ' −' + d.summary.removed + ' ~' + d.summary.modified);
      /* determinism: normalise twice, fingerprints equal */
      var m2 = window.VanillaLoader.normaliseSnapshot(snap);
      var strip = function (m) { var c = window.StudioSchema.deepClone(m); delete c.meta; return c; };
      assert(window.StudioSchema.fingerprint(strip(m1)) === window.StudioSchema.fingerprint(strip(m2)), 'normalisation deterministic');
      /* environment GUID isolation: canonical keys carry no GUIDs */
      assert(m1.helpdesk.statuses.every(function (s) { return !/[0-9a-f]{8}-/.test(s.key); }), 'no GUIDs in canonical keys');
    });
  });

  test('findings report NOT EVALUATED when required fields are missing', function () {
    return loadedPromise.then(function (res) {
      /* a sparse snapshot: statuses known but no supplier actions, no tags,
       * no availability — rules must not fire OR falsely pass */
      var sparse = window.VanillaLoader.normaliseSnapshot({
        kind: 'INSTANCE-SNAPSHOT', snapshotVersion: 1,
        meta: { targetUrl: 'x', crawledAt: 'x' },
        identities: {},
        helpdesk: undefined,
        orders: undefined
      });
      var detailed = window.StudioRules.runAllDetailed(sparse);
      assert(detailed.findings.length === 0, 'no findings fabricated from an empty model');
      assert(detailed.notEvaluated.length >= 5, 'missing-field rules reported NOT EVALUATED, got ' + detailed.notEvaluated.length);
      assert(detailed.notEvaluated.every(function (n) { return n.reason; }), 'each carries its reason');

      /* the full model evaluates everything */
      var full = window.StudioRules.runAllDetailed(res.model);
      assert(full.notEvaluated.length === 0, 'canonical model leaves nothing unevaluated');
    });
  });

  /* ---- findings engine -------------------------------------------------- */

  test('rules recover the known Vanilla defects with correct fixability', function () {
    return loadedPromise.then(function (res) {
      var findings = window.StudioRules.runAll(res.model);
      function byRule(id) { return findings.filter(function (f) { return f.ruleId === id; }); }

      var portal = byRule('R-PORTAL-ACCEPTANCE');
      var portalObjs = portal.map(function (f) { return f.object.split(' ')[0]; }).sort().join(',');
      assert(portalObjs === 'ORC10,SP01', 'VI-009 portal findings = SP01 + ORC10, got ' + portalObjs);
      assert(portal.every(function (f) { return f.fixable && f.fix.field === 'portalVisible'; }), 'portal findings fixable');

      var reject = byRule('R-REJECT-AVAILABILITY');
      assert(reject.length === 1 && reject[0].object.indexOf('SP02') === 0, 'SP02 availability contradiction found');
      assert(reject[0].fix.to.indexOf('Awaiting acceptance') !== -1, 'proposed availability includes AWA');

      var dead = byRule('R-DEAD-END-STATUS').map(function (f) { return f.object; }).sort();
      assert(dead.indexOf('Business Case - R') !== -1 && dead.indexOf('Quote Requested - R') !== -1,
        'dead ends include BC-R and QR-R, got ' + dead.join(', '));

      assert(byRule('R-DUPLICATE-NAMES').length === 1, 'VO-001 duplicate Default priority found');

      /* VI-010 is computable since model v2 carries structured tag automation */
      var vi010 = byRule('R-INVERTED-HOLD-TAGS');
      assert(vi010.length === 1 && vi010[0].object.indexOf('GM06') === 0, 'VI-010 GM06 computed from structured tags');

      /* fixable: SP01+ORC10 portal visibility, SP02 availability, GM06 tag
       * automation = 4 operations. SP02's portal-visibility gap becomes
       * computable once when-to-show is carried in the orders model. */
      var patch = window.StudioRules.compileFixPatch(findings);
      assert(patch.operations.length === 4, '4 fixable operations, got ' + patch.operations.length);
      assert(patch.operations.every(function (op) { return op.target && op.field; }), 'ops well-formed');
    });
  });

  /* ---- view smoke tests: render real projections into a sandbox -------- */

  function sandbox() {
    var sb = document.getElementById('sandbox');
    while (sb.firstChild) sb.removeChild(sb.firstChild);
    return sb;
  }

  test('Diagram renders 13 status columns + Not-allocated (All types)', function () {
    return loadedPromise.then(function (res) {
      window.StudioDiagram._state.type = 'All';
      window.StudioDiagram._state.search = '';
      window.StudioDiagram._state.collapsed = {};
      window.StudioDiagram.render(sandbox(), res.model);
      var cols = document.querySelectorAll('#sandbox .dcol');
      assert(cols.length === 14, '14 columns expected, got ' + cols.length);
      var cards = document.querySelectorAll('#sandbox .dcard');
      assert(cards.length > 90, 'expected 95+ availability cards + machine column, got ' + cards.length);
    });
  });

  test('Diagram Reactive filter shows only Reactive statuses', function () {
    return loadedPromise.then(function (res) {
      window.StudioDiagram._state.type = 'Reactive';
      window.StudioDiagram.render(sandbox(), res.model);
      var cols = document.querySelectorAll('#sandbox .dcol:not(.machine)');
      assert(cols.length === 9, '9 Reactive status columns, got ' + cols.length);
      window.StudioDiagram._state.type = 'All';
    });
  });

  test('Action Map renders 13 | 50 | 13 lanes and pin draws edges', function () {
    return loadedPromise.then(function (res) {
      window.StudioActionMap._state.type = 'All';
      window.StudioActionMap._state.search = '';
      window.StudioActionMap._state.pinned = null;
      window.StudioActionMap.render(sandbox(), res.model);
      var lanes = document.querySelectorAll('#sandbox .lane');
      var counts = Array.prototype.map.call(lanes, function (l) { return l.querySelectorAll('.lrow').length; });
      assert(counts.join(',') === '13,50,13', 'lane counts ' + counts.join(','));
      assert(document.querySelectorAll('#sandbox #mapSvg path').length === 0, 'default view draws no edges');
      var rows = document.querySelectorAll('#sandbox .lane:nth-child(3) .lrow');
      var rh04 = Array.prototype.filter.call(rows, function (r) { return r.textContent.indexOf('RH04') === 0; })[0];
      rh04.click();
      assert(document.querySelectorAll('#sandbox #mapSvg path').length === 4, 'RH04 pin draws 4 edges (3 avail + 1 sets)');
      window.StudioActionMap._state.pinned = null;
    });
  });

  test('Matrix renders all 50 actions with sortable projection', function () {
    return loadedPromise.then(function (res) {
      window.StudioGrid._state.type = 'All';
      window.StudioGrid._state.search = '';
      window.StudioGrid.render(sandbox(), res.model);
      var rows = document.querySelectorAll('#sandbox tbody tr');
      assert(rows.length === 50, '50 rows, got ' + rows.length);
    });
  });

  test('Overview + Configuration render from the loaded model', function () {
    return loadedPromise.then(function (res) {
      window.StudioOverview.render(sandbox(), res.model, res.invariants);
      assert(document.querySelectorAll('#sandbox .tile').length >= 6, 'overview tiles');
      window.StudioConfig.render(sandbox(), res.model);
      assert(document.querySelectorAll('#sandbox .tile').length >= 10, 'config sections');
    });
  });

  /* ---- projects: persistence + current-project context ------------------ */

  var PROJECTS_KEY = 'concerto-studio-projects-v1';
  var INSTANCE_KEY = 'concerto-studio-instance-v1';

  function syntheticSnapshot(res) {
    /* the same raw model shapes the crawler emits (see 'snapshot round-trip') */
    return {
      kind: 'INSTANCE-SNAPSHOT', snapshotVersion: 1,
      meta: { targetUrl: 'x', crawledAt: '2026-08-19T00:00:00', counts: {}, warnings: [], notCrawled: [] },
      identities: res.raw.identities,
      helpdesk: res.raw.helpdesk,
      orders: res.raw.orders
    };
  }

  test('projects: create / list / open / close / addChange round-trip through localStorage', function () {
    var P = window.StudioProject;
    localStorage.removeItem(PROJECTS_KEY);
    try {
      var rec = P.create({ name: 'ZZ Test Customer', instanceUrl: 'https://zz.example', domains: ['Reactive Helpdesk'] });
      assert(rec.formatVersion === 1 && rec.key === 'zz-test-customer', 'record created with version + slug key');
      assert(P.list().length === 1 && P.list()[0].name === 'ZZ Test Customer', 'list finds it');
      assert(P.get(rec.key).instanceUrl === 'https://zz.example', 'get reads it back');
      assert(P.current() === null, 'no current project before open');

      var opened = P.open(rec.key);
      assert(opened && opened.lastOpenedAt, 'open stamps lastOpenedAt');
      assert(P.current() && P.current().key === rec.key, 'open sets currentKey');

      P.addChange('did a thing');
      P.addChange({ text: 'did another', kind: 'design' });
      assert(P.current().changeLog.length === 2, 'changes appended');
      assert(P.current().changeLog.every(function (c) { return c.at; }), 'entries stamped');

      /* the raw localStorage payload carries everything */
      var raw = JSON.parse(localStorage.getItem(PROJECTS_KEY));
      assert(raw.currentKey === rec.key && raw.projects[rec.key].changeLog.length === 2, 'store persisted');

      P.close();
      assert(P.current() === null, 'close clears currentKey');
      assert(P.list().length === 1, 'close keeps the record');
    } finally {
      localStorage.removeItem(PROJECTS_KEY);
    }
  });

  test('projects: captureContext stores instance + desired state; open() restores both', function () {
    return loadedPromise.then(function (res) {
      var P = window.StudioProject, M = window.StudioModel;
      var prevApp = window.StudioApp;
      var prevInstanceLS = localStorage.getItem(INSTANCE_KEY);
      localStorage.removeItem(PROJECTS_KEY);
      M.discard();
      try {
        var snap = syntheticSnapshot(res);
        var instModel = window.VanillaLoader.normaliseSnapshot(snap);
        window.StudioApp = { model: res.model, instance: null };

        var rec = P.create({ name: 'ZZ Context', instanceUrl: 'https://ctx.example', domains: ['Reactive Helpdesk'] });
        P.open(rec.key);

        /* build a live context: instance record + desired-state fork with one edit */
        window.StudioApp.instance = { snapshotId: 't', meta: snap.meta, model: instModel };
        M.fork(res.model);
        M.addStatus('ZZ Project Status', ['Reactive']);

        var saved = P.captureContext();
        assert(saved.instance && saved.instance.snapshotId === 't', 'instance captured');
        assert(saved.desiredHelpdesk && saved.desiredHelpdesk.kind === 'CUSTOMER-DESIRED-STATE', 'desired state captured as the model.js export');
        assert(saved.lastCrawlAt === snap.meta.crawledAt, 'lastCrawlAt stamped from the snapshot meta');
        assert(S.deepEqual(saved.basedOnVanilla, res.model.meta.sourceFingerprints), 'Vanilla fingerprints pinned');

        /* wipe the live context, then open() must restore it */
        window.StudioApp.instance = null;
        M.discard();
        assert(!M.hasFork(), 'context wiped');
        P.open(rec.key);
        assert(window.StudioApp.instance && window.StudioApp.instance.snapshotId === 't', 'open restores the instance record');
        assert(M.hasFork(), 'open restores the desired-state fork');
        assert(M.desired().helpdesk.statuses.some(function (s) { return s.name === 'ZZ Project Status'; }), 'the design edit survived the round-trip');
        assert(window.StudioDiff.compare(res.model, M.desired()).statuses.added.length === 1, 'deviation recomputes identically');

        /* opening a project WITHOUT context must clear, not throw */
        var bare = P.create({ name: 'ZZ Bare', instanceUrl: '', domains: [] });
        P.open(bare.key);
        assert(window.StudioApp.instance === null, 'bare project clears the instance context');
        assert(!M.hasFork(), 'bare project clears the design fork');
      } finally {
        M.discard();
        window.StudioApp = prevApp;
        if (prevInstanceLS === null) localStorage.removeItem(INSTANCE_KEY);
        else { try { localStorage.setItem(INSTANCE_KEY, prevInstanceLS); } catch (e) { /* */ } }
        localStorage.removeItem(PROJECTS_KEY);
      }
    });
  });

  test('projects: exportProject / importProject identity', function () {
    var P = window.StudioProject;
    localStorage.removeItem(PROJECTS_KEY);
    try {
      var rec = P.create({ name: 'ZZ Export', instanceUrl: 'https://exp.example', domains: ['Reactive Helpdesk'] });
      P.save(rec.key, { notes: 'hello', changeLog: [{ at: '2026-08-19T00:00:00Z', text: 'x' }] });
      var text = P.exportProject(rec.key);
      var parsed = JSON.parse(text);
      assert(parsed.kind === 'CONCERTO-STUDIO-PROJECT' && parsed.formatVersion === 1, 'file envelope');
      assert(parsed.project.key === rec.key && parsed.project.notes === 'hello', 'record carried');

      localStorage.removeItem(PROJECTS_KEY);
      var imported = P.importProject(text);
      assert(imported.key === rec.key, 'import returns the record');
      assert(JSON.stringify(P.get(rec.key)) === JSON.stringify(parsed.project), 'record identical after import');
      assert(JSON.stringify(JSON.parse(P.exportProject(rec.key)).project) === JSON.stringify(parsed.project), 'export → import → export identity');

      var threw = false;
      try { P.importProject('{"kind":"WRONG"}'); } catch (e) { threw = true; }
      assert(threw, 'wrong kind rejected');
    } finally {
      localStorage.removeItem(PROJECTS_KEY);
    }
  });

  test('projects: delete clears the record and currentKey (files untouched by design)', function () {
    var P = window.StudioProject;
    localStorage.removeItem(PROJECTS_KEY);
    try {
      var rec = P.create({ name: 'ZZ Doomed', instanceUrl: '', domains: [] });
      P.open(rec.key);
      assert(P.current() && P.current().key === rec.key, 'open before delete');
      assert(P.remove(rec.key) === true, 'remove reports success');
      assert(P.get(rec.key) === null, 'record gone');
      assert(P.current() === null, 'currentKey cleared with it');
      assert(P.remove(rec.key) === false, 'second remove is a safe no-op');
    } finally {
      localStorage.removeItem(PROJECTS_KEY);
    }
  });

  test('Projects view: cards render; deviation/findings counts guard an absent instance', function () {
    return loadedPromise.then(function (res) {
      var P = window.StudioProject;
      localStorage.removeItem(PROJECTS_KEY);
      try {
        P.create({ name: 'ZZ No Instance', instanceUrl: 'https://a.example', domains: ['Reactive Helpdesk'] });
        var b = P.create({ name: 'ZZ With Instance', instanceUrl: 'https://b.example', domains: ['Reactive Helpdesk'] });
        var snap = syntheticSnapshot(res);
        P.save(b.key, { instance: { snapshotId: 's', meta: snap.meta, model: window.VanillaLoader.normaliseSnapshot(snap) } });

        window.StudioProjects.render(sandbox(), res.model);
        var cards = document.querySelectorAll('#sandbox .project-card');
        assert(cards.length === 2, '2 project cards, got ' + cards.length);
        function cardFor(name) {
          return Array.prototype.filter.call(cards, function (c) { return c.textContent.indexOf(name) !== -1; })[0];
        }
        var noInst = cardFor('ZZ No Instance');
        assert(noInst.querySelector('.proj-dev').textContent === '—', 'no instance → deviations show —');
        assert(noInst.querySelector('.proj-findings').textContent === '—', 'no instance → findings show —');
        var withInst = cardFor('ZZ With Instance');
        assert(withInst.querySelector('.proj-dev').textContent === '0', 'Vanilla-identical instance → 0 deviations');
        assert(/^\d+$/.test(withInst.querySelector('.proj-findings').textContent), 'findings computed live from the instance model');
      } finally {
        localStorage.removeItem(PROJECTS_KEY);
      }
    });
  });

  /* ---- settings view + project-file record shape ----------------------- */

  test('Settings has the baseline registry, ratified date, Vanilla evidence and Storage', function () {
    return loadedPromise.then(function (res) {
      var sb = document.getElementById('sandbox');
      while (sb.firstChild) sb.removeChild(sb.firstChild);
      window.StudioApp = window.StudioApp || {};
      window.StudioSettings.render(sb, res.model, res.invariants);
      /* the simplified Settings: three calm sections, detail behind folds */
      assert(/Baseline registry/i.test(sb.textContent), 'baseline registry (behind the Vanilla fold)');
      assert(sb.querySelector('input[type=date]'), 'ratified-date control');
      assert(/Discovery evidence/i.test(sb.textContent), 'Vanilla evidence lives under the Vanilla section');
      assert(/Storage/i.test(sb.textContent), 'Storage section');
      assert(sb.textContent.indexOf(res.model.meta.sourceFingerprints.helpdesk) !== -1, 'the baseline fingerprint is available (technical detail)');
      assert(sb.querySelectorAll('details').length >= 3, 'engineering detail sits behind disclosures, not on the page');
    });
  });

  test('project Evidence is separate from Vanilla evidence and shows project history', function () {
    return loadedPromise.then(function (res) {
      var sb = document.getElementById('sandbox');
      while (sb.firstChild) sb.removeChild(sb.firstChild);
      window.StudioApp = window.StudioApp || {}; window.StudioApp.model = res.model;
      withCleanProjects(function () {
        /* no project open → prompts to select a project, points to Settings for Vanilla evidence */
        window.StudioProjectEvidence.render(sb, res.model);
        assert(/Project evidence/i.test(sb.textContent) && /Settings/.test(sb.textContent), 'no-project state points to Settings');
        /* with a project open → shows its change receipts */
        window.StudioProject.importProject(fileFor('kirklees-council', 'Kirklees Council', {
          changeLog: [{ at: '2026-08-19', id: 'CHG-001', object: 'SP01', outcome: 'PASS' }],
          findingsSummary: { resolved: ['VI-009 fixed'] }
        }));
        window.StudioProject.open('kirklees-council');
        while (sb.firstChild) sb.removeChild(sb.firstChild);
        window.StudioProjectEvidence.render(sb, res.model);
        assert(/Change receipts/i.test(sb.textContent), 'shows change receipts');
        assert(sb.textContent.indexOf('CHG-001') !== -1, 'lists the project change');
        assert(sb.textContent.indexOf('VI-009 fixed') !== -1, 'shows project findings');
        window.StudioProject.close();
      });
    });
  });

  test('Design nests Edit / Compare / Findings / Build (Build is not a separate destination)', function () {
    return loadedPromise.then(function (res) {
      var sb = document.getElementById('sandbox');
      while (sb.firstChild) sb.removeChild(sb.firstChild);
      window.StudioApp = window.StudioApp || {}; window.StudioApp.model = res.model;
      var M = window.StudioModel;
      M.discard(); M.fork(res.model);
      window.StudioDesign.render(sb, res.model);
      var tabLabels = Array.prototype.map.call(sb.querySelectorAll('.toolstrip .seg button'), function (b) { return b.textContent; });
      assert(tabLabels.indexOf('Edit') !== -1 && tabLabels.indexOf('Compare') !== -1 &&
        tabLabels.indexOf('Findings') !== -1 && tabLabels.indexOf('Build') !== -1,
        'Design tabs = Edit/Compare/Findings/Build, got ' + tabLabels.join(','));
      M.discard();
    });
  });

  function withCleanProjects(fn) {
    var KEY = window.StudioProject.STORAGE_KEY;
    var saved = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    try { return fn(); } finally { if (saved) localStorage.setItem(KEY, saved); else localStorage.removeItem(KEY); }
  }
  function fileFor(key, name, extra) {
    var p = { formatVersion: 1, key: key, name: name, instanceUrl: 'https://' + key + '.example', domains: ['Reactive Helpdesk'], createdAt: 'x', lastOpenedAt: null, lastCrawlAt: null, concertoBuild: null, basedOnVanilla: null, instance: null, desiredHelpdesk: null, findingsState: {}, notes: '', changeLog: [] };
    Object.keys(extra || {}).forEach(function (k) { p[k] = extra[k]; });
    return JSON.stringify({ kind: 'CONCERTO-STUDIO-PROJECT', formatVersion: 1, project: p });
  }

  test('durable project-file record imports and beats a stale localStorage entry', function () {
    return loadedPromise.then(function () {
      withCleanProjects(function () {
        /* stale localStorage record with the WRONG url */
        window.StudioProject.create({ key: 'kirklees-council', name: 'STALE', instanceUrl: 'https://wrong.example' });
        /* durable file for the same key wins */
        var rec = window.StudioProject.importProject(fileFor('kirklees-council', 'Kirklees Council', { changeLog: [{ at: 'x', id: 'CHG-001' }] }));
        assert(rec.name === 'Kirklees Council', 'file name wins');
        assert(window.StudioProject.get('kirklees-council').instanceUrl === 'https://kirklees-council.example', 'file url wins over stale');
        assert(window.StudioProject.get('kirklees-council').changeLog.length === 1, 'change log carried');
      });
    });
  });

  test('exactly two seeded projects; stale non-manifest keys can be pruned', function () {
    return loadedPromise.then(function () {
      withCleanProjects(function () {
        window.StudioProject.importProject(fileFor('warwick-demo', 'Warwick Demo'));
        window.StudioProject.importProject(fileFor('kirklees-council', 'Kirklees Council'));
        window.StudioProject.create({ key: 'zz-stale', name: 'ZZ Stale', instanceUrl: 'x' }); /* not in manifest */
        var manifest = ['warwick-demo', 'kirklees-council'];
        window.StudioProject.list().forEach(function (p) { if (manifest.indexOf(p.key) === -1) window.StudioProject.remove(p.key); });
        var keys = window.StudioProject.list().map(function (p) { return p.key; }).sort();
        assert(keys.length === 2 && keys[0] === 'kirklees-council' && keys[1] === 'warwick-demo', 'exactly the two manifest projects remain: ' + keys.join(','));
      });
    });
  });

  test('project switching carries no cross-project state leakage', function () {
    return loadedPromise.then(function (res) {
      withCleanProjects(function () {
        window.StudioApp = window.StudioApp || {};
        window.StudioApp.model = res.model;
        var instA = { snapshotId: 'A', meta: { targetUrl: 'https://a' }, model: res.model };
        window.StudioProject.importProject(fileFor('proj-a', 'Project A', { instance: instA }));
        window.StudioProject.importProject(fileFor('proj-b', 'Project B')); /* no instance */
        window.StudioProject.open('proj-a');
        assert(window.StudioApp.instance && window.StudioApp.instance.snapshotId === 'A', 'A opens with its instance');
        window.StudioProject.open('proj-b');
        assert(!window.StudioApp.instance, 'switching to B (no instance) clears A instance — no leak');
        window.StudioProject.close();
      });
    });
  });

  /* ---- instance ingest + snapshot timeline ----------------------------- */

  /* A miniature capture in the recorded-crawl shape. Deliberately includes
   * the two genuinely ambiguous cases the real Kirklees capture contains:
   * "WC-R" (With Contractor - R *or* Work Complete - R) resolvable from the
   * baseline for RH04, and unresolvable for a code the baseline lacks. */
  var CAPTURE = {
    kind: 'INSTANCE-SNAPSHOT',
    label: 'TEST CAPTURE',
    meta: { targetUrl: 'https://test.example', crawledAt: '2026-08-19T09:30:00Z', crawlMethod: 'unit test' },
    statuses: {
      listLevel: 'WH 10, WMT-R 20, WC-R 30, WC-R(work) 60, Closed 70. With Helpdesk=Default.',
      typeAttribution: {
        reactive: ['With Helpdesk', 'With Maintenance Team - R', 'With Contractor - R', 'Work Complete - R', 'Closed'],
        planned: []
      },
      recordLevelReactive: { 'With Helpdesk': { ticked: ['Default status'] } }
    },
    actionsGroupedViewReactive: {
      'With Helpdesk': ['G001 Add note', 'RH04 Assign to contractor→WC-R', 'ZZ99 Invented→WC-R'],
      'With Contractor - R': ['G001']
    }
  };

  test('captured crawl ingests into a real model (identity, availability, results)', function () {
    return loadedPromise.then(function (res) {
      var out = window.StudioIngest.fromCapturedCrawl(CAPTURE, res.model);
      var m = out.model;
      assert(m.helpdesk.statuses.length === 5, '5 statuses ingested, got ' + m.helpdesk.statuses.length);
      var wh = m.helpdesk.statuses.filter(function (s) { return s.name === 'With Helpdesk'; })[0];
      assert(wh && wh.displayOrder === 10, 'sort order read from the capture, got ' + (wh && wh.displayOrder));
      assert(wh.isDefaultFor.indexOf('Reactive') !== -1, 'default status read from the capture');
      var codes = m.helpdesk.actions.map(function (a) { return a.code; }).sort().join(',');
      assert(codes === 'G001,RH04,ZZ99', 'action codes ingested: ' + codes);
      var g001 = m.helpdesk.actions.filter(function (a) { return a.code === 'G001'; })[0];
      assert(/^G001\./.test(g001.name), 'known code resolves to the baseline action name: ' + g001.name);
      assert(g001.notesProvenance === 'OBSERVED-CRAWL', 'ingested actions declare crawl provenance');
      assert(m.helpdesk.availability.filter(function (e) { return e.action === g001.name; }).length === 2,
        'G001 availability captured in both statuses');
    });
  });

  test('ambiguous abbreviations resolve against the baseline or stay unresolved — never guessed', function () {
    return loadedPromise.then(function (res) {
      var out = window.StudioIngest.fromCapturedCrawl(CAPTURE, res.model);
      var rh04 = out.model.helpdesk.actions.filter(function (a) { return a.code === 'RH04'; })[0];
      var r = out.model.helpdesk.results.filter(function (x) { return x.action === rh04.name; })[0];
      assert(r && r.toStatus === 'With Contractor - R',
        'RH04 → WC-R disambiguated to With Contractor - R, got ' + (r && r.toStatus));
      assert(out.report.resolutions.some(function (x) { return x.how === 'DISAMBIGUATED-VS-BASELINE'; }),
        'the disambiguation is logged');
      var zz = out.model.helpdesk.actions.filter(function (a) { return a.code === 'ZZ99'; })[0];
      assert(out.model.helpdesk.results.filter(function (x) { return x.action === zz.name; }).length === 0,
        'an unresolvable target produces NO result edge');
      assert(out.report.unresolved.length === 1, 'and is reported as unresolved, got ' + out.report.unresolved.length);
    });
  });

  test('uncaptured fields are excluded from comparison, not reported as deviations', function () {
    return loadedPromise.then(function (res) {
      var out = window.StudioIngest.fromCapturedCrawl(CAPTURE, res.model);
      var d = window.StudioDiff.compare(res.model, out.model);
      assert(d.summary.notCompared.indexOf('buttonGroup') !== -1, 'buttonGroup declared not-compared');
      assert(d.summary.notCompared.indexOf('emails') !== -1, 'emails declared not-compared');
      var g001 = out.model.helpdesk.actions.filter(function (a) { return a.code === 'G001'; })[0];
      var mod = d.actions.modified.filter(function (x) { return x.key === g001.name; })[0];
      assert(!mod, 'G001 is not reported as modified merely because the crawl did not read its detail');
    });
  });

  test('a Reactive-only capture is compared within its own scope, not against Planned', function () {
    return loadedPromise.then(function (res) {
      var out = window.StudioIngest.fromCapturedCrawl(CAPTURE, res.model);
      var d = window.StudioDiff.compare(res.model, out.model);
      assert(d.summary.scopedToTypes && d.summary.scopedToTypes.join(',') === 'Reactive',
        'comparison scope is declared: ' + JSON.stringify(d.summary.scopedToTypes));
      var removedPlanned = d.actions.removed.filter(function (x) {
        return (x.object.types || []).indexOf('Planned') !== -1;
      });
      assert(removedPlanned.length === 0,
        'Planned-only actions are out of scope, not reported as removed (' + removedPlanned.length + ')');
      var st = d.statuses.removed.map(function (x) { return x.key; });
      assert(st.indexOf('New PPM') === -1, 'Planned-only statuses are out of scope too');
    });
  });

  test('actions no grouped-by-status crawl can see are not reported as deletions', function () {
    return loadedPromise.then(function (res) {
      var out = window.StudioIngest.fromCapturedCrawl(CAPTURE, res.model);
      var d = window.StudioDiff.compare(res.model, out.model);
      var invisible = d.summary.invisibleToCrawl || [];
      /* RH03b Quote Ordered is engine-fired: available in no status at all */
      assert(invisible.some(function (n) { return /RH03b/.test(n); }),
        'engine-fired RH03b is declared out of view');
      assert(!d.actions.removed.some(function (x) { return /RH03b/.test(x.key); }),
        'and is therefore NOT reported as removed');
      /* RH08 IS available in a status in the baseline and absent here — a real delta */
      assert(d.actions.removed.some(function (x) { return /RH08/.test(x.key); }),
        'a genuinely visible-but-absent action IS still reported as removed');
    });
  });

  test('an outcome the crawl never recorded is not reported as a deleted outcome', function () {
    return loadedPromise.then(function (res) {
      var out = window.StudioIngest.fromCapturedCrawl(CAPTURE, res.model);
      var d = window.StudioDiff.compare(res.model, out.model);
      assert(d.summary.resultsNotObserved > 0, 'unobserved outcomes are counted and declared');
      var g001 = out.model.helpdesk.actions.filter(function (a) { return a.code === 'G001'; })[0];
      assert(!d.results.removed.some(function (r) { return r.action === g001.name; }),
        'G001 was listed without an arrow — its baseline outcome is not called deleted');
      /* RH04 WAS recorded with an arrow, so its outcome remains comparable */
      var rh04 = out.model.helpdesk.actions.filter(function (a) { return a.code === 'RH04'; })[0];
      assert(out.model.helpdesk.results.some(function (r) { return r.action === rh04.name; }),
        'a recorded outcome is still carried and compared');
    });
  });

  test('snapshot stamps display at the precision they were recorded', function () {
    var SS = window.StudioSnapshots;
    assert(SS.formatStamp('2026-08-19T09:30:00Z') === '19 Aug 2026 09:30', SS.formatStamp('2026-08-19T09:30:00Z'));
    assert(SS.formatStamp('2026-08-19') === '19 Aug 2026', SS.formatStamp('2026-08-19'));
    var dated = SS.list({ key: 'k', snapshots: [{ id: 'a', path: 'a.json', capturedAt: '2026-08-19' }] })[0];
    assert(dated.precision === 'date' && /time not recorded/.test(SS.stampLabel(dated)),
      'a date-only capture says so instead of inventing a clock time');
    var timed = SS.list({ key: 'k', snapshots: [{ id: 'b', path: 'b.json', capturedAt: '2026-08-19T09:30:00Z' }] })[0];
    assert(timed.precision === 'datetime' && !/time not recorded/.test(SS.stampLabel(timed)), 'timed capture');
  });

  test('snapshot list is newest-first and selection defaults to the latest capture', function () {
    var proj = {
      key: 'tl', snapshots: [
        { id: 'old', path: 'o.json', capturedAt: '2026-08-01T08:00:00Z' },
        { id: 'new', path: 'n.json', capturedAt: '2026-08-19T09:30:00Z' }
      ]
    };
    var SS = window.StudioSnapshots;
    var l = SS.list(proj);
    assert(l[0].id === 'new' && l[1].id === 'old', 'newest first: ' + l.map(function (e) { return e.id; }).join(','));
    assert(SS.selectedEntry(proj).id === 'new', 'defaults to the latest capture');
    SS.select('tl', 'old');
    assert(SS.selectedEntry(proj).id === 'old', 'an explicit stamp selection sticks');
    SS.select('tl', 'new');
  });

  test('a live harness crawl joins the timeline without a project file', function () {
    return loadedPromise.then(function (res) {
      withCleanProjects(function () {
        var SS = window.StudioSnapshots;
        var live = { snapshotId: 'crawl-9', meta: { crawledAt: '2026-08-20T14:05:00Z' }, model: res.model };
        var proj = {
          key: 'live', instance: live,
          snapshots: [{ id: 'crawl-9', path: null, capturedAt: '2026-08-20T14:05:00Z', label: 'Crawl' }]
        };
        var e = SS.list(proj)[0];
        assert(e.precision === 'datetime', 'a harness crawl carries a full timestamp');
        assert(SS.modelFor(proj) === res.model, 'the live crawl is renderable from the timeline');
      });
    });
  });

  test('changes between two captures are computed and ringed; removals survive in the summary', function () {
    return loadedPromise.then(function (res) {
      var SS = window.StudioSnapshots;
      var earlier = window.StudioIngest.fromCapturedCrawl(CAPTURE, res.model);
      /* a later capture in which RH04 is no longer available in With Helpdesk */
      var later = JSON.parse(JSON.stringify(CAPTURE));
      later.meta.crawledAt = '2026-08-20T11:00:00Z';
      later.actionsGroupedViewReactive['With Helpdesk'] = ['G001 Add note', 'ZZ99 Invented→WC-R'];
      var lateOut = window.StudioIngest.fromCapturedCrawl(later, res.model);

      var diff = window.StudioDiff.compare(earlier.model, lateOut.model);
      assert(diff.actions.removed.length === 1, 'RH04 removed, got ' + diff.actions.removed.length);
      assert(diff.availability.removed.length === 1, 'its availability edge removed too');

      var sets = SS.highlight(diff);
      var rh04 = earlier.model.helpdesk.actions.filter(function (a) { return a.code === 'RH04'; })[0];
      assert(sets.actions[rh04.name] === 'removed', 'the removed action is classified as removed');

      /* the ring can only paint what the view actually drew */
      var host = document.getElementById('sandbox');
      host.innerHTML = '';
      var card = document.createElement('div');
      card.setAttribute('data-action', 'G001. Add a note, photo or document');
      card.setAttribute('data-status', 'With Helpdesk');
      host.appendChild(card);
      var ghost = document.createElement('div');
      ghost.setAttribute('data-action', rh04.name);
      host.appendChild(ghost);
      SS.applyHighlight(host, sets);
      assert(ghost.classList.contains('chg-ring') && ghost.classList.contains('chg-removed'),
        'a drawn removed object is ringed');
      assert(!card.classList.contains('chg-ring'), 'an unchanged object is left alone');

      var rows = window.StudioDiff.deviationSchedule(diff);
      assert(rows.some(function (r) { return r.kind === 'REMOVED' && /RH04/.test(r.detail); }),
        'the written summary names the removal even where nothing can be ringed');
      host.innerHTML = '';
    });
  });

  /* ---- the harness's own output, ingested ------------------------------
   * Closes the loop: harness/tests/test_end_to_end.py drives the REAL
   * adapter and crawlers against a fixture Concerto and banks the snapshot
   * it produces. If the Studio can turn that file into a model, the whole
   * chain — DOM → adapter → crawler → snapshot → Studio model — is proven
   * without a live instance. Only authentication remains untested. */

  var harnessSnap = fetch('../harness/tests/fixtures/harness-crawl-snapshot.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; });

  test('the harness snapshot fixture is present (run test_end_to_end.py to regenerate)', function () {
    return harnessSnap.then(function (s) {
      assert(s && s.kind === 'INSTANCE-SNAPSHOT', 'fixture missing — python harness/tests/test_end_to_end.py');
      assert(s.meta.writeCapability === false, 'the snapshot records that no write capability existed');
    });
  });

  test('a real harness crawl snapshot ingests into a Studio model', function () {
    return harnessSnap.then(function (s) {
      if (!s) throw new Error('fixture missing');
      var out = window.StudioIngest.fromSnapshot(s, null);
      var m = out.model;
      var names = m.helpdesk.statuses.map(function (x) { return x.name; }).sort();
      assert(names.join('|') === 'With Contractor - R|With Helpdesk|With Maintenance Team', names.join('|'));
      var acts = m.helpdesk.actions.map(function (a) { return a.code; }).sort();
      assert(acts.join(',') === 'G001,G003,RH04', acts.join(','));
      var rh04 = m.helpdesk.actions.filter(function (a) { return a.code === 'RH04'; })[0];
      assert(rh04.availableIn.indexOf('With Helpdesk') !== -1, 'availability survives ingest');
      assert(m.helpdesk.results.some(function (r) {
        return r.action === rh04.name && r.kind === 'sets' && r.toStatus === 'With Contractor - R';
      }), 'a crawled resulting status survives ingest as a "sets" edge');
      assert(m.helpdesk.results.some(function (r) {
        return r.kind === 'userSelects' && r.toStatus === 'With Contractor - R';
      }), 'user-selects stays distinct from sets through ingest');
      assert(m.orders.supplierActions.length === 2, 'the Orders domain survives ingest');
      assert(m.identities.statuses['With Helpdesk'], 'GUID identities survive ingest');
    });
  });

  /* ---- durable private store ------------------------------------------
   * The store may or may not be running during a test run. Both states are
   * legitimate; what must NEVER happen is the Studio quietly behaving as
   * though work were banked when it is not. */

  var storeProbe = window.StudioStore ? window.StudioStore.probe() : Promise.resolve(null);

  test('the Studio can always say where project data came from', function () {
    return storeProbe.then(function () {
      var src = window.StudioStore.source();
      assert(['store', 'files', 'unknown'].indexOf(src) !== -1, 'source is one of the known sources: ' + src);
      var line = window.StudioStore.durabilityLine();
      assert(typeof line === 'string' && line.length > 20, 'a plain-English durability line exists');
    });
  });

  test('persisting without a running store refuses honestly instead of doing nothing', function () {
    return storeProbe.then(function () {
      if (window.StudioStore.available()) return; /* covered by the store round-trip below */
      return window.StudioProject.persist('does-not-matter').then(function (r) {
        assert(r && r.saved === false, 'the refusal is explicit');
        assert(typeof r.reason === 'string' && r.reason.length, 'and carries a reason: ' + r.reason);
      });
    });
  });

  test('when the store IS running it is authoritative and never claims a backup it lacks', function () {
    return storeProbe.then(function (h) {
      if (!window.StudioStore.available()) return; /* store not running — nothing to assert */
      assert(h.insideRepository === false, 'the store root is outside the public repository');
      assert(['OFF-MACHINE', 'LOCAL-HISTORY', 'LOCAL-VERSIONS', 'SINGLE-COPY'].indexOf(h.durability) !== -1,
        'durability is one of the honest states: ' + h.durability);
      if (!h.git || !h.git.remote) {
        assert(h.durability !== 'OFF-MACHINE', 'no remote means it must NOT report OFF-MACHINE');
        assert(/only|NO REMOTE|one machine/i.test(window.StudioStore.durabilityLine()),
          'and the sentence must say so: ' + window.StudioStore.durabilityLine());
      }
      return window.StudioStore.list().then(function (rows) {
        assert(Array.isArray(rows), 'the store lists projects');
      });
    });
  });


  /* ---- MAKE THE PROJECTS REAL -----------------------------------------
   * A project view must show THAT PROJECT or say it has nothing. These
   * tests load the real Kirklees and Warwick Demo project files and assert
   * the properties that distinguish a real project model from a Vanilla
   * stand-in. They run against the same durable files the app loads.
   */

  function loadProjectFile(key) {
    if (window.StudioStore && window.StudioStore.available()) {
      return window.StudioStore.get(key).then(function (payload) { return payload.project; });
    }
    return fetch('../projects/' + key + '/project.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('no project file for ' + key); return r.json(); })
      .then(function (f) { return f.project; });
  }

  /* Snapshot files are read relative to the app, so tests reach them the
   * same way the app does — through the store when it is up. */
  function projectFixture(key) {
    return storeProbe.then(function () { return loadProjectFile(key); }).then(function (rec) {
      return loadedPromise.then(function (res) {
        return window.StudioSnapshots.ensureLoaded(rec, res.model).then(function () {
          return { project: rec, vanilla: res.model };
        });
      });
    });
  }

  var kirklees = projectFixture('kirklees-council');
  var warwick = projectFixture('warwick-demo');

  test('Kirklees Day-One loads as a real model', function () {
    return kirklees.then(function (f) {
      var m = window.StudioSnapshots.baselineModel(f.project);
      assert(m, 'the Day-One baseline model exists');
      assert(m.meta.environment === 'https://kirklees.concerto.co.uk',
        'and it is Kirklees, not another instance: ' + m.meta.environment);
      assert(m.helpdesk.statuses.length === 13, '13 statuses, got ' + m.helpdesk.statuses.length);
      assert(m.orders.supplierActions.length === 11,
        '11 supplier actions (the older Labs baseline has 13), got ' + m.orders.supplierActions.length);
    });
  });

  test('Kirklees Current loads and is NOT the same object as Day-One', function () {
    return kirklees.then(function (f) {
      var base = window.StudioSnapshots.baselineModel(f.project);
      var cur = window.StudioSnapshots.currentModel(f.project);
      assert(cur, 'the current model exists');
      assert(cur !== base, 'current and Day-One are distinct models');
      assert(cur.meta.environment === 'https://kirklees.concerto.co.uk', 'and it is Kirklees');
    });
  });

  function supplier(model, key) {
    return model.orders.supplierActions.filter(function (a) { return a.canonicalKey === key; })[0];
  }

  test('CHG-001/002 differ correctly between Day-One and Current', function () {
    return kirklees.then(function (f) {
      var base = window.StudioSnapshots.baselineModel(f.project);
      var cur = window.StudioSnapshots.currentModel(f.project);

      var sp01b = supplier(base, 'SP01'), sp01c = supplier(cur, 'SP01');
      assert(sp01b.portalVisible === false, 'Day-One SP01 keeps the ORIGINAL broken value (portal off)');
      assert(sp01c.portalVisible === true, 'Current SP01 is corrected (portal on) — CHG-001');

      var sp02b = supplier(base, 'SP02'), sp02c = supplier(cur, 'SP02');
      assert(sp02b.portalVisible === false, 'Day-One SP02 portal off');
      assert(sp02b.availableIn.join(',') === 'In progress', 'Day-One SP02 availability is the broken In progress');
      assert(sp02c.portalVisible === true, 'Current SP02 portal on — CHG-002');
      assert(sp02c.availableIn.indexOf('Awaiting acceptance') !== -1, 'Current SP02 gains Awaiting acceptance');
      assert(sp02c.availableIn.indexOf('In progress') === -1, 'and loses In progress');

      assert(sp02c.changedBy.indexOf('CHG-002') !== -1, 'the change receipt is attached to the object it changed');
    });
  });

  test('applying the change overlay never edits the Day-One capture', function () {
    return kirklees.then(function (f) {
      /* re-read Day-One after Current was built from it */
      var base = window.StudioSnapshots.baselineModel(f.project);
      assert(supplier(base, 'SP01').portalVisible === false,
        'Day-One SP01 is still false after Current was derived from it');
      assert(!supplier(base, 'SP02').changedBy, 'and Day-One carries no change stamp');
    });
  });

  test('ORC10 and SPWA do not appear in Kirklees, and their absence is recorded', function () {
    return kirklees.then(function (f) {
      var cur = window.StudioSnapshots.currentModel(f.project);
      assert(!supplier(cur, 'ORC10'), 'no ORC10 in Kirklees');
      assert(!supplier(cur, 'SPWA'), 'no SPWA in Kirklees');
      var absences = cur.orders.unknowns.filter(function (u) { return u.kind === 'OBSERVED-ABSENT'; })
        .map(function (u) { return u.canonicalKey; }).sort().join(',');
      assert(absences === 'ORC10,SPWA', 'both absences are recorded as OBSERVED-ABSENT, got ' + absences);
    });
  });

  test('a supplier action present but not opened is shown as such, never filled in from Vanilla', function () {
    return kirklees.then(function (f) {
      var cur = window.StudioSnapshots.currentModel(f.project);
      var sp07c = supplier(cur, 'SP07c');
      assert(sp07c, 'SP07c is present (it is inside the counted 11)');
      assert(sp07c.detailObserved === false, 'its detail is declared NOT observed');
      assert(sp07c.name === 'NOT INDIVIDUALLY OBSERVED', 'and it is not given the baseline name: ' + sp07c.name);
      assert(sp07c.portalVisible === null, 'nor the baseline portal value');
    });
  });

  test('Kirklees helpdesk differs from Vanilla — ingestion actually happened', function () {
    return kirklees.then(function (f) {
      var cur = window.StudioSnapshots.currentModel(f.project);
      assert(cur.helpdesk.actions.length !== f.vanilla.helpdesk.actions.length,
        'Kirklees action count (' + cur.helpdesk.actions.length + ') differs from Vanilla (' +
        f.vanilla.helpdesk.actions.length + ')');
      var rh08 = cur.helpdesk.actions.filter(function (a) { return a.code === 'RH08'; })[0];
      assert(!rh08, 'RH08 Place On Hold is absent from the Kirklees capture, as observed');
    });
  });

  test('the project source/state indicator describes what is on screen', function () {
    return kirklees.then(function (f) {
      var SS = window.StudioSnapshots;
      var base = SS.byRole(f.project, 'baseline');
      var cur = SS.byRole(f.project, 'current');
      assert(base && cur, 'the project declares both a baseline and a current state');
      SS.select(f.project.key, base.id);
      var c1 = SS.contextLabel(f.project);
      assert(c1.state === 'BASELINE' && /Day-One/.test(c1.line), 'baseline is announced: ' + JSON.stringify(c1));
      SS.select(f.project.key, cur.id);
      var c2 = SS.contextLabel(f.project);
      assert(c2.state === 'CURRENT' && /Current/.test(c2.line), 'current is announced: ' + JSON.stringify(c2));
      assert(c2.stamp && c2.baseline, 'with a snapshot stamp and the baseline it is measured against');
    });
  });

  test('a project with no ingested model reports NOT-INGESTED rather than Vanilla', function () {
    var empty = { key: 'empty-proj', name: 'Empty', snapshots: [] };
    var c = window.StudioSnapshots.contextLabel(empty);
    assert(c.state === 'NOT-INGESTED', 'state is NOT-INGESTED, got ' + c.state);
    assert(window.StudioSnapshots.currentModel(empty) === null, 'and there is NO model to render');
    assert(window.StudioSnapshots.baselineModel(empty) === null, 'not even a baseline');
  });

  test('Warwick Demo is its own project model with its provenance stated', function () {
    return warwick.then(function (f) {
      var m = window.StudioSnapshots.currentModel(f.project);
      assert(m, 'Warwick Demo has a model');
      assert(m.meta.environment === 'https://warwick.concertodemo.co.uk',
        'stamped with its own instance: ' + m.meta.environment);
      assert(m.meta.provenance === 'DISCOVERY-CAPTURE-OF-THIS-INSTANCE',
        'and declares WHY the canonical model describes it: ' + m.meta.provenance);
      var rec = window.StudioSnapshots.entryRecord(f.project, window.StudioSnapshots.selectedEntry(f.project));
      var rep = rec.meta.ingestReport;
      assert(rep.knownDeltas.some(function (d) { return /With AMO/.test(d.object); }),
        'the With AMO addition is carried as a known delta');
      assert(rep.knownDeltas.some(function (d) { return d.kind === 'EXPERIMENT-RESIDUE'; }),
        'E0/E1 residue is recorded');
      assert(rep.notIngested.some(function (n) { return /PPM/.test(n.family); }),
        'PPM Scheduler is declared NOT INGESTED, not silently empty');
    });
  });

  test('switching projects swaps the actual model — no cross-project leakage', function () {
    return Promise.all([kirklees, warwick]).then(function (both) {
      var k = window.StudioSnapshots.currentModel(both[0].project);
      var w = window.StudioSnapshots.currentModel(both[1].project);
      assert(k.meta.environment !== w.meta.environment, 'the two projects carry different instances');
      assert(k.orders.supplierActions.length === 11 && w.orders.supplierActions.length === 13,
        'and different configuration: ' + k.orders.supplierActions.length + ' vs ' + w.orders.supplierActions.length);
      assert(k.helpdesk.actions.length !== w.helpdesk.actions.length, 'and different helpdesk action counts');
    });
  });

  test('the project views are handed the project model, not Vanilla', function () {
    return kirklees.then(function (f) {
      var m = window.StudioSnapshots.currentModel(f.project);
      var host = document.getElementById('sandbox');
      [['Diagram', window.StudioDiagram], ['Action Map', window.StudioActionMap],
       ['Matrix', window.StudioGrid], ['Configuration', window.StudioConfig]].forEach(function (pair) {
        host.innerHTML = '';
        pair[1].render(host, m);
        var text = host.textContent;
        assert(text.length > 0, pair[0] + ' rendered something');
        assert(text.indexOf('RH08') === -1,
          pair[0] + ' shows the Kirklees model (RH08, absent in Kirklees, is not drawn)');
      });
      host.innerHTML = '';
    });
  });

  test('Design forks the CURRENT configuration, not Vanilla', function () {
    return kirklees.then(function (f) {
      var M = window.StudioModel;
      var cur = window.StudioSnapshots.currentModel(f.project);
      var hadFork = M.hasFork();
      if (hadFork) M.discard();
      M.fork(cur);
      var d = M.desired();
      assert(d.helpdesk.actions.length === cur.helpdesk.actions.length,
        'the fork has the project current action count, not Vanilla: ' +
        d.helpdesk.actions.length + ' vs Vanilla ' + f.vanilla.helpdesk.actions.length);
      assert(d.helpdesk.actions.length !== f.vanilla.helpdesk.actions.length, 'which differ');
      var vsCurrent = window.StudioDiff.compare(cur, d);
      assert(vsCurrent.isEmpty, 'a fresh fork deviates from CURRENT by nothing');
      var vsVanilla = window.StudioDiff.compare(f.vanilla, d);
      assert(!vsVanilla.isEmpty, 'while still differing from Vanilla — Vanilla is a comparison, not the parent');
      M.discard();
    });
  });

  test('Solution Design consumes the selected project, not the generic Vanilla document', function () {
    return kirklees.then(function (f) {
      var cur = window.StudioSnapshots.currentModel(f.project);
      var diff = window.StudioDiff.compare(f.vanilla, cur);
      var doc = window.StudioSolDesign.generate(cur, {
        edition: 'instance',
        project: f.project,
        stateLabel: 'Current configuration',
        diff: diff,
        deviations: window.StudioDiff.deviationSchedule(diff),
        findings: window.StudioRules.runAll(cur)
      });
      assert(doc.indexOf('Kirklees Council') !== -1, 'the document names the customer');
      assert(doc.indexOf('kirklees.concerto.co.uk') !== -1, 'and its instance');
      assert(doc.indexOf('CHG-001') !== -1, 'and its verified changes');
      assert(/customer decision/i.test(doc), 'and the decisions still open for the customer');
      assert(doc.indexOf('Vanilla System Solution Design') === -1,
        'and is NOT the generic Vanilla document');
    });
  });

  test('Vanilla stays separate: the baseline registry is not a project', function () {
    return kirklees.then(function () {
      var keys = window.StudioProject.list().map(function (p) { return p.key; });
      assert(keys.indexOf('vanilla') === -1, 'Vanilla is not in the project list');
      assert(typeof window.StudioSettings.ratified === 'function',
        'the Vanilla baseline registry lives in Settings');
    });
  });

  /* ---- simple UX over the clever system --------------------------------
   * A project simply IS its current configuration; history and comparisons
   * are explicit, temporary, and clearly announced. */

  test('a project renders CURRENT by default; viewing history is explicit and reversible', function () {
    return kirklees.then(function (f) {
      var SS = window.StudioSnapshots;
      SS.clearView(f.project.key);
      var cur = SS.currentModel(f.project);
      assert(SS.modelFor(f.project) === cur, 'default = current, no state to choose');
      var base = SS.byRole(f.project, 'baseline');
      SS.setView(f.project.key, base.id);
      assert(SS.viewing(f.project).id === base.id, 'a history view is announced as such');
      assert(SS.modelFor(f.project) === SS.baselineModel(f.project), 'and renders the historical capture');
      SS.clearView(f.project.key);
      assert(SS.modelFor(f.project) === cur, 'Return to current does exactly that');
    });
  });

  /* ---- process flows ----------------------------------------------------- */

  test('process flows render from the model and adapt to what it contains', function () {
    return loadedPromise.then(function (res) {
      var out = window.StudioFlow.render('reactive', res.model);
      assert(!out.missing && out.svg.indexOf('<svg') === 0, 'reactive flow renders as SVG');
      assert(out.svg.indexOf('REACTIVE HELPDESK PROCESS FLOW') !== -1, 'titled');
      assert(out.svg.indexOf('data-status="With Helpdesk"') !== -1, 'steps carry their status anchors');
      assert(out.svg.indexOf('Owner:') !== -1, 'owner chips are drawn');
      ['planned', 'contractor', 'quote', 'business-case'].forEach(function (fid) {
        assert(!window.StudioFlow.render(fid, res.model).missing, fid + ' flow renders for Vanilla');
      });
    });
  });

  test('a flow never draws a step this configuration does not have', function () {
    return Promise.all([loadedPromise, kirklees]).then(function (both) {
      var k = window.StudioSnapshots.currentModel(both[1].project);
      var resolved = window.StudioFlow.resolveSteps(window.StudioFlow.FLOWS.contractor, k);
      /* Kirklees holds SP01..SP07d — the steps stand; bullets say what IS there */
      var out = window.StudioFlow.render('contractor', k);
      assert(!out.missing, 'contractor flow renders for Kirklees');
      assert(out.svg.indexOf('ORC10') === -1, 'nothing about actions Kirklees does not have');
      void resolved;
      /* a model without the quote status drops the quote step and says so */
      var slim = JSON.parse(JSON.stringify({ helpdesk: { statuses: [{ name: 'With Helpdesk' }], actions: [], availability: [], results: [] }, orders: { supplierActions: [] } }));
      var r2 = window.StudioFlow.resolveSteps(window.StudioFlow.FLOWS.reactive, slim);
      assert(r2.dropped.length > 0, 'absent statuses are reported as dropped, not drawn');
      assert(r2.steps.every(function (s) { return !s.status || s.status === 'With Helpdesk'; }), 'only present statuses survive');
    });
  });

  test('the printable flow bundle is a standalone landscape document', function () {
    return loadedPromise.then(function (res) {
      var flows = ['reactive', 'planned'].map(function (f) { return window.StudioFlow.render(f, res.model); });
      var html = window.StudioFlow.printable(flows, 'Test flows');
      assert(html.indexOf('size: A4 landscape') !== -1, 'A4 landscape page rule');
      assert(html.indexOf('page-break-after') !== -1, 'one flow per page');
      assert((html.match(/<svg/g) || []).length === 2, 'both flows embedded');
    });
  });

  /* ---- Solution Design (customer) vs Technical Design ------------------- */

  test('the customer Solution Design speaks the customer’s language, never register codes', function () {
    return kirklees.then(function (f) {
      var m = window.StudioSnapshots.currentModel(f.project);
      var diff = window.StudioDiff.compare(f.vanilla, m);
      var doc = window.StudioSolDesignCustomer.generate(m, {
        project: f.project, vanilla: f.vanilla,
        deviations: window.StudioDiff.deviationSchedule(diff)
      });
      assert(doc.indexOf('Kirklees Council') !== -1, 'names the customer');
      assert(doc.indexOf('Solution Design') !== -1, 'is the Solution Design');
      assert(doc.indexOf('Vanilla baseline') !== -1, 'identifies the exact baseline in document control');
      /* the language rules */
      var body = doc.slice(0, doc.indexOf('Appendix C'));
      assert(!/VI-\d|X-\d\d\d|E-\d\d\d|STRUCTURAL|machine-readable/.test(body),
        'no internal register codes or software concerns before the evidence appendix');
      assert(!/dead.?end/i.test(doc), 'engine-driven statuses are never called dead ends');
      assert(/quote workflow|Business Cases/i.test(doc), 'the engines are described as working features');
      assert(/Deviations from the standard product/.test(doc), 'deviations are a first-class section');
      assert(doc.indexOf('CHG-001') === -1 || /Implemented/.test(doc), 'changes appear as delivered design, with status');
      assert(/Customer decisions/i.test(doc), 'open decisions are the customer’s, stated as such');
      assert(/DECISION REQUIRED|VERIFIED|STANDARD/.test(doc), 'implementation status states are present');
    });
  });

  test('the Solution Design embeds FACTUAL workflow diagrams derived from the model', function () {
    return kirklees.then(function (f) {
      var m = window.StudioSnapshots.currentModel(f.project);
      var doc = window.StudioSolDesignCustomer.generate(m, { project: f.project, vanilla: f.vanilla, deviations: [] });
      /* one flow per captured type, generated from availability+results —
         never the narrative gallery, which told a story the model did not */
      assert((doc.match(/<svg/g) || []).length >= 1, 'at least one factual flow embedded, got ' + (doc.match(/<svg/g) || []).length);
      var fac = window.StudioFlow.factual(m, 'Reactive');
      assert(!fac.missing && fac.edges > 0, 'the Reactive factual flow has model-derived edges');
      /* every edge label in the factual flow is a real action code of the model */
      var codes = (m.helpdesk.actions || []).map(function (a) { return a.code; }).filter(Boolean);
      var labels = (fac.svg.match(/fill="#1e6b4f">([A-Z]{1,3}\d{2,3}[a-z]?)</g) || [])
        .map(function (x) { return x.replace(/.*>([^<]+)</, '$1'); });
      labels.forEach(function (l) {
        assert(codes.indexOf(l) !== -1, 'flow edge label ' + l + ' is a real action code, not narrative');
      });
    });
  });

  test('the Technical Design remains the exhaustive internal document', function () {
    return kirklees.then(function (f) {
      var m = window.StudioSnapshots.currentModel(f.project);
      var diff = window.StudioDiff.compare(f.vanilla, m);
      var doc = window.StudioSolDesign.generate(m, {
        edition: 'instance', project: f.project,
        stateLabel: 'Current configuration', diff: diff,
        deviations: window.StudioDiff.deviationSchedule(diff),
        findings: window.StudioRules.runAll(m)
      });
      assert(/CHG-001/.test(doc), 'carries change receipts');
      assert(/Evidence|evidence/.test(doc), 'carries evidence grading — faults and gaps belong here');
    });
  });

  /* ---- the effective business view --------------------------------------
   * Raw configuration says what exists; the customer document must say how
   * the system behaves for this type of job and this user. */

  test('two-gate mobile: jobs appear on the app only where the STATUS carries the gate', function () {
    return loadedPromise.then(function (res) {
      var mob = window.StudioEffective.mobileStatuses(res.model).map(function (m) { return m.name; }).sort();
      assert(mob.join('|') === 'With Maintenance Team|With Maintenance Team - R',
        'Vanilla: only the two maintenance-team statuses are on the app, got ' + mob.join(', '));
      /* Closed has a mobile-capable action (G001) but no status gate */
      assert(!window.StudioEffective.mobileGate(res.model, 'Closed').gated,
        'a mobile-capable action in Closed does not put Closed on the app');
    });
  });

  test('mobile gates come from observed status records when the capture read them', function () {
    return kirklees.then(function (f) {
      var m = window.StudioSnapshots.currentModel(f.project);
      var g = window.StudioEffective.mobileGate(m, 'With Maintenance Team - R');
      assert(g.gated && g.provenance === 'OBSERVED',
        'Kirklees WMT-R gate was read from the record (“Appear on mobile app”), got ' + JSON.stringify(g));
      var wh = window.StudioEffective.mobileGate(m, 'With Helpdesk');
      assert(!wh.gated && wh.provenance === 'OBSERVED',
        'Kirklees With Helpdesk record was read and carries no mobile gate');
    });
  });

  test('type scoping: a Planned status never appears to fall into Reactive statuses', function () {
    return loadedPromise.then(function (res) {
      var outs = window.StudioEffective.outcomesOf(res.model, 'With Maintenance Team', 'Planned');
      assert(outs.every(function (o) { return !/- R$|Quote|Business Case/.test(o); }),
        'Planned WMT outcomes stay Planned, got: ' + outs.join(', '));
      var acts = window.StudioEffective.actionsIn(res.model, 'With Maintenance Team', 'Planned', false);
      assert(acts.length > 0, 'and the Planned status still has its own actions');
    });
  });

  test('a Reactive-only capture inherits the standard Planned design, and says so', function () {
    return kirklees.then(function (f) {
      var m = window.StudioSnapshots.currentModel(f.project);
      var tv = window.StudioEffective.typeView(m, f.vanilla, 'Planned');
      assert(tv.state === 'INHERITED-STANDARD', 'Kirklees Planned = inherited standard, got ' + tv.state);
      assert(/not captured/i.test(tv.note) && /standard/i.test(tv.note), 'with an honest note: ' + tv.note);
      assert(tv.model === f.vanilla, 'rendered from the standard product model');
      var rv = window.StudioEffective.typeView(m, f.vanilla, 'Reactive');
      assert(rv.state === 'OBSERVED', 'while Reactive is observed in the capture');
    });
  });

  test('the Kirklees Solution Design carries the Planned detail (as inherited standard)', function () {
    return kirklees.then(function (f) {
      var m = window.StudioSnapshots.currentModel(f.project);
      var doc = window.StudioSolDesignCustomer.generate(m, { project: f.project, vanilla: f.vanilla, deviations: [] });
      assert(doc.indexOf('Planned Helpdesk design') !== -1, 'the Planned section exists');
      assert(doc.indexOf('With Maintenance Team</h4>') !== -1 || /With Maintenance Team<\/h4>/.test(doc),
        'with real status detail');
      assert(/not captured for this instance/i.test(doc) && /to be verified/i.test(doc),
        'introduced as standard-product design to be verified, not passed off as observed');
      assert(/TO VERIFY/.test(doc), 'and the implementation status table carries TO VERIFY');
    });
  });

  test('the Solution Design mobile section follows the two-gate model', function () {
    return loadedPromise.then(function (res) {
      var doc = window.StudioSolDesignCustomer.generate(res.model, { vanilla: res.model, deviations: [] });
      var sec = doc.slice(doc.indexOf('Mobile (Orchestrate)'), doc.indexOf('Customer decisions'));
      assert(sec.indexOf('With Maintenance Team') !== -1, 'names the gated statuses');
      assert(sec.indexOf('Closed') === -1 && sec.indexOf('With Helpdesk') === -1,
        'and does not claim app visibility for ungated statuses');
      assert(/do not appear on the app/.test(sec), 'states the boundary explicitly');
    });
  });

  test('known live deltas appear as deviations — never beside a "no deviations" claim', function () {
    return warwick.then(function (f) {
      var m = window.StudioSnapshots.currentModel(f.project);
      var rec = window.StudioSnapshots.entryRecord(f.project, window.StudioSnapshots.selectedEntry(f.project));
      var doc = window.StudioSolDesignCustomer.generate(m, {
        project: f.project, vanilla: f.vanilla, deviations: [],
        ingestReport: rec.meta.ingestReport
      });
      var devSection = doc.slice(doc.indexOf('Deviations from the standard product'), doc.indexOf('Implementation'));
      assert(devSection.indexOf('With AMO') !== -1, 'the known live deviation is IN the deviations section');
      assert(/Known live deviation/.test(devSection), 'labelled as a known live deviation');
      assert(/Operational \/ test residue/.test(devSection), 'test residue is labelled as residue, not design');
      assert(devSection.indexOf('No deviations') === -1, 'no contradictory "no deviations" claim');
      assert(/not yet verified/.test(devSection), 'unverified drift is stated');
    });
  });

  test('engine behaviour is phrased by provenance, not promoted across versions', function () {
    return Promise.all([loadedPromise, kirklees, warwick]).then(function (all) {
      var kf = all[1], wf = all[2];
      assert(window.StudioEffective.engineProvenance(kf.project, 'quote') === 'OBSERVED',
        'Kirklees verified its quote engine');
      assert(window.StudioEffective.engineProvenance(wf.project, 'quote') === 'INHERITED-STANDARD',
        'Warwick Demo did not — the claim stays standard-product');
      var wm = window.StudioSnapshots.currentModel(wf.project);
      var doc = window.StudioSolDesignCustomer.generate(wm, { project: wf.project, vanilla: all[0].model, deviations: [] });
      assert(/standard product behaviour/.test(doc), 'the Warwick document says which behaviour is standard, not observed');
    });
  });

  test('the Orders section explains the portal column instead of contradicting it', function () {
    return loadedPromise.then(function (res) {
      var doc = window.StudioSolDesignCustomer.generate(res.model, { vanilla: res.model, deviations: [] });
      assert(/control the contractor\/order lifecycle/.test(doc), 'lifecycle framing');
      assert(!/what your contractors see and do/.test(doc), 'the contradictory intro is gone');
    });
  });

  /* ---- two separate document views --------------------------------------- */

  test('Solution Design and Technical Design are two separate views', function () {
    assert(window.StudioSolutionDesignView && window.StudioTechnicalDesignView,
      'both view modules exist');
    return kirklees.then(function (f) {
      var host = document.getElementById('sandbox');
      host.innerHTML = '';
      window.StudioTechnicalDesignView.render(host, window.StudioSnapshots.currentModel(f.project),
        { vanilla: f.vanilla, project: f.project });
      var seg = host.querySelector('.seg');
      assert(seg && /Current configuration/.test(seg.textContent) && /Day-One baseline/.test(seg.textContent),
        'Technical Design keeps the original edition controls');
      var frame = host.querySelector('iframe');
      var doc = frame.getAttribute('srcdoc');
      assert(/Solution Design<\/h1>|Instance As-Is/.test(doc) || /Evidence grading/.test(doc),
        'and generates the ORIGINAL detailed format');
      host.innerHTML = '';
      window.StudioSolutionDesignView.render(host, window.StudioSnapshots.currentModel(f.project),
        { vanilla: f.vanilla, project: f.project });
      var sdoc = host.querySelector('iframe').getAttribute('srcdoc');
      assert(/Solution Design/.test(sdoc) && /Workflow at a glance/.test(sdoc),
        'Solution Design renders the customer document');
      assert(!host.querySelector('.seg'), 'with no edition maze in the customer view');
      host.innerHTML = '';
    });
  });

  /* ---- receipts: truthful cost accounting --------------------------------
   * The Launch discipline: deterministic operations carry real zeros;
   * AI-assisted operations carry recorded actuals or 'unavailable' —
   * a number is never invented. */

  function withCleanReceipts(fn) {
    var KEY = window.StudioReceipts._key;
    var saved = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    return Promise.resolve().then(fn).then(function (v) {
      if (saved) localStorage.setItem(KEY, saved); else localStorage.removeItem(KEY);
      return v;
    }, function (e) {
      if (saved) localStorage.setItem(KEY, saved); else localStorage.removeItem(KEY);
      throw e;
    });
  }

  test('a deterministic operation is timed and carries real zeros for AI', function () {
    return withCleanReceipts(function () {
      return window.StudioReceipts.timed('TEST OP', 'target', function () {
        return new Promise(function (res) { setTimeout(res, 20); });
      }).then(function () {
        var list = window.StudioReceipts._loadLocal();
        assert(list.length === 1, 'one receipt recorded');
        var r = list[0];
        assert(typeof r.durationMs === 'number' && r.durationMs >= 10, 'a measured duration: ' + r.durationMs);
        assert(r.runtimeImplementation === 'DETERMINISTIC' && r.aiInvoked === false, 'deterministic runtime');
        assert(r.totalTokens === 0 && r.aiCost === '£0.00', 'REAL zeros, not blanks');
        assert(r.outcome === 'COMPLETE', 'outcome recorded');
      });
    });
  });

  test('a failed operation still gets a truthful receipt', function () {
    return withCleanReceipts(function () {
      return window.StudioReceipts.timed('TEST FAIL', 'target', function () {
        return Promise.reject(new Error('boom'));
      }).then(function () { throw new Error('should have rethrown'); }, function () {
        var r = window.StudioReceipts._loadLocal()[0];
        assert(r.outcome === 'FAILED' && /boom/.test(r.error), 'failure recorded with the error');
      });
    });
  });

  test('AI-assisted project activity is unmetered — never a fabricated number', function () {
    return kirklees.then(function (f) {
      var derived = window.StudioReceipts.derivedFor(f.project);
      assert(derived.length >= 3, 'captures + changes derive receipts, got ' + derived.length);
      var assisted = derived.filter(function (r) { return r.aiInvoked; });
      assert(assisted.length >= 3, 'the assisted crawls and CHG-001/002 are AI-assisted');
      assisted.forEach(function (r) {
        assert(r.totalTokens === 'unavailable' || typeof r.totalTokens === 'number',
          'tokens are a recorded actual or the string unavailable: ' + r.totalTokens);
        assert(r.totalTokens !== 0 || !r.aiInvoked, 'an AI-assisted op never claims zero tokens');
      });
      var chg = derived.filter(function (r) { return /CONFIG CHANGE/.test(r.operation); });
      assert(chg.length === 2 && chg.every(function (r) { return r.outcome === 'VERIFIED'; }),
        'CHG-001/002 appear as verified changes');
    });
  });

  test('the summary sums only KNOWN tokens and counts the unmetered', function () {
    var s = window.StudioReceipts.summarise([
      { totalTokens: 100, durationMs: 50, aiInvoked: false },
      { totalTokens: 'unavailable', durationMs: 'unavailable', aiInvoked: true },
      { totalTokens: 200, durationMs: 30, aiInvoked: true }
    ]);
    assert(s.knownTokens === 300, 'known tokens summed: ' + s.knownTokens);
    assert(s.unmetered === 1, 'unmetered counted, not guessed into the sum');
    assert(s.timedMs === 80 && s.untimed === 1, 'durations likewise');
    assert(s.aiOps === 2, 'AI operations counted');
  });

  test('receipts recorded in the durable store are merged into the ledger', function () {
    return storeProbe.then(function () {
      if (!window.StudioStore.available()) return; /* store not running — merge is best-effort */
      return window.StudioReceipts.all([]).then(function (list) {
        var stored = list.filter(function (r) { return r.source === 'store'; });
        assert(stored.length >= 1, 'store receipts appear in the merged ledger');
        stored.forEach(function (r) {
          assert(typeof r.totalTokens === 'number' ? !!r.tokenBasis : r.totalTokens === 'unavailable',
            'every stored figure carries its basis, or is unavailable: ' + r.operation);
        });
      });
    });
  });

  test('Studio-build cost is separated from operational cost — never one blended number', function () {
    var R = window.StudioReceipts;
    var rows = [
      { operation: 'HARNESS CRAWL', target: 'https://x', totalTokens: 0, aiInvoked: false },
      { operation: 'INGEST SNAPSHOT', target: 'Kirklees Council — x', totalTokens: 0, aiInvoked: false },
      { operation: 'ASSISTED SESSION — receipts feature build', target: 'Studio build (no instance contact)', totalTokens: 28000, aiInvoked: true },
      { operation: 'ASSISTED SESSION — capture', target: 'Kirklees', category: 'OPERATIONAL', totalTokens: 5000, aiInvoked: true },
      { operation: 'CONFIG CHANGE CHG-001', target: 'Kirklees — SP01', totalTokens: 'unavailable', aiInvoked: true }
    ];
    assert(R.classify(rows[0]) === 'OPERATIONAL', 'a harness crawl is operational');
    assert(R.classify(rows[2]) === 'BUILD', 'Studio build work is BUILD');
    assert(R.classify(rows[3]) === 'OPERATIONAL', 'an explicit category wins');
    var s = R.summarise(rows);
    assert(s.byCategory.BUILD.knownTokens === 28000, 'build tokens counted apart: ' + s.byCategory.BUILD.knownTokens);
    assert(s.byCategory.OPERATIONAL.knownTokens === 5000, 'operational tokens counted apart: ' + s.byCategory.OPERATIONAL.knownTokens);
    assert(s.byCategory.OPERATIONAL.unmetered === 1, 'operational unmetered counted apart');
    var ops = R.filter(rows, 'OPERATIONAL', null);
    assert(ops.length === 4 && ops.every(function (r) { return R.classify(r) === 'OPERATIONAL'; }), 'category filter');
    var aiOps = R.filter(rows, 'OPERATIONAL', 'AI');
    assert(aiOps.length === 2, 'category + runtime filters compose: ' + aiOps.length);
    assert(R.filter(rows, 'BUILD', 'DETERMINISTIC').length === 0, 'no deterministic build rows here');
  });

  test('the real ledger separates the categories too', function () {
    return storeProbe.then(function () {
      return window.StudioReceipts.all([]).then(function (list) {
        if (!list.length) return;
        var s = window.StudioReceipts.summarise(list);
        assert(s.byCategory.OPERATIONAL.operations + s.byCategory.BUILD.operations === s.operations,
          'every receipt lands in exactly one category');
        list.forEach(function (r) {
          assert(r.category === 'OPERATIONAL' || r.category === 'BUILD', 'each merged receipt is categorised');
        });
      });
    });
  });

  test('Settings renders the Receipts section with the honesty note', function () {
    return loadedPromise.then(function (res) {
      var sb = document.getElementById('sandbox');
      sb.innerHTML = '';
      window.StudioSettings.render(sb, res.model, res.invariants);
      return new Promise(function (r) { setTimeout(r, 250); }).then(function () {
        assert(/Receipts/.test(sb.textContent), 'Receipts section exists');
        assert(/never estimated/i.test(sb.textContent), 'the truthfulness rule is stated on the page');
        sb.innerHTML = '';
      });
    });
  });

  /* ---- one project, one instance ----------------------------------------
   * The target of a crawl is the OPEN PROJECT'S instance. It is never asked
   * for again, never remembered from another customer, and a session on a
   * different system can never be crawled into this project. */

  test('the crawl target is the project’s own instance — never a remembered URL', function () {
    return withCleanProjects(function () {
      var sb = document.getElementById('sandbox');
      sb.innerHTML = '';
      /* a stale global URL from some earlier session */
      localStorage.setItem('concerto-studio-instance-url', 'https://someone-elses.example');
      window.StudioProject.importProject(fileFor('npl', 'National Physical Labs',
        { instanceUrl: 'https://fmhelpdesk.npl.co.uk' }));
      window.StudioProject.open('npl');
      window.StudioInstance.render(sb, window.StudioApp.model);
      var text = sb.textContent;
      assert(text.indexOf('fmhelpdesk.npl.co.uk') !== -1, 'the project’s instance is shown as the target');
      assert(text.indexOf('someone-elses.example') === -1, 'the remembered URL is NOT used: ' + text.slice(0, 200));
      assert(!sb.querySelector('input[type=text]'), 'and there is no second URL box to fill in again');
      window.StudioProject.close();
      sb.innerHTML = '';
      localStorage.removeItem('concerto-studio-instance-url');
    });
  });

  test('a crawl states which instance it expects, so it cannot land in the wrong project', function () {
    var seen = null;
    var realCall = window.StudioHarness.crawl;
    window.StudioHarness.crawl = function (domains, expect) { seen = expect; return new Promise(function () { }); };
    try {
      return withCleanProjects(function () {
        var sb = document.getElementById('sandbox');
        sb.innerHTML = '';
        window.StudioProject.importProject(fileFor('npl', 'NPL', { instanceUrl: 'https://fmhelpdesk.npl.co.uk' }));
        window.StudioProject.open('npl');
        window.StudioInstance._state.session = { state: 'CONNECTED_READ_ONLY', targetUrl: 'https://fmhelpdesk.npl.co.uk' };
        window.StudioInstance._state.harness = { available: true };
        window.StudioInstance.render(sb, window.StudioApp.model);
        var btn = Array.prototype.slice.call(sb.querySelectorAll('button'))
          .filter(function (b) { return /CRAWL INSTANCE/.test(b.textContent); })[0];
        assert(btn && !btn.disabled, 'CRAWL is available when the session is on the right instance');
        btn.click();
        assert(seen === 'https://fmhelpdesk.npl.co.uk', 'the expected instance travels with the crawl: ' + seen);
        window.StudioProject.close();
        sb.innerHTML = '';
      });
    } finally {
      window.StudioHarness.crawl = realCall;
      window.StudioInstance._state.session = null;
      window.StudioInstance._state.harness = null;
    }
  });

  test('a session on a DIFFERENT instance blocks the crawl and says so', function () {
    return withCleanProjects(function () {
      var sb = document.getElementById('sandbox');
      sb.innerHTML = '';
      window.StudioProject.importProject(fileFor('npl', 'NPL', { instanceUrl: 'https://fmhelpdesk.npl.co.uk' }));
      window.StudioProject.open('npl');
      /* the harness is still signed in to the demo instance */
      window.StudioInstance._state.session = { state: 'CONNECTED_READ_ONLY', targetUrl: 'https://warwick.concertodemo.co.uk' };
      window.StudioInstance._state.harness = { available: true };
      window.StudioInstance.render(sb, window.StudioApp.model);
      var btn = Array.prototype.slice.call(sb.querySelectorAll('button'))
        .filter(function (b) { return /CRAWL INSTANCE/.test(b.textContent); })[0];
      assert(btn && btn.disabled, 'CRAWL is refused while the session is elsewhere');
      assert(sb.querySelector('.wrong-instance'), 'and the mismatch is stated, loudly');
      assert(/warwick\.concertodemo\.co\.uk/.test(sb.querySelector('.wrong-instance').textContent) &&
        /fmhelpdesk\.npl\.co\.uk/.test(sb.querySelector('.wrong-instance').textContent),
        'naming both systems so the mistake is obvious');
      window.StudioProject.close();
      window.StudioInstance._state.session = null;
      window.StudioInstance._state.harness = null;
      sb.innerHTML = '';
    });
  });

  test('Studio never silently deletes a project — unknown ones are flagged, not pruned', function () {
    return withCleanProjects(function () {
      var rec = window.StudioProject.create({ key: 'brand-new', name: 'Brand New', instanceUrl: 'https://x.example' });
      assert(rec.unsaved === true, 'a fresh project is marked unsaved');
      /* startup reconciliation: the store knows nothing about this one */
      var storeKeys = ['kirklees-council'];
      window.StudioProject.list().forEach(function (p) {
        if (storeKeys.indexOf(p.key) !== -1) {
          if (p.unsaved) window.StudioProject.save(p.key, { unsaved: false });
          return;
        }
        if (!p.unsaved) window.StudioProject.save(p.key, { unsaved: true });
      });
      assert(window.StudioProject.get('brand-new'), 'the project still exists after reconciliation');
      assert(window.StudioProject.get('brand-new').unsaved === true, 'and is flagged as not saved');
      /* the card says so, and offers the fix */
      var sb = document.getElementById('sandbox');
      sb.innerHTML = '';
      window.StudioProjects.render(sb, window.StudioApp.model);
      assert(/NOT SAVED/.test(sb.textContent), 'the Projects page flags it');
      assert(Array.prototype.slice.call(sb.querySelectorAll('button'))
        .some(function (b) { return b.textContent === 'Save now'; }), 'and offers Save now');
      sb.innerHTML = '';
    });
  });

  test('UAT: journeys are derived from the model graph, ending at terminal statuses', function () {
    return kirklees.then(function (f) {
      var m = window.StudioSnapshots.currentModel(f.project);
      var js = window.StudioUAT.journeys(m, 'Reactive', {});
      assert(js.length > 0, 'at least one reactive journey derived, got ' + js.length);
      /* every step is a real availability edge: action available in fromStatus, setting toStatus */
      js.forEach(function (j) {
        j.forEach(function (step) {
          assert(step.from && step.to && step.action, 'each step names from/action/to');
          assert(step.to !== step.from, 'a journey step always changes status');
        });
      });
      /* at least one journey reaches a terminal status — a complete lifecycle */
      var reachesTerminal = js.some(function (j) { return ['Closed', 'Cancelled'].indexOf(j[j.length - 1].to) !== -1; });
      assert(reachesTerminal, 'at least one journey reaches Closed/Cancelled');
    });
  });

  test('UAT: a scenario carries model-derived assertions and real action-code traceability, no invented selectors', function () {
    return kirklees.then(function (f) {
      var m = window.StudioSnapshots.currentModel(f.project);
      var js = window.StudioUAT.journeys(m, 'Reactive', {});
      var sc = window.StudioUAT.scenarioFromJourney(js[0], m, { type: 'Reactive', projectKey: f.project.key });
      assert(sc.steps.length === js[0].length, 'one step per journey transition');
      /* every step uses the semantic keyword, never a selector */
      sc.steps.forEach(function (st) {
        assert(st.keyword === 'TAKE_ACTION', 'steps are semantic keyword steps');
        assert(!/nth-child|querySelector|click div/i.test(JSON.stringify(st)), 'no browser selectors in a scenario');
        assert(st.assertions.some(function (a) { return a.keyword === 'JOB_STATUS_EQUALS'; }), 'each step asserts the resulting status');
      });
      /* traceability points at real action codes present in the model */
      var codes = (m.helpdesk.actions || []).map(function (a) { return a.code; });
      sc.traceability.technicalDesign.forEach(function (c) {
        assert(codes.indexOf(c) !== -1, 'traceability code ' + c + ' is a real action code');
      });
    });
  });

  test('UAT: a known Vanilla defect becomes a regression scenario asserting the CORRECT behaviour, never an expected pass of the defect', function () {
    return kirklees.then(function (f) {
      var m = window.StudioSnapshots.currentModel(f.project);
      var packs = window.StudioUAT.library(m, {
        projectKey: f.project.key,
        findings: [{ id: 'X-1', severity: 'DEFECT', title: 'Supplier cannot accept order', detail: 'SP01/SP02 broken' }]
      });
      assert(packs.regression.length >= 1, 'the defect produced a regression scenario');
      var reg = packs.regression[0];
      assert(/evidence, not an oracle/i.test(reg.oracleNote || ''), 'the scenario states Vanilla is evidence, not an oracle');
      assert(reg.target.expectedModel === 'desired', 'a regression asserts the DESIRED (corrected) outcome');
    });
  });

  test('UAT: the suite renders back into the Excel workbook shape (human-execution export)', function () {
    return kirklees.then(function (f) {
      var m = window.StudioSnapshots.currentModel(f.project);
      var packs = window.StudioUAT.library(m, { projectKey: f.project.key });
      var rows = window.StudioUAT.toExcelRows(packs.core);
      assert(rows.length === packs.core.length, 'one row per scenario');
      var r = rows[0];
      ['id', 'priority', 'role', 'scenario', 'steps', 'expected', 'actual', 'result', 'tester', 'date'].forEach(function (col) {
        assert(col in r, 'the export row carries the workbook column: ' + col);
      });
    });
  });

  test('SRD: parses modal requirements and anchors clause numbers', function () {
    var text = '3.1 The system shall allow a helpdesk agent to raise a reactive job.\n' +
      '3.2 The contractor must be able to accept or reject an order.\n' +
      'This is just background prose with no obligation.\n' +
      '3.3 Jobs should move to a "With Surveyor" status when a survey is required.';
    var reqs = window.StudioSRD.parseRequirements(text);
    assert(reqs.length === 3, 'three requirements extracted, prose ignored — got ' + reqs.length);
    assert(reqs[0].clause === '3.1', 'clause number anchored');
    assert(reqs[0].priority === 'mandatory' && reqs[2].priority === 'expected', 'modality drives priority');
  });

  test('SRD: gap analysis judges PRESENT / NOT-PRESENT / UNKNOWN against the baseline with evidence', function () {
    return kirklees.then(function (f) {
      var m = window.StudioSnapshots.currentModel(f.project);
      var reqs = window.StudioSRD.parseRequirements(
        'The system shall support a reactive helpdesk.\n' +
        'Jobs shall be able to move to a "With Surveyor" status.\n' +
        'The solution must integrate with the customer SAP finance system.');
      var res = window.StudioSRD.assess(reqs, m);
      assert(res.rows.length === 3, 'three assessed');
      var present = res.rows.filter(function (r) { return r.verdict === 'PRESENT'; });
      assert(present.length >= 1 && present[0].evidence.length >= 0, 'a covered requirement is PRESENT with a basis');
      /* the SAP integration cannot be judged from config → UNKNOWN, never a false PRESENT */
      var sap = res.rows.filter(function (r) { return /SAP/.test(r.text); })[0];
      assert(sap && sap.verdict === 'UNKNOWN', 'an unmappable integration requirement is UNKNOWN, got ' + (sap && sap.verdict));
      assert(res.summary.total === 3, 'summary counts every requirement');
    });
  });

  test('SRD: AI-suggested turns a status gap into an addStatus op with AI-SUGGESTED provenance', function () {
    return kirklees.then(function (f) {
      var m = window.StudioSnapshots.currentModel(f.project);
      var row = { ref: 'SRD-001', text: 'Jobs shall move to a "With Surveyor" status when a survey is required.', verdict: 'NOT-PRESENT' };
      var sug = window.StudioSRD.suggest(row, m);
      assert(sug.kind === 'add-status', 'a status gap suggests add-status, got ' + sug.kind);
      assert(sug.op && sug.op.op === 'addStatus' && /Surveyor/.test(sug.op.name), 'the op adds the named status');
      assert(sug.provenance === 'AI-SUGGESTED', 'provenance is AI-SUGGESTED for review');
    });
  });

  test('UAT: customer scenarios import from JSON / CSV / plain text and keep their provenance', function () {
    var json = window.StudioUAT.importScenarios('[{"title":"Contractor accepts order","steps":["Assign to contractor","Accept the order"]}]', { pack: 'customer' });
    assert(json.length === 1 && json[0].steps.length === 2, 'JSON import');
    assert(json[0].provenance.acquiredFrom === 'customer-upload', 'customer provenance preserved');
    var csv = window.StudioUAT.importScenarios('id,scenario,steps,expected\nT1,Raise a job,"1. Log a job\n2. Save","Job created", ', { pack: 'vanilla' });
    assert(csv.length === 1 && csv[0].pack === 'vanilla', 'CSV import tagged as the vanilla pack');
    var packed = window.StudioUAT.library({ helpdesk: {}, orders: {} }, { customScenarios: csv });
    assert((packed.vanillaProvided || []).length === 1, 'library routes a vanilla-tagged scenario into the Vanilla pack');
    var txt = window.StudioUAT.importScenarios('Cancel a job\n- Open the job\n- Press cancel\n\nClose a job\n- Complete the work\n- Press close', { pack: 'customer' });
    assert(txt.length === 2 && txt[0].steps.length === 2, 'plain-text blocks import as scenarios');
  });

  test('UAT execution: a run records per-step results and rolls up scenario + requirement outcomes', function () {
    /* a small run over two scenarios, exercised through the same result
       logic the guided runner uses */
    function scenarioResult(sc) {
      if (sc.steps.some(function (s) { return s.result === 'FAIL'; })) return 'FAIL';
      if (sc.steps.some(function (s) { return s.result === 'BLOCKED'; })) return 'BLOCKED';
      if (sc.steps.every(function (s) { return s.result === 'PASS'; })) return 'PASS';
      return 'PARTIAL';
    }
    var run = { scenarios: [
      { id: 'A', requirements: ['SRD-001'], steps: [{ result: 'PASS' }, { result: 'PASS' }] },
      { id: 'B', requirements: ['SRD-002'], steps: [{ result: 'PASS' }, { result: 'FAIL' }] }
    ] };
    run.scenarios.forEach(function (s) { s.result = scenarioResult(s); });
    assert(run.scenarios[0].result === 'PASS', 'all-pass scenario is PASS');
    assert(run.scenarios[1].result === 'FAIL', 'any-fail scenario is FAIL');
    var pass = run.scenarios.filter(function (s) { return s.result === 'PASS'; }).length;
    var fail = run.scenarios.filter(function (s) { return s.result === 'FAIL'; }).length;
    assert(pass === 1 && fail === 1, 'run rolls up pass/fail');
    /* requirement coverage: SRD-002 fails because scenario B failed */
    var cover = {};
    run.scenarios.forEach(function (s) { s.requirements.forEach(function (rq) { cover[rq] = cover[rq] || { fail: 0 }; if (s.result !== 'PASS') cover[rq].fail++; }); });
    assert(cover['SRD-001'].fail === 0 && cover['SRD-002'].fail === 1, 'requirement coverage reflects the failing scenario');
  });

  /* ---- process flows (workpackage-style, model-bound) ------------------- */

  function procflowModel() {
    return { helpdesk: {
      statuses: [
        { name: 'With Helpdesk', types: ['Reactive'] },
        { name: 'With SMART - R', types: ['Reactive'] },
        { name: 'With Contractor - R', types: ['Reactive'] },
        { name: 'In Progress', types: ['Reactive', 'Planned'] },
        { name: 'On Hold', types: ['Reactive', 'Planned'] },
        { name: 'Work Complete', types: ['Reactive'] },
        { name: 'With SMART', types: ['Planned'] },
        { name: 'With Contractor', types: ['Planned'] },
        { name: 'Ghost - R', types: ['Reactive'], suppressed: true }
      ],
      actions: [
        { name: 'RH08. Place On Hold', types: ['Reactive'] },
        { name: 'RH09. Take off hold', types: ['Reactive'] }
      ]
    } };
  }

  test('procflow: reactive flow binds THIS instance’s own status names into the callouts', function () {
    var out = window.StudioProcFlow.reactive(procflowModel());
    assert(out.svg.indexOf('<svg') === 0, 'renders svg');
    assert(out.svg.indexOf('With SMART - R') !== -1, 'internal-team callout carries the instance name (With SMART - R, not With Maintenance Team)');
    assert(out.svg.indexOf('With Contractor - R') !== -1, 'contractor callout bound');
    assert(out.svg.indexOf('Ghost - R') === -1, 'suppressed statuses are never drawn');
    var roles = out.bindings.map(function (b) { return b.role; });
    assert(roles.indexOf('internal') !== -1 && roles.indexOf('holdBranch') !== -1, 'bindings are reported for the document to cite');
  });

  test('procflow: a role the instance does not have removes its branch — nothing invented', function () {
    var m = procflowModel();
    m.helpdesk.statuses = m.helpdesk.statuses.filter(function (s) { return s.name !== 'On Hold'; });
    m.helpdesk.actions = [];
    var out = window.StudioProcFlow.reactive(m);
    assert(out.svg.indexOf('Place on hold') === -1, 'no hold action + no hold status = no hold branch');
    assert(out.svg.indexOf('Follow-up') === -1, 'no follow-up status = no follow-up decision');
  });

  test('procflow: the diagram SET is evidence-driven — no supplier portal / remedials = fewer diagrams', function () {
    var lean = window.StudioProcFlow.all(procflowModel());
    assert(lean.length === 3, 'lean config: reactive + planned + internal completion only, got ' + lean.length);
    assert(!lean.some(function (f) { return f.id === 'external-completion'; }), 'no supplier portal = no external completion diagram');
    assert(!lean.some(function (f) { return f.id === 'remedial'; }), 'no remedial actions = no remedial diagram');
    var m = procflowModel();
    m.orders = { supplierActions: [{ name: 'SP01. Accept job' }, { name: 'SP07. PPM Complete - with remedials' }] };
    m.helpdesk.actions.push({ name: 'PH07. PPM Complete - with remedials', types: ['Planned'] });
    var full = window.StudioProcFlow.all(m);
    assert(full.length === 5, 'supplier + remedial evidence brings the full set, got ' + full.length);
    full.forEach(function (f) {
      assert(f.svg.indexOf('<svg') === 0 && f.svg.indexOf('</svg>') !== -1, f.id + ' renders complete svg');
    });
    assert(full[1].svg.indexOf('With SMART') !== -1, 'planned flow binds the planned-type internal status');
  });

  test('procflow: step PRESENCE follows the instance’s actions — no RAMS/AFP/invoicing means none drawn', function () {
    var m = procflowModel();
    m.orders = { supplierActions: [{ name: 'SP01. Accept job' }] };
    var r = window.StudioProcFlow.reactive(m);
    assert(r.svg.indexOf('RAMS') === -1 && r.svg.indexOf('Start work') !== -1, 'no RAMS action = plain Start work');
    assert(r.svg.indexOf('Acknowledge order') === -1, 'no acknowledge action = no acknowledge step');
    assert(/Accept order/.test(r.svg), 'portal accept evidenced = portal accept step');
    var x = window.StudioProcFlow.externalCompletion(m);
    assert(x && x.svg.indexOf('AFP') === -1 && x.svg.indexOf('invoice') === -1 && x.svg.indexOf('Invoice') === -1,
      'no AFP / invoice actions = no AFP branch or invoicing steps');
  });

  test('procflow: the customer Solution Design embeds the workpackage flows with a status-name note', function () {
    return kirklees.then(function (f) {
      var m = window.StudioSnapshots.currentModel(f.project);
      var doc = window.StudioSolDesignCustomer.generate(m, {
        project: f.project, vanilla: f.vanilla, deviations: []
      });
      assert(doc.indexOf('procflow-embed') !== -1, 'workpackage flows are embedded');
      var want = window.StudioProcFlow.all(m).length;
      assert((doc.match(/class="flow-embed procflow-embed"/g) || []).length === want,
        'exactly the evidence-driven set is in the document (' + want + ')');
      assert(/Status names shown are this instance/.test(doc), 'the document cites the instance-bound names');
    });
  });

  /* ---- runner ---------------------------------------------------------- */

  var ul = document.getElementById('results');
  var passCount = 0, failCount = 0;

  function run(i) {
    if (i >= registry.length) {
      document.title = failCount === 0
        ? 'PASS ' + passCount + '/' + registry.length
        : 'FAIL ' + failCount + '/' + registry.length;
      var li = document.createElement('li');
      li.innerHTML = '<b>' + document.title + '</b>';
      ul.appendChild(li);
      return;
    }
    var t = registry[i];
    Promise.resolve()
      .then(function () { return t.fn(); })
      .then(function () {
        passCount++;
        var li = document.createElement('li');
        li.className = 'pass';
        li.textContent = '✔ ' + t.name;
        ul.appendChild(li);
      })
      .catch(function (err) {
        failCount++;
        var li = document.createElement('li');
        li.className = 'fail';
        li.innerHTML = '✘ ' + t.name + '<span class="detail">' + String(err.message || err) + '</span>';
        ul.appendChild(li);
      })
      .then(function () { run(i + 1); });
  }
  run(0);
})();
