/* uatexec.js — UAT CONFIGURATION PRE-FLIGHT (and the honest boundary of
 * what can be checked without touching a live job).
 *
 * WHAT THIS IS
 * ------------
 * Every UAT scenario is a sequence of semantic steps (TAKE_ACTION …) with
 * assertions (JOB_STATUS_EQUALS …). Some of those are decidable from the
 * CONFIGURATION alone: if a scenario says "take RH04 while the job is With
 * Helpdesk", and RH04 is not available in With Helpdesk, that scenario can
 * NEVER pass — and a human should not spend an afternoon discovering it.
 * Pre-flight evaluates exactly those, per step, against the project model.
 *
 * WHAT THIS IS NOT
 * ----------------
 * It is NOT execution and never claims to be. Runtime facts — did the email
 * actually send, did the order really raise, does the engine fire — are
 * NOT decidable from configuration, and are reported as NEEDS-HUMAN (or
 * NEEDS-HARNESS once the read endpoints exist), never as a pass. A green
 * pre-flight means "the configuration permits this journey", nothing more.
 *
 * WHY IT MATTERS
 * --------------
 * It turns the UAT library into a live regression check against the model:
 * change the configuration, re-run pre-flight, and every scenario the
 * change broke lights up immediately — the same discipline as the workflow-
 * logic checks, applied to the customer's own agreed test pack.
 *
 * Pure module: model + scenarios in, verdicts out. window.StudioUatExec.
 */
(function () {
  'use strict';

  var VERDICT = {
    OK: 'CONFIG-OK',            /* configuration permits this */
    FAIL: 'CONFIG-FAIL',        /* configuration forbids it — will never pass */
    HUMAN: 'NEEDS-HUMAN',       /* runtime truth; only a real run can say */
    UNKNOWN: 'NOT-EVALUATED'    /* keyword this build does not understand */
  };

  function codeOf(name) {
    var m = String(name || '').match(/^([A-Z]{1,3}\d{2,3}[a-z]?)/);
    return m ? m[1] : String(name || '');
  }

  /* index the model once per pre-flight run */
  function index(model, type) {
    var hd = (model && model.helpdesk) || {};
    var byName = {}, byCode = {};
    (hd.actions || []).forEach(function (a) {
      byName[a.name] = a;
      if (a.code) byCode[a.code] = a;
      byCode[codeOf(a.name)] = byCode[codeOf(a.name)] || a;
    });
    var statuses = {};
    (hd.statuses || []).forEach(function (s) { statuses[s.name] = s; });
    /* availability: action -> {status: true}, type-scoped */
    var avail = {};
    (hd.availability || []).forEach(function (e) {
      if (type && e.type && e.type !== type && e.type !== 'Both') return;
      (avail[e.action] = avail[e.action] || {})[e.status] = true;
    });
    (hd.actions || []).forEach(function (a) {
      (a.availableIn || []).forEach(function (s) { (avail[a.name] = avail[a.name] || {})[s] = true; });
    });
    /* results: action -> resulting status (type-scoped), and user-selectable */
    var result = {}, selectable = {};
    (hd.actions || []).forEach(function (a) {
      if (a.resultingStatus) result[a.name] = a.resultingStatus;
      (a.userSelectableStatuses || []).forEach(function (s) { (selectable[a.name] = selectable[a.name] || {})[s] = true; });
    });
    (hd.results || []).forEach(function (r) {
      if (type && r.type && r.type !== type) return;
      if (r.kind === 'sets') result[r.action] = r.toStatus;
      if (r.kind === 'user-selects') (selectable[r.action] = selectable[r.action] || {})[r.toStatus] = true;
    });
    return { hd: hd, byName: byName, byCode: byCode, statuses: statuses, avail: avail, result: result, selectable: selectable };
  }

  function findAction(ix, ref) {
    if (!ref) return null;
    return ix.byName[ref] || ix.byCode[ref] || ix.byCode[codeOf(ref)] || null;
  }

  /* ---- per-assertion evaluation ----------------------------------------- */

  function evalAssertion(as, ctx) {
    var kw = as.keyword;
    if (kw === 'JOB_STATUS_EQUALS') {
      var want = as.value;
      if (!ctx.action) return { verdict: VERDICT.UNKNOWN, why: 'no action in scope for this assertion' };
      var sets = ctx.ix.result[ctx.action.name];
      var picks = ctx.ix.selectable[ctx.action.name] || {};
      if (sets === want) return { verdict: VERDICT.OK, why: codeOf(ctx.action.name) + ' sets ' + want };
      if (picks[want]) return { verdict: VERDICT.OK, why: codeOf(ctx.action.name) + ' lets the user select ' + want };
      if (!ctx.ix.statuses[want]) {
        return { verdict: VERDICT.FAIL, why: 'status "' + want + '" does not exist in this configuration' };
      }
      if (ctx.ix.statuses[want] && ctx.ix.statuses[want].suppressed) {
        return { verdict: VERDICT.FAIL, why: 'status "' + want + '" is SUPPRESSED — a job cannot rest there' };
      }
      if (!sets && !Object.keys(picks).length) {
        return { verdict: VERDICT.HUMAN, why: codeOf(ctx.action.name) + ' changes no status in the configuration; only a run can confirm what the job shows' };
      }
      return { verdict: VERDICT.FAIL, why: codeOf(ctx.action.name) + ' results in "' + (sets || Object.keys(picks).join('/')) + '", not "' + want + '"' };
    }
    if (kw === 'NOTIFICATION_SENT') {
      var flags = (ctx.action && ctx.action.flags) || [];
      var hasEmail = flags.some(function (f) { return /email/i.test(f); }) ||
        (ctx.action && (ctx.action.emails || []).length);
      if (!hasEmail) return { verdict: VERDICT.FAIL, why: 'no email rule is configured on ' + (ctx.action ? codeOf(ctx.action.name) : 'this action') };
      return { verdict: VERDICT.HUMAN, why: 'an email rule exists; delivery is a runtime fact — check the mailbox' };
    }
    if (kw === 'ORDER_RAISED_FOR_JOB') {
      return { verdict: VERDICT.HUMAN, why: 'order creation is a runtime effect — verify on the job’s Orders tab' };
    }
    if (kw === 'TAG_PRESENT' || kw === 'TAG_ABSENT') {
      var adds = (ctx.action && ctx.action.addsTags) || [];
      var rems = (ctx.action && ctx.action.removesTags) || [];
      var pool = kw === 'TAG_PRESENT' ? adds : rems;
      if (as.value && pool.indexOf(as.value) === -1) {
        return { verdict: VERDICT.FAIL, why: (ctx.action ? codeOf(ctx.action.name) : 'this action') + ' does not ' + (kw === 'TAG_PRESENT' ? 'add' : 'remove') + ' tag "' + as.value + '"' };
      }
      return { verdict: VERDICT.HUMAN, why: 'tag configuration matches; confirm on the job record' };
    }
    return { verdict: VERDICT.UNKNOWN, why: 'no pre-flight evaluator for ' + kw };
  }

  /* ---- per-step evaluation ---------------------------------------------- */

  function evalStep(step, ix, cursor) {
    var out = { id: step.id, keyword: step.keyword, checks: [] };
    var action = null;

    if (step.keyword === 'TAKE_ACTION') {
      var ref = (step.parameters || {}).action;
      action = findAction(ix, ref);
      if (!action) {
        out.checks.push({ what: 'action exists', verdict: VERDICT.FAIL, why: 'action "' + ref + '" is not in this configuration' });
        out.verdict = VERDICT.FAIL;
        return out;
      }
      var from = (step.parameters || {}).fromStatus || cursor.status;
      if (from) {
        var av = ix.avail[action.name] || {};
        if (av[from]) {
          out.checks.push({ what: 'available in ' + from, verdict: VERDICT.OK, why: codeOf(action.name) + ' is allocated to ' + from });
        } else if (action.machineFired || (action.flags || []).indexOf('machine_fired') !== -1) {
          out.checks.push({ what: 'available in ' + from, verdict: VERDICT.HUMAN, why: codeOf(action.name) + ' is engine-fired — not user-allocated by design' });
        } else {
          out.checks.push({
            what: 'available in ' + from, verdict: VERDICT.FAIL,
            why: codeOf(action.name) + ' is NOT allocated to "' + from + '" (allocated: ' + (Object.keys(av).join(', ') || 'nowhere') + ')'
          });
        }
      }
      /* advance the cursor the way the configuration says the job moves */
      var to = ix.result[action.name];
      if (to) cursor.status = to;
    }

    (step.assertions || []).forEach(function (as) {
      var r = evalAssertion(as, { ix: ix, action: action });
      out.checks.push({ what: as.keyword + (as.value ? ' ' + as.value : ''), verdict: r.verdict, why: r.why });
      if (as.keyword === 'JOB_STATUS_EQUALS' && r.verdict === VERDICT.OK && as.value) cursor.status = as.value;
    });

    var vs = out.checks.map(function (c) { return c.verdict; });
    out.verdict = vs.indexOf(VERDICT.FAIL) !== -1 ? VERDICT.FAIL
      : vs.indexOf(VERDICT.HUMAN) !== -1 ? VERDICT.HUMAN
      : vs.indexOf(VERDICT.UNKNOWN) !== -1 && vs.indexOf(VERDICT.OK) === -1 ? VERDICT.UNKNOWN
      : VERDICT.OK;
    return out;
  }

  /* ---- scenario / suite -------------------------------------------------- */

  function preflight(scenario, model, opts) {
    opts = opts || {};
    var type = opts.type || (/Planned|PPM/i.test(scenario.module || '') ? 'Planned' : 'Reactive');
    var ix = index(model, type);
    var cursor = { status: null };
    /* the starting status: the type's default, unless a precondition names one */
    (model && model.helpdesk && model.helpdesk.statuses || []).forEach(function (s) {
      if (!cursor.status && (s.isDefaultFor || []).indexOf(type) !== -1) cursor.status = s.name;
    });
    var steps = (scenario.steps || []).map(function (st) { return evalStep(st, ix, cursor); });
    var vs = steps.map(function (s) { return s.verdict; });
    return {
      scenarioId: scenario.id,
      title: scenario.title,
      type: type,
      verdict: vs.indexOf(VERDICT.FAIL) !== -1 ? VERDICT.FAIL
        : vs.indexOf(VERDICT.HUMAN) !== -1 ? VERDICT.HUMAN
        : vs.length ? VERDICT.OK : VERDICT.UNKNOWN,
      steps: steps,
      blockers: steps.filter(function (s) { return s.verdict === VERDICT.FAIL; })
        .map(function (s) {
          return s.id + ': ' + s.checks.filter(function (c) { return c.verdict === VERDICT.FAIL; })
            .map(function (c) { return c.why; }).join('; ');
        }),
      note: 'Pre-flight checks CONFIGURATION only. It never asserts a runtime outcome.'
    };
  }

  function preflightSuite(scenarios, model, opts) {
    var results = (scenarios || []).map(function (sc) { return preflight(sc, model, opts); });
    var count = function (v) { return results.filter(function (r) { return r.verdict === v; }).length; };
    return {
      results: results,
      summary: {
        total: results.length,
        configOk: count(VERDICT.OK),
        configFail: count(VERDICT.FAIL),
        needsHuman: count(VERDICT.HUMAN),
        notEvaluated: count(VERDICT.UNKNOWN)
      },
      /* the scenarios worth a human's afternoon, and the ones that are
         broken before anyone starts */
      runnable: results.filter(function (r) { return r.verdict !== VERDICT.FAIL; }).map(function (r) { return r.scenarioId; }),
      broken: results.filter(function (r) { return r.verdict === VERDICT.FAIL; })
    };
  }

  /* ---- what real browser execution would still need ---------------------- */

  /* Honest roadmap, not a promise: the capabilities a scenario needs from
     the harness before it could run unattended. Anything listed here is a
     read the harness cannot do today. */
  function harnessGap(scenario) {
    var need = {};
    (scenario.preconditions || []).forEach(function (p) {
      if (/JOB_EXISTS/.test(p.keyword)) need['create a test job (fixture service)'] = true;
    });
    (scenario.steps || []).forEach(function (st) {
      if (st.keyword === 'TAKE_ACTION') need['open a job record and press an action button'] = true;
      (st.assertions || []).forEach(function (as) {
        if (as.keyword === 'JOB_STATUS_EQUALS') need['read a job’s current status'] = true;
        if (as.keyword === 'NOTIFICATION_SENT') need['inspect an outbound email log'] = true;
        if (as.keyword === 'ORDER_RAISED_FOR_JOB') need['read a job’s linked orders'] = true;
        if (/^TAG_/.test(as.keyword)) need['read a job’s tags'] = true;
      });
    });
    return Object.keys(need);
  }

  var api = {
    VERDICT: VERDICT,
    preflight: preflight,
    preflightSuite: preflightSuite,
    harnessGap: harnessGap,
    _index: index
  };
  if (typeof window !== 'undefined') window.StudioUatExec = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
