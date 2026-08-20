/* receipts.js — what every operation actually cost: time taken and tokens
 * burned. The same discipline as the Launch app's receipts:
 *
 *   TRUTHFUL, OR NOTHING.
 *   - Deterministic operations (the Playwright harness crawler, local model
 *     ingests, store saves) carry REAL ZEROS for AI usage, and measured
 *     durations.
 *   - AI-assisted operations (side-panel discovery crawls, assisted
 *     configuration changes) burn Claude tokens the Studio cannot meter —
 *     they are recorded with tokens 'unavailable'. A number appears ONLY
 *     if the provider's returned usage was recorded at the time. Nothing
 *     is ever estimated or fabricated.
 *
 * Three sources, merged newest-first:
 *   1. HARNESS receipts (GET :8602/receipts) — deterministic crawls with
 *      durations and counts, written append-only by the harness itself.
 *   2. LOCAL Studio receipts — operations the Studio performs and can time
 *      itself (snapshot ingests, store saves). Kept in localStorage,
 *      capped, session-mirroring the same truthfulness rules.
 *   3. DERIVED activity — AI-assisted work recorded in the durable project
 *      files (assisted-discovery snapshots, verified configuration
 *      changes). Their token cost is 'unavailable' unless the project file
 *      carries a recorded actual (`ai: {totalTokens: …}`).
 */
(function () {
  'use strict';

  var KEY = 'concerto-studio-receipts-v1';
  var MAX_LOCAL = 400;

  var DETERMINISTIC = {
    runtimeImplementation: 'DETERMINISTIC',
    aiInvoked: false, aiProvider: null, aiModel: null,
    totalTokens: 0, aiCost: '£0.00'
  };
  var AI_ASSISTED_UNMETERED = {
    runtimeImplementation: 'AI-ASSISTED',
    aiInvoked: true, aiProvider: 'Anthropic (Claude, side-panel session)', aiModel: null,
    totalTokens: 'unavailable', aiCost: 'unavailable'
  };

  function loadLocal() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function saveLocal(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX_LOCAL))); } catch (e) { /* */ }
  }

  /* Record a Studio-performed deterministic operation. */
  function record(entry) {
    var list = loadLocal();
    list.push(Object.assign({
      when: new Date().toISOString(),
      source: 'studio'
    }, DETERMINISTIC, entry));
    saveLocal(list);
  }

  /* Time a promise-returning operation and record it. */
  function timed(operation, target, fn, countsFn) {
    var t0 = Date.now();
    return fn().then(function (result) {
      record({
        operation: operation, target: target,
        durationMs: Date.now() - t0, outcome: 'COMPLETE',
        counts: countsFn ? countsFn(result) : undefined
      });
      return result;
    }, function (err) {
      record({
        operation: operation, target: target,
        durationMs: Date.now() - t0, outcome: 'FAILED',
        error: String(err && err.message || err)
      });
      throw err;
    });
  }

  /* ---- derived: AI-assisted activity from the durable project files ---- */
  function derivedFor(project) {
    if (!project) return [];
    var out = [];
    (project.snapshots || []).forEach(function (s) {
      var acq = s.acquisition || '';
      if (acq === 'BUILD-READ-BACK') return; /* an overlay, not an operation */
      var assisted = acq === 'ASSISTED-DISCOVERY' || acq === 'BROWSER-CRAWL';
      out.push(Object.assign({
        when: s.capturedAt || '',
        source: 'project',
        operation: 'CAPTURE (' + (acq || 'unknown route') + ')',
        target: project.name + ' — ' + (s.label || s.id),
        durationMs: (s.ai && s.ai.durationMs) != null ? s.ai.durationMs : 'unavailable',
        outcome: 'COMPLETE'
      }, assisted ? AI_ASSISTED_UNMETERED : DETERMINISTIC,
      /* a RECORDED actual (from the provider) may override 'unavailable' —
       * a written number beats the unknown, but only a written one */
      s.ai && s.ai.totalTokens != null ? { totalTokens: s.ai.totalTokens, aiCost: s.ai.aiCost || 'unavailable' } : null));
    });
    (project.changeLog || []).forEach(function (c) {
      out.push(Object.assign({
        when: c.at || '',
        source: 'project',
        operation: 'CONFIG CHANGE ' + (c.id || ''),
        target: project.name + ' — ' + (c.object || ''),
        durationMs: (c.ai && c.ai.durationMs) != null ? c.ai.durationMs : 'unavailable',
        outcome: /PASS/.test(c.outcome || '') ? 'VERIFIED' : (c.outcome || 'APPLIED')
      }, AI_ASSISTED_UNMETERED,
      c.ai && c.ai.totalTokens != null ? { totalTokens: c.ai.totalTokens, aiCost: c.ai.aiCost || 'unavailable' } : null));
    });
    return out;
  }

  function normaliseHarness(r) {
    return {
      when: r.finishedAt || r.recordedAt || '',
      source: 'harness',
      operation: 'HARNESS ' + String(r.kind || 'crawl').toUpperCase() +
        (r.domains ? ' (' + r.domains.join(', ') + ')' : ''),
      target: r.target || '',
      durationMs: r.durationMs != null ? r.durationMs : 'unavailable',
      outcome: r.outcome || '',
      counts: r.counts,
      runtimeImplementation: r.runtimeImplementation || 'DETERMINISTIC',
      aiInvoked: !!r.aiInvoked,
      aiProvider: r.aiProvider || null,
      totalTokens: r.totalTokens != null ? r.totalTokens : 0,
      aiCost: r.aiCost || '£0.00',
      raw: r
    };
  }

  /* Everything, merged newest-first. Harness fetch is best-effort. */
  function all(projects) {
    var local = loadLocal();
    var derived = [];
    (projects || []).forEach(function (p) { derived = derived.concat(derivedFor(p)); });
    return fetch('http://127.0.0.1:8602/receipts', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { receipts: [] }; })
      .catch(function () { return { receipts: [] }; })
      .then(function (h) {
        var merged = local.concat(derived, (h.receipts || []).map(normaliseHarness));
        merged.sort(function (a, b) { return String(b.when).localeCompare(String(a.when)); });
        return merged;
      });
  }

  /* Honest totals: known token spend summed; unmetered operations COUNTED,
   * never guessed into the sum. */
  function summarise(list) {
    var s = { operations: list.length, knownTokens: 0, unmetered: 0, timedMs: 0, untimed: 0, aiOps: 0 };
    list.forEach(function (r) {
      if (typeof r.totalTokens === 'number') s.knownTokens += r.totalTokens;
      else s.unmetered++;
      if (typeof r.durationMs === 'number') s.timedMs += r.durationMs;
      else s.untimed++;
      if (r.aiInvoked) s.aiOps++;
    });
    return s;
  }

  function fmtDuration(ms) {
    if (typeof ms !== 'number') return '—';
    if (ms < 1000) return ms + ' ms';
    var sec = Math.round(ms / 1000);
    return sec >= 60 ? Math.floor(sec / 60) + 'm ' + (sec % 60) + 's' : sec + 's';
  }

  function toJsonl(list) {
    return list.map(function (r) {
      var c = Object.assign({}, r); delete c.raw;
      return JSON.stringify(c);
    }).join('\n');
  }

  var api = {
    DETERMINISTIC: DETERMINISTIC, AI_ASSISTED_UNMETERED: AI_ASSISTED_UNMETERED,
    record: record, timed: timed, derivedFor: derivedFor,
    all: all, summarise: summarise, fmtDuration: fmtDuration, toJsonl: toJsonl,
    _key: KEY, _loadLocal: loadLocal
  };
  if (typeof window !== 'undefined') window.StudioReceipts = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
