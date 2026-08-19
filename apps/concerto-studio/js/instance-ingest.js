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

  function fromCapturedCrawl(snap, baseline) {
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

    var model = window.VanillaLoader.normaliseSnapshot(raw.identities
      ? { meta: snap.meta || {}, helpdesk: raw.helpdesk, identities: raw.identities }
      : { meta: snap.meta || {}, helpdesk: raw.helpdesk });

    report.counts = {
      statuses: model.helpdesk.statuses.length,
      actions: model.helpdesk.actions.length,
      availability: model.helpdesk.availability.length,
      results: model.helpdesk.results.length,
      unresolved: report.unresolved.length
    };
    return { model: model, report: report };
  }

  function fromSnapshot(snap, baseline) {
    if (snap && (snap.helpdesk || snap.orders)) {
      return { model: window.VanillaLoader.normaliseSnapshot(snap), report: null };
    }
    return fromCapturedCrawl(snap, baseline);
  }

  /* Build the instance record views read from window.StudioApp.instance. */
  function toInstanceRecord(snapshotId, snap, baseline) {
    var out = fromSnapshot(snap, baseline);
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
    toInstanceRecord: toInstanceRecord,
    _parseActionEntry: parseActionEntry,
    _parseOrderings: parseOrderings,
    NOT_CAPTURED: NOT_CAPTURED
  };
  if (typeof window !== 'undefined') window.StudioIngest = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
