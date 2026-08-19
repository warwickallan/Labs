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

  test('harness adapter: write capability false when up, honest when down, execute refuses', function () {
    var H = window.StudioHarness;
    return H.probe().then(function (p) {
      if (p.available) {
        assert(p.writeCapability === false, 'a running harness MUST report writeCapability=false');
      } else {
        assert(p.reason, 'unavailability carries a reason');
      }
      return H.execute({}, {}).then(
        function () { throw new Error('execute must refuse'); },
        function (err) { assert(/read-only|authorised/.test(String(err.message)), 'refusal names read-only construction'); }
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
