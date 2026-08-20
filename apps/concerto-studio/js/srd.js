/* srd.js — SRD / tender ingestion and gap analysis (pure, no DOM/IO).
 *
 * The second feeder of the build process (per References/deep-research-report.md):
 * a customer SRD or tender is decomposed into atomic requirements, each
 * assessed against the VANILLA baseline as PRESENT / NOT-PRESENT / UNKNOWN,
 * and — where a gap exists — turned into a SUGGESTED configuration change
 * that the Design view can apply to the fork for human review.
 *
 * Determinism first: parsing and matching are heuristic but repeatable and
 * evidence-carrying. This is a FIRST PASS for human + Claude review, never
 * authoritative — every requirement keeps its matched evidence so a person
 * (or Claude in the chat) can correct the verdict.
 */
(function () {
  'use strict';

  var MODALITY = /\b(shall|must|will|should|is required to|are required to|needs to|need to|to be able to|the system (?:shall|must|should|will))\b/i;

  /* Split raw SRD/tender text into atomic requirement candidates. A line or
   * sentence carrying a modal verb ("shall/must/should") is a requirement;
   * bulleted/numbered clauses are honoured; a leading clause number is kept
   * as the citation anchor. */
  function parseRequirements(text) {
    if (!text) return [];
    var out = [], seq = 0;
    var blocks = String(text).replace(/\r/g, '').split(/\n{2,}|\n(?=\s*(?:\d+[.)]|[-*•]|\d+\.\d+))/);
    blocks.forEach(function (block) {
      var lines = block.split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean);
      lines.forEach(function (line) {
        var sentences = line.split(/(?<=[.;])\s+(?=[A-Z0-9])/);
        sentences.forEach(function (s) {
          s = s.trim();
          if (s.length < 12) return;
          if (!MODALITY.test(s) && !/^\s*(\d+[.)]|\d+\.\d+)/.test(s)) return;
          seq += 1;
          var anchor = (s.match(/^\s*(\d+(?:\.\d+)*)/) || [])[1] || null;
          out.push({
            ref: 'SRD-' + String(seq).padStart(3, '0'),
            clause: anchor,
            text: s.replace(/^\s*(?:\d+(?:\.\d+)*[.)]?\s*)/, '').replace(/^[-*•]\s*/, '').trim(),
            modality: (s.match(MODALITY) || [null])[0],
            priority: /\b(must|shall|mandatory|critical)\b/i.test(s) ? 'mandatory'
              : /\bshould\b/i.test(s) ? 'expected'
                : /\bmay\b/i.test(s) ? 'optional' : 'expected'
          });
        });
      });
    });
    return dedupe(out);
  }

  function dedupe(reqs) {
    var seen = {}, out = [];
    reqs.forEach(function (r) {
      var k = r.text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (seen[k]) return; seen[k] = true; out.push(r);
    });
    return out;
  }

  /* Vocabulary the model actually exposes, for matching. */
  function modelVocab(model) {
    var hd = (model && model.helpdesk) || {};
    var o = (model && model.orders) || {};
    var terms = [];
    function add(kind, name, ref) { if (name) terms.push({ kind: kind, name: String(name), key: String(name).toLowerCase(), ref: ref || name }); }
    (hd.statuses || []).forEach(function (s) { add('status', s.name); });
    (hd.actions || []).forEach(function (a) { add('action', a.name, a.code || a.name); if (a.code) add('action', a.code, a.code); });
    (hd.tags || []).forEach(function (t) { add('tag', t.name); });
    (hd.operativeStatuses || []).forEach(function (s) { add('operative-status', s.name); });
    (hd.responseCategories || []).forEach(function (c) { add('response-category', c.name); });
    (o.orderStatuses || []).forEach(function (s) { add('order-status', s.name || s); });
    (o.supplierActions || []).forEach(function (s) { add('supplier-action', s.name || s.canonicalKey || s); });
    /* capability phrases the platform is known to cover (INHERITED-STANDARD) */
    CAPABILITIES.forEach(function (c) { c.phrases.forEach(function (p) { terms.push({ kind: 'capability', name: c.name, key: p, ref: c.name, capability: true }); }); });
    return terms;
  }

  /* Standing Concerto capabilities — used to mark a requirement PRESENT as
   * inherited-standard even when no specific config element names it. Kept
   * deliberately conservative; anything not here that has no config match
   * stays UNKNOWN, never a false PRESENT. */
  var CAPABILITIES = [
    { name: 'Reactive helpdesk', phrases: ['reactive', 'log a job', 'raise a job', 'raise a request', 'helpdesk request'] },
    { name: 'Planned / PPM', phrases: ['planned maintenance', 'ppm', 'scheduled maintenance', 'preventative'] },
    { name: 'Contractor / supplier orders', phrases: ['contractor', 'supplier', 'subcontractor', 'purchase order', 'raise an order'] },
    { name: 'SLA / response targets', phrases: ['sla', 'response time', 'response target', 'priority', 'target completion'] },
    { name: 'Mobile working', phrases: ['mobile', 'app', 'orchestrate', 'engineer app', 'operative app'] },
    { name: 'Quotes', phrases: ['quote', 'quotation', 'estimate'] },
    { name: 'Role-based access', phrases: ['role', 'permission', 'access control', 'security profile'] },
    { name: 'Reporting / dashboards', phrases: ['report', 'dashboard', 'kpi', 'management information'] },
    { name: 'Notifications', phrases: ['notification', 'email alert', 'notify', 'email the'] },
    { name: 'Approvals', phrases: ['approval', 'authorise', 'authorisation', 'sign off', 'cost uplift'] }
  ];

  /* Assess one requirement against the model vocabulary.
   *   PRESENT      — a specific config element or a covered capability matches
   *   NOT-PRESENT   — the requirement clearly names an element/behaviour the
   *                   model does not contain (a status/action/tag by name)
   *   UNKNOWN      — cannot be established from configuration alone
   */
  function assessOne(req, vocab) {
    var text = ' ' + req.text.toLowerCase() + ' ';
    var hits = [];
    vocab.forEach(function (t) {
      if (t.key.length < 3) return;
      if (text.indexOf(' ' + t.key + ' ') !== -1 || text.indexOf(t.key) !== -1 && t.key.length >= 5) {
        hits.push(t);
      }
    });
    var concrete = hits.filter(function (h) { return !h.capability; });
    var caps = hits.filter(function (h) { return h.capability; });
    var verdict, basis, evidence;
    if (concrete.length) {
      verdict = 'PRESENT';
      basis = 'Matches configured ' + uniqueKinds(concrete) + ' in this model.';
      evidence = concrete.slice(0, 6).map(function (h) { return h.kind + ': ' + h.name; });
    } else if (caps.length) {
      verdict = 'PRESENT';
      basis = 'Covered by standard Concerto capability: ' + unique(caps.map(function (c) { return c.name; })).join(', ') + '. (Inherited-standard — verify the specific configuration.)';
      evidence = unique(caps.map(function (c) { return 'capability: ' + c.name; }));
    } else if (namesMissingElement(req.text)) {
      verdict = 'NOT-PRESENT';
      basis = 'Names a status/action/behaviour not found in the model. Likely a configuration gap.';
      evidence = [];
    } else {
      verdict = 'UNKNOWN';
      basis = 'Cannot be confirmed from configuration alone — needs review (integration, data, non-functional, or wording that does not map to a config element).';
      evidence = [];
    }
    return { ref: req.ref, clause: req.clause, text: req.text, priority: req.priority, verdict: verdict, basis: basis, evidence: evidence, acquiredBy: 'DETERMINISTIC-MATCH' };
  }

  /* A requirement "names a missing element" if it quotes a status/action-like
   * phrase (title case, or 'status'/'stage'/'action' nearby) but nothing in
   * the model matched. Conservative — otherwise everything reads NOT-PRESENT. */
  function namesMissingElement(text) {
    return /\b(status|stage|state|action|button|workflow step|tag)\b/i.test(text);
  }

  function assess(requirements, model) {
    var vocab = modelVocab(model);
    var rows = requirements.map(function (r) { return assessOne(r, vocab); });
    var summary = { PRESENT: 0, 'NOT-PRESENT': 0, UNKNOWN: 0, total: rows.length };
    rows.forEach(function (r) { summary[r.verdict] = (summary[r.verdict] || 0) + 1; });
    return { rows: rows, summary: summary };
  }

  /* Suggest a configuration change to close a gap. Deterministic first pass:
   * for a NOT-PRESENT requirement that names a status/action, propose adding
   * it; otherwise return a review task for Claude. Provenance AI-SUGGESTED,
   * so the Design view marks it clearly and a human approves before build. */
  function suggest(assessRow, model) {
    var t = assessRow.text;
    var quoted = (t.match(/["“']([^"”']{3,40})["”']/) || [])[1];
    if (assessRow.verdict === 'PRESENT') {
      return { kind: 'none', note: 'Already present — no change suggested.' };
    }
    if (/\b(status|stage|state)\b/i.test(t)) {
      var stName = quoted || titleGuess(t, /(?:status|stage|state)/i);
      if (stName) return {
        kind: 'add-status', name: stName, provenance: 'AI-SUGGESTED',
        rationale: 'Requirement ' + assessRow.ref + ' expects a status "' + stName + '" not present in the model.',
        op: { op: 'addStatus', name: stName, types: ['Reactive', 'Planned'] }
      };
    }
    if (/\b(action|button|be able to|allow)\b/i.test(t)) {
      var acName = quoted || titleGuess(t, /(?:action|button)/i);
      if (acName) return {
        kind: 'add-action', name: acName, provenance: 'AI-SUGGESTED',
        rationale: 'Requirement ' + assessRow.ref + ' expects an action "' + acName + '" not present in the model.',
        op: { op: 'addAction', name: acName }
      };
    }
    return {
      kind: 'review', provenance: 'AI-SUGGESTED',
      rationale: 'This gap needs interpretation (integration, data, non-functional, or a behaviour spanning several config elements). Flagged for Claude to propose a concrete change in the chat.',
      op: null
    };
  }

  function titleGuess(text, near) {
    /* pull a Title-Case phrase near the keyword as the likely element name */
    var m = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/g);
    return m ? m.sort(function (a, b) { return b.length - a.length; })[0] : null;
  }

  function unique(a) { var s = {}, o = []; a.forEach(function (x) { if (!s[x]) { s[x] = 1; o.push(x); } }); return o; }
  function uniqueKinds(hits) { return unique(hits.map(function (h) { return h.kind; })).join(' / '); }

  window.StudioSRD = {
    parseRequirements: parseRequirements,
    assess: assess,
    assessOne: assessOne,
    suggest: suggest,
    modelVocab: modelVocab,
    CAPABILITIES: CAPABILITIES
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.StudioSRD;
})();
