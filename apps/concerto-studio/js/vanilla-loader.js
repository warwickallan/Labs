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
          /* modelVersion 2 carries structured per-action configuration
           * (evidence-promoted); v1 falls back to parsing generated notes */
          var v2 = 'buttonGroup' in a || a.tagAutomation;
          var parsed = v2 ? null : S.parseActionNotes(a.notes);
          rec = {
            key: S.canonicalKey('hd', 'action', a.name),
            name: a.name,
            code: a.code,
            active: a.active,
            applicability: a.applicability,
            mobileAvailable: a.mobileAvailable,
            types: [],
            buttonGroup: v2 ? (a.buttonGroup || null) : parsed.buttonGroup,
            flags: (v2 ? a.flags : parsed.flags) || [],
            addsTags: v2 ? (a.tagAutomation ? a.tagAutomation.adds.slice() : []) : parsed.addsTags,
            removesTags: v2 ? (a.tagAutomation ? a.tagAutomation.removes.slice() : []) : parsed.removesTags,
            tagNote: v2 && a.tagAutomation ? (a.tagAutomation.note || null) : null,
            resultingType: v2 ? (a.resultingType || null) : parsed.resultingType,
            hidden: !!a.hidden,
            orderStatusTrigger: a.orderStatusTrigger || null,
            orderApprovalTrigger: !!a.orderApprovalTrigger,
            afpTrigger: !!a.afpTrigger,
            ordersEffects: (a.ordersEffects || []).slice(),
            constraints: (a.constraints || []).slice(),
            timer: a.timer || null,
            hold: a.hold || null,
            defaultOrdersProject: a.defaultOrdersProject || null,
            routesTo: a.routesTo || null,
            emails: (a.emails || []).slice(),
            assignment: a.assignment || {},
            importanceUseFirst: !!a.importanceUseFirst,
            availableInAnyStatus: !!a.availableInAnyStatus,
            availableIn: (a.availableIn || []).slice(),
            notesProvenance: a.provenance || (v2 ? 'STRUCTURED-V2' : 'PARSED-FROM-NOTES'),
            rawNotes: a.notes || '',
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
        modelVersion: hd.metadata.modelVersion,
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
        /* Which fields the SOURCE actually captured. Absent for the canonical
         * models (they capture everything); present for instance crawls so
         * the differ never reads an uncaptured field as a deviation. */
        capture: hd.metadata.capture || null,
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

    check('Model version supported (1 or 2)',
      m.meta.modelVersion === 1 || m.meta.modelVersion === 2,
      'v' + m.meta.modelVersion);

    if (m.meta.modelVersion >= 2) {
      /* structured per-action availableIn must agree with the relationship
       * edges — same truth, two projections */
      var availByAction = {};
      hd.availability.forEach(function (e) {
        (availByAction[e.action] = availByAction[e.action] || {})[e.status] = true;
      });
      check('v2 structured availableIn agrees with relationship edges',
        hd.actions.every(function (a) {
          var fromEdges = Object.keys(availByAction[a.name] || {}).sort().join('|');
          return a.availableIn.slice().sort().join('|') === fromEdges;
        }));

      var gm06 = hd.actions.filter(function (a) { return a.code === 'GM06'; })[0];
      check('v2 carries structured tag automation (GM06 = VI-010 computable)',
        gm06 && gm06.addsTags.indexOf('05. On hold') !== -1 &&
        gm06.removesTags.indexOf('04. In progress') !== -1,
        gm06 ? '+' + gm06.addsTags.join(',') + ' −' + gm06.removesTags.join(',') : 'GM06 missing');

      var rh04v2 = hd.actions.filter(function (a) { return a.code === 'RH04'; })[0];
      check('v2 structured triggers/constraints present (RH04 order trigger, GM02→GM01 constraint)',
        rh04v2 && rh04v2.orderStatusTrigger === 'Awaiting acceptance' &&
        hd.actions.some(function (a) { return a.code === 'GM02' && a.constraints.indexOf('GM01') !== -1; }));
    }

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

  /* Normalise a harness INSTANCE-SNAPSHOT into the same model shape as
   * Vanilla — ONE normaliser, multiple model sources. The snapshot's
   * helpdesk/orders parts are emitted by the crawler in the raw
   * VANILLA-*.json shapes precisely so this reuse is possible. */
  function normaliseSnapshot(snapshot) {
    var raw = {
      helpdesk: snapshot.helpdesk || {
        metadata: { modelVersion: 2, environment: snapshot.meta.targetUrl, generatedAt: snapshot.meta.crawledAt },
        sharedConfiguration: [],
        helpdeskTypes: [
          { name: 'Reactive', statuses: [], operativeStatuses: [], actions: [], relationships: [] },
          { name: 'Planned', statuses: [], operativeStatuses: [], actions: [], relationships: [] }
        ],
        evidence: []
      },
      orders: snapshot.orders || {
        metadata: { generatedAt: snapshot.meta.crawledAt },
        orderStatuses: [], orderPriorities: [], orderTypes: [],
        budgetCategories: [], supplierActions: [], emptyTabs: [], unknowns: []
      },
      crossDomain: { edges: [] },
      behaviours: { behaviours: [] },
      identities: Object.assign({ _meta: {}, statuses: {}, actions: {} }, snapshot.identities || {})
    };
    var model = normalise(raw);
    return model;
  }

  var api = { loadAll: loadAll, normalise: normalise, normaliseSnapshot: normaliseSnapshot, invariants: invariants, FILES: FILES };
  if (typeof window !== 'undefined') window.VanillaLoader = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
