/* vanilla-loader.js — loads the canonical Labs models READ-ONLY and
 * normalises them into the Studio's frozen Vanilla model.
 *
 * Source of truth: ../../model/*.json in the Labs repository. The Studio
 * NEVER writes there; the returned model is deep-frozen so no code path can
 * mutate Vanilla. Customer design forks a clone (model.js, later).
 *
 * Every normalised object keeps its provenance: confidence grade, evidence
 * ids, and — where a value was recovered from generated notes prose rather
 * than a structured field — provenance 'PARSED-FROM-NOTES'.
 */
(function () {
  'use strict';

  var S = (typeof window !== 'undefined' ? window.StudioSchema : require('./studio-schema.js'));

  var FILES = {
    helpdesk: 'VANILLA-HELPDESK.json',
    orders: 'VANILLA-ORDERS.json',
    crossDomain: 'CROSS-DOMAIN-RELATIONSHIPS.json',
    behaviours: 'VERIFIED-BEHAVIOURS.json',
    identities: 'IDENTITIES.json'
  };

  function fetchJson(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('Failed to load ' + url + ' (' + r.status + ')');
      return r.json();
    });
  }

  /* ---- normalisation -------------------------------------------------- */

  function normalise(raw) {
    var hd = raw.helpdesk, ord = raw.orders;

    /* Statuses: global registry keyed by name; Closed/Cancelled are single
     * records shared by both Types (sharedConfiguration, E-003). */
    var statusByName = {};
    var statusList = [];
    hd.helpdeskTypes.forEach(function (t) {
      t.statuses.forEach(function (st) {
        var rec = statusByName[st.name];
        if (!rec) {
          rec = {
            key: S.canonicalKey('hd', 'status', st.name),
            name: st.name,
            types: [],
            isDefaultFor: [],
            ordering: {},
            displayOrder: Infinity,
            confidence: st.confidence,
            evidence: st.evidence.slice()
          };
          statusByName[st.name] = rec;
          statusList.push(rec);
        }
        rec.types.push(t.name);
        rec.ordering[t.name] = st.ordering;
        if (st.isDefault) rec.isDefaultFor.push(t.name);
        rec.displayOrder = Math.min(rec.displayOrder, st.ordering);
      });
    });
    statusList.sort(function (a, b) {
      return a.displayOrder - b.displayOrder || a.name.localeCompare(b.name);
    });

    /* Actions: global registry keyed by full display name (unique across
     * the 50 live actions). Per-type membership recorded. Notes prose is
     * parsed into structured fields with explicit provenance. */
    var actionByName = {};
    var actionList = [];
    hd.helpdeskTypes.forEach(function (t) {
      t.actions.forEach(function (a) {
        var rec = actionByName[a.name];
        if (!rec) {
          var parsed = S.parseActionNotes(a.notes);
          rec = {
            key: S.canonicalKey('hd', 'action', a.name),
            name: a.name,
            code: a.code,
            active: a.active,
            applicability: a.applicability,
            mobileAvailable: a.mobileAvailable,
            types: [],
            buttonGroup: parsed.buttonGroup,
            flags: parsed.flags,
            addsTags: parsed.addsTags,
            removesTags: parsed.removesTags,
            resultingType: parsed.resultingType,
            notesProvenance: 'PARSED-FROM-NOTES',
            rawNotes: parsed.rawNotes,
            machineFired: false, /* derived below */
            confidence: a.confidence,
            evidence: a.evidence.slice()
          };
          actionByName[a.name] = rec;
          actionList.push(rec);
        }
        if (rec.types.indexOf(t.name) === -1) rec.types.push(t.name);
      });
    });
    actionList.sort(function (a, b) { return a.name.localeCompare(b.name); });

    /* Relationships: availability + results, per Type, with provenance. */
    var availability = [];
    var results = [];
    hd.helpdeskTypes.forEach(function (t) {
      t.relationships.forEach(function (r) {
        if (r.kind === 'action-available-in-status') {
          availability.push({
            action: r.action, status: r.fromStatus, type: t.name,
            confidence: r.confidence, evidence: r.evidence.slice()
          });
        } else if (r.kind === 'action-sets-job-status') {
          results.push({
            action: r.action, toStatus: r.toStatus, kind: 'sets', type: t.name,
            confidence: r.confidence, evidence: r.evidence.slice()
          });
        } else if (r.kind === 'action-user-selects-status') {
          results.push({
            action: r.action, toStatus: r.toStatus, kind: 'userSelects', type: t.name,
            confidence: r.confidence, evidence: r.evidence.slice()
          });
        }
      });
    });

    /* Machine-fired derivation: an action that produces a result (or is
     * fired by a supplier action / cross-domain trigger) but is available
     * from NO status is fired by an engine, not a user. Matches the
     * grouped-view 'Not allocated' column (E-005) + U-004 resolution. */
    var availByAction = {};
    availability.forEach(function (e) { availByAction[e.action] = true; });
    var firedByCode = {}; /* helpdesk action code -> [supplier action keys] */
    ord.supplierActions.forEach(function (sa) {
      if (sa.firesHelpdeskAction) {
        (firedByCode[sa.firesHelpdeskAction] = firedByCode[sa.firesHelpdeskAction] || []).push(sa.canonicalKey);
      }
    });
    actionList.forEach(function (a) {
      var hasResult = results.some(function (r) { return r.action === a.name; });
      var externallyFired = !!firedByCode[a.code];
      if (!availByAction[a.name] && (hasResult || externallyFired)) a.machineFired = true;
      a.firedBySupplierActions = firedByCode[a.code] || [];
    });

    /* Operative statuses are structurally type-agnostic (U-003, E-013) —
     * take one copy. */
    var operativeStatuses = hd.helpdeskTypes[0].operativeStatuses.map(function (o) {
      return typeof o === 'string' ? { name: o } : o;
    });

    /* Orders domain: pass through with canonical keys added (supplier
     * actions already carry a collision-safe canonicalKey — keep it). */
    var orders = {
      orderStatuses: ord.orderStatuses.map(function (o) {
        return Object.assign({ key: S.canonicalKey('ord', 'order-status', o.name) }, o);
      }),
      orderPriorities: ord.orderPriorities.map(function (o, i) {
        /* duplicate 'Default' names (VO-001) — disambiguate by index */
        return Object.assign({ key: S.canonicalKey('ord', 'order-priority', o.name + '-' + i) }, o);
      }),
      orderTypes: ord.orderTypes.map(function (o) {
        return Object.assign({ key: S.canonicalKey('ord', 'order-type', o.name) }, o);
      }),
      budgetCategories: ord.budgetCategories.map(function (o) {
        return Object.assign({ key: S.canonicalKey('ord', 'budget-category', o.name) }, o);
      }),
      supplierActions: ord.supplierActions.map(function (o) {
        return Object.assign({ key: S.canonicalKey('ord', 'supplier-action', o.canonicalKey) }, o);
      }),
      emptyTabs: ord.emptyTabs.slice(),
      unknowns: (ord.unknowns || []).slice()
    };

    var model = {
      meta: {
        environment: hd.metadata.environment,
        generatedAt: {
          helpdesk: hd.metadata.generatedAt,
          orders: ord.metadata.generatedAt
        },
        sourceFingerprints: {
          helpdesk: S.fingerprint(hd),
          orders: S.fingerprint(ord),
          crossDomain: S.fingerprint(raw.crossDomain),
          behaviours: S.fingerprint(raw.behaviours),
          identities: S.fingerprint(raw.identities)
        },
        loadedAt: new Date().toISOString(),
        notes: 'Normalised READ-ONLY from Labs model/*.json. Vanilla is immutable.'
      },
      helpdesk: {
        types: hd.helpdeskTypes.map(function (t) {
          return {
            name: t.name,
            statuses: t.statuses.map(function (s) { return s.name; }),
            defaultStatus: (t.statuses.filter(function (s) { return s.isDefault; })[0] || {}).name || null,
            actions: t.actions.map(function (a) { return a.name; }),
            unknowns: (t.unknowns || []).slice()
          };
        }),
        statuses: statusList,
        actions: actionList,
        availability: availability,
        results: results,
        operativeStatuses: operativeStatuses,
        sharedConfiguration: hd.sharedConfiguration.slice()
      },
      orders: orders,
      crossDomain: raw.crossDomain.edges.slice(),
      behaviours: raw.behaviours.behaviours.slice(),
      identities: raw.identities,
      evidenceIndex: hd.evidence.slice()
    };

    return S.deepFreeze(model);
  }

  /* ---- fidelity invariants --------------------------------------------
   * Run after every load. If the Labs repo changes shape or counts, the
   * Studio must notice — never silently absorb drift. Counts pinned from
   * the current evidence baseline (E-001..E-024 / EO-001..EO-006).
   */
  function invariants(m) {
    var checks = [];
    function check(name, pass, detail) { checks.push({ name: name, pass: !!pass, detail: detail || '' }); }

    var hd = m.helpdesk;
    check('2 Helpdesk Types (Reactive, Planned)',
      hd.types.length === 2 &&
      hd.types[0].name === 'Reactive' && hd.types[1].name === 'Planned',
      hd.types.map(function (t) { return t.name; }).join(', '));

    check('13 unique statuses (9 Reactive, 6 Planned, Closed+Cancelled shared)',
      hd.statuses.length === 13 &&
      hd.types[0].statuses.length === 9 && hd.types[1].statuses.length === 6,
      hd.statuses.length + ' unique; per-type ' + hd.types.map(function (t) { return t.statuses.length; }).join('/'));

    var shared = hd.statuses.filter(function (s) { return s.types.length === 2; }).map(function (s) { return s.name; }).sort();
    check('Shared statuses are exactly Closed and Cancelled',
      shared.length === 2 && shared[0] === 'Cancelled' && shared[1] === 'Closed', shared.join(', '));

    check('50 unique live actions', hd.actions.length === 50, String(hd.actions.length));
    check('All actions active', hd.actions.every(function (a) { return a.active; }));

    check('137 relationships (95 availability, 27 sets, 15 user-selects)',
      hd.availability.length === 95 &&
      hd.results.filter(function (r) { return r.kind === 'sets'; }).length === 27 &&
      hd.results.filter(function (r) { return r.kind === 'userSelects'; }).length === 15,
      hd.availability.length + ' avail / ' +
      hd.results.filter(function (r) { return r.kind === 'sets'; }).length + ' sets / ' +
      hd.results.filter(function (r) { return r.kind === 'userSelects'; }).length + ' user-selects');

    var statusNames = {};
    hd.statuses.forEach(function (s) { statusNames[s.name] = true; });
    var actionNames = {};
    hd.actions.forEach(function (a) { actionNames[a.name] = true; });
    check('Every availability edge resolves to a known action and status',
      hd.availability.every(function (e) { return actionNames[e.action] && statusNames[e.status]; }));
    check('Every result edge resolves to a known action and status',
      hd.results.every(function (e) { return actionNames[e.action] && statusNames[e.toStatus]; }));

    check('Default statuses: Reactive→With Helpdesk, Planned→none',
      hd.types[0].defaultStatus === 'With Helpdesk' && hd.types[1].defaultStatus === null,
      hd.types.map(function (t) { return t.name + '→' + t.defaultStatus; }).join(', '));

    check('9 operative statuses (type-agnostic)', hd.operativeStatuses.length === 9, String(hd.operativeStatuses.length));

    var o = m.orders;
    check('Orders: 11 statuses / 7 priorities / 2 types / 11 budget categories / 13 supplier actions',
      o.orderStatuses.length === 11 && o.orderPriorities.length === 7 &&
      o.orderTypes.length === 2 && o.budgetCategories.length === 11 &&
      o.supplierActions.length === 13,
      [o.orderStatuses.length, o.orderPriorities.length, o.orderTypes.length,
        o.budgetCategories.length, o.supplierActions.length].join('/'));

    var saKeys = {};
    var saDup = o.supplierActions.some(function (sa) {
      if (saKeys[sa.canonicalKey]) return true;
      saKeys[sa.canonicalKey] = true; return false;
    });
    check('Supplier-action canonical keys unique (SP07a..d disambiguated)', !saDup);

    var orderStatusNames = {};
    o.orderStatuses.forEach(function (s) { orderStatusNames[s.name] = true; });
    check('Supplier-action availability resolves to known order statuses',
      o.supplierActions.every(function (sa) {
        return (sa.availableIn || []).every(function (n) { return orderStatusNames[n]; });
      }));

    var hdCodes = {};
    hd.actions.forEach(function (a) { hdCodes[a.code] = true; });
    check('Every supplier-action firesHelpdeskAction resolves to a helpdesk action code',
      o.supplierActions.every(function (sa) { return !sa.firesHelpdeskAction || hdCodes[sa.firesHelpdeskAction]; }));

    check('18 cross-domain edges (X-001..X-018)', m.crossDomain.length === 18, String(m.crossDomain.length));
    check('13 graded behaviours (B-001..B-013)', m.behaviours.length === 13, String(m.behaviours.length));

    var idStatuses = Object.keys(m.identities.statuses || {});
    check('IDENTITIES status names match the 13 model statuses',
      idStatuses.length === 13 && idStatuses.every(function (n) { return statusNames[n]; }),
      idStatuses.length + ' GUID-mapped');

    check('Vanilla model is deep-frozen (immutable)', Object.isFrozen(m) && Object.isFrozen(m.helpdesk.actions));

    return checks;
  }

  function loadAll(baseUrl) {
    baseUrl = baseUrl || '../../model/';
    var names = Object.keys(FILES);
    return Promise.all(names.map(function (n) { return fetchJson(baseUrl + FILES[n]); }))
      .then(function (loaded) {
        var raw = {};
        names.forEach(function (n, i) { raw[n] = loaded[i]; });
        var model = normalise(raw);
        return { model: model, invariants: invariants(model), raw: raw };
      });
  }

  var api = { loadAll: loadAll, normalise: normalise, invariants: invariants, FILES: FILES };
  if (typeof window !== 'undefined') window.VanillaLoader = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
