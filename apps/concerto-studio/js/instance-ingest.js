/* instance-ingest.js — turn a captured customer-instance crawl into a
 * Studio model, so a project's Diagram / Action Map / Matrix / Configuration
 * show THAT INSTANCE rather than the Vanilla reference.
 *
 * Two snapshot shapes are accepted:
 *
 *   1. HARNESS shape — the crawler already emits raw VANILLA-*.json parts
 *      (snapshot.helpdesk / snapshot.orders); handed straight to
 *      VanillaLoader.normaliseSnapshot. One normaliser, many sources.
 *
 *   2. CAPTURED-CRAWL shape — an evidence snapshot recorded by an
 *      authenticated read-only browser crawl (statuses.typeAttribution,
 *      statuses.recordLevelReactive, actionsGroupedViewReactive). This file
 *      converts that evidence into the raw shape.
 *
 * PROVENANCE IS THE POINT. The converter never invents configuration. Where
 * the crawl recorded an abbreviation the evidence itself defines, it is
 * expanded and logged. Where an abbreviation is genuinely ambiguous in the
 * source ("WC-R" = With Contractor - R *or* Work Complete - R), it is
 * resolved ONLY by matching the action code against the baseline's known
 * result — logged as DISAMBIGUATED-VS-BASELINE — and otherwise left
 * UNRESOLVED and reported. Fields the crawl did not capture (per-action
 * button group, tags, timers, emails …) stay empty and are declared in
 * report.notCaptured, which the differ reads so uncaptured fields are never
 * mistaken for deviations.
 */
(function () {
  'use strict';

  /* Abbreviations defined by the snapshot's own listLevel line. */
  var ABBREV = {
    'WH': 'With Helpdesk',
    'WMT-R': 'With Maintenance Team - R',
    'AOA-R': 'Awaiting Order Approval - R',
    'QR-R': 'Quote Requested - R',
    'BC-R': 'Business Case - R',
    'WC-R(work)': 'Work Complete - R',
    'Closed': 'Closed',
    'Cancelled': 'Cancelled'
  };
  /* Ambiguous in the source: both statuses abbreviate to WC-R. */
  var AMBIGUOUS = { 'WC-R': ['With Contractor - R', 'Work Complete - R'] };

  /* What a side-panel status+grouped-action crawl actually sees. */
  var CAPTURED_ACTION_FIELDS = ['code', 'active', 'types'];
  var CAPTURED_STATUS_FIELDS = ['types', 'isDefaultFor', 'displayOrder'];
  var NOT_CAPTURED = [
    'buttonGroup', 'flags', 'addsTags', 'removesTags', 'resultingType',
    'hidden', 'constraints', 'timer', 'hold', 'orderStatusTrigger',
    'ordersEffects', 'emails', 'defaultOrdersProject', 'routesTo',
    'applicability', 'mobileAvailable'
  ];

  function baselineIndexByCode(baseline) {
    var byCode = {};
    if (!baseline) return byCode;
    baseline.helpdesk.actions.forEach(function (a) { if (a.code) byCode[a.code] = a; });
    return byCode;
  }

  function baselineResultStatus(baseline, code) {
    var byCode = baselineIndexByCode(baseline);
    var act = byCode[code];
    if (!act) return null;
    var hit = baseline.helpdesk.results.filter(function (r) { return r.action === act.name; })[0];
    return hit ? hit.toStatus : null;
  }

  /* "WH 10, WMT-R 20, …, WC-R(work) 60" → {status name: ordering} */
  function parseOrderings(listLevel) {
    var out = {};
    if (!listLevel) return out;
    var re = /([A-Za-z][A-Za-z\-]*(?:\(work\))?)\s+(\d+)\b/g, m;
    while ((m = re.exec(listLevel)) !== null) {
      var name = ABBREV[m[1]] || (AMBIGUOUS[m[1]] ? AMBIGUOUS[m[1]][0] : null);
      if (name && !(name in out)) out[name] = parseInt(m[2], 10);
    }
    return out;
  }

  /* "RH04 Assign to contractor→With Contractor - R (Orchestrate only)" */
  function parseActionEntry(entry) {
    var raw = String(entry).trim();
    if (!raw || raw.charAt(0) === '(') return null; /* "(no actions — dead end)" */
    var note = null;
    var noteMatch = raw.match(/\s*\(([^)]*)\)\s*$/);
    if (noteMatch) { note = noteMatch[1]; raw = raw.slice(0, noteMatch.index).trim(); }
    var parts = raw.split('→');
    var left = parts[0].trim();
    var target = parts.length > 1 ? parts[1].trim() : null;
    /* Concerto action codes: 1–3 letters + 2–3 digits + an optional variant
     * letter — G001, RH04, T05, SP07a. */
    var codeMatch = left.match(/^([A-Z]{1,3}\d{2,3}[a-z]?)(?![A-Za-z0-9])\s*/);
    if (!codeMatch) return null;
    return {
      code: codeMatch[1],
      label: left.slice(codeMatch[0].length).trim(),
      target: target,
      note: note,
      raw: String(entry).trim()
    };
  }

  /* ---- Orders ----------------------------------------------------------
   * An instance's Orders truth may be acquired by inspection rather than a
   * full grid crawl. What is carried is exactly what was observed:
   *  - actions opened individually → full detail, OBSERVED;
   *  - actions counted but not opened → PRESENT, detail NOT OBSERVED;
   *  - actions observed to be ABSENT → absent, and recorded as an absence
   *    with its reason, so "missing" is never confused with "not looked at".
   */
  function ordersFrom(observed, report) {
    var out = {
      metadata: { generatedAt: report.crawledAt },
      orderStatuses: [], orderPriorities: [], orderTypes: [],
      budgetCategories: [], supplierActions: [], emptyTabs: [], unknowns: []
    };
    if (!observed) return out;

    Object.keys(observed.actions || {}).forEach(function (key) {
      var a = observed.actions[key];
      out.supplierActions.push(Object.assign({}, a, {
        canonicalKey: key,
        observedCode: a.code || key,
        detailObserved: true,
        provenance: 'OBSERVED-INSTANCE'
      }));
    });
    (observed.presentNotDetailed || []).forEach(function (p) {
      out.supplierActions.push({
        canonicalKey: p.canonicalKey,
        code: p.canonicalKey.replace(/[a-d]$/, ''),
        observedCode: p.canonicalKey.replace(/[a-d]$/, ''),
        name: 'NOT INDIVIDUALLY OBSERVED',
        detailObserved: false,
        provenance: 'PRESENT-DETAIL-NOT-OBSERVED',
        confidence: 'VERIFIED — STRUCTURAL',
        note: p.reason,
        availableIn: [],
        portalVisible: null,
        resultingOrderStatus: null,
        firesHelpdeskAction: null
      });
      report.notes.push('Supplier action ' + p.canonicalKey +
        ' is present in this instance but its detail was not captured — shown as NOT INDIVIDUALLY OBSERVED, never filled in from the baseline.');
    });
    (observed.absent || []).forEach(function (x) {
      out.unknowns.push({
        family: 'supplierAction', canonicalKey: x.canonicalKey,
        kind: 'OBSERVED-ABSENT', name: x.name, reason: x.reason
      });
      report.notes.push('Supplier action ' + x.canonicalKey + ' is ABSENT from this instance (observed).');
    });

    var counted = observed.supplierActionCount;
    if (counted != null && counted !== out.supplierActions.length) {
      report.unresolved.push({
        item: 'Orders supplier actions',
        reason: 'the grid was counted at ' + counted + ' records but ' +
          out.supplierActions.length + ' are accounted for individually'
      });
    }

    if (observed.orderStatuses && observed.orderStatuses.captured === false) {
      (observed.orderStatuses.referenced || []).forEach(function (n) {
        out.orderStatuses.push({
          name: n, provenance: 'REFERENCED-NOT-ENUMERATED',
          confidence: 'VERIFIED — STRUCTURAL',
          note: 'Known to exist because an observed supplier action refers to it; the Order status family itself was not enumerated.'
        });
      });
      out.unknowns.push({ family: 'orderStatuses', kind: 'NOT-CAPTURED',
        reason: observed.orderStatuses.reason });
      report.notes.push('Order statuses were not enumerated in this instance — only those referenced by observed supplier actions are carried.');
    }

    if (observed.responseCategories) out.responseCategories = observed.responseCategories;
    if (observed.quoteEngine) out.quoteEngine = observed.quoteEngine;
    return out;
  }

  /* ---- verified-change overlay ----------------------------------------
   * A CURRENT model is the Day-One model plus the changes that were
   * actually applied and read-back verified. Expressing it as an overlay
   * (rather than a second hand-written capture) means Day-One can never be
   * quietly edited, and every difference between the two traces to a
   * change receipt. */
  function applyChanges(rawOrders, changes, report) {
    (changes || []).forEach(function (c) {
      if (c.family !== 'supplierAction') {
        report.unresolved.push({ item: c.ref || 'change', reason: 'unsupported change family: ' + c.family });
        return;
      }
      var hit = rawOrders.supplierActions.filter(function (a) { return a.canonicalKey === c.key; })[0];
      if (!hit) {
        report.unresolved.push({ item: c.ref || c.key, reason: 'no such supplier action in the baseline snapshot' });
        return;
      }
      Object.keys(c.set || {}).forEach(function (f) {
        report.appliedChanges.push({
          ref: c.ref, object: c.key + ' ' + (hit.name || ''), field: f,
          from: hit[f], to: c.set[f]
        });
        hit[f] = c.set[f];
      });
      if (c.availability) {
        var list = (hit.availableIn || []).slice();
        (c.availability.remove || []).forEach(function (s) {
          var i = list.indexOf(s);
          if (i !== -1) { list.splice(i, 1); report.appliedChanges.push({ ref: c.ref, object: c.key, field: 'availableIn', from: s, to: '(removed)' }); }
        });
        (c.availability.add || []).forEach(function (s) {
          if (list.indexOf(s) === -1) { list.push(s); report.appliedChanges.push({ ref: c.ref, object: c.key, field: 'availableIn', from: '(absent)', to: s }); }
        });
        hit.availableIn = list;
      }
      hit.changedBy = (hit.changedBy || []).concat([c.ref]);
    });
    return rawOrders;
  }

  function fromCapturedCrawl(snap, baseline, opts) {
    var report = {
      source: snap.label || 'captured crawl',
      targetUrl: (snap.meta || {}).targetUrl || null,
      crawledAt: (snap.meta || {}).crawledAt || null,
      crawlMethod: (snap.meta || {}).crawlMethod || null,
      capturedActionFields: CAPTURED_ACTION_FIELDS.slice(),
      capturedStatusFields: CAPTURED_STATUS_FIELDS.slice(),
      notCaptured: NOT_CAPTURED.slice(),
      resolutions: [],
      unresolved: [],
      statusFlags: {},
      notes: [],
      appliedChanges: [],
      counts: {}
    };
    function resolved(item, from, to, how) { report.resolutions.push({ item: item, from: from, to: to, how: how }); }
    function unresolved(item, reason) { report.unresolved.push({ item: item, reason: reason }); }

    var ev = [snap.label ? snap.label : 'captured-crawl'];
    var attribution = (snap.statuses || {}).typeAttribution || { reactive: [], planned: [] };
    var orderings = parseOrderings((snap.statuses || {}).listLevel);
    var recordLevel = (snap.statuses || {}).recordLevelReactive || {};
    Object.keys(recordLevel).forEach(function (n) { report.statusFlags[n] = (recordLevel[n].ticked || []).slice(); });

    var defaultStatus = /With Helpdesk\s*=\s*Default/i.test((snap.statuses || {}).listLevel || '')
      ? 'With Helpdesk' : null;

    function statusRecords(names, typeName) {
      return names.map(function (n, i) {
        var ord = orderings[n];
        if (ord == null) {
          ord = (i + 1) * 10;
          report.notes.push('Sort order not captured for ' + typeName + ' status "' + n +
            '" — display order follows the crawl listing, not an observed value.');
        }
        return {
          name: n,
          isDefault: typeName === 'Reactive' && n === defaultStatus,
          ordering: ord,
          confidence: 'VERIFIED — OBSERVED',
          evidence: ev.slice()
        };
      });
    }

    /* Actions + relationships, from the grouped action view (Reactive). */
    var grouped = snap.actionsGroupedViewReactive || {};
    var byCode = baselineIndexByCode(baseline);
    var actions = {};      /* name -> raw action record */
    var availability = []; /* {action, fromStatus} */
    var results = {};      /* name -> toStatus (deduped) */

    Object.keys(grouped).forEach(function (statusName) {
      (grouped[statusName] || []).forEach(function (entry) {
        var p = parseActionEntry(entry);
        if (!p) {
          if (String(entry).indexOf('no actions') === -1 && String(entry).charAt(0) !== '(') {
            unresolved(String(entry), 'could not read an action code from the crawl entry');
          }
          return;
        }
        var base = byCode[p.code];
        var name;
        if (base) {
          name = base.name;
          if (p.label) resolved(p.code, p.label, name, 'CODE-MATCHED-BASELINE');
        } else {
          name = p.code + (p.label ? '. ' + p.label : '');
          report.notes.push('Action ' + p.code + ' has no baseline counterpart — carried with its observed label only.');
        }

        if (!actions[name]) {
          actions[name] = {
            name: name,
            code: p.code,
            active: true,
            applicability: base ? base.applicability : null,
            mobileAvailable: base ? base.mobileAvailable : null,
            confidence: 'VERIFIED — OBSERVED',
            evidence: ev.slice(),
            buttonGroup: null,
            flags: [],
            availableIn: [],
            provenance: 'OBSERVED-CRAWL',
            notes: ''
          };
        }
        if (actions[name].availableIn.indexOf(statusName) === -1) actions[name].availableIn.push(statusName);
        availability.push({
          kind: 'action-available-in-status',
          action: name,
          fromStatus: statusName,
          confidence: 'VERIFIED — OBSERVED',
          evidence: ev.slice()
        });

        if (p.target) {
          var to = null;
          if (ABBREV[p.target]) to = ABBREV[p.target];
          else if (AMBIGUOUS[p.target]) {
            var fromBase = baselineResultStatus(baseline, p.code);
            if (fromBase && AMBIGUOUS[p.target].indexOf(fromBase) !== -1) {
              to = fromBase;
              resolved(p.code + ' → ' + p.target, p.target, to, 'DISAMBIGUATED-VS-BASELINE');
            } else {
              unresolved(p.raw, '"' + p.target + '" is ambiguous in the crawl (' +
                AMBIGUOUS[p.target].join(' / ') + ') and the baseline does not settle it — result edge omitted');
            }
          } else {
            to = p.target; /* already a full status name */
          }
          if (to) results[name] = to;
        }
      });
    });

    var reactiveStatusNames = attribution.reactive || [];
    var plannedStatusNames = attribution.planned || [];
    var knownStatus = {};
    reactiveStatusNames.concat(plannedStatusNames).forEach(function (n) { knownStatus[n] = true; });
    Object.keys(results).forEach(function (name) {
      if (!knownStatus[results[name]]) {
        unresolved(name + ' → ' + results[name], 'resulting status is not in the crawled status list — edge omitted');
        delete results[name];
      }
    });

    var actionList = Object.keys(actions).sort().map(function (n) { return actions[n]; });
    var relationships = availability.slice();
    Object.keys(results).sort().forEach(function (name) {
      relationships.push({
        kind: 'action-sets-job-status',
        action: name,
        toStatus: results[name],
        confidence: 'VERIFIED — STRUCTURAL',
        evidence: ev.slice()
      });
    });
    report.notes.push('The crawl records that an action leads to a status, not whether Concerto sets it ' +
      'or the user selects it — every result edge is carried as "sets".');
    if (!plannedStatusNames.length) report.notes.push('Planned Helpdesk was not crawled.');
    else report.notes.push('Planned statuses were listed by the crawl; Planned actions were not crawled.');

    var raw = {
      helpdesk: {
        metadata: {
          modelVersion: 2,
          environment: report.targetUrl,
          generatedAt: report.crawledAt,
          capture: {
            kind: 'INSTANCE-CRAWL',
            actionFields: CAPTURED_ACTION_FIELDS.slice(),
            statusFields: CAPTURED_STATUS_FIELDS.slice(),
            notCaptured: NOT_CAPTURED.slice(),
            /* Only the Reactive Type's actions and relationships were
             * crawled; Planned statuses were listed but not configured, so
             * Planned is out of comparison scope. */
            types: ['Reactive'],
            /* Actions were read from the grouped-by-status view, which
             * cannot show engine-fired actions — the differ must not read
             * their absence as a deletion. */
            actionsFrom: 'status-grouped-view',
            /* …and it only records an outcome where the view drew an arrow,
             * so silence about an outcome is not evidence of its absence. */
            resultsFrom: 'status-grouped-view-arrows'
          }
        },
        sharedConfiguration: [],
        helpdeskTypes: [
          {
            name: 'Reactive',
            statuses: statusRecords(reactiveStatusNames, 'Reactive'),
            operativeStatuses: [],
            actions: actionList,
            relationships: relationships,
            unknowns: []
          },
          {
            name: 'Planned',
            statuses: statusRecords(plannedStatusNames, 'Planned'),
            operativeStatuses: [],
            actions: [],
            relationships: [],
            unknowns: ['Planned actions and relationships were not crawled.']
          }
        ],
        evidence: []
      },
      identities: snap.identities || null
    };

    /* Orders may arrive in the same snapshot or in a companion part. */
    var ordersObserved = snap.ordersObserved ||
      (opts && opts.orders && opts.orders.ordersObserved) || null;
    if (opts && opts.orders && opts.orders.meta && !report.crawledAt) {
      report.crawledAt = opts.orders.meta.crawledAt;
    }
    var rawOrders = ordersFrom(ordersObserved, report);
    if (opts && opts.changes && opts.changes.length) {
      applyChanges(rawOrders, opts.changes, report);
      report.notes.push('This is the CURRENT model: the Day-One capture plus ' +
        opts.changes.length + ' verified change(s), applied as an overlay so Day-One is never edited.');
    }

    var payload = { meta: snap.meta || {}, helpdesk: raw.helpdesk, orders: rawOrders };
    if (raw.identities) payload.identities = raw.identities;
    var model = window.VanillaLoader.normaliseSnapshot(payload);

    report.counts = {
      statuses: model.helpdesk.statuses.length,
      actions: model.helpdesk.actions.length,
      availability: model.helpdesk.availability.length,
      results: model.helpdesk.results.length,
      supplierActions: model.orders.supplierActions.length,
      unresolved: report.unresolved.length
    };
    return { model: model, report: report };
  }

  /* An instance whose configuration IS the source of the canonical model —
   * the discovery instance. Using that model here is not a fallback: it is
   * the capture of this very instance, and it is labelled as such, with the
   * ways the instance has since moved recorded as known deltas rather than
   * quietly folded in. Refused outright if there is no model to stand on. */
  function fromDiscoveryRecord(snap, baseline) {
    var S = window.StudioSchema;
    var report = {
      source: snap.label || 'discovery capture',
      targetUrl: (snap.meta || {}).targetUrl || null,
      crawledAt: (snap.meta || {}).crawledAt || null,
      crawlMethod: (snap.meta || {}).crawlMethod || null,
      acquisition: (snap.meta || {}).acquisition || 'ASSISTED-DISCOVERY',
      capturedActionFields: null,
      capturedStatusFields: null,
      notCaptured: [],
      resolutions: [], unresolved: [], statusFlags: {},
      notes: [], appliedChanges: [], counts: {}
    };
    if (!baseline) {
      report.unresolved.push({ item: 'discovery record', reason: 'the canonical model is not loaded, so this instance cannot be reconstructed' });
      return { model: null, report: report };
    }
    var fp = snap.fromLabsModel || {};
    if (fp.helpdeskFingerprint && baseline.meta.sourceFingerprints.helpdesk !== fp.helpdeskFingerprint) {
      report.unresolved.push({
        item: 'discovery record',
        reason: 'the canonical model has moved on (fingerprint ' + baseline.meta.sourceFingerprints.helpdesk +
          ', this record expects ' + fp.helpdeskFingerprint + ') — it may no longer describe this instance'
      });
    }
    var model = S.deepClone(baseline);
    model.meta = Object.assign({}, model.meta, {
      environment: report.targetUrl,
      provenance: 'DISCOVERY-CAPTURE-OF-THIS-INSTANCE',
      provenanceNote: fp.reason || 'The canonical model was generated from this instance.',
      capture: { kind: 'DISCOVERY-CAPTURE', types: ['Reactive', 'Planned'] }
    });
    report.notes.push(fp.reason || 'The canonical Labs model was generated from this instance, so it is the capture of it — not a stand-in for it.');
    (snap.knownDeltasSinceCapture || []).forEach(function (d) {
      report.notes.push('KNOWN DELTA (' + d.kind + ') ' + d.object + ' — ' + d.detail);
    });
    (snap.notIngested || []).forEach(function (n) {
      report.unresolved.push({ item: n.family, reason: n.reason });
    });
    report.knownDeltas = (snap.knownDeltasSinceCapture || []).slice();
    report.notIngested = (snap.notIngested || []).slice();
    report.counts = {
      statuses: model.helpdesk.statuses.length,
      actions: model.helpdesk.actions.length,
      availability: model.helpdesk.availability.length,
      results: model.helpdesk.results.length,
      supplierActions: model.orders.supplierActions.length,
      unresolved: report.unresolved.length
    };
    return { model: S.deepFreeze(model), report: report };
  }

  function fromSnapshot(snap, baseline, opts) {
    if (snap && snap.fromLabsModel && snap.fromLabsModel.use) {
      return fromDiscoveryRecord(snap, baseline);
    }
    if (snap && (snap.helpdesk || snap.orders)) {
      return { model: window.VanillaLoader.normaliseSnapshot(snap), report: null };
    }
    return fromCapturedCrawl(snap, baseline, opts);
  }

  /* Build the instance record views read from window.StudioApp.instance. */
  function toInstanceRecord(snapshotId, snap, baseline, opts) {
    var out = fromSnapshot(snap, baseline, opts);
    var meta = Object.assign({}, snap.meta || {});
    if (out.report) {
      meta.counts = out.report.counts;
      meta.ingestReport = out.report;
    }
    return {
      snapshotId: snapshotId,
      meta: meta,
      model: out.model,
      ingestedAt: new Date().toISOString()
    };
  }

  var api = {
    fromSnapshot: fromSnapshot,
    fromCapturedCrawl: fromCapturedCrawl,
    ordersFrom: ordersFrom,
    applyChanges: applyChanges,
    toInstanceRecord: toInstanceRecord,
    _parseActionEntry: parseActionEntry,
    _parseOrderings: parseOrderings,
    NOT_CAPTURED: NOT_CAPTURED
  };
  if (typeof window !== 'undefined') window.StudioIngest = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
