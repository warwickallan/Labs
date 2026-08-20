/* flowrender.js — Bellrock-style PROCESS FLOW diagrams, generated from the
 * model. The visual language follows the Bellrock process-flow reference
 * (References/Process Flows): horizontal swimlanes per system/actor,
 * numbered step cards with a few plain-English bullets and an owner chip,
 * solid arrows for the main journey, dashed arrows for automated/engine
 * behaviour, a legend strip, landscape print.
 *
 * The journeys are declared with BUSINESS meaning (which statuses and
 * actions make up "contractor works"), but everything drawn is validated
 * against the model actually being rendered: a status the instance does
 * not have is dropped and noted, and bullets come from the actions that are
 * really available there. So the same declaration renders Vanilla, a
 * customer's current configuration, or a proposed design — each honestly.
 *
 * Output is a self-contained inline SVG string (literal colours — it must
 * survive printing and standalone HTML) consumed by:
 *   - the Diagram view's FLOW mode (pan/zoom via viewBox, like the board);
 *   - the Solution Design generator (embedded per-workflow diagrams);
 *   - "Open for printing" (standalone HTML, @page A4 landscape).
 */
(function () {
  'use strict';

  /* Bellrock-adjacent palette (literal: survives print + standalone HTML) */
  var C = {
    ink: '#12332b', dim: '#4a6a60', faint: '#8aa39a',
    laneDark: '#0e3e33', laneGreen: '#1e6b4f', laneAmber: '#8a6d1f', laneSlate: '#3d5a66',
    laneDarkBg: '#f2f7f5', laneGreenBg: '#eef7f0', laneAmberBg: '#fbf7ea', laneSlateBg: '#eff4f6',
    card: '#ffffff', cardBorder: '#0e3e33',
    arrow: '#0e3e33', engine: '#8a6d1f', response: '#1e6b4f',
    badge: '#0e3e33', end: '#1e6b4f'
  };
  var LANE_COLORS = { dark: C.laneDark, green: C.laneGreen, amber: C.laneAmber, slate: C.laneSlate };
  var LANE_BGS = { dark: C.laneDarkBg, green: C.laneGreenBg, amber: C.laneAmberBg, slate: C.laneSlateBg };

  /* ---- journey declarations -------------------------------------------
   * Each step: lane, col (grid), title, and its model anchors — a status
   * whose presence gates the step, and/or action codes whose availability
   * provides the bullets. `engine: true` marks system-driven steps.
   */
  var FLOWS = {
    reactive: {
      title: 'REACTIVE HELPDESK PROCESS FLOW',
      subtitle: 'End to end journey of a reactive job, from report to closure.',
      lanes: [
        { id: 'helpdesk', label: 'HELPDESK (WEB)', tone: 'dark' },
        { id: 'field', label: 'MAINTENANCE TEAM (MOBILE)', tone: 'green' },
        { id: 'contractor', label: 'CONTRACTOR / SUPPLIER', tone: 'slate' },
        { id: 'engine', label: 'AUTOMATED ENGINES', tone: 'amber' }
      ],
      steps: [
        { id: 'raise', lane: 'helpdesk', col: 0, title: 'Job raised', status: 'With Helpdesk',
          bullets: ['Reporter wizard or admin quick-add', 'Job arrives With Helpdesk'], owner: 'Helpdesk' },
        { id: 'triage', lane: 'helpdesk', col: 1, title: 'Triage & route', status: 'With Helpdesk',
          actionCodes: ['RH02', 'RH04', 'RH06'], owner: 'Helpdesk' },
        { id: 'internal', lane: 'field', col: 2, title: 'Internal works', status: 'With Maintenance Team - R',
          actionCodes: ['GM01', 'GM04', 'RM01', 'RM02'], owner: 'Maintenance team' },
        { id: 'contractor', lane: 'contractor', col: 2, title: 'Contractor works', status: 'With Contractor - R',
          actionCodes: ['T02', 'T04', 'T05', 'RH10'], owner: 'Contractor' },
        { id: 'quote', lane: 'engine', col: 3, title: 'Quote requested', status: 'Quote Requested - R', engine: true,
          bullets: ['Quote engine manages the lifecycle', 'Raising the order returns the job to the contractor workflow'], owner: 'System' },
        { id: 'bc', lane: 'engine', col: 4, title: 'Business case', status: 'Business Case - R', engine: true,
          bullets: ['Cost uplift reviewed in the Business Cases module', 'Approval returns the job to the workflow'], owner: 'System' },
        { id: 'complete', lane: 'helpdesk', col: 5, title: 'Work complete', status: 'Work Complete - R',
          actionCodes: ['G004'], owner: 'Helpdesk' },
        { id: 'closed', lane: 'helpdesk', col: 6, title: 'Closed', status: 'Closed',
          bullets: ['Job closed and reportable'], owner: 'Helpdesk', end: true }
      ],
      edges: [
        ['raise', 'triage', 'flow'], ['triage', 'internal', 'flow'], ['triage', 'contractor', 'flow'],
        ['internal', 'complete', 'flow'], ['contractor', 'complete', 'flow'],
        ['triage', 'quote', 'engine'], ['quote', 'contractor', 'engine'],
        ['contractor', 'bc', 'engine'], ['bc', 'contractor', 'engine'],
        ['complete', 'closed', 'flow']
      ]
    },
    planned: {
      title: 'PLANNED HELPDESK PROCESS FLOW',
      subtitle: 'The journey of a planned (PPM-originated) job.',
      lanes: [
        { id: 'helpdesk', label: 'HELPDESK (WEB)', tone: 'dark' },
        { id: 'delivery', label: 'DELIVERY (TEAM / CONTRACTOR)', tone: 'green' }
      ],
      steps: [
        { id: 'new', lane: 'helpdesk', col: 0, title: 'Planned job created', status: 'New PPM',
          bullets: ['Created from the list toolbar or the PPM side'], owner: 'Helpdesk' },
        { id: 'team', lane: 'delivery', col: 1, title: 'With maintenance team', status: 'With Maintenance Team',
          actionCodes: ['PH02', 'GM01', 'GM04'], owner: 'Maintenance team' },
        { id: 'contractor', lane: 'delivery', col: 2, title: 'With contractor', status: 'With Contractor',
          actionCodes: ['PH03', 'PH06'], owner: 'Contractor' },
        { id: 'complete', lane: 'helpdesk', col: 3, title: 'PPM complete', status: 'PPM Complete',
          actionCodes: ['G004'], owner: 'Helpdesk' },
        { id: 'closed', lane: 'helpdesk', col: 4, title: 'Closed', status: 'Closed',
          bullets: ['Job closed and reportable'], owner: 'Helpdesk', end: true }
      ],
      edges: [
        ['new', 'team', 'flow'], ['new', 'contractor', 'flow'],
        ['team', 'complete', 'flow'], ['contractor', 'complete', 'flow'],
        ['complete', 'closed', 'flow']
      ]
    },
    contractor: {
      title: 'CONTRACTOR & ORDERS PROCESS FLOW',
      subtitle: 'How an order reaches a contractor and how their portal actions drive the job.',
      lanes: [
        { id: 'helpdesk', label: 'CONCERTO HELPDESK', tone: 'dark' },
        { id: 'portal', label: 'SUPPLIER PORTAL', tone: 'green' }
      ],
      steps: [
        { id: 'assign', lane: 'helpdesk', col: 0, title: 'Assign to contractor', status: 'With Helpdesk',
          actionCodes: ['RH04'], bullets: ['Raises the order', 'Order awaits acceptance'], owner: 'Helpdesk' },
        { id: 'accept', lane: 'portal', col: 1, title: 'Accept or reject', supplierKeys: ['SP01', 'SP02'], owner: 'Contractor' },
        { id: 'appoint', lane: 'portal', col: 2, title: 'Make appointment', supplierKeys: ['SP03'], owner: 'Contractor' },
        { id: 'deliver', lane: 'portal', col: 3, title: 'Deliver the works', supplierKeys: ['SP05', 'SP06'], owner: 'Contractor' },
        { id: 'complete', lane: 'portal', col: 4, title: 'Work complete', supplierKeys: ['SP07a', 'SP07b'], owner: 'Contractor' },
        { id: 'job', lane: 'helpdesk', col: 5, title: 'Job updated', status: 'Work Complete - R',
          bullets: ['Each portal action fires the matching helpdesk action', 'Job follows the contractor’s progress'], owner: 'System', end: true }
      ],
      edges: [
        ['assign', 'accept', 'flow'], ['accept', 'appoint', 'flow'], ['appoint', 'deliver', 'flow'],
        ['deliver', 'complete', 'flow'], ['complete', 'job', 'engine']
      ]
    },
    quote: {
      title: 'QUOTE PROCESS FLOW',
      subtitle: 'A quote request handled by the quote engine, returning the job to the contractor workflow.',
      lanes: [
        { id: 'helpdesk', label: 'CONCERTO HELPDESK', tone: 'dark' },
        { id: 'engine', label: 'QUOTE ENGINE', tone: 'amber' }
      ],
      steps: [
        { id: 'request', lane: 'helpdesk', col: 0, title: 'Quote requested', status: 'Quote Requested - R',
          actionCodes: ['RH06'], bullets: ['Job waits while the quote is handled'], owner: 'Helpdesk' },
        { id: 'issue', lane: 'engine', col: 1, title: 'Quote issued & received', engine: true,
          bullets: ['Issue to suppliers, receive quotes', 'Send back or select successful'], owner: 'System' },
        { id: 'approve', lane: 'engine', col: 2, title: 'Approve & raise order', engine: true,
          bullets: ['Approved quote raises the order', 'Fires “Quote Ordered” on the job'], owner: 'System' },
        { id: 'return', lane: 'helpdesk', col: 3, title: 'Back with contractor', status: 'With Contractor - R',
          bullets: ['Job continues the contractor workflow'], owner: 'Helpdesk', end: true }
      ],
      edges: [
        ['request', 'issue', 'engine'], ['issue', 'approve', 'engine'], ['approve', 'return', 'engine']
      ]
    },
    'business-case': {
      title: 'BUSINESS CASE PROCESS FLOW',
      subtitle: 'A cost uplift reviewed in the Business Cases module, returning the job to the workflow.',
      lanes: [
        { id: 'portal', label: 'CONTRACTOR / SUPPLIER', tone: 'slate' },
        { id: 'module', label: 'BUSINESS CASES MODULE', tone: 'amber' },
        { id: 'helpdesk', label: 'CONCERTO HELPDESK', tone: 'dark' }
      ],
      steps: [
        { id: 'uplift', lane: 'portal', col: 0, title: 'Cost uplift raised', supplierKeys: ['BC01'],
          bullets: ['Contractor requests a cost uplift'], owner: 'Contractor' },
        { id: 'hold', lane: 'helpdesk', col: 1, title: 'Job at business case', status: 'Business Case - R',
          bullets: ['Job waits — no manual triage needed'], owner: 'System' },
        { id: 'review', lane: 'module', col: 2, title: 'Reviewed & decided', engine: true,
          bullets: ['Awaiting approval → Approved / Rejected', 'Decision made in the module'], owner: 'System' },
        { id: 'return', lane: 'helpdesk', col: 3, title: 'Back in the workflow', status: 'With Contractor - R',
          bullets: ['Approval returns the job automatically'], owner: 'System', end: true }
      ],
      edges: [
        ['uplift', 'hold', 'engine'], ['hold', 'review', 'engine'], ['review', 'return', 'engine']
      ]
    }
  };

  /* ---- model validation -------------------------------------------------
   * Only draw what this model actually has; report what was dropped. */
  function resolveSteps(flow, model) {
    var statusByName = {};
    model.helpdesk.statuses.forEach(function (s) { statusByName[s.name] = s; });
    var actionByCode = {};
    model.helpdesk.actions.forEach(function (a) { if (a.code) actionByCode[a.code] = a; });
    var supplierByKey = {};
    (model.orders.supplierActions || []).forEach(function (sa) { supplierByKey[sa.canonicalKey] = sa; });

    var dropped = [];
    var steps = flow.steps.filter(function (st) {
      if (st.status && !statusByName[st.status]) {
        dropped.push({ step: st.title, reason: 'status “' + st.status + '” is not in this configuration' });
        return false;
      }
      return true;
    }).map(function (st) {
      var bullets = (st.bullets || []).slice();
      (st.actionCodes || []).forEach(function (code) {
        var a = actionByCode[code];
        if (!a) return;
        if (st.status) {
          var avail = model.helpdesk.availability.some(function (e) {
            return e.action === a.name && e.status === st.status;
          });
          if (!avail) return; /* the action exists but not here — don't claim it */
        }
        if (bullets.length < 4) bullets.push(a.name.replace(/^[A-Z]+\d+[a-z]?\.\s*/, ''));
      });
      (st.supplierKeys || []).forEach(function (key) {
        var sa = supplierByKey[key];
        if (!sa) { dropped.push({ step: st.title, reason: key + ' is not in this configuration' }); return; }
        if (sa.detailObserved === false) { bullets.push('(detail not yet captured)'); return; }
        if (bullets.length < 4) bullets.push(sa.name + (sa.portalVisible === false ? ' (not portal-visible)' : ''));
      });
      if (!bullets.length) bullets.push('No actions configured here');
      return Object.assign({}, st, { bullets: bullets.slice(0, 4) });
    });
    return { steps: steps, dropped: dropped };
  }

  /* ---- geometry + drawing ---------------------------------------------- */
  var CARD_W = 176, CARD_H = 128, COL_W = 214, LANE_H = 158, RAIL_W = 96;
  var TOP = 86, LEGEND_H = 46, PAD = 18;

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function wrap(text, max) {
    var words = String(text).split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) {
      if ((cur + ' ' + w).trim().length > max) { if (cur) lines.push(cur); cur = w; }
      else cur = (cur + ' ' + w).trim();
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function render(flowId, model, opts) {
    opts = opts || {};
    var flow = FLOWS[flowId];
    if (!flow) return { svg: '', dropped: [], missing: true };
    var resolved = resolveSteps(flow, model);
    var steps = resolved.steps;
    if (!steps.length) return { svg: '', dropped: resolved.dropped, missing: true };

    var laneIndex = {};
    var lanesUsed = flow.lanes.filter(function (l) {
      return steps.some(function (s) { return s.lane === l.id; });
    });
    lanesUsed.forEach(function (l, i) { laneIndex[l.id] = i; });

    var maxCol = 0;
    steps.forEach(function (s) { if (s.col > maxCol) maxCol = s.col; });
    var width = RAIL_W + (maxCol + 1) * COL_W + PAD * 2;
    var lanesTop = TOP;
    var height = lanesTop + lanesUsed.length * LANE_H + LEGEND_H + PAD * 2 + (opts.compact ? 0 : 26);

    var stepPos = {};
    steps.forEach(function (s) {
      stepPos[s.id] = {
        x: RAIL_W + PAD + s.col * COL_W + (COL_W - CARD_W) / 2,
        y: lanesTop + laneIndex[s.lane] * LANE_H + (LANE_H - CARD_H) / 2
      };
    });

    var svg = [];
    svg.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" ' +
      'font-family="Segoe UI, system-ui, sans-serif" style="max-width:100%;height:auto;background:#fff">');
    svg.push('<defs>' +
      '<marker id="fr-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0 0 L10 5 L0 10 z" fill="' + C.arrow + '"/></marker>' +
      '<marker id="fr-arrow-engine" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0 0 L10 5 L0 10 z" fill="' + C.engine + '"/></marker>' +
      '</defs>');

    /* header */
    svg.push('<text x="' + (width / 2) + '" y="34" text-anchor="middle" font-size="21" font-weight="700" fill="' + C.ink + '" letter-spacing="1">' + esc(flow.title) + '</text>');
    svg.push('<rect x="' + (width / 2 - 40) + '" y="42" width="80" height="3" rx="1.5" fill="' + C.laneGreen + '"/>');
    svg.push('<text x="' + (width / 2) + '" y="62" text-anchor="middle" font-size="11.5" fill="' + C.dim + '">' + esc(opts.subtitle || flow.subtitle) + '</text>');

    /* lanes */
    lanesUsed.forEach(function (l, i) {
      var y = lanesTop + i * LANE_H;
      svg.push('<rect x="' + PAD + '" y="' + y + '" width="' + (width - PAD * 2) + '" height="' + (LANE_H - 8) + '" rx="10" fill="' + LANE_BGS[l.tone] + '"/>');
      svg.push('<rect x="' + PAD + '" y="' + y + '" width="' + (RAIL_W - PAD - 6) + '" height="' + (LANE_H - 8) + '" rx="10" fill="' + LANE_COLORS[l.tone] + '"/>');
      var cx = PAD + (RAIL_W - PAD - 6) / 2, cy = y + (LANE_H - 8) / 2;
      svg.push('<text x="' + cx + '" y="' + cy + '" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" letter-spacing="1.5" transform="rotate(-90 ' + cx + ' ' + cy + ')">' + esc(l.label) + '</text>');
    });

    /* edges under cards */
    (flow.edges || []).forEach(function (e) {
      var a = stepPos[e[0]], b = stepPos[e[1]];
      if (!a || !b) return;
      var kind = e[2] || 'flow';
      var stroke = kind === 'engine' ? C.engine : kind === 'response' ? C.response : C.arrow;
      var dash = kind === 'engine' ? ' stroke-dasharray="5 4"' : '';
      var marker = kind === 'engine' ? 'fr-arrow-engine' : 'fr-arrow';
      var x1, y1, x2, y2, path;
      if (Math.abs(a.y - b.y) < 2) { /* same lane: straight */
        var leftFirst = a.x < b.x;
        x1 = leftFirst ? a.x + CARD_W : a.x; y1 = a.y + CARD_H / 2;
        x2 = leftFirst ? b.x : b.x + CARD_W; y2 = b.y + CARD_H / 2;
        path = 'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2;
      } else { /* elbow: out of the side, down/up, into the side */
        var goingRight = b.x >= a.x + CARD_W;
        x1 = goingRight ? a.x + CARD_W : a.x; y1 = a.y + CARD_H / 2;
        x2 = goingRight ? b.x : b.x + CARD_W; y2 = b.y + CARD_H / 2;
        var midX = goingRight ? x1 + (x2 - x1) / 2 : x1 - 22;
        path = 'M' + x1 + ' ' + y1 + ' L' + midX + ' ' + y1 + ' L' + midX + ' ' + y2 + ' L' + x2 + ' ' + y2;
      }
      svg.push('<path d="' + path + '" fill="none" stroke="' + stroke + '" stroke-width="1.8"' + dash + ' marker-end="url(#' + marker + ')"/>');
    });

    /* cards */
    steps.forEach(function (s, idx) {
      var p = stepPos[s.id];
      var lane = lanesUsed[laneIndex[s.lane]];
      var laneCol = LANE_COLORS[lane.tone];
      var dataAttrs = s.status ? ' data-status="' + esc(s.status) + '"' : '';
      svg.push('<g' + dataAttrs + '>');
      svg.push('<rect x="' + p.x + '" y="' + p.y + '" width="' + CARD_W + '" height="' + CARD_H + '" rx="10" fill="' + C.card + '" stroke="' + (s.engine ? C.engine : C.cardBorder) + '" stroke-width="1.3"' + (s.engine ? ' stroke-dasharray="5 4"' : '') + '/>');
      /* number badge */
      svg.push('<circle cx="' + (p.x + CARD_W / 2) + '" cy="' + (p.y - 2) + '" r="11" fill="' + C.badge + '"/>');
      svg.push('<text x="' + (p.x + CARD_W / 2) + '" y="' + (p.y + 2) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">' + (idx + 1) + '</text>');
      /* title */
      var ty = p.y + 24;
      wrap(s.title, 22).slice(0, 2).forEach(function (line) {
        svg.push('<text x="' + (p.x + CARD_W / 2) + '" y="' + ty + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + C.ink + '">' + esc(line) + '</text>');
        ty += 14;
      });
      /* bullets */
      ty += 3;
      s.bullets.forEach(function (b) {
        wrap('• ' + b, 32).slice(0, 2).forEach(function (line) {
          if (ty > p.y + CARD_H - 22) return;
          svg.push('<text x="' + (p.x + 10) + '" y="' + ty + '" font-size="9.5" fill="' + C.dim + '">' + esc(line) + '</text>');
          ty += 11.5;
        });
      });
      /* owner chip */
      svg.push('<rect x="' + (p.x + CARD_W / 2 - 56) + '" y="' + (p.y + CARD_H - 17) + '" width="112" height="15" rx="7.5" fill="' + laneCol + '"/>');
      svg.push('<text x="' + (p.x + CARD_W / 2) + '" y="' + (p.y + CARD_H - 6) + '" text-anchor="middle" font-size="8.5" font-weight="600" fill="#fff">Owner: ' + esc(s.owner || lane.label) + '</text>');
      if (s.end) {
        svg.push('<circle cx="' + (p.x + CARD_W + 26) + '" cy="' + (p.y + CARD_H / 2) + '" r="15" fill="' + C.end + '"/>');
        svg.push('<text x="' + (p.x + CARD_W + 26) + '" y="' + (p.y + CARD_H / 2 + 4) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">✓</text>');
        svg.push('<text x="' + (p.x + CARD_W + 26) + '" y="' + (p.y + CARD_H / 2 + 30) + '" text-anchor="middle" font-size="9.5" font-weight="700" fill="' + C.end + '">END</text>');
      }
      svg.push('</g>');
    });

    /* legend */
    var ly = lanesTop + lanesUsed.length * LANE_H + 10;
    svg.push('<rect x="' + PAD + '" y="' + ly + '" width="' + (width - PAD * 2) + '" height="' + (LEGEND_H - 10) + '" rx="8" fill="#fff" stroke="#d8e2de"/>');
    var lx = PAD + 18, lcy = ly + (LEGEND_H - 10) / 2;
    svg.push('<line x1="' + lx + '" y1="' + lcy + '" x2="' + (lx + 34) + '" y2="' + lcy + '" stroke="' + C.arrow + '" stroke-width="1.8" marker-end="url(#fr-arrow)"/>');
    svg.push('<text x="' + (lx + 42) + '" y="' + (lcy + 3.5) + '" font-size="10" fill="' + C.dim + '">Process flow</text>');
    lx += 130;
    svg.push('<line x1="' + lx + '" y1="' + lcy + '" x2="' + (lx + 34) + '" y2="' + lcy + '" stroke="' + C.engine + '" stroke-width="1.8" stroke-dasharray="5 4" marker-end="url(#fr-arrow-engine)"/>');
    svg.push('<text x="' + (lx + 42) + '" y="' + (lcy + 3.5) + '" font-size="10" fill="' + C.dim + '">Automated / engine-driven</text>');
    lx += 200;
    svg.push('<rect x="' + lx + '" y="' + (lcy - 8) + '" width="86" height="16" rx="8" fill="' + C.laneDark + '"/>');
    svg.push('<text x="' + (lx + 43) + '" y="' + (lcy + 3.5) + '" text-anchor="middle" font-size="8.5" font-weight="600" fill="#fff">Owner: …</text>');
    svg.push('<text x="' + (lx + 96) + '" y="' + (lcy + 3.5) + '" font-size="10" fill="' + C.dim + '">Who performs the step</text>');

    /* dropped-step honesty note */
    if (resolved.dropped.length && !opts.compact) {
      svg.push('<text x="' + PAD + '" y="' + (height - 10) + '" font-size="9.5" fill="' + C.faint + '">Not shown (not in this configuration): ' +
        esc(resolved.dropped.map(function (d) { return d.step; }).join(', ')) + '</text>');
    }

    svg.push('</svg>');
    return { svg: svg.join(''), dropped: resolved.dropped, missing: false, width: width, height: height };
  }

  /* Standalone printable HTML — landscape A4, one flow per page. */
  function printable(flows, docTitle) {
    var body = flows.map(function (f) {
      return '<section class="flowpage">' + f.svg + '</section>';
    }).join('');
    return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(docTitle) + '</title><style>' +
      '@page { size: A4 landscape; margin: 8mm; }' +
      'body { margin: 0; font-family: "Segoe UI", system-ui, sans-serif; }' +
      '.flowpage { page-break-after: always; display: flex; align-items: center; justify-content: center; min-height: 96vh; }' +
      '.flowpage:last-child { page-break-after: auto; }' +
      '.flowpage svg { width: 100%; max-height: 96vh; }' +
      '@media screen { body { background: #e8ece9; } .flowpage { background: #fff; margin: 16px auto; max-width: 1250px; box-shadow: 0 2px 12px rgba(0,0,0,.12); padding: 10px; } }' +
      '</style></head><body>' + body +
      '<script>/* print from the browser: File → Print → Save as PDF */</scr' + 'ipt></body></html>';
  }

  var api = { FLOWS: FLOWS, render: render, resolveSteps: resolveSteps, printable: printable };
  /* FACTUAL flow: generated from the model\u2019s own availability + results
   * edges \u2014 exactly what the Action Map shows, drawn as a flow. Nothing is
   * narrated and nothing is guessed: a status appears because it exists and
   * is not suppressed; an arrow appears because that action, available in
   * that status, sets that resulting status. Actions with no status change
   * are listed under the status they belong to. */
  function factual(model, type) {
    var hd = (model && model.helpdesk) || {};
    var statuses = (hd.statuses || []).filter(function (s) {
      return !s.suppressed && (s.types || []).indexOf(type) !== -1;
    }).map(function (s) { return s.name; });
    if (!statuses.length) return { missing: true, svg: '' };
    var avail = {};
    (hd.availability || []).forEach(function (e) {
      if (e.type && e.type !== type && e.type !== 'Both') return;
      if (statuses.indexOf(e.status) === -1) return;
      (avail[e.status] = avail[e.status] || []).push(e.action);
    });
    var resultOf = {};
    (hd.actions || []).forEach(function (a) { if (a.resultingStatus) resultOf[a.name] = a.resultingStatus; });
    (hd.results || []).forEach(function (r) {
      if (r.type && r.type !== type) return;
      if (r.kind === 'sets') resultOf[r.action] = r.toStatus;
    });
    var edges = []; var seen = {};
    statuses.forEach(function (st) {
      (avail[st] || []).forEach(function (an) {
        var to = resultOf[an];
        if (!to || statuses.indexOf(to) === -1) return;
        if (to === st) return;
        var k = st + '>' + to + '>' + an;
        if (seen[k]) return; seen[k] = true;
        var code = (an.match(/^([A-Z]{1,3}\d{2,3}[a-z]?)/) || [an.slice(0, 6)])[0];
        edges.push({ from: st, to: to, label: code });
      });
    });
    /* layout: one column of status boxes, arrows on the right */
    var W = 760, RH = 64, PAD = 16, BW = 250;
    var H = PAD * 2 + statuses.length * RH;
    var y = function (st) { return PAD + statuses.indexOf(st) * RH + RH / 2; };
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" font-family="Segoe UI,Arial,sans-serif">';
    svg += '<defs><marker id="fw-ar" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 z" fill="#1e6b4f"/></marker></defs>';
    statuses.forEach(function (st) {
      var yy = y(st) - 20;
      svg += '<rect x="' + PAD + '" y="' + yy + '" width="' + BW + '" height="40" rx="6" fill="#eef4f1" stroke="#1e6b4f"/>';
      svg += '<text x="' + (PAD + BW / 2) + '" y="' + (yy + 24) + '" text-anchor="middle" font-size="13" font-weight="600" fill="#0e3e33">' + st.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text>';
      var locals = (avail[st] || []).filter(function (an) { var to = resultOf[an]; return !to || statuses.indexOf(to) === -1 || to === st; });
      if (locals.length) {
        var codes = locals.map(function (an) { return (an.match(/^([A-Z]{1,3}\d{2,3}[a-z]?)/) || [an.slice(0, 5)])[0]; }).join(' ');
        svg += '<text x="' + (PAD + BW + 12) + '" y="' + (yy + 14) + '" font-size="10" fill="#68727d">also here: ' + codes.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text>';
      }
    });
    var lane = 0;
    edges.forEach(function (e) {
      var x0 = PAD + BW, y0 = y(e.from), y1 = y(e.to);
      var xr = x0 + 60 + (lane % 6) * 68; lane++;
      svg += '<path d="M ' + x0 + ' ' + y0 + ' H ' + xr + ' V ' + y1 + ' H ' + (x0 + 4) + '" fill="none" stroke="#1e6b4f" stroke-width="1.4" marker-end="url(#fw-ar)"/>';
      svg += '<text x="' + (xr + 3) + '" y="' + ((y0 + y1) / 2) + '" font-size="10" fill="#1e6b4f">' + e.label + '</text>';
    });
    svg += '</svg>';
    return { missing: false, svg: svg, statuses: statuses.length, edges: edges.length };
  }

  api.factual = factual;
  if (typeof window !== 'undefined') window.StudioFlow = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
