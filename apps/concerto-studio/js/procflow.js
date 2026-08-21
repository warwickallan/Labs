/* procflow.js — workpackage-style PROCESS FLOW diagrams for the design docs.
 *
 * Recreates the shape and vocabulary of the Bellrock/Concerto workpackage
 * flows (Reactive process; Planned process + Remedial / Internal completion /
 * External completion sub-flows) as clean modern SVG — no images, no logos,
 * print-safe, self-contained.
 *
 * HONESTY RULE: the flow SKELETON is the standard product journey (the same
 * one the workpackage documents describe); every STATUS CALLOUT is bound to
 * this instance's OWN statuses by role. A role that does not exist in the
 * model (e.g. no follow-up status, no hold action) removes that branch or
 * callout — nothing is invented. Each diagram reports its bindings so the
 * document can say which names came from the instance.
 *
 * Pure module: no DOM, no fetch, no state. window.StudioProcFlow.
 */
(function () {
  'use strict';

  /* ---- actor palette (same semantic key as the workpackage docs) ------- */
  var C = {
    helpdesk: { fill: '#1d6fd6', text: '#ffffff' },
    contractor: { fill: '#ef8b2f', text: '#ffffff' },
    operative: { fill: '#c9268f', text: '#ffffff' },
    shared: { fill: '#f4c520', text: '#333d47' },
    start: { fill: '#3f9142', text: '#ffffff' },
    end: { fill: '#d64541', text: '#ffffff' },
    line: '#55606b',
    yes: '#2c7a3f',
    no: '#c0392b',
    calloutFill: '#eef1f5',
    calloutBar: '#333d47',
    calloutText: '#333d47',
    title: '#2b3540',
    sub: '#68727d'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---- model bindings -------------------------------------------------- */

  function statusesFor(model, type) {
    var hd = (model && model.helpdesk) || {};
    return (hd.statuses || []).filter(function (s) {
      return !s.suppressed && (!s.types || !s.types.length || s.types.indexOf(type) !== -1);
    }).map(function (s) { return s.name; });
  }

  function findStatus(names, regexes) {
    for (var i = 0; i < regexes.length; i++) {
      for (var j = 0; j < names.length; j++) {
        if (regexes[i].test(names[j])) return names[j];
      }
    }
    return null;
  }

  function hasAction(model, type, re) {
    var hd = (model && model.helpdesk) || {};
    return (hd.actions || []).some(function (a) {
      if (!re.test(a.name || '')) return false;
      var t = a.types || [];
      return !t.length || t.indexOf(type) !== -1;
    });
  }

  /* What this instance's configuration actually EVIDENCES. Steps are drawn
   * only when the model carries an action (helpdesk or supplier-portal) that
   * performs them — an older or leaner build simply has a leaner diagram. */
  function evidence(model) {
    var hd = (model && model.helpdesk) || {};
    var ord = (model && model.orders) || {};
    var acts = (hd.actions || []).map(function (a) { return a.name || ''; });
    var sups = (ord.supplierActions || []).map(function (a) { return a.name || ''; });
    var pool = acts.concat(sups).join(' | ');
    function has(re) { return re.test(pool); }
    return {
      accept: has(/accept/i),
      rams: has(/\brams\b/i),
      appointment: has(/appoint/i),
      remedial: has(/remedial/i),
      afp: has(/\bafp\b/i),
      acknowledge: has(/acknowledg/i),
      invoice: has(/invoice/i),
      mobile: (hd.actions || []).some(function (a) { return a.mobileAvailable; }) || has(/travel|mobile/i),
      supplierPortal: sups.length > 0,
      supplierAccept: sups.some(function (n) { return /accept/i.test(n); })
    };
  }

  /* Role table per type: how instance statuses map onto the journey. */
  function bind(model, type) {
    var names = statusesFor(model, type);
    var b = {
      all: names,
      def: findStatus(names, [/with helpdesk/i, /new/i]),
      contractor: findStatus(names, [/with contractor/i, /contractor/i]),
      internal: findStatus(names, [/smart/i, /maintenance team/i, /internal/i, /with .*team/i]),
      inProgress: findStatus(names, [/in progress/i]),
      hold: findStatus(names, [/on hold/i]),
      followUp: findStatus(names, [/follow.?up/i]),
      complete: findStatus(names, [/work complete$/i, /^complete/i, /complete(?!.*follow)/i]),
      closed: findStatus(names, [/closed/i]),
      holdAction: hasAction(model, type, /place on hold|^.*\bon hold\b/i),
      releaseAction: hasAction(model, type, /take off hold|off hold|release/i)
    };
    return b;
  }

  /* ---- SVG kit ---------------------------------------------------------- */

  function Kit(width, height) {
    this.w = width; this.h = height;
    this.parts = [];
  }

  Kit.prototype.push = function (s) { this.parts.push(s); };

  /* multi-line label helper: split on \n, centre vertically */
  Kit.prototype.textBlock = function (cx, cy, lines, color, size, weight) {
    var lh = size + 4;
    var y0 = cy - ((lines.length - 1) * lh) / 2;
    for (var i = 0; i < lines.length; i++) {
      this.push('<text x="' + cx + '" y="' + (y0 + i * lh + size * 0.35) + '" text-anchor="middle" font-size="' + size +
        '" font-weight="' + (weight || 600) + '" fill="' + color + '">' + esc(lines[i]) + '</text>');
    }
  };

  function wrap(label, max) {
    var words = String(label).split(/\s+/); var lines = []; var cur = '';
    words.forEach(function (w) {
      if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; }
      else cur = (cur + ' ' + w).trim();
    });
    if (cur) lines.push(cur);
    return lines;
  }

  Kit.prototype.node = function (cx, cy, w, h, actor, label) {
    var a = C[actor] || C.shared;
    this.push('<rect x="' + (cx - w / 2) + '" y="' + (cy - h / 2) + '" width="' + w + '" height="' + h +
      '" rx="10" fill="' + a.fill + '" filter="url(#pfsh)"/>');
    this.textBlock(cx, cy, wrap(label, Math.floor(w / 8)), a.text, 13, 600);
  };

  Kit.prototype.terminal = function (cx, cy, w, h, kind, label) {
    var a = C[kind];
    this.push('<rect x="' + (cx - w / 2) + '" y="' + (cy - h / 2) + '" width="' + w + '" height="' + h +
      '" rx="' + (h / 2) + '" fill="' + a.fill + '" filter="url(#pfsh)"/>');
    this.textBlock(cx, cy, wrap(label, Math.floor(w / 8)), a.text, 13, 700);
  };

  Kit.prototype.decision = function (cx, cy, w, h, label) {
    this.push('<path d="M ' + cx + ' ' + (cy - h / 2) + ' L ' + (cx + w / 2) + ' ' + cy + ' L ' + cx + ' ' + (cy + h / 2) +
      ' L ' + (cx - w / 2) + ' ' + cy + ' Z" fill="#ffffff" stroke="' + C.line + '" stroke-width="1.6" filter="url(#pfsh)"/>');
    this.textBlock(cx, cy, wrap(label, 14), C.title, 12, 600);
  };

  /* off-page link pentagon (down-pointing = to, up base = from) */
  Kit.prototype.offpage = function (cx, cy, w, h, kind, label) {
    var a = kind === 'from' ? C.start : C.shared;
    var t = cy - h / 2, b = cy + h / 2;
    this.push('<path d="M ' + (cx - w / 2) + ' ' + t + ' H ' + (cx + w / 2) + ' V ' + (b - h / 3) + ' L ' + cx + ' ' + b +
      ' L ' + (cx - w / 2) + ' ' + (b - h / 3) + ' Z" fill="' + a.fill + '" filter="url(#pfsh)"/>');
    this.textBlock(cx, cy - h / 8, wrap(label, 14), a.text, 12, 700);
  };

  /* status callout: pill with accent bar, beside an activity */
  Kit.prototype.callout = function (x, cy, label, anchorRight) {
    var w = Math.max(96, label.length * 7.4 + 26), h = 30;
    var lx = anchorRight ? x : x - w;
    this.push('<rect x="' + lx + '" y="' + (cy - h / 2) + '" width="' + w + '" height="' + h +
      '" rx="15" fill="' + C.calloutFill + '" stroke="#d4dae1"/>');
    this.push('<rect x="' + (anchorRight ? lx : lx + w - 5) + '" y="' + (cy - h / 2) + '" width="5" height="' + h +
      '" rx="2.5" fill="' + C.calloutBar + '"/>');
    this.push('<text x="' + (lx + w / 2 + (anchorRight ? 3 : -3)) + '" y="' + (cy + 4) + '" text-anchor="middle" font-size="11.5" font-weight="600" fill="' +
      C.calloutText + '">' + esc(label) + '</text>');
  };

  /* orthogonal edge through waypoints [[x,y],...]; label near the start */
  Kit.prototype.edge = function (pts, label, labelColor) {
    var d = 'M ' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 1; i < pts.length; i++) d += ' L ' + pts[i][0] + ' ' + pts[i][1];
    this.push('<path d="' + d + '" fill="none" stroke="' + C.line + '" stroke-width="1.6" marker-end="url(#pfar)"/>');
    if (label) {
      var lx = (pts[0][0] + pts[1][0]) / 2, ly = (pts[0][1] + pts[1][1]) / 2 - 6;
      if (pts[0][1] === pts[1][1]) { ly = pts[0][1] - 8; }
      this.push('<text x="' + lx + '" y="' + ly + '" text-anchor="middle" font-size="11.5" font-weight="700" fill="' +
        (labelColor || C.sub) + '">' + esc(label) + '</text>');
    }
  };

  Kit.prototype.header = function (title, subtitle) {
    this.push('<text x="34" y="52" font-size="26" font-weight="700" fill="' + C.title + '">' + esc(title) + '</text>');
    if (subtitle) this.push('<text x="34" y="74" font-size="12.5" fill="' + C.sub + '">' + esc(subtitle) + '</text>');
    /* compact key chips, top right */
    var chips = [['Helpdesk', C.helpdesk.fill], ['Contractor', C.contractor.fill], ['Operative', C.operative.fill], ['Either', C.shared.fill], ['Status', C.calloutFill]];
    var x = this.w - 34;
    for (var i = chips.length - 1; i >= 0; i--) {
      var label = chips[i][0]; var w = label.length * 6.6 + 30;
      x -= w + 8;
      this.push('<rect x="' + x + '" y="36" width="' + w + '" height="22" rx="11" fill="#f6f8fa" stroke="#e0e5ea"/>');
      this.push('<circle cx="' + (x + 13) + '" cy="47" r="5.5" fill="' + chips[i][1] + '"' + (chips[i][1] === C.calloutFill ? ' stroke="#b9c2cc"' : '') + '/>');
      this.push('<text x="' + (x + 23) + '" y="51" font-size="11" fill="#4a5560">' + esc(label) + '</text>');
    }
  };

  Kit.prototype.svg = function () {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + this.w + ' ' + this.h +
      '" font-family="Segoe UI, Arial, sans-serif" style="max-width:100%;height:auto;background:#ffffff">' +
      '<defs>' +
      '<marker id="pfar" markerWidth="9" markerHeight="9" refX="7.5" refY="3.5" orient="auto"><path d="M0,0 L8,3.5 L0,7 z" fill="' + C.line + '"/></marker>' +
      '<filter id="pfsh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.8" flood-color="#1b2733" flood-opacity="0.18"/></filter>' +
      '</defs>' + this.parts.join('') + '</svg>';
  };

  /* ---- Reactive process (workpackage page-7 shape) ---------------------- */

  function reactive(model, ev) {
    ev = ev || evidence(model);
    var b = bind(model, 'Reactive');
    var bindings = [];
    function co(k, kit, x, cy, right) {
      if (!b[k]) return;
      kit.callout(x, cy, b[k], right);
      bindings.push({ role: k, status: b[k] });
    }
    var hasFollow = !!b.followUp;
    var hasHold = !!(b.holdAction || b.hold);
    var hasContractor = !!b.contractor;

    /* branch steps: drawn ONLY when this instance's config evidences them */
    var left = [];
    if (hasContractor) {
      left.push(['helpdesk', 'Assign contractor', null]);
      left.push(['helpdesk', 'Raise order', 'contractor']);
      if (ev.acknowledge) left.push(['contractor', 'Acknowledge order', null]);
      else if (ev.supplierAccept) left.push(['contractor', 'Accept order (supplier portal)', null]);
      if (ev.appointment) left.push(['contractor', 'Make appointment & assign operative', null]);
    }
    var right = [
      ['helpdesk', 'Internal team assigned', 'internal'],
      ['helpdesk', 'Assign operative', null]
    ];
    if (ev.accept) right.push(['operative', 'Accept job', null]);

    var branchRows = Math.max(left.length, right.length);
    var ROW = 86, TOP = 392;
    var mergeY = TOP + branchRows * ROW + 22;
    var workY = mergeY + 46;
    var decY = workY + 104;
    var followY = decY + 114;
    var afterY = (hasFollow ? followY + 98 : decY + 84);
    var H = afterY + 120;
    var k = new Kit(1080, H);
    k.header('Reactive process', 'This instance’s own journey — steps its configuration does not have are not shown');

    var CX = 640, LX = 300, MX = 470;
    k.terminal(CX, 140, 170, 44, 'start', 'Job logged');
    k.edge([[CX, 162], [CX, 196]]);
    k.node(CX, 222, 200, 48, 'helpdesk', 'Triage job');
    co('def', k, CX + 130, 222, true);
    k.edge([[CX, 246], [CX, 282]]);

    function stack(kit, x, steps, y0) {
      var lastY = y0 - 30;
      steps.forEach(function (s, i) {
        var y = y0 + i * ROW;
        if (i) kit.edge([[x, lastY], [x, y - 28]]);
        var wide = s[1].length > 24;
        kit.node(x, y, wide ? 236 : 210, wide ? 60 : 50, s[0], s[1]);
        if (s[2]) co(s[2], kit, s[2] === 'contractor' ? x - 135 : x + 135, y, s[2] !== 'contractor');
        lastY = y + (wide ? 30 : 25);
      });
      return lastY;
    }

    var leftEnd, rightEnd;
    if (hasContractor) {
      k.decision(CX, 322, 190, 84, 'Assign to internal team?');
      k.edge([[CX - 95, 322], [LX, 322], [LX, TOP - 28]], 'No', C.no);
      k.edge([[CX, 364], [CX, TOP - 28]], 'Yes', C.yes);
      leftEnd = stack(k, LX, left, TOP);
      rightEnd = stack(k, CX, right, TOP);
      k.edge([[LX, leftEnd], [LX, mergeY], [MX, mergeY], [MX, mergeY + 14]]);
      k.edge([[CX, rightEnd], [CX, mergeY], [MX + 6, mergeY]]);
    } else {
      /* no contractor route in this configuration — a single internal lane */
      rightEnd = stack(k, CX, right, 322);
      k.edge([[CX, rightEnd], [CX, mergeY], [MX, mergeY], [MX, mergeY + 14]]);
    }

    k.node(MX, workY, 220, 52, 'shared', ev.rams ? 'RAMS & start work' : 'Start work');
    co('inProgress', k, MX + 140, workY, true);
    k.edge([[MX, workY + 26], [MX, decY - 42]]);
    k.decision(MX, decY, 190, 84, 'Can the task be completed?');

    if (hasHold) {
      k.edge([[MX + 95, decY], [820, decY]], 'No', C.no);
      k.node(846, decY, 180, 48, 'shared', 'Place on hold');
      co('hold', k, 846 + 118, decY, true);
      if (b.releaseAction) {
        k.edge([[846, decY - 24], [846, workY], [MX + (b.inProgress ? 245 : 112), workY]], 'released', C.sub);
      }
      bindings.push({ role: 'holdBranch', status: b.hold || '(hold action present)' });
    }

    if (hasFollow) {
      k.edge([[MX, decY + 42], [MX, followY - 44]], 'Yes', C.yes);
      k.decision(MX, followY, 190, 84, 'Follow-up visit needed?');
      k.edge([[MX + 95, followY], [820, followY]], 'Yes', C.yes);
      k.node(846, followY, 180, 52, 'shared', 'Complete details');
      co('followUp', k, 846 + 118, followY, true);
      k.edge([[846, followY + 26], [846, afterY + 76], [MX + 96, afterY + 76]]);
      k.edge([[MX, followY + 42], [MX, afterY - 26]], 'No', C.no);
    } else {
      k.edge([[MX, decY + 42], [MX, afterY - 26]], 'Yes', C.yes);
    }
    k.node(MX, afterY, 200, 52, 'shared', 'Complete details');
    co('complete', k, MX - 130, afterY, false);
    k.edge([[MX, afterY + 26], [MX, afterY + 54]]);
    k.terminal(MX, afterY + 76, 170, 44, 'end', 'Close job');

    return { id: 'reactive', title: 'Reactive process', svg: k.svg(), bindings: bindings };
  }

  /* ---- Planned (PPM) main process --------------------------------------- */

  function planned(model, ev) {
    ev = ev || evidence(model);
    var b = bind(model, 'Planned');
    var bindings = [];
    function co(k2, kit, x, cy, right) {
      if (!b[k2]) return;
      kit.callout(x, cy, b[k2], right);
      bindings.push({ role: k2, status: b[k2] });
    }
    var k = new Kit(1080, 1330);
    k.header('Planned (PPM) process', 'Standard journey with this instance’s own statuses');

    var CX = 560, LX = 280, RX = 830;
    k.terminal(CX, 140, 190, 44, 'start', 'Create PPM');
    k.edge([[CX, 162], [CX, 196]]);
    k.decision(CX, 240, 200, 88, 'Internal or external PPM?');

    /* external: supplier / orders (left) */
    k.edge([[CX - 100, 240], [LX, 240], [LX, 268]], 'External', C.sub);
    k.decision(LX, 312, 190, 88, 'Supplier onboarded?');
    k.edge([[LX + 95, 312], [CX + 120, 312], [CX + 120, 366]], 'Not onboarded', C.no);
    k.edge([[LX, 356], [LX, 388]], 'Onboarded', C.yes);
    k.node(LX, 416, 200, 52, 'helpdesk', 'Create orders');
    k.edge([[LX, 442], [LX, 476]]);
    k.node(LX, 504, 200, 48, 'helpdesk', 'Orders issued');
    co('contractor', k, LX - 130, 504, false);
    k.edge([[LX, 528], [LX, 566]]);
    k.node(LX, 598, 230, 62, 'contractor', 'Work assigned & appointments made');

    /* internal: jobs (right, via centre) */
    k.node(CX + 120, 394, 200, 52, 'helpdesk', 'Create jobs');
    k.edge([[CX + 120, 420], [CX + 120, 454]]);
    k.node(CX + 120, 482, 210, 52, 'helpdesk', 'Helpdesk jobs created');
    co('def', k, CX + 120 + 135, 482, true);
    k.edge([[CX + 120, 508], [CX + 120, 546]]);
    k.node(CX + 120, 574, 200, 52, 'helpdesk', 'Work assigned');
    co('internal', k, CX + 120 + 130, 574, true);

    /* merge */
    k.edge([[LX, 629], [LX, 690], [CX, 690], [CX, 708]]);
    k.edge([[CX + 120, 600], [CX + 120, 690], [CX + 6, 690]]);
    k.node(CX, 736, 210, 52, 'shared', 'Work carried out');
    co('inProgress', k, CX + 135, 736, true);
    k.edge([[CX, 762], [CX, 798]]);
    k.decision(CX, 842, 190, 84, 'Work complete?');
    if (b.holdAction || b.hold) {
      k.edge([[CX + 95, 842], [RX, 842]], 'No', C.no);
      k.node(RX, 842, 170, 48, 'shared', 'Place on hold');
      co('hold', k, RX + 113, 842, true);
      k.edge([[RX, 818], [RX, 736], [CX + (b.inProgress ? 240 : 107), 736]]);
      bindings.push({ role: 'holdBranch', status: b.hold || '(hold action present)' });
    }
    var y = 884;
    if (ev.remedial) {
      k.edge([[CX, y], [CX, 916]], 'Yes', C.yes);
      k.decision(CX, 960, 190, 84, 'Remedials found?');
      k.edge([[CX - 95, 960], [LX - 60, 960], [LX - 60, 1000]], 'Yes', C.yes);
      k.offpage(LX - 60, 1036, 160, 64, 'to', 'Remedial process');
      k.edge([[CX, 1002], [CX, 1034]], 'No', C.no);
      y = 1034;
    } else {
      k.edge([[CX, y], [CX, 1034]], 'Yes', C.yes);
    }
    if (ev.supplierPortal) {
      k.decision(CX, 1080, 200, 88, 'Contractor on the supplier portal?');
      k.edge([[CX + 100, 1080], [RX, 1080], [RX, 1114]], 'No', C.no);
      k.offpage(RX, 1152, 180, 66, 'to', 'Internal completion');
      k.edge([[CX, 1124], [CX, 1156]], 'Yes', C.yes);
      k.offpage(CX, 1196, 200, 66, 'to', 'Supplier order completion');
    } else {
      k.offpage(CX, 1080, 180, 66, 'to', 'Internal completion');
    }

    return { id: 'planned', title: 'Planned (PPM) process', svg: k.svg(), bindings: bindings };
  }

  /* ---- PPM sub-flows ----------------------------------------------------- */

  function remedial() {
    var k = new Kit(1080, 760);
    k.header('Remedial process', 'Standard product journey');
    var CX = 540;
    k.offpage(CX, 150, 180, 64, 'from', 'Log a remedial');
    k.edge([[CX, 182], [CX, 214]]);
    k.decision(CX, 262, 210, 92, 'Logged via PPM checklist?');
    k.edge([[CX + 105, 262], [830, 262]], 'Yes', C.yes);
    k.offpage(830, 262, 180, 64, 'to', 'Can complete work');
    k.edge([[CX, 308], [CX, 340]], 'No', C.no);
    k.node(CX, 368, 200, 48, 'shared', 'Log all details');
    k.edge([[CX, 392], [CX, 424]]);
    k.decision(CX, 470, 190, 84, 'More remedials?');
    k.edge([[CX + 95, 470], [790, 470], [790, 368], [CX + 101, 368]], 'Yes', C.yes);
    k.edge([[CX, 512], [CX, 546]], 'No', C.no);
    k.offpage(CX, 586, 190, 66, 'to', 'Can complete work');
    return { id: 'remedial', title: 'Remedial process', svg: k.svg(), bindings: [] };
  }

  function internalCompletion(model, ev) {
    ev = ev || evidence(model);
    var b = bind(model, 'Planned');
    var bindings = [];
    var k = new Kit(1080, 1000);
    k.header('Internal completion', 'This instance’s own journey');
    var CX = 560, LX = 300;
    k.offpage(CX, 150, 190, 64, 'from', 'Internal completion');
    if (ev.mobile) {
      k.edge([[CX, 182], [CX, 214]]);
      k.decision(CX, 260, 190, 84, 'Completing on mobile?');
      k.edge([[CX - 95, 260], [LX, 260], [LX, 296]], 'No', C.no);
      k.node(LX, 324, 210, 52, 'helpdesk', 'Helpdesk completes the job');
      k.edge([[CX, 302], [CX, 334]], 'Yes', C.yes);
      k.node(CX, 362, 210, 52, 'operative', 'Operative closes the job');
      k.edge([[LX, 350], [LX, 448], [CX - 6, 448]]);
      k.edge([[CX, 388], [CX, 448], [CX, 466]]);
    } else {
      /* no mobile capability evidenced — the helpdesk closes every job */
      k.edge([[CX, 182], [CX, 300]]);
      k.node(CX, 328, 210, 52, 'helpdesk', 'Helpdesk completes the job');
      k.edge([[CX, 354], [CX, 466]]);
    }
    if (ev.remedial) {
      k.decision(CX, 512, 200, 88, 'Were remedials logged?');
      k.edge([[CX - 100, 512], [LX, 512], [LX, 552]], 'No', C.no);
      k.node(LX, 584, 220, 56, 'helpdesk', 'Close job — PPM complete');
      if (b.complete) { k.callout(LX - 140, 584, b.complete, false); bindings.push({ role: 'complete', status: b.complete }); }
      k.edge([[CX + 100, 512], [830, 512], [830, 552]], 'Yes', C.yes);
      k.node(830, 590, 220, 64, 'helpdesk', 'Close job — complete with remedials');
      k.edge([[LX, 612], [LX, 724], [CX - 6, 724]]);
      k.edge([[830, 622], [830, 724], [CX + 6, 724]]);
      k.edge([[CX, 724], [CX, 742]]);
    } else {
      k.node(CX, 512, 220, 56, 'helpdesk', 'Close job — PPM complete');
      if (b.complete) { k.callout(CX + 140, 512, b.complete, true); bindings.push({ role: 'complete', status: b.complete }); }
      k.edge([[CX, 540], [CX, 742]]);
    }
    k.terminal(CX, 768, 180, 44, 'end', 'End of process');
    return { id: 'internal-completion', title: 'Internal completion', svg: k.svg(), bindings: bindings };
  }

  function externalCompletion(model, ev) {
    ev = ev || evidence(model);
    if (!ev.supplierPortal) return null;
    var b = bind(model, 'Planned');
    var bindings = [];
    var k = new Kit(1080, ev.invoice ? 1120 : (ev.afp ? 780 : 620));
    k.header('External (supplier) completion', 'This instance’s own journey');
    var CX = 560, LX = 300;
    k.offpage(CX, 150, 210, 66, 'from', 'Supplier order completion');
    var y;
    if (ev.remedial) {
      k.edge([[CX, 183], [CX, 216]]);
      k.decision(CX, 262, 200, 88, 'Were remedials logged?');
      k.edge([[CX - 100, 262], [LX, 262], [LX, 302]], 'No', C.no);
      k.node(LX, 334, 220, 56, 'contractor', 'Close job — PPM complete');
      if (b.complete) { k.callout(LX - 140, 334, b.complete, false); bindings.push({ role: 'complete', status: b.complete }); }
      k.edge([[CX + 100, 262], [830, 262], [830, 302]], 'Yes', C.yes);
      k.node(830, 340, 220, 64, 'contractor', 'Close job — complete with remedials');
      k.edge([[LX, 362], [LX, 452], [CX - 6, 452]]);
      k.edge([[830, 372], [830, 452], [CX + 6, 452]]);
      k.edge([[CX, 452], [CX, 470]]);
      y = 470;
    } else {
      k.edge([[CX, 183], [CX, 300]]);
      k.node(CX, 328, 220, 56, 'contractor', 'Close job — work complete');
      if (b.complete) { k.callout(CX + 140, 328, b.complete, true); bindings.push({ role: 'complete', status: b.complete }); }
      k.edge([[CX, 356], [CX, 470]]);
      y = 470;
    }
    if (ev.afp) {
      k.decision(CX, y + 46, 190, 84, 'AFP process used?');
      k.edge([[CX - 95, y + 46], [LX, y + 46], [LX, y + 82]], 'Yes', C.yes);
      k.offpage(LX, y + 120, 160, 64, 'to', 'AFP process');
      k.edge([[CX, y + 88], [CX, y + 120]], 'No', C.no);
      y += 120;
    }
    if (ev.invoice) {
      k.node(CX, y + 28, 190, 48, 'contractor', 'Create invoice');
      k.edge([[CX, y + 52], [CX, y + 84]]);
      k.node(CX, y + 112, 190, 48, 'contractor', 'Attach invoice');
      k.edge([[CX, y + 136], [CX, y + 168]]);
      k.node(CX, y + 196, 190, 48, 'contractor', 'Submit invoice');
      k.edge([[CX, y + 220], [CX, y + 252]]);
      y += 252;
    } else {
      k.edge([[CX, y], [CX, y + 26]]);
      y += 26;
    }
    k.terminal(CX, y + 22, 180, 44, 'end', 'End of process');
    return { id: 'external-completion', title: 'External (supplier) completion', svg: k.svg(), bindings: bindings };
  }

  /* Everything the docs embed, in reading order — each diagram tailored to
   * (and possibly removed by) what this instance's configuration evidences. */
  function all(model) {
    var ev = evidence(model);
    var flows = [reactive(model, ev), planned(model, ev)];
    if (ev.remedial) flows.push(remedial());
    flows.push(internalCompletion(model, ev));
    flows.push(externalCompletion(model, ev));
    return flows.filter(Boolean);
  }

  var api = {
    reactive: reactive,
    planned: planned,
    remedial: remedial,
    internalCompletion: internalCompletion,
    externalCompletion: externalCompletion,
    all: all,
    _bind: bind
  };

  if (typeof window !== 'undefined') window.StudioProcFlow = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
