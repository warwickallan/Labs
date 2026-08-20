/* effective.js — the EFFECTIVE BUSINESS VIEW between raw configuration and
 * anything a customer reads.
 *
 *   RAW CONFIGURATION
 *          ↓  apply: job type scoping · status-level gates · engine routes ·
 *              machine-fired vs user actions · channel rules
 *   EFFECTIVE WORKFLOW
 *          ↓
 *   SOLUTION DESIGN
 *
 * Raw configuration answers "what fields exist"; a Solution Design has to
 * answer "how does the system behave for this type of job and this user".
 * The differences this layer enforces:
 *
 *  - TYPE SCOPING. An action's availability and outcomes are read per
 *    Helpdesk Type from the typed relationship edges, so a Planned status
 *    never appears to fall into Reactive statuses merely because a shared
 *    action can go there on the Reactive side.
 *  - THE TWO-GATE MOBILE MODEL. A job appears on the Orchestrate app only
 *    where the STATUS carries the mobile gate ("Appear on mobile app") AND
 *    the action is mobile-capable. An action being mobile-capable in Closed
 *    does not put Closed on the app. Where an instance capture read the
 *    status records, the gate comes from that capture; otherwise the
 *    standard product's verified gates are used and declared as inherited.
 *  - PROVENANCE OF CLAIMS. Everything returned carries how it is known:
 *    OBSERVED (in this capture), INHERITED-STANDARD (standard product
 *    behaviour not verified in this instance), UNKNOWN.
 *
 * Raw truth is untouched — the Technical Design keeps reading the model
 * directly, exactly as before.
 */
(function () {
  'use strict';

  /* Standard-product status-level mobile gates, from the discovery
   * evidence (record-level "Appear on mobile app" ticks). Used only when
   * the model being rendered did not capture status records itself. */
  var STANDARD_MOBILE_GATES = ['With Maintenance Team', 'With Maintenance Team - R'];

  function statusByName(model) {
    var m = {};
    model.helpdesk.statuses.forEach(function (s) { m[s.name] = s; });
    return m;
  }
  function actionByName(model) {
    var m = {};
    model.helpdesk.actions.forEach(function (a) { m[a.name] = a; });
    return m;
  }

  /* ---- the two-gate mobile model ---------------------------------------- */

  function mobileGate(model, name) {
    var s = statusByName(model)[name];
    if (!s) return { gated: false, provenance: 'UNKNOWN' };
    if (s.flagsCaptured || (s.flags && s.flags.length)) {
      var gated = (s.flags || []).some(function (f) { return /mobile app/i.test(f); });
      return { gated: gated, provenance: 'OBSERVED' };
    }
    return {
      gated: STANDARD_MOBILE_GATES.indexOf(name) !== -1,
      provenance: 'INHERITED-STANDARD'
    };
  }

  /* Statuses where jobs actually appear on the app, with provenance. */
  function mobileStatuses(model) {
    var out = [];
    model.helpdesk.statuses.forEach(function (s) {
      var g = mobileGate(model, s.name);
      if (g.gated) out.push({ name: s.name, provenance: g.provenance });
    });
    return out;
  }

  /* ---- type-scoped workflow --------------------------------------------- */

  function actionsIn(model, status, typeName, wantMachine) {
    var byName = actionByName(model);
    var seen = {}, out = [];
    model.helpdesk.availability.forEach(function (e) {
      if (e.status !== status || seen[e.action]) return;
      if (typeName && e.type && e.type !== typeName) return;
      seen[e.action] = true;
      var a = byName[e.action];
      if (!a) return;
      if (!!a.machineFired !== !!wantMachine) return;
      out.push(a);
    });
    return out;
  }

  function entriesInto(model, status, typeName) {
    var seen = {}, out = [];
    model.helpdesk.results.forEach(function (r) {
      if (r.toStatus !== status || seen[r.action]) return;
      if (typeName && r.type && r.type !== typeName) return;
      seen[r.action] = true;
      out.push(r.action);
    });
    return out;
  }

  function outcomesOf(model, status, typeName) {
    var names = {};
    actionsIn(model, status, typeName, false).concat(actionsIn(model, status, typeName, true))
      .forEach(function (a) { names[a.name] = true; });
    var seen = {}, out = [];
    model.helpdesk.results.forEach(function (r) {
      if (!names[r.action] || r.toStatus === status || seen[r.toStatus]) return;
      if (typeName && r.type && r.type !== typeName) return;
      seen[r.toStatus] = true;
      out.push(r.toStatus);
    });
    return out;
  }

  /* ---- channels vs delivery routes --------------------------------------
   * "Available through" = actual presentation channels; the contractor
   * route is a DELIVERY ROUTE, not a channel. */
  function channels(model, status, typeName) {
    var acts = actionsIn(model, status, typeName, false);
    var out = ['Helpdesk web'];
    var gate = mobileGate(model, status);
    if (gate.gated && acts.some(function (a) { return a.mobileAvailable; })) {
      out.push('Orchestrate mobile app');
    }
    return out;
  }

  function deliveryRoutes(model, status, typeName) {
    var acts = actionsIn(model, status, typeName, false);
    var out = [];
    if (/Maintenance Team/.test(status)) out.push('Internal maintenance');
    if (/Contractor/.test(status) ||
      acts.some(function (a) { return (a.flags || []).indexOf('supplier_assignment') !== -1; })) {
      out.push('Contractor (via order)');
    }
    return out;
  }

  /* ---- engine behaviour provenance ---------------------------------------
   * "Approval returns the job automatically" was VERIFIED in a newer
   * baseline. For a capture where it was not observed, it is standard-
   * product behaviour and must be phrased that way, not quietly promoted. */
  function engineProvenance(project, which) {
    var notes = ((project && project.findingsSummary && project.findingsSummary.notDefects) || []).join(' ');
    if (which === 'quote' && /Quote/i.test(notes)) return 'OBSERVED';
    if (which === 'business-case' && /Business Case/i.test(notes)) return 'OBSERVED';
    return 'INHERITED-STANDARD';
  }

  /* ---- type view: is a Type's detail captured, inherited, or unknown? ---
   * A Reactive-only capture lists Planned statuses but no Planned actions.
   * Where the statuses match the standard product, the standard Planned
   * design is the best available description — but INHERITED, and said so.
   */
  function typeView(model, vanilla, typeName) {
    var t = model.helpdesk.types.filter(function (x) { return x.name === typeName; })[0];
    if (!t) return { state: 'ABSENT', statuses: [], model: model };
    var hasDetail = t.statuses.some(function (name) {
      return actionsIn(model, name, typeName, false).length ||
        actionsIn(model, name, typeName, true).length;
    });
    if (hasDetail) return { state: 'OBSERVED', statuses: t.statuses, model: model };

    if (vanilla && vanilla !== model) {
      var vt = vanilla.helpdesk.types.filter(function (x) { return x.name === typeName; })[0];
      if (vt) {
        var same = t.statuses.length === vt.statuses.length &&
          t.statuses.every(function (n) { return vt.statuses.indexOf(n) !== -1; });
        if (same) {
          return {
            state: 'INHERITED-STANDARD', statuses: vt.statuses, model: vanilla,
            note: 'The ' + typeName + ' workflow detail was not captured for this instance. Its statuses match the standard product exactly, so the standard ' + typeName + ' design is shown — to be verified against this instance.'
          };
        }
        return {
          state: 'UNKNOWN', statuses: t.statuses, model: model,
          note: 'The ' + typeName + ' workflow detail was not captured for this instance, and its statuses differ from the standard product — the detail is unknown until captured.'
        };
      }
    }
    return { state: 'UNKNOWN', statuses: t.statuses, model: model };
  }

  var api = {
    STANDARD_MOBILE_GATES: STANDARD_MOBILE_GATES,
    mobileGate: mobileGate, mobileStatuses: mobileStatuses,
    actionsIn: actionsIn, entriesInto: entriesInto, outcomesOf: outcomesOf,
    channels: channels, deliveryRoutes: deliveryRoutes,
    engineProvenance: engineProvenance, typeView: typeView
  };
  if (typeof window !== 'undefined') window.StudioEffective = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
