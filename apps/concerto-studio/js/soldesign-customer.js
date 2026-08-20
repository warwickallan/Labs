/* soldesign-customer.js — the CUSTOMER-FACING Solution Design generator.
 *
 * A Solution Design tells a customer exactly what has been delivered, in
 * their language, so they can sign off against it. It reads the EFFECTIVE
 * WORKFLOW (js/effective.js), never the raw configuration: type-scoped
 * actions and outcomes, the two-gate mobile model, channels separated from
 * delivery routes, and provenance-aware phrasing — behaviour observed in
 * this instance is stated; standard-product behaviour not verified here is
 * introduced as such, never quietly promoted.
 *
 * LANGUAGE RULES (hard, test-enforced):
 *   - No internal codes in the body (E-*, X-*, VI-*, STRUCTURAL, register
 *     ids). Those live in the evidence appendix.
 *   - No internal software concerns. If detail was not captured, the
 *     document says what is known instead ("shown as standard, to be
 *     verified") — it never renders another instance's data as this one's.
 *   - Engine-driven statuses (Quote, Business Case) are working features.
 *   - The Vanilla baseline is identified by date/fingerprint in document
 *     control, not treated as one eternal reference.
 */
(function () {
  'use strict';

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function stripCode(name) { return String(name).replace(/^[A-Z]+\d+[a-z]?\.\s*/, ''); }
  function E() { return window.StudioEffective; }

  var PURPOSE = {
    'With Helpdesk': 'A new or returned job waiting for the helpdesk to triage and route it.',
    'With Maintenance Team - R': 'The job has been allocated to an internal maintenance resource.',
    'Awaiting Order Approval - R': 'The order value is above the approval level; the job waits for approval.',
    'With Contractor - R': 'The job is with an external contractor, driven by their order.',
    'Quote Requested - R': 'A quote has been requested; the quote workflow manages this stage.',
    'Business Case - R': 'A cost uplift is under review in the Business Cases area.',
    'Work Complete - R': 'The work is done; the job awaits closure checks.',
    'Closed': 'The job is finished and closed for reporting.',
    'Cancelled': 'The job has been cancelled.',
    'New PPM': 'A planned job created from the planned-maintenance side.',
    'With Maintenance Team': 'The planned job is with an internal maintenance resource.',
    'With Contractor': 'The planned job is with an external contractor.',
    'PPM Complete': 'The planned work is done; the job awaits closure.'
  };
  function statusPurpose(name) { return PURPOSE[name] || 'A configured stage of this workflow.'; }

  /* One status, in the customer's terms — everything type-scoped. */
  function statusBlock(model, statusName, typeName, diffRows) {
    var user = E().actionsIn(model, statusName, typeName, false);
    var auto = E().actionsIn(model, statusName, typeName, true);
    var devs = (diffRows || []).filter(function (r) { return r.detail.indexOf(statusName) !== -1; });
    var h = '<div class="status-block">';
    h += '<h4>' + esc(statusName) + '</h4>';
    h += '<table class="kv">';
    h += '<tr><th>Purpose</th><td>' + esc(statusPurpose(statusName)) + '</td></tr>';
    var into = E().entriesInto(model, statusName, typeName).map(stripCode);
    if (into.length) h += '<tr><th>Entered from</th><td>' + esc(into.slice(0, 4).join(' · ')) + '</td></tr>';
    if (user.length) {
      h += '<tr><th>Main actions</th><td>' + esc(user.slice(0, 6).map(function (a) { return stripCode(a.name); }).join(' · ')) +
        (user.length > 6 ? ' <span class="more">(+' + (user.length - 6) + ' more — Appendix A)</span>' : '') + '</td></tr>';
    }
    if (auto.length) {
      h += '<tr><th>Automated</th><td>' + esc(auto.slice(0, 4).map(function (a) { return stripCode(a.name); }).join(' · ')) + '</td></tr>';
    }
    var outs = E().outcomesOf(model, statusName, typeName);
    if (outs.length) h += '<tr><th>Main outcomes</th><td>' + esc(outs.slice(0, 5).join(' · ')) + '</td></tr>';
    h += '<tr><th>Available through</th><td>' + esc(E().channels(model, statusName, typeName).join(' · ')) + '</td></tr>';
    var routes = E().deliveryRoutes(model, statusName, typeName);
    if (routes.length) h += '<tr><th>Delivery route</th><td>' + esc(routes.join(' · ')) + '</td></tr>';
    if (devs.length) {
      h += '<tr><th class="dev">Your design</th><td class="dev">' +
        devs.slice(0, 3).map(function (d) { return esc(d.kind.toLowerCase() + ': ' + d.detail); }).join('<br>') + '</td></tr>';
    }
    h += '</table></div>';
    return h;
  }

  function statusTable(model, typeName, statuses) {
    var h = '<table><thead><tr><th>Status</th><th>Purpose</th><th>Main actions</th><th>Main ways out</th></tr></thead><tbody>';
    statuses.forEach(function (name) {
      var user = E().actionsIn(model, name, typeName, false);
      var outs = E().outcomesOf(model, name, typeName);
      h += '<tr><td><b>' + esc(name) + '</b></td><td>' + esc(statusPurpose(name)) + '</td><td>' +
        esc(user.slice(0, 3).map(function (a) { return stripCode(a.name); }).join(' · ') || '—') + '</td><td>' +
        esc(outs.slice(0, 3).join(' · ') || '—') + '</td></tr>';
    });
    return h + '</tbody></table>';
  }

  function generate(model, opts) {
    if (window.StudioSchema && window.StudioSchema.completeModel) model = window.StudioSchema.completeModel(model);
    opts = opts || {};
    var proj = opts.project || null;
    var vanilla = opts.vanilla || model;
    var customerName = proj ? proj.name : 'Standard product';
    var deviations = opts.deviations || [];
    var changes = (proj && proj.changeLog) || [];
    var fs = (proj && proj.findingsSummary) || {};
    var rep = opts.ingestReport || null;
    var docStatus = opts.docStatus || (changes.length ? 'Implemented (in progress)' : 'Draft');

    var h = '';

    /* cover & document control */
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

    /* 1 · solution overview */
    var reactiveView = E().typeView(model, vanilla, 'Reactive');
    var plannedView = E().typeView(model, vanilla, 'Planned');
    var hasQuote = model.helpdesk.statuses.some(function (s) { return /Quote Requested/.test(s.name); });
    var hasBC = model.helpdesk.statuses.some(function (s) { return /Business Case/.test(s.name); });
    var supplierCount = (model.orders.supplierActions || []).length;
    var quoteProv = E().engineProvenance(proj, 'quote');
    var bcProv = E().engineProvenance(proj, 'business-case');

    h += '<h2>1 · Solution overview</h2>';
    h += '<p>Your Concerto system manages two kinds of work. <b>Reactive</b> jobs are faults and requests, raised through ' +
      'the reporter wizard or by the helpdesk, and worked through ' + reactiveView.statuses.length + ' workflow stages. ' +
      '<b>Planned</b> jobs originate from planned maintenance and follow their own shorter workflow. ' +
      'Work is delivered either by your <b>internal maintenance team</b> — who receive and progress their jobs on the Orchestrate mobile app — ' +
      'or by <b>external contractors</b>, who receive an order and drive it from the supplier portal' +
      (supplierCount ? ' through ' + supplierCount + ' portal actions' : '') + '. ' +
      'Each portal step automatically updates the job, so the helpdesk always sees the contractor’s progress without re-keying.</p>';
    if (hasQuote || hasBC) {
      h += '<p>' +
        (hasQuote ? 'Where work needs pricing first, the <b>quote workflow</b> takes over: quotes are issued, received and approved, and raising the order ' +
          (quoteProv === 'OBSERVED' ? 'returns the job to the contractor workflow automatically — verified in this instance. '
            : 'returns the job to the contractor workflow (standard product behaviour). ') : '') +
        (hasBC ? 'Where costs rise mid-job, a <b>cost uplift</b> goes to the Business Cases area for approval' +
          (bcProv === 'OBSERVED' ? ', and the decision returns the job to the workflow automatically — verified in this instance.'
            : '; in the standard product, the decision returns the job to the workflow automatically.') : '') +
        '</p>';
    }

    /* 2 · workflow at a glance — the tables lead, the diagrams follow */
    h += '<h2>2 · Workflow at a glance</h2>';
    h += '<h4>Reactive</h4>' + statusTable(reactiveView.model, 'Reactive', reactiveView.statuses);
    if (plannedView.state !== 'ABSENT') {
      h += '<h4>Planned</h4>';
      if (plannedView.note) h += '<p class="inherit">' + esc(plannedView.note) + '</p>';
      if (plannedView.state !== 'UNKNOWN') h += statusTable(plannedView.model, 'Planned', plannedView.statuses);
      else h += '<p>Stages: ' + esc(plannedView.statuses.join(' · ')) + '</p>';
    }
    if (window.StudioFlow) {
      ['reactive', 'planned', 'contractor', 'quote', 'business-case'].forEach(function (fid) {
        var src = (fid === 'planned' && plannedView.state === 'INHERITED-STANDARD') ? plannedView.model : model;
        var out = window.StudioFlow.render(fid, src, { compact: true });
        if (!out.missing) h += '<div class="flow-embed">' + out.svg + '</div>';
      });
    }

    /* 3 · reactive design */
    h += '<h2>3 · Reactive Helpdesk design</h2>';
    reactiveView.statuses.forEach(function (name) {
      h += statusBlock(reactiveView.model, name, 'Reactive', deviations);
    });

    /* 4 · planned design */
    if (plannedView.state !== 'ABSENT') {
      h += '<h2>4 · Planned Helpdesk design</h2>';
      if (plannedView.note) h += '<p class="inherit">' + esc(plannedView.note) + '</p>';
      if (plannedView.state === 'UNKNOWN') {
        h += '<p>Stages: ' + esc(plannedView.statuses.join(' · ')) + '. The detailed design will be added once captured.</p>';
      } else {
        plannedView.statuses.forEach(function (name) {
          h += statusBlock(plannedView.model, name, 'Planned', plannedView.state === 'OBSERVED' ? deviations : []);
        });
      }
    }

    /* 5 · orders & contractor */
    h += '<h2>5 · Orders &amp; contractor design</h2>';
    var sas = model.orders.supplierActions || [];
    if (sas.length) {
      h += '<p>The following supplier actions control the contractor/order lifecycle. The <b>Portal</b> column identifies which of them are exposed to contractors through the supplier portal; the others are driven from the contractor’s app or by Concerto itself.</p>';
      h += '<table><thead><tr><th>Supplier action</th><th>Available when the order is</th><th>Moves the order to</th><th>Portal</th></tr></thead><tbody>';
      sas.forEach(function (sa) {
        var unread = sa.detailObserved === false;
        h += '<tr><td><b>' + esc(unread ? sa.canonicalKey : (sa.name || sa.canonicalKey)) + '</b></td><td>' +
          esc(unread ? 'to be confirmed' : ((sa.availableIn || []).join(' · ') || '—')) + '</td><td>' +
          esc(unread ? '—' : (sa.resultingOrderStatus || '—')) + '</td><td>' +
          (unread ? '—' : (sa.portalVisible ? 'Yes' : 'No')) + '</td></tr>';
      });
      h += '</tbody></table>';
    } else {
      h += '<p>The Orders configuration for this instance will be described here once captured.</p>';
    }

    /* 6 · SLA */
    h += '<h2>6 · SLA &amp; response categories</h2>';
    /* The instance's own categories, broken out per service stream. The
       standard-product sentence is a LAST resort and says so honestly. */
    var hrc = (model.helpdesk && model.helpdesk.responseCategories) || [];
    if (hrc.length) {
      var streams = {};
      hrc.forEach(function (c) {
        var m = /\(([^)]+)\)/.exec(c.name);
        var stream = m ? m[1] : (c.supplier || 'General');
        (streams[stream] = streams[stream] || []).push(c);
      });
      var fmt = function (c) {
        var r = c.initialResponseHours ? c.initialResponseHours + ' hours' : (c.initialResponseDays ? c.initialResponseDays + ' days' : '—');
        var pr = c.permanentRepairHours ? c.permanentRepairHours + ' hours' : (c.permanentRepairDays ? c.permanentRepairDays + ' days' : '—');
        return '<tr><td><b>' + esc(c.name) + '</b></td><td>' + r + '</td><td>' + pr + '</td><td>' + esc(c.supplier || '') + '</td><td>' + esc(c.orderPriority || '') + '</td></tr>';
      };
      Object.keys(streams).forEach(function (st) {
        h += '<h3>' + esc(st) + '</h3>';
        h += '<table><thead><tr><th>Response category</th><th>Initial response</th><th>Permanent repair</th><th>Delivered by</th><th>Order priority</th></tr></thead><tbody>';
        streams[st].forEach(function (c) { h += fmt(c); });
        h += '</tbody></table>';
      });
      var anom = hrc.filter(function (c) { return c.anomaly; });
      anom.forEach(function (c) {
        h += '<p class="decision">' + esc(c.name) + ': ' + esc(c.anomaly) + ' — raised for correction.</p>';
      });
    } else if (false) {
      h += '<table><thead><tr><th>Category</th><th>Respond within</th><th>Complete within</th><th>Default</th></tr></thead><tbody>';
      rc.categories.forEach(function (c) {
        h += '<tr><td><b>' + esc(c.name) + '</b></td><td>' + esc(c.response) + '</td><td>' + esc(c.complete) + '</td><td>' + (c.isDefault ? 'Yes' : '') + '</td></tr>';
      });
      h += '</tbody></table>';
      if (rc.defaultSet === false) {
        h += '<p class="decision">No default category is currently set, so jobs raised through the reporter wizard arrive without an SLA until one is chosen — see <b>Customer decisions</b> below.</p>';
      }
    } else {
      h += '<p>Response categories were not captured for this instance — this section will state them once they are read. Nothing here is assumed from the standard product.</p>';
    }

    /* 7 · mobile — the two-gate model, honestly */
    h += '<h2>7 · Mobile (Orchestrate)</h2>';
    var mob = E().mobileStatuses(model);
    var inherited = mob.length && mob.every(function (m) { return m.provenance === 'INHERITED-STANDARD'; });
    h += '<p>Your internal maintenance team works from the Orchestrate mobile app. Jobs appear on the app while they are at: <b>' +
      esc(mob.map(function (m) { return m.name; }).join(' · ') || '—') + '</b>' +
      (inherited ? ' (standard product behaviour)' : '') +
      '. There, operatives accept, start, hold and complete their work, and each mobile action updates the job in real time. ' +
      'Jobs in other statuses are visible on the web but do not appear on the app.</p>';
    /* every mobile action, grouped as the app groups them */
    var mobActs = (model.helpdesk.actions || []).filter(function (a) {
      return a.mobileAvailable || /Mobile/.test(a.buttonGroup || '');
    });
    if (mobActs.length) {
      h += '<h3>Mobile actions</h3>';
      h += '<table><thead><tr><th>Action</th><th>Group</th><th>Job types</th><th>Outcome</th></tr></thead><tbody>';
      mobActs.forEach(function (a) {
        h += '<tr><td><b>' + esc(a.name) + '</b></td><td>' + esc(a.buttonGroup || '—') + '</td><td>' +
          esc(a.ppmScope || a.applicability || 'All jobs') + '</td><td>' +
          esc(a.resultingStatus || (a.pauseStatus ? (a.pauseStatus === 'Paused' ? 'Pauses the job' : 'Restarts the job') : 'No status change')) + '</td></tr>';
      });
      h += '</tbody></table>';
    }

    /* 8 · customer decisions — a working table, not a footnote */
    h += '<h2>8 · Customer decisions &amp; assumptions</h2>';
    var decisions = fs.customerDecisions || [];
    if (decisions.length) {
      h += '<table><thead><tr><th>Decision</th><th>Current position</th><th>Owner</th><th>Status</th></tr></thead><tbody>';
      decisions.forEach(function (d) {
        if (typeof d === 'object') {
          h += '<tr><td><b>' + esc(d.decision) + '</b></td><td>' + esc(d.assumption || '—') + '</td><td>' + esc(d.owner || 'Customer') + '</td><td><b>' + esc(d.status || 'OPEN') + '</b></td></tr>';
        } else {
          var text = String(d).replace(/DECISION-\d+\s+—\s+/, '');
          var dot = text.indexOf('.');
          var title = dot > 10 ? text.slice(0, dot) : text;
          var rest = dot > 10 ? text.slice(dot + 1).trim() : '';
          h += '<tr><td><b>' + esc(title) + '</b></td><td>' + esc(rest || '—') + '</td><td>Customer</td><td><b>OPEN</b></td></tr>';
        }
      });
      h += '</tbody></table>';
    } else {
      h += '<p>No design decisions are currently open.</p>';
    }

    /* 9 · deviations — including what is KNOWN to differ from the capture */
    h += '<h2>9 · Deviations from the standard product</h2>';
    h += '<p>Your system is the ratified standard product plus the explicit changes below. Everything not listed here behaves as standard.</p>';
    var anyDeviation = false;
    if (changes.length) {
      anyDeviation = true;
      h += '<table><thead><tr><th>Area</th><th>Standard behaviour</th><th>Your design</th><th>Reason</th><th>Status</th></tr></thead><tbody>';
      changes.forEach(function (c) {
        h += '<tr><td><b>' + esc(c.object || '') + '</b></td><td>' +
          esc(c.field ? c.field + ' = ' + JSON.stringify(c.before) : 'as supplied') + '</td><td>' +
          esc(c.field ? c.field + ' = ' + JSON.stringify(c.after) : (c.fields || '')) + '</td><td>' +
          esc(c.why || 'Correction required for the workflow to operate') + '</td><td>' +
          (/PASS/.test(c.outcome || '') ? '<b>Implemented &amp; verified</b>' : esc(c.outcome || '')) + '</td></tr>';
      });
      h += '</tbody></table>';
    }
    /* known deltas since capture (e.g. a status added to the live system
     * after the design was captured) belong HERE, not buried in evidence —
     * a "no deviations" claim beside a known one is a contradiction */
    if (rep && rep.knownDeltas && rep.knownDeltas.length) {
      anyDeviation = true;
      h += '<h4>Known differences between this design and the live system</h4>';
      h += '<table><thead><tr><th>Kind</th><th>What</th><th>Position</th></tr></thead><tbody>';
      rep.knownDeltas.forEach(function (d) {
        var kind = d.kind === 'EXPERIMENT-RESIDUE' ? 'Operational / test residue' : 'Known live deviation';
        h += '<tr><td>' + esc(kind) + '</td><td><b>' + esc(d.object) + '</b></td><td>' + esc(d.detail) + '</td></tr>';
      });
      h += '</tbody></table>';
      h += '<p class="inherit">This document describes the captured design; anything changed in the live system since capture, beyond the items above, is not yet verified.</p>';
    }
    if (!anyDeviation) {
      h += '<p>No deviations — this system runs the standard product configuration as captured.</p>';
    }
    if (deviations.length && proj) {
      h += '<details class="appendix-link"><summary>Every configuration difference from the Vanilla baseline (' + deviations.length + ')</summary><ul>';
      deviations.slice(0, 250).forEach(function (r) {
        h += '<li>' + esc(r.kind.toLowerCase() + ' · ' + r.object + ' · ' + r.detail) + '</li>';
      });
      h += '</ul></details>';
    }

    /* 10 · implementation status */
    h += '<h2>10 · Implementation &amp; verification status</h2>';
    h += '<table><thead><tr><th>Item</th><th>Status</th></tr></thead><tbody>';
    changes.forEach(function (c) {
      h += '<tr><td>' + esc((c.id ? c.id + ' — ' : '') + (c.object || '')) + '</td><td><b>' +
        (/PASS/.test(c.outcome || '') ? 'VERIFIED' : 'BUILT') + '</b></td></tr>';
    });
    decisions.forEach(function (d) {
      var t = typeof d === 'object' ? d.decision : String(d).split('.')[0];
      h += '<tr><td>' + esc(t) + '</td><td><b>DECISION REQUIRED</b></td></tr>';
    });
    if (plannedView.state === 'INHERITED-STANDARD') {
      h += '<tr><td>Planned workflow detail (shown as standard)</td><td><b>TO VERIFY</b></td></tr>';
    }
    if (!changes.length && !decisions.length && plannedView.state !== 'INHERITED-STANDARD') {
      h += '<tr><td>Standard product configuration</td><td><b>STANDARD</b></td></tr>';
    }
    h += '</tbody></table>';

    /* appendices */
    h += '<h2 class="appendix">Appendix A · Workflow matrix (which action is available where)</h2>';
    h += '<p class="dense-list">Purpose: one row per action — where users can take it and what it does. Appendix B lists the configuration records themselves.</p>';
    h += '<table class="dense"><thead><tr><th>Action</th><th>Available in</th><th>Outcome</th><th>Mobile-capable</th></tr></thead><tbody>';
    model.helpdesk.actions.forEach(function (a) {
      var results = model.helpdesk.results.filter(function (r) { return r.action === a.name; });
      h += '<tr><td>' + esc(a.name) + '</td><td>' + esc((a.availableIn || []).join(' · ') || (a.machineFired ? 'system-fired' : '—')) + '</td><td>' +
        esc(results.map(function (r) { return (r.kind === 'userSelects' ? 'user selects ' : '') + r.toStatus; }).join(' · ') || '—') + '</td><td>' +
        (a.mobileAvailable ? '✔' : '') + '</td></tr>';
    });
    h += '</tbody></table>';
    h += '<p class="dense-list">“Mobile-capable” is the action’s own capability; jobs only appear on the app at the statuses listed in section 7.</p>';

    h += '<h2 class="appendix">Appendix B · Configuration schedule (what has been delivered)</h2>';
    h += '<p class="dense-list">Purpose: the delivered configuration records, for sign-off. This document is self-contained.</p>';
    h += '<h3>Job statuses</h3><table class="dense"><thead><tr><th>Status</th><th>Applies to</th></tr></thead><tbody>';
    (model.helpdesk.statuses || []).forEach(function (st) {
      h += '<tr><td><b>' + esc(st.name) + '</b></td><td>' + esc((st.types || []).join(', ')) + '</td></tr>';
    });
    h += '</tbody></table>';
    h += '<h3>Actions</h3><table class="dense"><thead><tr><th>Action</th><th>Group</th><th>Job types</th><th>Sets status</th><th>Notifications</th></tr></thead><tbody>';
    (model.helpdesk.actions || []).forEach(function (a) {
      var mails = (a.flags || []).filter(function (f) { return /email/i.test(f); })
        .map(function (f) { return f === 'emailOriginator' ? 'originator' : f === 'emailSupplier' ? 'supplier' : 'email'; });
      h += '<tr><td><b>' + esc(a.name) + '</b></td><td>' + esc(a.buttonGroup || 'Not allocated') + '</td><td>' +
        esc(a.ppmScope || 'All jobs') + '</td><td>' + esc(a.resultingStatus || '—') + '</td><td>' + esc(mails.join(', ')) + '</td></tr>';
    });
    h += '</tbody></table>';
    if ((model.helpdesk.tags || []).length) {
      h += '<h3>Job tags</h3><p class="dense-list">Tags mark a job’s supplier/order state at a glance and are applied automatically by the workflow.</p>';
      h += '<table class="dense"><thead><tr><th>Tag</th><th>Family</th></tr></thead><tbody>';
      model.helpdesk.tags.forEach(function (t) {
        h += '<tr><td><b>' + esc(t.name) + '</b></td><td>' + esc(t.family || '') + '</td></tr>';
      });
      h += '</tbody></table>';
    }

    h += '<h2 class="appendix">Appendix C · Evidence &amp; provenance (implementation team)</h2>';
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
      '.inherit { background: #eff4f6; padding: 8px 12px; border-left: 3px solid #3d5a66; font-size: 12.5px; }' +
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
