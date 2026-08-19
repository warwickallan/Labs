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
