/* soldesign.js — the System Solution Design generator. Consumes the
 * canonical model (never screen prose): every table below is projected
 * from the loaded model object; the few facts the machine models do not
 * yet carry (response-category records, classification records) are
 * quoted from the repository registers and explicitly marked as such.
 *
 * Two editions from one generator:
 *   VANILLA  — the baseline system design
 *   CUSTOMER — the design fork, with a computed Deviation Schedule
 * Output: a complete standalone print-quality HTML document (string).
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var CSS = [
    '@page { margin: 22mm 18mm; }',
    'body { font: 11pt/1.55 "Segoe UI", system-ui, sans-serif; color: #1a2620; max-width: 860px; margin: 0 auto; padding: 32px 24px; }',
    'h1 { font-size: 24pt; margin: 0 0 4px; letter-spacing: -0.3px; }',
    'h2 { font-size: 15pt; margin: 34px 0 10px; padding-bottom: 5px; border-bottom: 2px solid #0f766e; page-break-after: avoid; }',
    'h3 { font-size: 12pt; margin: 22px 0 6px; page-break-after: avoid; }',
    '.subtitle { color: #5c6b60; font-size: 12pt; margin: 0 0 24px; }',
    'table { border-collapse: collapse; width: 100%; margin: 8px 0 16px; font-size: 9.5pt; page-break-inside: auto; }',
    'th, td { border: 1px solid #cfd8cf; padding: 5px 8px; text-align: left; vertical-align: top; }',
    'th { background: #eef3ee; font-weight: 600; }',
    'tr { page-break-inside: avoid; }',
    '.meta { font-size: 9pt; color: #5c6b60; border: 1px solid #dde3dd; border-radius: 6px; padding: 10px 14px; margin: 18px 0; }',
    '.note { background: #fdf6e3; border-left: 3px solid #b45309; padding: 8px 12px; font-size: 9.5pt; margin: 10px 0; }',
    '.register { background: #eef3ee; border-left: 3px solid #0f766e; padding: 8px 12px; font-size: 9.5pt; margin: 10px 0; }',
    '.grade { font-size: 8pt; color: #5c6b60; border: 1px solid #cfd8cf; border-radius: 8px; padding: 0 6px; white-space: nowrap; }',
    '.bad { color: #b42318; font-weight: 600; }',
    '.designed { color: #0f766e; font-weight: 600; }',
    'code { font-family: Consolas, monospace; font-size: 9pt; background: #f0f3f0; padding: 0 3px; }',
    'ul { margin: 6px 0; } li { margin: 3px 0; }',
    '.pagebreak { page-break-before: always; }'
  ].join('\n');

  function resultsText(model, actionName, type) {
    var rs = model.helpdesk.results.filter(function (r) { return r.action === actionName && (!type || r.type === type); });
    if (!rs.length) return 'No status change';
    return rs.map(function (r) {
      return (r.kind === 'userSelects' ? 'User selects — typically ' : 'Moves the job to ') + r.toStatus;
    }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join('; ');
  }

  function actionEffects(a) {
    var bits = [];
    if (a.addsTags.length) bits.push('adds tag ' + a.addsTags.map(function (t) { return '"' + t + '"'; }).join(', '));
    if (a.removesTags.length) bits.push('removes tag ' + a.removesTags.map(function (t) { return '"' + t + '"'; }).join(', '));
    if (a.flags.indexOf('supplier_assignment') !== -1) bits.push('assigns a supplier / raises an order');
    if (a.flags.some(function (f) { return f.indexOf('email') !== -1; })) bits.push('sends email');
    if (a.mobileAvailable) bits.push('available on the mobile app (status gate also applies)');
    if (a.machineFired) bits.push('machine-fired (no user surface)');
    return bits.join('; ');
  }

  function statusSection(model, s) {
    var h = '<h3>' + esc(s.name) + (s.isDefaultFor.length ? ' — default status for ' + esc(s.isDefaultFor.join(', ')) : '') + '</h3>';
    h += '<p style="font-size:9.5pt;color:#5c6b60">Applies to: ' + esc(s.types.join(' and ')) + ' jobs.' +
      (s.confidence === 'DESIGNED' ? ' <span class="designed">Added in this design.</span>' : '') + '</p>';
    var avail = model.helpdesk.availability.filter(function (e) { return e.status === s.name; });
    var seen = {}, rows = '';
    avail.forEach(function (e) {
      if (seen[e.action]) return;
      seen[e.action] = true;
      var a = model.helpdesk.actions.filter(function (x) { return x.name === e.action; })[0];
      if (!a) return;
      rows += '<tr><td><b>' + esc(a.name) + '</b>' + (a.confidence === 'DESIGNED' ? ' <span class="designed">(designed)</span>' : '') + '</td>' +
        '<td>' + esc(resultsText(model, a.name)) + '</td>' +
        '<td>' + esc(actionEffects(a) || '—') + '</td></tr>';
    });
    if (rows) {
      h += '<table><thead><tr><th style="width:34%">Action available here</th><th style="width:30%">Outcome</th><th>Effects</th></tr></thead><tbody>' + rows + '</tbody></table>';
    } else {
      h += '<p class="note">No actions are offered from this status — jobs here can only move via an engine (quote/orders/PPM) or not at all.</p>';
    }
    return h;
  }

  function generate(model, opts) {
    opts = opts || {};
    var isCustomer = opts.edition === 'customer';
    var isInstance = opts.edition === 'instance';
    var title = isCustomer ? 'Desired Customer Solution Design'
      : isInstance ? 'Instance As-Is Solution Design'
      : 'Vanilla System Solution Design';
    var h = '';

    h += '<h1>' + title + '</h1>';
    h += '<p class="subtitle">Concerto Helpdesk &amp; Orders configuration — generated from the ' +
      (isInstance ? 'crawled instance snapshot (read-only automated crawl)' : 'canonical machine-readable model') +
      (isCustomer ? ', including the customer design deviations from Vanilla' : '') +
      (isInstance ? ', including its deviations from the Vanilla baseline' : '') + '.</p>';
    h += '<div class="meta">Source environment: <code>' + esc(model.meta.environment) + '</code> · ' +
      'model generated ' + esc(model.meta.generatedAt.helpdesk) + ' (Helpdesk) / ' + esc(model.meta.generatedAt.orders) + ' (Orders) · ' +
      'baseline fingerprints <code>hd:' + esc(model.meta.sourceFingerprints.helpdesk) + '</code> <code>ord:' + esc(model.meta.sourceFingerprints.orders) + '</code> · ' +
      'document generated ' + esc(new Date().toISOString().slice(0, 16).replace('T', ' ')) + '.<br>' +
      'Evidence grading: every configuration claim in this document traces to the discovery evidence (E-*/EO-* files in the Labs repository); ' +
      'behavioural claims are graded separately and cross-domain behaviour is configuration truth only until experiment E2 runs.' +
      (isCustomer ? ' Items marked <span class="designed">designed</span> are customer deviations, not evidenced Vanilla configuration.' : '') +
      '</div>';

    /* 1 — scope */
    h += '<h2>1 · Scope</h2>';
    h += '<p>This document describes the ' + (isCustomer ? 'customer' : 'Vanilla baseline') + ' configuration of the Concerto ' +
      '<b>Helpdesk</b> and <b>Orders</b> domains and the cross-domain mechanism between them, as discovered and evidenced in the TEST environment. ' +
      'It covers the workflow status model, the actions available in each status and what they do, the SLA model, classifications, mobile behaviour, and the contractor/supplier interaction. ' +
      '<b>PPM Scheduler is out of scope</b>: it is referenced throughout the configuration (visit statuses, statutory scoping, PPM disciplines) but is an explicitly unmapped domain.</p>';

    /* 2 — helpdesk types */
    h += '<h2>2 · Helpdesk Types</h2>';
    h += '<table><thead><tr><th>Type</th><th>Default status</th><th>Statuses bound</th><th>Creation route</th></tr></thead><tbody>';
    model.helpdesk.types.forEach(function (t) {
      var route = t.name === 'Reactive'
        ? 'Reporter wizard ("Raise a job") or the admin quick-add form; both create via RH01. Wizard-raised jobs collect no urgency and arrive WITHOUT an SLA (verified).'
        : 'The add button is hidden by configuration ("DO NOT USE"); Planned jobs are created from the list toolbar (PH01) or by the PPM side (unmapped).';
      h += '<tr><td><b>' + esc(t.name) + '</b></td><td>' + esc(t.defaultStatus || '— none set') + '</td><td>' +
        esc(t.statuses.join(' · ')) + '</td><td>' + route + '</td></tr>';
    });
    h += '</tbody></table>';

    /* 3 — workflow status model */
    h += '<h2 class="pagebreak">3 · Workflow: statuses and their actions</h2>';
    h += '<p>Each status below is a node in the job state machine. The table under each status lists every action a user can take from it, the resulting status, and the automation the action carries (tags, email, supplier assignment). ' +
      'An action reaches a surface only if the rendering gates allow it (hidden/suppressed flags, job-type applicability, and for mobile the two-gate model in section 6).</p>';
    model.helpdesk.statuses.forEach(function (s) { h += statusSection(model, s); });

    var machine = model.helpdesk.actions.filter(function (a) { return a.machineFired; });
    if (machine.length) {
      h += '<h3>Machine-fired actions (no user surface)</h3>';
      h += '<table><thead><tr><th style="width:34%">Action</th><th style="width:30%">Outcome</th><th>Fired by</th></tr></thead><tbody>';
      machine.forEach(function (a) {
        var firedBy = a.firedBySupplierActions.length
          ? 'Supplier action(s): ' + a.firedBySupplierActions.join(', ')
          : (a.code === 'RH03b' ? 'The quote engine (RE05 "Raise Order")' : 'Engine-internal');
        h += '<tr><td><b>' + esc(a.name) + '</b></td><td>' + esc(resultsText(model, a.name)) + '</td><td>' + esc(firedBy) + '</td></tr>';
      });
      h += '</tbody></table>';
    }

    /* 4 — SLA */
    h += '<h2>4 · Response Categories (SLA)</h2>';
    var slaFact = model.helpdesk.sharedConfiguration.filter(function (s) { return /SLA table/.test(s.statement); })[0];
    if (slaFact) h += '<p>' + esc(slaFact.statement) + '</p>';
    h += '<p>SLA targets are computed on the working-time clock and applied at creation only when an urgency is captured. ' +
      'The admin quick-add form requires urgency; the reporter wizard never asks — so wizard-raised jobs arrive <b>without SLA targets</b> (VI-005, controlled-verified B-010). No response category is flagged default.</p>';
    h += '<div class="register">Per-record response-category values are evidenced in the repository (E-013/E-017) but not yet carried in the machine-readable model; the summary above quotes the model\'s shared-configuration facts.</div>';

    /* 5 — classifications */
    h += '<h2>5 · Classifications</h2>';
    h += '<p>The reporter-facing fault taxonomy: parents and children presented as wizard tiles and as cascading admin selects that auto-fill the short title. In Vanilla, all records are Reactive-typed, and the schema\'s wiring to default urgency, asset types, budget category and order type is <b>unset on every record</b> (VI-006) — the taxonomy exists but drives no automation.</p>';
    h += '<div class="register">Classification records (16 parents + 74 children, uniform; E-018/E-023) are evidenced in the repository but not yet carried in the machine-readable model.</div>';

    /* 6 — mobile */
    h += '<h2>6 · Mobile (Orchestrate) behaviour</h2>';
    h += '<p>An action reaches the mobile operative only when <b>both</b> gates open: (1) the action\'s own mobile flag (and its constraint chain), and (2) the status flag "Will jobs in this status appear on the mobile app" — TRUE only for <b>With Maintenance Team</b> and <b>With Maintenance Team - R</b> in Vanilla. Broader mobile-capable actions are therefore only practically exposed on-device while the job sits in those working statuses.</p>';
    var mobileActions = model.helpdesk.actions.filter(function (a) { return a.mobileAvailable; });
    h += '<p>Mobile-capable actions (' + mobileActions.length + '): ' + esc(mobileActions.map(function (a) { return a.code; }).join(', ')) + '.</p>';

    /* 7 — orders & supplier interaction */
    h += '<h2 class="pagebreak">7 · Orders and the contractor / supplier interaction</h2>';
    h += '<p>Assigning a contractor (e.g. RH04) raises an order — order reference = parent job reference + "/n" — in the default order status. The supplier then drives the order through its own state machine from the Supplier Portal or the contractor app; supplier actions carry a direct "resulting action on the helpdesk" link, which is how the parent job follows the order.</p>';
    h += '<h3>Order statuses</h3><table><thead><tr><th>Status</th><th>Default</th><th>Notes</th></tr></thead><tbody>';
    model.orders.orderStatuses.forEach(function (s) {
      h += '<tr><td>' + esc(s.name) + '</td><td>' + (s.isDefault ? '★' : '') + '</td><td>' +
        (s.preventApplication ? 'blocks applications-for-payment' : '') + '</td></tr>';
    });
    h += '</tbody></table>';
    h += '<h3>Supplier actions</h3><table><thead><tr><th>Action</th><th>Available in</th><th>Order becomes</th><th>Fires on the job</th><th>Portal</th></tr></thead><tbody>';
    model.orders.supplierActions.forEach(function (sa) {
      h += '<tr><td><b>' + esc(sa.observedCode + ' ' + sa.name) + '</b></td><td>' + esc((sa.availableIn || []).join(', ') || '—') + '</td><td>' +
        esc(sa.resultingOrderStatus || '—') + '</td><td>' + esc(sa.firesHelpdeskAction || '—') + '</td><td>' +
        (sa.portalVisible ? 'visible' : '<span class="bad">NOT visible</span>') + '</td></tr>';
    });
    h += '</tbody></table>';
    h += '<p class="note"><b>Known defect (VI-009/VO-002):</b> the acceptance-path actions (SP01 Accept, SP02 Reject, ORC10 Acknowledge) are not portal-visible — and SP02 is additionally only available after acceptance — so the supplier lifecycle cannot start from the portal in Vanilla. Four field changes across three actions repair it.</p>';
    h += '<h3>Cross-domain edges</h3><ul>';
    model.crossDomain.forEach(function (e) {
      h += '<li><code>' + esc(e.id) + '</code> ' + esc(e.edge) + ' <span class="grade">' + esc(e.grade) + '</span></li>';
    });
    h += '</ul><p>Every cross-domain edge above is configuration truth (both sides read in Admin); none is behaviourally verified yet — that is experiment E2.</p>';

    /* 8 — deviation schedules (customer/instance editions) */
    var hasDeviations = (isCustomer || isInstance) && opts.diff;
    if (hasDeviations) {
      var devTitle = isInstance ? 'Deviation Schedule (this instance vs Vanilla)'
        : 'Deviation Schedule (this design vs Vanilla)';
      h += '<h2 class="pagebreak">8 · ' + devTitle + '</h2>';
      var schedule = window.StudioDiff.deviationSchedule(opts.diff);
      if (schedule.length) {
        h += '<table><thead><tr><th style="width:12%">Change</th><th style="width:14%">Object</th><th>Deviation</th></tr></thead><tbody>';
        schedule.forEach(function (r) {
          h += '<tr><td><b>' + esc(r.kind) + '</b></td><td>' + esc(r.object) + '</td><td>' + esc(r.detail) + '</td></tr>';
        });
        h += '</tbody></table>';
        h += '<p>Everything not listed above is identical to the Vanilla baseline (fingerprints in the header).' +
          (isInstance ? ' A first-crawler snapshot also differs from the canonical model wherever the crawler has not yet reproduced a field — those gaps are listed as NOT CRAWLED in section ' + (9) + ', not hidden.' : '') + '</p>';
      } else {
        h += '<p>' + (isInstance ? 'This instance is' : 'This design is currently') + ' identical to the Vanilla baseline.</p>';
      }
      if (isCustomer && opts.instanceDiff) {
        h += '<h3>Instance → Desired</h3>';
        var sched2 = window.StudioDiff.deviationSchedule(opts.instanceDiff);
        if (sched2.length) {
          h += '<table><thead><tr><th style="width:12%">Change</th><th style="width:14%">Object</th><th>Deviation</th></tr></thead><tbody>';
          sched2.forEach(function (r) {
            h += '<tr><td><b>' + esc(r.kind) + '</b></td><td>' + esc(r.object) + '</td><td>' + esc(r.detail) + '</td></tr>';
          });
          h += '</tbody></table>';
        } else {
          h += '<p>The crawled instance already matches this design.</p>';
        }
      }
    }

    /* not-crawled honesty for instance editions */
    if (isInstance && opts.notCrawled && opts.notCrawled.length) {
      h += '<h3>Not crawled (fields the automated crawler has not yet reproduced)</h3><ul>';
      opts.notCrawled.forEach(function (n) {
        h += '<li><b>' + esc(n.family) + '</b> — ' + esc(n.reason) + '</li>';
      });
      h += '</ul>';
    }

    /* 9 — findings, assumptions, unknowns */
    var secNo = hasDeviations ? 9 : 8;
    h += '<h2 class="pagebreak">' + secNo + ' · Known findings, assumptions and unresolved decisions</h2>';
    if (opts.findings && opts.findings.length) {
      h += '<h3>Evidence-backed findings (computed from this configuration)</h3><table><thead><tr><th>Register</th><th>Category</th><th>Object</th><th>Finding</th></tr></thead><tbody>';
      opts.findings.forEach(function (f) {
        h += '<tr><td><code>' + esc(f.register) + '</code></td><td>' + esc(f.category) + '</td><td>' + esc(f.object) + '</td><td>' + esc(f.finding) + '</td></tr>';
      });
      h += '</tbody></table>';
    }
    h += '<h3>Register-known findings</h3><ul>';
    (window.StudioRules ? window.StudioRules.REGISTER_ONLY : []).forEach(function (f) {
      h += '<li><code>' + esc(f.register) + '</code> — ' + esc(f.finding) + '</li>';
    });
    h += '</ul>';
    h += '<h3>Genuine unknowns</h3><ul>' +
      '<li>Order approval-level source (UO-001).</li>' +
      '<li>Action-constraint runtime semantics (U-012 — experiment E5).</li>' +
      '<li>Runtime truth of every cross-domain edge (experiments E2/E3).</li>' +
      '<li>The PPM Scheduler domain in its entirety.</li>' +
      (model.helpdesk.types[1] && !model.helpdesk.types[1].defaultStatus ? '<li>Planned type has no default status configured (noted benign gap).</li>' : '') +
      '</ul>';

    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>' + esc(title) +
      '</title><style>' + CSS + '</style></head><body>' + h + '</body></html>';
  }

  var api = { generate: generate };
  if (typeof window !== 'undefined') window.StudioSolDesign = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
