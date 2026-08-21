/* hdbuilder.js — build a BRAND-NEW helpdesk from scratch, from everything
 * Vanilla discovery taught us about what a working helpdesk needs:
 *
 *   - job types (Reactive and/or Planned), each with a DEFAULT status;
 *   - statuses per type, ordered, with terminal states (closed/cancelled);
 *   - actions: allocated to statuses (an unallocated user action is
 *     unreachable = broken), with resulting statuses that exist, do/undo
 *     pairs (hold needs release), and a route from the default status to a
 *     terminal one (a job must be able to LIVE and DIE);
 *   - mobile flags where operatives work the job.
 *
 * The same workflow-logic checks Claude runs on captured instances run LIVE
 * on the draft here — a design that fails them would be broken in Concerto,
 * so the builder says so before a single click is spent building it.
 *
 * Pure module: spec in, {validation, model, plan} out. No DOM, no fetch.
 * window.StudioHdBuilder.
 */
(function () {
  'use strict';

  var TYPES = ['Reactive', 'Planned'];

  /* ---- draft spec -------------------------------------------------------- */

  function blank(name) {
    return {
      name: name || 'New helpdesk',
      jobTypes: [{ name: 'Reactive' }],
      statuses: [],   /* {name, types[], isDefaultFor[], ordering, suppressed, terminal, mobileGate} */
      actions: []     /* {code, name, types[], availableIn[], resultingStatus, userSelectable[],
                         mobileAvailable, buttonGroup} */
    };
  }

  /* Seed with the minimal viable journey Vanilla discovery proved: log →
   * assign → work → hold/release → complete → close, plus cancel. Names are
   * a starting point to rename, not gospel. */
  function seedMinimal(name) {
    var s = blank(name);
    s.statuses = [
      { name: 'With Helpdesk', types: ['Reactive'], isDefaultFor: ['Reactive'], ordering: 10 },
      { name: 'Assigned', types: ['Reactive'], isDefaultFor: [], ordering: 20 },
      { name: 'In Progress', types: ['Reactive'], isDefaultFor: [], ordering: 30 },
      { name: 'On Hold', types: ['Reactive'], isDefaultFor: [], ordering: 40 },
      { name: 'Work Complete', types: ['Reactive'], isDefaultFor: [], ordering: 50 },
      { name: 'Closed', types: ['Reactive'], isDefaultFor: [], ordering: 60, terminal: true },
      { name: 'Cancelled', types: ['Reactive'], isDefaultFor: [], ordering: 70, terminal: true }
    ];
    s.actions = [
      { code: 'NH01', name: 'New task', types: ['Reactive'], availableIn: [], resultingStatus: 'With Helpdesk', machineFired: true },
      { code: 'NH02', name: 'Assign', types: ['Reactive'], availableIn: ['With Helpdesk'], resultingStatus: 'Assigned' },
      { code: 'NH03', name: 'Start work', types: ['Reactive'], availableIn: ['Assigned'], resultingStatus: 'In Progress', mobileAvailable: true },
      { code: 'NH04', name: 'Place on hold', types: ['Reactive'], availableIn: ['Assigned', 'In Progress'], resultingStatus: 'On Hold' },
      { code: 'NH05', name: 'Take off hold', types: ['Reactive'], availableIn: ['On Hold'], resultingStatus: 'In Progress' },
      { code: 'NH06', name: 'Work complete', types: ['Reactive'], availableIn: ['In Progress'], resultingStatus: 'Work Complete', mobileAvailable: true },
      { code: 'NH07', name: 'Close job', types: ['Reactive'], availableIn: ['Work Complete'], resultingStatus: 'Closed' },
      { code: 'NH08', name: 'Cancel job', types: ['Reactive'], availableIn: ['With Helpdesk', 'Assigned', 'In Progress', 'On Hold'], resultingStatus: 'Cancelled' },
      { code: 'NH09', name: 'Add a note or photo', types: ['Reactive'], availableIn: ['With Helpdesk', 'Assigned', 'In Progress', 'On Hold', 'Work Complete'], resultingStatus: null, mobileAvailable: true }
    ];
    return s;
  }

  /* ---- validation: the workflow-logic checklist -------------------------- */

  function validate(spec) {
    var issues = [];
    function bad(sev, what) { issues.push({ severity: sev, issue: what }); }

    var typeNames = (spec.jobTypes || []).map(function (t) { return t.name; });
    if (!typeNames.length) bad('BLOCKER', 'No job types — a helpdesk needs at least one (Reactive or Planned).');
    typeNames.forEach(function (t) {
      if (TYPES.indexOf(t) === -1) bad('BLOCKER', 'Job type ' + t + ' is not a Concerto helpdesk type (Reactive/Planned).');
    });

    var stByName = {};
    (spec.statuses || []).forEach(function (st) {
      if (stByName[st.name]) bad('BLOCKER', 'Duplicate status name "' + st.name + '" — display names must be unique to build safely.');
      stByName[st.name] = st;
    });

    typeNames.forEach(function (t) {
      var sts = (spec.statuses || []).filter(function (s) { return (s.types || []).indexOf(t) !== -1 && !s.suppressed; });
      if (!sts.length) { bad('BLOCKER', t + ': no statuses.'); return; }
      var defs = sts.filter(function (s) { return (s.isDefaultFor || []).indexOf(t) !== -1; });
      if (!defs.length) bad('BLOCKER', t + ': no DEFAULT status — Concerto needs one per type for new jobs to land in.');
      if (defs.length > 1) bad('BLOCKER', t + ': more than one default status (' + defs.map(function (s) { return s.name; }).join(', ') + ').');
      if (!sts.some(function (s) { return s.terminal; })) bad('WARN', t + ': no terminal status marked — jobs would never leave the board (add a Closed/Cancelled).');
    });

    var codes = {};
    (spec.actions || []).forEach(function (a) {
      if (!a.code || !/^[A-Z]{1,4}\d{1,3}[a-z]?$/.test(a.code)) bad('WARN', 'Action "' + (a.name || a.code) + '": code should look like RH01/NH02 (letters + number).');
      if (codes[a.code]) bad('BLOCKER', 'Duplicate action code ' + a.code + ' — NPL taught us what duplicate wiring does.');
      codes[a.code] = true;
      (a.availableIn || []).forEach(function (s) {
        if (!stByName[s]) bad('BLOCKER', 'Action ' + a.code + ' is allocated to status "' + s + '" which does not exist.');
      });
      if (a.resultingStatus && !stByName[a.resultingStatus]) {
        bad('BLOCKER', 'Action ' + a.code + ' results in status "' + a.resultingStatus + '" which does not exist.');
      }
      (a.userSelectable || []).forEach(function (s) {
        if (!stByName[s]) bad('BLOCKER', 'Action ' + a.code + ' lets the user select status "' + s + '" which does not exist.');
      });
      if (!(a.availableIn || []).length && !a.machineFired) {
        bad('BLOCKER', 'Action ' + a.code + ' (' + a.name + ') is allocated to NO status — unreachable unless engine-fired. Mark it machine-fired or allocate it.');
      }
    });

    /* do/undo pairs: hold without release (and vice versa), per type */
    typeNames.forEach(function (t) {
      var inType = (spec.actions || []).filter(function (a) { return (a.types || []).indexOf(t) !== -1; });
      var hold = inType.filter(function (a) { return /(place|put).*hold|^on hold$/i.test(a.name || ''); });
      var release = inType.filter(function (a) { return /take off hold|off hold|release/i.test(a.name || ''); });
      if (hold.length && !release.length) bad('BLOCKER', t + ': a job can be put ON hold (' + hold[0].code + ') but never taken OFF — the NPL lesson.');
      if (release.length && !hold.length) bad('BLOCKER', t + ': a job can be taken OFF hold (' + release[0].code + ') but never put ON.');
    });

    /* reachability: from the default status, every non-suppressed status
       should be reachable, and a terminal status must be reachable */
    typeNames.forEach(function (t) {
      var sts = (spec.statuses || []).filter(function (s) { return (s.types || []).indexOf(t) !== -1 && !s.suppressed; });
      var def = sts.filter(function (s) { return (s.isDefaultFor || []).indexOf(t) !== -1; })[0];
      if (!def) return;
      var edges = {};
      (spec.actions || []).forEach(function (a) {
        if ((a.types || []).indexOf(t) === -1) return;
        (a.availableIn || []).forEach(function (from) {
          (edges[from] = edges[from] || []).push(a.resultingStatus);
          (a.userSelectable || []).forEach(function (to) { edges[from].push(to); });
        });
      });
      var seen = {}; var queue = [def.name];
      while (queue.length) {
        var cur = queue.shift();
        if (seen[cur]) continue;
        seen[cur] = true;
        (edges[cur] || []).forEach(function (to) { if (to && !seen[to]) queue.push(to); });
      }
      sts.forEach(function (s) {
        if (!seen[s.name]) bad('WARN', t + ': status "' + s.name + '" is not reachable from the default (' + def.name + ') by any action.');
      });
      var terminalReached = sts.some(function (s) { return s.terminal && seen[s.name]; });
      if (!terminalReached && sts.some(function (s) { return s.terminal; })) {
        bad('BLOCKER', t + ': no terminal status is reachable from the default — jobs can be born but never die.');
      }
      sts.forEach(function (s) {
        if (s.terminal) return;
        var exits = (edges[s.name] || []).filter(Boolean);
        if (seen[s.name] && !exits.length) bad('BLOCKER', t + ': status "' + s.name + '" is a dead end — reachable but no action moves the job on.');
      });
    });

    return {
      ok: !issues.some(function (i) { return i.severity === 'BLOCKER'; }),
      issues: issues
    };
  }

  /* ---- to a Studio model (so lifeflow/procflow can PREVIEW the draft) ---- */

  function toModel(spec) {
    var statuses = (spec.statuses || []).map(function (st) {
      return {
        name: st.name, types: (st.types || []).slice(),
        isDefaultFor: (st.isDefaultFor || []).slice(),
        ordering: {}, displayOrder: st.ordering || 0,
        suppressed: !!st.suppressed, confidence: 'DESIGNED', evidence: []
      };
    });
    var actions = [], availability = [], results = [];
    (spec.actions || []).forEach(function (a) {
      var full = a.code + '. ' + a.name;
      actions.push({
        name: full, code: a.code, active: true, types: (a.types || []).slice(),
        mobileAvailable: !!a.mobileAvailable, machineFired: !!a.machineFired,
        buttonGroup: a.buttonGroup || null,
        availableIn: (a.availableIn || []).slice(),
        resultingStatus: a.resultingStatus || undefined,
        userSelectableStatuses: (a.userSelectable || []).slice(),
        flags: [], addsTags: [], removesTags: [], confidence: 'DESIGNED', evidence: []
      });
      (a.availableIn || []).forEach(function (s) {
        (a.types || []).forEach(function (t) {
          availability.push({ action: full, status: s, type: t, confidence: 'DESIGNED', evidence: [] });
        });
      });
      if (a.resultingStatus) {
        (a.types || []).forEach(function (t) {
          results.push({ action: full, toStatus: a.resultingStatus, kind: 'sets', type: t, confidence: 'DESIGNED', evidence: [] });
        });
      }
      (a.userSelectable || []).forEach(function (s) {
        (a.types || []).forEach(function (t) {
          results.push({ action: full, toStatus: s, kind: 'user-selects', type: t, confidence: 'DESIGNED', evidence: [] });
        });
      });
    });
    var types = (spec.jobTypes || []).map(function (t) {
      return {
        name: t.name,
        statuses: statuses.filter(function (s) { return s.types.indexOf(t.name) !== -1; }).map(function (s) { return s.name; }),
        actions: actions.filter(function (a) { return a.types.indexOf(t.name) !== -1; }).map(function (a) { return a.name; })
      };
    });
    return {
      helpdesk: {
        types: types, statuses: statuses, actions: actions,
        availability: availability, results: results,
        operativeStatuses: [], tags: [], responseCategories: []
      },
      orders: {}, crossDomain: {}, meta: { source: 'HD-BUILDER', name: spec.name }
    };
  }

  /* ---- build plan: ordered, dependency-aware, honest about executability - */

  /* ops the harness writer implements today; everything else is STAGED —
     recorded precisely enough for a human (or a later writer version) to
     apply, never silently dropped. */
  var WRITER_OPS = ['set_action_availability', 'set_user_selectable', 'delete_action', 'rename_status',
    'create_status', 'create_action'];

  function buildPlan(spec) {
    var v = validate(spec);
    var steps = []; var n = 0;
    function step(op, object, params, dependsOn) {
      n++;
      steps.push({
        n: n, op: op, object: object, params: params,
        executable: WRITER_OPS.indexOf(op) !== -1,
        dependsOn: dependsOn || [], status: 'PENDING'
      });
      return n;
    }

    (spec.jobTypes || []).forEach(function (t) {
      step('configure_job_type', t.name, { name: t.name },
        []);
    });
    var statusStep = {};
    (spec.statuses || []).slice().sort(function (a, b) { return (a.ordering || 0) - (b.ordering || 0); })
      .forEach(function (st) {
        statusStep[st.name] = step('create_status', st.name, {
          name: st.name, types: (st.types || []).slice(),
          sortOrder: st.ordering || 0,
          isDefaultFor: (st.isDefaultFor || []).slice(),
          suppress: !!st.suppressed
        });
      });
    (spec.actions || []).forEach(function (a) {
      var full = a.code + '. ' + a.name;
      var deps = [];
      (a.availableIn || []).concat(a.resultingStatus ? [a.resultingStatus] : [], a.userSelectable || [])
        .forEach(function (s) { if (statusStep[s] && deps.indexOf(statusStep[s]) === -1) deps.push(statusStep[s]); });
      var createN = step('create_action', full, {
        name: full, code: a.code, types: (a.types || []).slice(),
        resultingStatus: a.resultingStatus || null,
        mobileAvailable: !!a.mobileAvailable, buttonGroup: a.buttonGroup || null
      }, deps);
      if ((a.availableIn || []).length) {
        step('set_action_availability', full, { action: full, statuses: (a.availableIn || []).slice() }, [createN]);
      }
      if ((a.userSelectable || []).length) {
        step('set_user_selectable', full, { action: full, statuses: (a.userSelectable || []).slice() }, [createN]);
      }
    });

    return {
      valid: v.ok, issues: v.issues,
      steps: steps,
      executableCount: steps.filter(function (s) { return s.executable; }).length,
      stagedCount: steps.filter(function (s) { return !s.executable; }).length
    };
  }

  var api = { blank: blank, seedMinimal: seedMinimal, validate: validate, toModel: toModel, buildPlan: buildPlan, WRITER_OPS: WRITER_OPS };
  if (typeof window !== 'undefined') window.StudioHdBuilder = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
