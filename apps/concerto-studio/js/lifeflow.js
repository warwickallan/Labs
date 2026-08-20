/* lifeflow.js — "the life of a job": the job lifecycle as a clean, readable
 * flow, derived from the model but telling the STORY, not redrawing the
 * action map.
 *
 * A job runs down a SPINE of milestones (the statuses it passes through, in
 * lifecycle order). Each forward step is labelled with the action that makes
 * it happen. Anything that isn't forward progress — hold, cancel, send to
 * quote/business-case — is drawn as a muted BRANCH off to the side, so the
 * eye follows the happy path and sees the exits without drowning in arrows.
 *
 * Two layers: the diagram shows milestones + labelled transitions only; the
 * full set of actions/outcomes for a status is revealed on CLICK (the view
 * wires data-status anchors to an expander). Pure: returns an SVG string and
 * the per-status detail; no DOM, no state.
 */
(function () {
  'use strict';

  var TERMINAL = ['Closed', 'Cancelled'];
  var HOLD = /hold|pause/i;
  var START = { Reactive: 'With Helpdesk', Planned: 'New PPM' };

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function codeOf(a) { var m = (a.name || '').match(/^([A-Z]{1,3}\d{2,3}[a-z]?)/); return a.code || (m ? m[1] : ''); }
  function verb(name) { return (name || '').replace(/^[A-Z]{1,3}\d{2,3}[a-z]?[.\s-]+/, ''); }

  /* status → transitions, from the model's own availability + results. */
  function graph(model, type) {
    var hd = model.helpdesk || {};
    var supp = {}; (hd.statuses || []).forEach(function (s) { if (s.suppressed) supp[s.name] = true; });
    var byName = {}; (hd.actions || []).forEach(function (a) { byName[a.name] = a; });
    var resultOf = {};
    (hd.actions || []).forEach(function (a) { if (a.resultingStatus) resultOf[a.name] = a.resultingStatus; });
    (hd.results || []).forEach(function (r) { if (r.kind === 'sets' && (!r.type || r.type === type)) resultOf[r.action] = r.toStatus; });
    var trans = {};   // from -> [{action, to, act}]
    (hd.availability || []).forEach(function (e) {
      if (e.type && e.type !== type && e.type !== 'Both') return;
      if (supp[e.status]) return;
      var to = resultOf[e.action] || null;
      if (to && supp[to]) return;
      (trans[e.status] = trans[e.status] || []).push({ action: e.action, to: to, act: byName[e.action] || { name: e.action } });
    });
    return { trans: trans, supp: supp };
  }

  /* Order the statuses of a type into a lifecycle spine. Use the model's
   * displayOrder where present (that IS the configured lifecycle order),
   * start pinned first, terminals pinned last, suppressed excluded. */
  function spineOrder(model, type, g) {
    var hd = model.helpdesk || {};
    var statuses = (hd.statuses || []).filter(function (s) {
      return !s.suppressed && (s.types || []).indexOf(type) !== -1;
    });
    /* keep only statuses that actually participate (reachable via a
       transition or able to move somewhere) — a lifecycle, not a list */
    var live = {};
    Object.keys(g.trans).forEach(function (from) {
      live[from] = true;
      g.trans[from].forEach(function (t) { if (t.to) live[t.to] = true; });
    });
    statuses = statuses.filter(function (s) { return live[s.name]; });
    var start = START[type];
    statuses.sort(function (a, b) {
      if (a.name === start) return -1; if (b.name === start) return 1;
      var at = TERMINAL.indexOf(a.name) !== -1, bt = TERMINAL.indexOf(b.name) !== -1;
      if (at && !bt) return 1; if (bt && !at) return -1;
      var ao = order(a, type), bo = order(b, type);
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    });
    return statuses.map(function (s) { return s.name; });
  }
  function order(s, type) {
    if (s.ordering && s.ordering[type] != null) return s.ordering[type];
    if (typeof s.displayOrder === 'number' && isFinite(s.displayOrder)) return s.displayOrder;
    return 9999;
  }

  /* classify a transition relative to the spine: forward (next milestone),
   * back (to an earlier milestone — a return), or branch (off the spine:
   * hold, cancel, quote, business case). */
  function render(model, type, opts) {
    opts = opts || {};
    var g = graph(model, type);
    var spine = spineOrder(model, type, g);
    if (spine.length < 2) return { missing: true, svg: '', detail: {} };
    var idx = {}; spine.forEach(function (s, i) { idx[s] = i; });

    var forward = {}, branches = [], detail = {};
    spine.forEach(function (s) {
      detail[s] = { actions: [], exits: [] };
      (g.trans[s] || []).forEach(function (t) {
        var a = t.act || { name: t.action };
        var rec = { code: codeOf(a), verb: verb(t.action), to: t.to, name: t.action, act: a };
        detail[s].actions.push(rec);
        if (!t.to || t.to === s) { rec.selfLoop = !!t.to; return; }  /* self-loop = in-place, not an exit */
        if (idx[t.to] != null && idx[t.to] > idx[s]) { (forward[s] = forward[s] || []).push(rec); }
        else if (idx[t.to] != null && idx[t.to] < idx[s]) { branches.push({ from: s, to: t.to, rec: rec, kind: 'return' }); }
        else { branches.push({ from: s, to: t.to, rec: rec, kind: 'exit' }); detail[s].exits.push(rec); }
      });
    });

    /* layout: spine as a centred vertical column of milestone cards. */
    var W = 900, cardW = 300, cardH = 60, gap = 46, padTop = 30, cx = 250;
    var H = padTop * 2 + spine.length * (cardH + gap);
    var y = function (i) { return padTop + i * (cardH + gap); };
    var svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" font-family="Segoe UI,Arial,sans-serif" class="lifeflow">'];
    svg.push('<defs>' +
      '<marker id="lf-fwd" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 z" fill="#1e6b4f"/></marker>' +
      '<marker id="lf-br" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 z" fill="#b08528"/></marker>' +
      '<marker id="lf-rt" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 z" fill="#9aa4ad"/></marker>' +
      '</defs>');

    /* forward arrows down the spine, action labels beside them */
    spine.forEach(function (s, i) {
      if (i === spine.length - 1) return;
      var moves = (forward[s] || []).filter(function (m) { return idx[m.to] === i + 1; });
      var y0 = y(i) + cardH, y1 = y(i + 1);
      svg.push('<line x1="' + (cx + cardW / 2) + '" y1="' + y0 + '" x2="' + (cx + cardW / 2) + '" y2="' + (y1 - 2) + '" stroke="#1e6b4f" stroke-width="2" marker-end="url(#lf-fwd)"/>');
      var label = moves.length ? moves.map(function (m) { return m.code || m.verb; }).slice(0, 3).join(', ') + (moves.length > 3 ? ' +' + (moves.length - 3) : '') : '';
      if (label) svg.push('<text x="' + (cx + cardW / 2 + 10) + '" y="' + ((y0 + y1) / 2 + 3) + '" font-size="11.5" fill="#1e6b4f">' + esc(label) + '</text>');
    });

    /* milestone cards */
    spine.forEach(function (s, i) {
      var term = TERMINAL.indexOf(s) !== -1, start = i === 0;
      var fill = term ? '#eceef0' : start ? '#dcefe6' : '#eef4f1';
      var stroke = term ? '#9aa4ad' : '#1e6b4f';
      var acts = (detail[s].actions || []).length;
      svg.push('<g class="lf-node" data-status="' + esc(s) + '" style="cursor:pointer">');
      svg.push('<rect x="' + cx + '" y="' + y(i) + '" width="' + cardW + '" height="' + cardH + '" rx="9" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (start || term ? 2 : 1.3) + '"/>');
      svg.push('<text x="' + (cx + 16) + '" y="' + (y(i) + 26) + '" font-size="14" font-weight="600" fill="#0e3e33">' + esc(s) + '</text>');
      svg.push('<text x="' + (cx + 16) + '" y="' + (y(i) + 45) + '" font-size="11" fill="#68727d">' + acts + ' action' + (acts === 1 ? '' : 's') + ' available' + (detail[s].exits.length ? ' · ' + detail[s].exits.length + ' exit' + (detail[s].exits.length === 1 ? '' : 's') : '') + ' · click for detail</text>');
      svg.push('</g>');
    });

    /* branches: hold / cancel / quote / business-case, to the right, muted */
    var laneX = cx + cardW + 70, seen = {};
    branches.forEach(function (b) {
      var i = idx[b.from]; if (i == null) return;
      var y0 = y(i) + cardH / 2;
      var col = b.kind === 'return' ? '#9aa4ad' : '#b08528';
      var mk = b.kind === 'return' ? 'lf-rt' : 'lf-br';
      var ty = y0;
      svg.push('<path d="M ' + (cx + cardW) + ' ' + y0 + ' H ' + laneX + '" fill="none" stroke="' + col + '" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#' + mk + ')"/>');
      var lab = (b.rec.code || b.rec.verb) + ' → ' + b.to;
      svg.push('<text x="' + (laneX + 6) + '" y="' + (ty + 3) + '" font-size="10.5" fill="' + col + '">' + esc(lab) + '</text>');
    });

    svg.push('</svg>');
    return { missing: false, svg: svg.join(''), spine: spine, detail: detail, branchCount: branches.length };
  }

  window.StudioLifeFlow = { render: render, graph: graph, spineOrder: spineOrder };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.StudioLifeFlow;
})();
