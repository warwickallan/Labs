/* soldesign-customer.js — the CUSTOMER-FACING Solution Design generator.
 *
 * A Solution Design tells a customer exactly what has been delivered, in
 * their language, so they can sign off against it. It is layered:
 *
 *   1. the document a customer reads — overview, journey diagrams, each
 *      status explained simply, the deviations from standard, the decisions
 *      still theirs to make, and the implementation status;
 *   2. appendices carrying the full configuration detail;
 *   3. an evidence & provenance appendix for the implementation team.
 *
 * LANGUAGE RULES (hard):
 *   - No internal codes in the body (E-*, X-*, VI-*, STRUCTURAL, register
 *     ids). Those live in Appendix C.
 *   - No internal software concerns ("machine-readable model", capture
 *     states). If detail was not captured, the appendix says so plainly.
 *   - Engine-driven statuses (Quote Requested, Business Case) are described
 *     as the working features they are — never as dead ends.
 *   - The Vanilla baseline is identified by version/date/fingerprint in
 *     document control, not treated as one eternal reference.
 *
 * The same project data drives the whole document; nothing here is written
 * by hand per customer.
 */
(function () {
  'use strict';

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function stripCode(name) { return String(name).replace(/^[A-Z]+\d+[a-z]?\.\s*/, ''); }

  /* Plain-English purpose per status — curated meaning, model-verified
   * presence. A status the map does not know gets an honest generic line. */
  var PURPOSE = {
    'With Helpdesk': 'A new or returned job waiting for the helpdesk to triage and route it.',
    'With Maintenance Team - R': 'The job has been allocated to an internal maintenance resource.',
    'Awaiting Order Approval - R': 'The order value is above the approval level; the job waits for approval.',
    'With Contractor - R': 'The job is with an external contractor, driven by their order.',
    'Quote Requested - R': 'A quote has been requested; the quote workflow manages this stage and returns the job automatically when the order is raised.',
    'Business Case - R': 'A cost uplift is under review in the Business Cases area; approval returns the job to the workflow automatically.',
    'Work Complete - R': 'The work is done; the job awaits closure checks.',
    'Closed': 'The job is finished and closed for reporting.',
    'Cancelled': 'The job has been cancelled.',
    'New PPM': 'A planned job created from the planned-maintenance side.',
    'With Maintenance Team': 'The planned job is with an internal maintenance resource.',
    'With Contractor': 'The planned job is with an external contractor.',
    'PPM Complete': 'The planned work is done; the job awaits closure.'
  };

  function statusPurpose(name) {
    return PURPOSE[name] || 'A configured stage of this workflow.';
  }

  function entriesInto(model, statusName) {
    var seen = {}, out = [];
    model.helpdesk.results.forEach(function (r) {
      if (r.toStatus !== statusName || seen[r.action]) return;
      seen[r.action] = true;
      out.push(stripCode(r.action));
    });
    return out;
  }

  function actionsIn(model, statusName, wantMachine) {
    var byName = {};
    model.helpdesk.actions.forEach(function (a) { byName[a.name] = a; });
    var seen = {}, out = [];
    model.helpdesk.availability.forEach(function (e) {
      if (e.status !== statusName || seen[e.action]) return;
      seen[e.action] = true;
      var a = byName[e.action];
      if (!a) return;
      if (!!a.machineFired !== !!wantMachine) return;
      out.push(a);
    });
    return out;
  }

  function outcomesOf(model, statusName) {
    var actions = actionsIn(model, statusName, false).concat(actionsIn(model, statusName, true));
    var names = {};
    actions.forEach(function (a) { names[a.name] = true; });
    var seen = {}, out = [];
    model.helpdesk.results.forEach(function (r) {
      if (!names[r.action] || r.toStatus === statusName || seen[r.toStatus]) return;
      seen[r.toStatus] = true;
      out.push(r.toStatus);
    });
    return out;
  }

  function channels(model, statusName) {
    var out = [];
    var acts = actionsIn(model, statusName, false);
    if (acts.some(function (a) { return a.mobileAvailable; })) out.push('Mobile (Orchestrate)');
    if (acts.some(function (a) { return (a.flags || []).indexOf('supplier_assignment') !== -1; })) out.push('Supplier / contractor route');
    out.unshift('Web');
    return out;
  }

  /* Deviations touching one status, said simply. */
  function statusDeviations(diffRows, statusName) {
    return (diffRows || []).filter(function (r) {
      return r.detail.indexOf(statusName) !== -1;
    });
  }

  function statusBlock(model, statusName, diffRows) {
    var user = actionsIn(model, statusName, false);
    var auto = actionsIn(model, statusName, true);
    var devs = statusDeviations(diffRows, statusName);
    var h = '<div class="status-block">';
    h += '<h4>' + esc(statusName) + '</h4>';
    h += '<table class="kv">';
    h += '<tr><th>Purpose</th><td>' + esc(statusPurpose(statusName)) + '</td></tr>';
    var into = entriesInto(model, statusName);
    if (into.length) h += '<tr><th>Entered from</th><td>' + esc(into.slice(0, 4).join(' · ')) + '</td></tr>';
    if (user.length) {
      h += '<tr><th>Main actions</th><td>' + esc(user.slice(0, 6).map(function (a) { return stripCode(a.name); }).join(' · ')) +
        (user.length > 6 ? ' <span class="more">(+' + (user.length - 6) + ' more — Appendix A)</span>' : '') + '</td></tr>';
    }
    if (auto.length) {
      h += '<tr><th>Automated</th><td>' + esc(auto.slice(0, 4).map(function (a) { return stripCode(a.name); }).join(' · ')) + '</td></tr>';
    }
    var outs = outcomesOf(model, statusName);
    if (outs.length) h += '<tr><th>Main outcomes</th><td>' + esc(outs.slice(0, 5).join(' · ')) + '</td></tr>';
    h += '<tr><th>Channels</th><td>' + esc(channels(model, statusName).join(' · ')) + '</td></tr>';
    if (devs.length) {
      h += '<tr><th class="dev">Your design</th><td class="dev">' +
        devs.slice(0, 3).map(function (d) { return esc(d.kind.toLowerCase() + ': ' + d.detail); }).join('<br>') + '</td></tr>';
    }
    h += '</table></div>';
    return h;
  }

  /* ---- the document ------------------------------------------------------ */
  function generate(model, opts) {
    opts = opts || {};
    var proj = opts.project || null;
    var vanilla = opts.vanilla || model;
    var customerName = proj ? proj.name : 'Standard product';
    var deviations = opts.deviations || [];
    var changes = (proj && proj.changeLog) || [];
    var fs = (proj && proj.findingsSummary) || {};
    var docStatus = opts.docStatus || (changes.length ? 'Implemented (in progress)' : 'Draft');

    var h = '';

    /* 1 · cover & document control */
    h += '<div class="cover">';
    h += '<div class="brand">Bellrock · Concerto</div>';
    h += '<h1>Solution Design</h1>';
    h += '<div class="cover-customer">' + esc(customerName) + '</div>';
    h += '<table class="kv control">';
    h += '<tr><th>Customer</th><td>' + esc(customerName) + '</td></tr>';
    if (proj) h += '<tr><th>Concerto instance</th><td>' + esc(proj.instanceUrl || '—') + '</td></tr>';
    h += '<tr><th>Document date</th><td>' + esc(new Date().toISOString().slice(0, 10)) + '</td></tr>';
    h += '<tr><th>Status</th><td>' + esc(docStatus) + '</td></tr>';
    h += '<tr><th>Vanilla baseline</th><td>' + esc(vanilla.meta.generatedAt.helpdesk) +
      (opts.ratified ? ' · ratified ' + esc(opts.ratified) : '') +
      ' · <code>hd:' + esc(vanilla.meta.sourceFingerprints.helpdesk) + '</code></td></tr>';
    if (opts.stamp) h += '<tr><th>Configuration as at</th><td>' + esc(opts.stamp) + '</td></tr>';
    h += '</table></div>';

    /* 2 · solution overview */
    var reactive = model.helpdesk.types.filter(function (t) { return t.name === 'Reactive'; })[0];
    var planned = model.helpdesk.types.filter(function (t) { return t.name === 'Planned'; })[0];
    var hasQuote = model.helpdesk.statuses.some(function (s) { return /Quote Requested/.test(s.name); });
    var hasBC = model.helpdesk.statuses.some(function (s) { return /Business Case/.test(s.name); });
    var supplierCount = (model.orders.supplierActions || []).length;

    h += '<h2>1 · Solution overview</h2>';
    h += '<p>Your Concerto system manages two kinds of work. <b>Reactive</b> jobs are faults and requests, raised through ' +
      'the reporter wizard or by the helpdesk, and worked through ' + (reactive ? reactive.statuses.length : 0) + ' workflow stages. ' +
      '<b>Planned</b> jobs originate from planned maintenance and follow their own shorter workflow. ' +
      'Work is delivered either by your <b>internal maintenance team</b> — who receive and progress jobs on the Orchestrate mobile app — ' +
      'or by <b>external contractors</b>, who receive an order and drive it from the supplier portal' +
      (supplierCount ? ' through ' + supplierCount + ' portal actions' : '') + '. ' +
      'Each portal step automatically updates the job, so the helpdesk always sees the contractor’s progress without re-keying.</p>';
    if (hasQuote || hasBC) {
      h += '<p>' +
        (hasQuote ? 'Where work needs pricing first, the <b>quote workflow</b> takes over: quotes are issued, received and approved, and raising the order returns the job to the contractor workflow automatically. ' : '') +
        (hasBC ? 'Where costs rise mid-job, a <b>cost uplift</b> goes to the Business Cases area for approval, and the job returns to the workflow automatically once decided.' : '') +
        '</p>';
    }

    /* 3 · workflow overview — diagrams */
    h += '<h2>2 · Workflow overview</h2>';
    if (window.StudioFlow) {
      ['reactive', 'planned', 'contractor', 'quote', 'business-case'].forEach(function (fid) {
        var out = window.StudioFlow.render(fid, model, { compact: true });
        if (!out.missing) h += '<div class="flow-embed">' + out.svg + '</div>';
      });
    }
    /* simple status table */
    h += '<table><thead><tr><th>Status</th><th>Purpose</th><th>Main actions</th><th>Main ways out</th></tr></thead><tbody>';
    model.helpdesk.statuses.forEach(function (s) {
      var user = actionsIn(model, s.name, false);
      var outs = outcomesOf(model, s.name);
      h += '<tr><td><b>' + esc(s.name) + '</b></td><td>' + esc(statusPurpose(s.name)) + '</td><td>' +
        esc(user.slice(0, 3).map(function (a) { return stripCode(a.name); }).join(' · ') || '—') + '</td><td>' +
        esc(outs.slice(0, 3).join(' · ') || '—') + '</td></tr>';
    });
    h += '</tbody></table>';

    /* 4 · reactive design */
    if (reactive) {
      h += '<h2>3 · Reactive Helpdesk design</h2>';
      reactive.statuses.forEach(function (name) { h += statusBlock(model, name, deviations); });
    }

    /* 5 · planned design */
    if (planned && planned.statuses.length) {
      h += '<h2>4 · Planned Helpdesk design</h2>';
      var plannedDetailed = planned.statuses.some(function (name) {
        return actionsIn(model, name, false).length;
      });
      if (plannedDetailed) planned.statuses.forEach(function (name) { h += statusBlock(model, name, deviations); });
      else h += '<p>The Planned workflow stages are listed above; their detailed configuration is carried in Appendix B as it is captured.</p>';
    }

    /* 6 · orders & contractor */
    h += '<h2>5 · Orders &amp; contractor design</h2>';
    var sas = model.orders.supplierActions || [];
    if (sas.length) {
      h += '<p>Contractors work their orders from the supplier portal. The actions below are what your contractors see and do; each one updates the job automatically.</p>';
      h += '<table><thead><tr><th>Portal action</th><th>Available when the order is</th><th>Moves the order to</th><th>On the portal?</th></tr></thead><tbody>';
      sas.forEach(function (sa) {
        var unread = sa.detailObserved === false;
        h += '<tr><td><b>' + esc(unread ? sa.canonicalKey : (sa.name || sa.canonicalKey)) + '</b></td><td>' +
          esc(unread ? 'detail to be confirmed' : ((sa.availableIn || []).join(' · ') || '—')) + '</td><td>' +
          esc(unread ? '—' : (sa.resultingOrderStatus || '—')) + '</td><td>' +
          (unread ? '—' : (sa.portalVisible ? 'Yes' : 'No')) + '</td></tr>';
      });
      h += '</tbody></table>';
    } else {
      h += '<p>The Orders configuration for this instance is carried in Appendix B as it is captured.</p>';
    }

    /* 7 · SLA */
    h += '<h2>6 · SLA &amp; response categories</h2>';
    var rc = model.orders.responseCategories;
    if (rc && rc.categories) {
      h += '<table><thead><tr><th>Category</th><th>Respond within</th><th>Complete within</th><th>Default</th></tr></thead><tbody>';
      rc.categories.forEach(function (c) {
        h += '<tr><td><b>' + esc(c.name) + '</b></td><td>' + esc(c.response) + '</td><td>' + esc(c.complete) + '</td><td>' + (c.isDefault ? 'Yes' : '') + '</td></tr>';
      });
      h += '</tbody></table>';
      if (rc.defaultSet === false) {
        h += '<p class="decision">No default category is currently set, so jobs raised through the reporter wizard arrive without an SLA until one is chosen — see <b>Customer decisions</b> below.</p>';
      }
    } else {
      h += '<p>Response categories follow the standard product configuration (P1–P4, Planned, By agreement).</p>';
    }

    /* 8 · mobile */
    h += '<h2>7 · Mobile (Orchestrate)</h2>';
    var mobileStatuses = model.helpdesk.statuses.filter(function (s) {
      return actionsIn(model, s.name, false).some(function (a) { return a.mobileAvailable; });
    }).map(function (s) { return s.name; });
    h += '<p>Your internal maintenance team works from the Orchestrate mobile app. Jobs appear on the app at: <b>' +
      esc(mobileStatuses.join(' · ') || 'the operational statuses') + '</b>. Operatives accept, start, hold and complete work from their device, ' +
      'and each mobile action updates the job in real time.</p>';

    /* 9 · customer decisions */
    h += '<h2>8 · Customer decisions &amp; assumptions</h2>';
    var decisions = fs.customerDecisions || [];
    if (decisions.length) {
      h += '<ul>';
      decisions.forEach(function (d) { h += '<li class="decision">' + esc(String(d).replace(/DECISION-\d+\s+—\s+/, '')) + '</li>'; });
      h += '</ul>';
    } else {
      h += '<p>No design decisions are currently open.</p>';
    }

    /* 10 · deviation from vanilla — first class */
    h += '<h2>9 · Deviations from the standard product</h2>';
    h += '<p>Your system is the ratified standard product plus the explicit changes below. Everything not listed here behaves as standard.</p>';
    if (changes.length) {
      h += '<table><thead><tr><th>Area</th><th>Standard behaviour</th><th>Your design</th><th>Reason</th><th>Status</th></tr></thead><tbody>';
      changes.forEach(function (c) {
        h += '<tr><td><b>' + esc(c.object || '') + '</b></td><td>' +
          esc(c.field ? c.field + ' = ' + JSON.stringify(c.before) : 'as supplied') + '</td><td>' +
          esc(c.field ? c.field + ' = ' + JSON.stringify(c.after) : (c.fields || '')) + '</td><td>' +
          esc(c.why || 'Correction required for the workflow to operate') + '</td><td>' +
          (/PASS/.test(c.outcome || '') ? '<b>Implemented &amp; verified</b>' : esc(c.outcome || '')) + '</td></tr>';
      });
      h += '</tbody></table>';
    } else {
      h += '<p>No deviations — this system runs the standard product configuration.</p>';
    }
    if (deviations.length && proj) {
      h += '<details class="appendix-link"><summary>Every configuration difference from the Vanilla baseline (' + deviations.length + ')</summary><ul>';
      deviations.slice(0, 250).forEach(function (r) {
        h += '<li>' + esc(r.kind.toLowerCase() + ' · ' + r.object + ' · ' + r.detail) + '</li>';
      });
      h += '</ul></details>';
    }

    /* 11 · implementation status */
    h += '<h2>10 · Implementation &amp; verification status</h2>';
    h += '<table><thead><tr><th>Item</th><th>Status</th></tr></thead><tbody>';
    changes.forEach(function (c) {
      h += '<tr><td>' + esc((c.id ? c.id + ' — ' : '') + (c.object || '')) + '</td><td><b>' +
        (/PASS/.test(c.outcome || '') ? 'VERIFIED' : 'BUILT') + '</b></td></tr>';
    });
    decisions.forEach(function (d) {
      h += '<tr><td>' + esc(String(d).split('.')[0]) + '</td><td><b>DECISION REQUIRED</b></td></tr>';
    });
    if (!changes.length && !decisions.length) h += '<tr><td>Standard product configuration</td><td><b>STANDARD</b></td></tr>';
    h += '</tbody></table>';

    /* appendices */
    h += '<h2 class="appendix">Appendix A · Full status / action matrix</h2>';
    h += '<table class="dense"><thead><tr><th>Action</th><th>Available in</th><th>Outcome</th><th>Mobile</th></tr></thead><tbody>';
    model.helpdesk.actions.forEach(function (a) {
      var results = model.helpdesk.results.filter(function (r) { return r.action === a.name; });
      h += '<tr><td>' + esc(a.name) + '</td><td>' + esc((a.availableIn || []).join(' · ') || (a.machineFired ? 'system-fired' : '—')) + '</td><td>' +
        esc(results.map(function (r) { return (r.kind === 'userSelects' ? 'user selects ' : '') + r.toStatus; }).join(' · ') || '—') + '</td><td>' +
        (a.mobileAvailable ? '✔' : '') + '</td></tr>';
    });
    h += '</tbody></table>';

    h += '<h2 class="appendix">Appendix B · Detailed configuration</h2>';
    h += '<p>The complete technical configuration — every field, flag, tag and trigger — is generated as the companion ' +
      '<b>Technical Design</b> document, which the implementation team maintains from the same source as this Solution Design.</p>';

    h += '<h2 class="appendix">Appendix C · Evidence &amp; provenance (implementation team)</h2>';
    var rep = opts.ingestReport;
    if (rep) {
      h += '<ul class="dense-list">';
      h += '<li>Acquired: ' + esc(rep.crawlMethod || 'see project evidence') + '</li>';
      (rep.notes || []).forEach(function (n) { h += '<li>' + esc(n) + '</li>'; });
      (rep.unresolved || []).forEach(function (u) { h += '<li>Unresolved: ' + esc(u.item) + ' — ' + esc(u.reason) + '</li>'; });
      h += '</ul>';
    }
    h += '<p class="dense-list">Model fingerprints: <code>hd:' + esc(model.meta.sourceFingerprints ? model.meta.sourceFingerprints.helpdesk : '—') +
      '</code> · full evidence register and change receipts: project Evidence in Concerto Studio.</p>';

    return wrapDocument(h, customerName + ' — Solution Design');
  }

  function wrapDocument(body, title) {
    return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>' +
      '@page { size: A4; margin: 16mm; }' +
      'body { font-family: "Segoe UI", system-ui, sans-serif; color: #1d2b27; margin: 0 auto; max-width: 880px; padding: 28px; line-height: 1.55; font-size: 13.5px; }' +
      'h1 { font-size: 34px; margin: 6px 0 2px; color: #0e3e33; }' +
      'h2 { font-size: 19px; color: #0e3e33; border-bottom: 2px solid #1e6b4f; padding-bottom: 4px; margin-top: 34px; page-break-after: avoid; }' +
      'h2.appendix { border-bottom-style: dashed; page-break-before: always; }' +
      'h4 { margin: 18px 0 6px; font-size: 14.5px; color: #0e3e33; }' +
      '.brand { font-weight: 700; letter-spacing: 2px; color: #1e6b4f; font-size: 12px; }' +
      '.cover { border-bottom: 3px solid #0e3e33; padding-bottom: 18px; margin-bottom: 8px; }' +
      '.cover-customer { font-size: 20px; color: #4a6a60; margin-bottom: 14px; }' +
      'table { border-collapse: collapse; width: 100%; margin: 10px 0 18px; font-size: 12.5px; page-break-inside: avoid; }' +
      'th, td { border: 1px solid #d8e2de; padding: 6px 9px; text-align: left; vertical-align: top; }' +
      'thead th { background: #eef5f1; color: #0e3e33; }' +
      'table.kv th { width: 150px; background: #f6faf8; font-weight: 600; }' +
      'table.kv, .status-block table { page-break-inside: avoid; }' +
      '.status-block { margin-bottom: 6px; }' +
      'td.dev, th.dev { background: #fbf7ea; }' +
      '.decision { background: #fbf7ea; padding: 8px 12px; border-left: 3px solid #8a6d1f; }' +
      'ul li.decision { list-style: none; margin: 6px 0; }' +
      '.more { color: #8aa39a; font-size: 11px; }' +
      '.flow-embed { margin: 14px 0; page-break-inside: avoid; }' +
      '.flow-embed svg { width: 100%; height: auto; border: 1px solid #e2e9e6; border-radius: 8px; }' +
      'table.dense th, table.dense td { font-size: 11px; padding: 4px 7px; }' +
      '.dense-list { font-size: 11.5px; color: #4a6a60; }' +
      'details.appendix-link summary { cursor: pointer; color: #4a6a60; font-size: 12.5px; }' +
      'code { background: #f2f5f4; padding: 1px 4px; border-radius: 3px; font-size: 11px; }' +
      '@media print { body { padding: 0; } details.appendix-link { display: none; } }' +
      '</style></head><body>' + body + '</body></html>';
  }

  var api = { generate: generate, PURPOSE: PURPOSE };
  if (typeof window !== 'undefined') window.StudioSolDesignCustomer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
