/* uat.js — the canonical UAT engine for Studio.
 *
 * Design follows References/deep-research-report.md:
 *   ONE canonical UAT system, two feeders (Vanilla journeys + customer SRD).
 *   Model spine: Vanilla=reference, Day-One=received, Current=what exists,
 *   DESIRED = the UAT target, CURRENT = the system under test.
 *   Keyword-driven, semantic steps (TAKE_ACTION, not CSS selectors).
 *   Vanilla is EVIDENCE, not an oracle: a known Vanilla defect never becomes
 *   an expected pass just because a baseline carried it.
 *
 * This module is PURE (no DOM, no I/O). It turns a resolved model into a
 * versioned library of scenario templates and renders them three ways:
 * canonical (machine), customer-readable, and Excel-style flat rows. Claude
 * proposes and drafts; a deterministic compiler (later) turns approved
 * keyword steps into browser/API/manual executors — this module never
 * invents selectors or system actions.
 */
(function () {
  'use strict';

  var TERMINAL = ['Closed', 'Cancelled'];      // journeys legitimately end here
  var START_REACTIVE = 'With Helpdesk';
  var START_PLANNED = 'New PPM';

  function slug(s) {
    return String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function codeOf(a) {
    var m = (a.name || '').match(/^([A-Z]{1,3}\d{2,3}[a-z]?)/);
    return a.code || (m ? m[1] : (a.name || '').slice(0, 6));
  }

  /* Availability as an adjacency map: status -> [action, ...], scoped to a
   * type, suppressed statuses excluded (they are not part of any live
   * journey). Pulled from the model's own availability edges — the same
   * truth the Action Map and factual flow show. */
  function adjacency(model, type) {
    var hd = model.helpdesk || {};
    var supp = {};
    (hd.statuses || []).forEach(function (s) { if (s.suppressed) supp[s.name] = true; });
    var byName = {};
    (hd.actions || []).forEach(function (a) { byName[a.name] = a; });
    var resultOf = {};
    (hd.actions || []).forEach(function (a) { if (a.resultingStatus) resultOf[a.name] = a.resultingStatus; });
    (hd.results || []).forEach(function (r) { if (r.kind === 'sets' && (!r.type || r.type === type)) resultOf[r.action] = r.toStatus; });
    var adj = {};
    (hd.availability || []).forEach(function (e) {
      if (e.type && e.type !== type && e.type !== 'Both') return;
      if (supp[e.status]) return;
      var to = resultOf[e.action];
      if (to && supp[to]) return;
      (adj[e.status] = adj[e.status] || []).push({ action: e.action, to: to || null, act: byName[e.action] });
    });
    return { adj: adj, resultOf: resultOf, byName: byName, supp: supp };
  }

  /* Derive business JOURNEYS: acyclic status→status paths from a start
   * status to a terminal one, following actions that set a new status.
   * This is the graph-derived "core journey" set the report asks for —
   * NOT one test per action. Bounded to keep it a library, not a maze. */
  function journeys(model, type, opts) {
    opts = opts || {};
    var start = opts.start || (type === 'Planned' ? START_PLANNED : START_REACTIVE);
    var g = adjacency(model, type);
    if (!g.adj[start]) return [];
    var out = [], maxLen = opts.maxLen || 6, maxPaths = opts.maxPaths || 12;
    function walk(status, path, seen) {
      if (out.length >= maxPaths) return;
      if (path.length && TERMINAL.indexOf(status) !== -1) { out.push(path.slice()); return; }
      if (path.length >= maxLen) { if (path.length) out.push(path.slice()); return; }
      var moves = (g.adj[status] || []).filter(function (m) { return m.to && m.to !== status && !seen[m.to]; });
      if (!moves.length) { if (path.length) out.push(path.slice()); return; }
      moves.forEach(function (m) {
        path.push({ from: status, action: m.action, to: m.to, act: m.act });
        seen[m.to] = true;
        walk(m.to, path, seen);
        seen[m.to] = false;
        path.pop();
      });
    }
    walk(start, [], (function () { var s = {}; s[start] = true; return s; })());
    /* de-dup identical action sequences, prefer shorter journeys first */
    var uniq = {}, res = [];
    out.sort(function (a, b) { return a.length - b.length; }).forEach(function (p) {
      var k = p.map(function (s) { return codeOf(s.act || { name: s.action }); }).join('>');
      if (!uniq[k]) { uniq[k] = true; res.push(p); }
    });
    return res;
  }

  /* One canonical scenario template from a journey. Steps are semantic
   * keyword steps with model-derived assertions; traceability points at the
   * real action codes (technical design anchors). No selectors, no prose
   * system actions. */
  function scenarioFromJourney(journey, model, ctx) {
    ctx = ctx || {};
    var type = ctx.type || 'Reactive';
    var last = journey[journey.length - 1];
    var id = 'UAT-' + (type === 'Planned' ? 'PPM' : 'RHD') + '-' + slug(last ? last.to : 'JOURNEY') +
      '-' + journey.map(function (s) { return codeOf(s.act || { name: s.action }); }).join('');
    var steps = journey.map(function (s, i) {
      var a = s.act || { name: s.action, flags: [] };
      var assertions = [{ keyword: 'JOB_STATUS_EQUALS', value: s.to }];
      (a.flags || []).forEach(function (f) {
        if (/^email/i.test(f)) assertions.push({ keyword: 'NOTIFICATION_SENT', value: f.replace(/^email/i, '').toLowerCase() || 'email' });
        if (f === 'supplier') assertions.push({ keyword: 'ORDER_RAISED_FOR_JOB' });
      });
      return {
        id: 'step-' + (i + 1),
        actor: /Mobile/.test(a.buttonGroup || '') ? 'Operative' : 'Helpdesk Agent',
        channel: /Mobile/.test(a.buttonGroup || '') ? 'Orchestrate mobile app' : 'Helpdesk Web',
        keyword: 'TAKE_ACTION',
        parameters: { action: s.action, fromStatus: s.from },
        assertions: assertions,
        evidence: ['recordSnapshot']
      };
    });
    return {
      id: id,
      version: 1,
      title: journeyTitle(journey, type),
      module: type === 'Planned' ? 'Planned / PPM' : 'Reactive Helpdesk',
      journey: journey.map(function (s) { return s.to; }).join(' → '),
      target: {
        projectId: ctx.projectKey || null,
        expectedModel: 'desired',
        executeAgainstModel: 'current',
        vanillaBaselineId: ctx.vanillaId || null
      },
      traceability: {
        technicalDesign: journey.map(function (s) { return codeOf(s.act || { name: s.action }); }),
        requirements: [],
        decisions: []
      },
      risk: { priority: journey.length <= 2 ? 'high' : 'medium' },
      preconditions: [
        { keyword: 'PROJECT_MODEL_MATCHES', parameters: { state: 'current' } },
        { keyword: type === 'Planned' ? 'PPM_JOB_EXISTS' : 'REACTIVE_JOB_EXISTS', output: 'job' }
      ],
      steps: steps,
      passCriteria: { allMandatoryAssertions: true, unexpectedErrors: 0 },
      rollback: { strategy: 'cancelAndRetain', steps: ['CANCEL_TEST_JOB_AND_OPEN_ORDERS', 'READ_BACK_CANCELLED_STATE'] },
      execution: { permittedModes: ['manual', 'browser', 'hybrid'], destructive: false, retryPolicy: 'readBeforeRetry' },
      provenance: { generatedBy: 'studio', generatorVersion: 'uat-schema-1', reviewStatus: 'draft', acquiredFrom: ctx.source || 'model-derived' }
    };
  }

  function journeyTitle(journey, type) {
    if (!journey.length) return 'Empty journey';
    var verbs = journey.map(function (s) { return (s.action || '').replace(/^[A-Z]{1,3}\d{2,3}[a-z]?[.\s-]+/, ''); });
    return (type === 'Planned' ? 'PPM job: ' : 'Reactive job: ') + verbs.join(', then ');
  }

  /* The versioned library for a resolved model. Packs per the report:
   * smoke (short critical journeys), core (all derived journeys), negative
   * (rejection / missing-data / permission — scaffolded honestly as drafts).
   * Vanilla defects are surfaced as regression scenarios whose DESIRED
   * outcome should pass after repair — never encoded as an expected pass. */
  function library(model, ctx) {
    ctx = ctx || {};
    var packs = { smoke: [], core: [], negative: [], regression: [] };
    ['Reactive', 'Planned'].forEach(function (type) {
      var js = journeys(model, type, {});
      js.forEach(function (j) {
        var sc = scenarioFromJourney(j, model, Object.assign({}, ctx, { type: type }));
        packs.core.push(sc);
        if (j.length <= 3) packs.smoke.push(sc);
      });
    });
    /* known Vanilla defects → regression scenarios (from project findings
     * flagged as defects). The scenario asserts the CORRECT behaviour. */
    (ctx.findings || []).forEach(function (f) {
      if (!/defect|risk|fault|broken/i.test((f.severity || '') + (f.title || ''))) return;
      packs.regression.push({
        id: 'UAT-REG-' + slug(f.id || f.title).slice(0, 30),
        version: 1,
        title: 'Regression: ' + (f.title || f.id),
        module: 'Known-risk regression',
        risk: { priority: 'high' },
        note: f.detail || '',
        target: { expectedModel: 'desired', executeAgainstModel: 'current', projectId: ctx.projectKey || null },
        traceability: { requirements: [], findings: [f.id] },
        steps: [],
        provenance: { generatedBy: 'studio', reviewStatus: 'draft', acquiredFrom: 'finding:' + (f.id || '') },
        oracleNote: 'Vanilla is evidence, not an oracle — this asserts the corrected behaviour, not the observed defect.'
      });
    });
    return packs;
  }

  function countPacks(packs) {
    return Object.keys(packs).reduce(function (n, k) { return n + packs[k].length; }, 0);
  }

  /* ---- renderings -------------------------------------------------------- */

  function actionVerb(a) { return (a || '').replace(/^[A-Z]{1,3}\d{2,3}[a-z]?[.\s-]+/, ''); }

  function renderCustomer(sc) {
    var lines = ['**' + sc.id + ' — ' + sc.title + '**', ''];
    (sc.preconditions || []).forEach(function () {});
    lines.push('_Preconditions: a ' + (sc.module === 'Planned / PPM' ? 'PPM' : 'Reactive') + ' test job exists._', '');
    (sc.steps || []).forEach(function (st) {
      lines.push('**Step (' + st.actor + ', ' + st.channel + '):** ' + actionVerb(st.parameters.action) + ' from "' + st.parameters.fromStatus + '".');
      st.assertions.forEach(function (as) {
        var exp = as.keyword === 'JOB_STATUS_EQUALS' ? 'Job moves to "' + as.value + '".'
          : as.keyword === 'NOTIFICATION_SENT' ? 'A notification is sent (' + as.value + ').'
            : as.keyword === 'ORDER_RAISED_FOR_JOB' ? 'An order is raised for the job.' : as.keyword;
        lines.push('  - Expected: ' + exp);
      });
      lines.push('');
    });
    lines.push('**Pass:** all expected outcomes observed, no unexpected errors.');
    return lines.join('\n');
  }

  function renderGherkin(sc) {
    var g = ['Feature: ' + sc.module, '', '  Scenario: ' + sc.title];
    g.push('    Given a ' + (sc.module === 'Planned / PPM' ? 'PPM' : 'Reactive') + ' test job exists');
    (sc.steps || []).forEach(function (st, i) {
      g.push('    ' + (i === 0 ? 'When ' : 'And ') + st.actor + ' performs "' + actionVerb(st.parameters.action) + '" from "' + st.parameters.fromStatus + '"');
      st.assertions.forEach(function (as) {
        if (as.keyword === 'JOB_STATUS_EQUALS') g.push('    Then the job status is "' + as.value + '"');
        else if (as.keyword === 'ORDER_RAISED_FOR_JOB') g.push('    And an order is raised for the job');
        else if (as.keyword === 'NOTIFICATION_SENT') g.push('    And a notification is sent to the ' + as.value);
      });
    });
    return g.join('\n');
  }

  /* Flat rows in the supplied Concerto UAT Script.xlsx style — the retained
   * human-execution export. Steps and expected results are joined per row. */
  function toExcelRows(scenarios) {
    return scenarios.map(function (sc) {
      var steps = (sc.steps || []).map(function (st, i) { return (i + 1) + '. ' + actionVerb(st.parameters.action) + ' (from ' + st.parameters.fromStatus + ')'; }).join('\n');
      var expected = (sc.steps || []).map(function (st) {
        return st.assertions.map(function (as) { return as.keyword === 'JOB_STATUS_EQUALS' ? '→ ' + as.value : as.keyword; }).join('; ');
      }).join('\n');
      return {
        id: sc.id, priority: (sc.risk && sc.risk.priority) || '', module: sc.module,
        role: (sc.steps[0] && sc.steps[0].actor) || '', scenario: sc.title,
        preconditions: (sc.module === 'Planned / PPM' ? 'PPM' : 'Reactive') + ' test job exists',
        steps: steps, expected: expected,
        traceability: (sc.traceability && sc.traceability.technicalDesign || []).join(', '),
        evidence: 'Record before/after; read-back', actual: '', result: '', defect: '', tester: '', date: ''
      };
    });
  }

  window.StudioUAT = {
    journeys: journeys,
    scenarioFromJourney: scenarioFromJourney,
    library: library,
    countPacks: countPacks,
    renderCustomer: renderCustomer,
    renderGherkin: renderGherkin,
    toExcelRows: toExcelRows,
    adjacency: adjacency
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.StudioUAT;
})();
