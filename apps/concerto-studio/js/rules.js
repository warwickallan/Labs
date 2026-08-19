/* rules.js — the Findings engine. NOT a generic AI opinion page: every
 * finding is produced by an explicit, evidence-referenced rule evaluated
 * against a loaded model, or is a quoted register entry for facts the
 * canonical models do not (yet) carry. Inference is never silently
 * upgraded to fact — every finding carries its category and confidence.
 *
 * Categories (from VANILLA-ISSUES.md):
 *   CONFIRMED DEFECT · CONFIGURATION INCONSISTENCY · STRONG ANOMALY ·
 *   POSSIBLE DEFECT · INFORMATION
 *
 * The same rules will later run against any crawled instance model.
 */
(function () {
  'use strict';

  /* ---- computed rules (run against a model) ----------------------------- */

  var RULES = [
    {
      id: 'R-PORTAL-ACCEPTANCE',
      register: 'VI-009 / VO-002',
      category: 'CONFIRMED DEFECT',
      domain: 'Orders',
      requires: function (m) {
        if (!m.orders.supplierActions.length) return 'supplier actions not crawled';
        if (!m.orders.orderStatuses.some(function (s) { return s.isDefault; })) return 'default order status not crawled';
        return null;
      },
      run: function (m) {
        var out = [];
        var defaultStatus = (m.orders.orderStatuses.filter(function (s) { return s.isDefault; })[0] || {}).name;
        if (!defaultStatus) return out;
        m.orders.supplierActions.forEach(function (sa) {
          if ((sa.availableIn || []).indexOf(defaultStatus) !== -1 && sa.portalVisible === false) {
            out.push({
              object: sa.observedCode + ' ' + sa.name,
              objectKey: sa.key,
              finding: 'Available in the default order status ("' + defaultStatus + '") but NOT visible on the supplier portal.',
              why: 'The order lifecycle entry point offers this action structurally, yet the portal cannot render it — the acceptance loop is dead on arrival (operationally confirmed, EO-005).',
              evidence: ['EO-002', 'EO-005'],
              confidence: 'VERIFIED — STRUCTURAL (operationally confirmed)',
              current: 'Show this action on the supplier portal = unticked',
              proposed: 'Show this action on the supplier portal = ticked',
              fixable: true,
              fix: { target: sa.key, field: 'portalVisible', from: false, to: true }
            });
          }
        });
        return out;
      }
    },
    {
      id: 'R-REJECT-AVAILABILITY',
      register: 'VI-009 (SP02 precision) / UO-002',
      category: 'CONFIRMED DEFECT',
      domain: 'Orders',
      requires: function (m) {
        if (!m.orders.supplierActions.some(function (sa) { return sa.firesHelpdeskAction; })) return 'supplier-action helpdesk links not crawled';
        if (!m.orders.orderStatuses.some(function (s) { return s.isDefault; })) return 'default order status not crawled';
        return null;
      },
      run: function (m) {
        var out = [];
        var defaultStatus = (m.orders.orderStatuses.filter(function (s) { return s.isDefault; })[0] || {}).name;
        m.orders.supplierActions.forEach(function (sa) {
          /* the reject action (fires T03, cancels the order) should be
           * offerable BEFORE acceptance — i.e. in the default status */
          if (sa.firesHelpdeskAction === 'T03' && defaultStatus &&
              (sa.availableIn || []).indexOf(defaultStatus) === -1) {
            out.push({
              object: sa.observedCode + ' ' + sa.name,
              objectKey: sa.key,
              finding: 'Reject action is not available in "' + defaultStatus + '" (ticked only: ' + (sa.availableIn || []).join(', ') + ') despite being the acceptance-stage rejection.',
              why: 'Its when-to-show is before-acceptance, but the availability tick contradicts that (UO-002) — a supplier can never reject an unaccepted order.',
              evidence: ['EO-002', 'EO-004'],
              confidence: 'VERIFIED — STRUCTURAL',
              current: 'Availability: ' + (sa.availableIn || []).join(', '),
              proposed: 'Availability includes "' + defaultStatus + '"',
              fixable: true,
              fix: { target: sa.key, field: 'availableIn', from: sa.availableIn, to: (sa.availableIn || []).concat([defaultStatus]) }
            });
          }
        });
        return out;
      }
    },
    {
      id: 'R-DEAD-END-STATUS',
      register: 'VI-002 (Business Case - R) · VI-003 history (Quote Requested - R)',
      category: 'STRONG ANOMALY',
      domain: 'Helpdesk',
      requires: function (m) {
        if (!m.helpdesk.availability.length) return 'action availability not crawled';
        return null;
      },
      run: function (m) {
        var out = [];
        m.helpdesk.statuses.forEach(function (s) {
          if (s.name === 'Closed' || s.name === 'Cancelled') return; /* terminal by design */
          var exits = m.helpdesk.availability.filter(function (e) { return e.status === s.name; });
          if (exits.length === 0) {
            var known = s.name === 'Quote Requested - R'
              ? ' KNOWN: downgraded to by-design — the quote engine (RE05→RH03b) advances these jobs (E-016); runtime proof is experiment E3.'
              : (s.name === 'Business Case - R' ? ' KNOWN: VI-002 — doubly dead (also unreachable per the map warning).' : '');
            out.push({
              object: s.name,
              objectKey: s.key,
              finding: 'Status offers ZERO actions — jobs arriving here cannot leave via the action system.' + known,
              why: 'A non-terminal status with no exit actions strands jobs unless an engine moves them.',
              evidence: ['E-005', 'E-007'],
              confidence: 'VERIFIED — OBSERVED',
              current: 'No actions available in this status',
              proposed: s.name === 'Quote Requested - R' ? 'None — by design (quote engine exit)' : 'Allocate an exit action, or remove/repurpose the status',
              fixable: false
            });
          }
        });
        return out;
      }
    },
    {
      id: 'R-CIRCULAR-ENTRY',
      register: 'VI-001 (New PPM)',
      category: 'INFORMATION',
      domain: 'Helpdesk',
      requires: function (m) {
        if (!m.helpdesk.results.length) return 'action result edges not crawled';
        return null;
      },
      run: function (m) {
        var out = [];
        m.helpdesk.statuses.forEach(function (s) {
          var inbound = m.helpdesk.results.filter(function (r) { return r.toStatus === s.name; });
          if (!inbound.length) return;
          var allSelfCircular = inbound.every(function (r) {
            var av = m.helpdesk.availability.filter(function (e) { return e.action === r.action; });
            return av.length > 0 && av.every(function (e) { return e.status === s.name; });
          });
          if (allSelfCircular && !s.isDefaultFor.length) {
            out.push({
              object: s.name,
              objectKey: s.key,
              finding: 'Only reachable from itself — every action that sets this status is only available FROM it.',
              why: 'Jobs can only arrive here at creation (job-type default action) or via an engine; the Action map flags this as "unreachable". For New PPM this is explained by PH01 being Planned’s creation default (E-010).',
              evidence: ['E-007', 'E-010'],
              confidence: 'VERIFIED — OBSERVED (interpretation per register)',
              current: 'Circular entry only',
              proposed: 'None required if creation-path entry is intended',
              fixable: false
            });
          }
        });
        return out;
      }
    },
    {
      id: 'R-INVERTED-HOLD-TAGS',
      register: 'VI-010',
      category: 'CONFIGURATION INCONSISTENCY',
      domain: 'Helpdesk',
      /* computable since model v2 carries structured tag automation */
      requires: function (m) {
        if (!m.helpdesk.actions.some(function (a) { return (a.addsTags || []).length || (a.removesTags || []).length; })) {
          return 'per-action tag automation not crawled';
        }
        return null;
      },
      run: function (m) {
        var out = [];
        m.helpdesk.actions.forEach(function (a) {
          if (/take off hold/i.test(a.name) && (a.addsTags || []).some(function (t) { return /on hold/i.test(t); })) {
            out.push({
              object: a.name,
              objectKey: a.key,
              finding: 'A "take off hold" action ADDS an On-hold tag (' + a.addsTags.join(', ') + ') — identical to the place-on-hold action; its purpose implies the inverse.',
              why: 'Jobs taken off hold would keep/gain the on-hold tag (runtime effect untested — E5 territory).',
              evidence: ['E-023', 'E-024'],
              confidence: 'VERIFIED — OBSERVED (structural); runtime untested',
              current: 'adds "' + a.addsTags.join(', ') + '", removes "' + a.removesTags.join(', ') + '"',
              proposed: 'removes "05. On hold" (and arguably adds "04. In progress" — register wording)',
              fixable: true,
              fix: { target: a.key, field: 'tagAutomation', from: { adds: a.addsTags, removes: a.removesTags }, to: { adds: [], removes: ['05. On hold'] } }
            });
          }
        });
        return out;
      }
    },
    {
      id: 'R-DUPLICATE-NAMES',
      register: 'VO-001',
      category: 'STRONG ANOMALY',
      domain: 'Orders',
      requires: function (m) {
        if (!m.orders.orderPriorities.length) return 'order priorities not crawled';
        return null;
      },
      run: function (m) {
        var out = [];
        var seen = {};
        m.orders.orderPriorities.forEach(function (p) {
          if (seen[p.name]) {
            out.push({
              object: 'Order priority "' + p.name + '"',
              objectKey: p.key,
              finding: 'Duplicate display name — two priority records are both called "' + p.name + '".',
              why: 'Display names are not unique identities; automation keyed by name would be ambiguous.',
              evidence: ['EO-001'],
              confidence: 'VERIFIED — OBSERVED',
              current: 'Two records named "' + p.name + '"',
              proposed: 'Rename or remove one record',
              fixable: false
            });
          }
          seen[p.name] = true;
        });
        return out;
      }
    },
    {
      id: 'R-GROUPLESS-ACTION',
      register: 'VI-004',
      category: 'INFORMATION',
      domain: 'Helpdesk',
      requires: function (m) {
        if (!m.helpdesk.actions.some(function (a) { return a.buttonGroup; })) return 'button groups not crawled';
        return null;
      },
      run: function (m) {
        return m.helpdesk.actions
          .filter(function (a) { return !a.buttonGroup && !a.machineFired; })
          .map(function (a) {
            return {
              object: a.name,
              objectKey: a.key,
              finding: 'Action has no button group and is not machine-fired — it may render nowhere.',
              why: 'Toolbar rendering groups actions by button group; a groupless, user-facing action has no surface.',
              evidence: ['E-006'],
              confidence: 'VERIFIED — OBSERVED',
              current: 'Button group: (blank)',
              proposed: 'Assign a button group or confirm machine-fired intent',
              fixable: false
            };
          });
      }
    }
  ];

  /* ---- register-known findings the models cannot (yet) compute --------- */

  var REGISTER_ONLY = [
    { register: 'VI-005', category: 'CONFIGURATION INCONSISTENCY', domain: 'Helpdesk', object: 'Response categories', finding: 'No default Response category — reporter-wizard jobs arrive with NO SLA (CONTROLLED VERIFIED, B-010).', evidence: ['E-012', 'E1'], note: 'Response-category records are not yet carried in the machine-readable model; quoted from the register.' },
    { register: 'VI-006', category: 'CONFIGURATION INCONSISTENCY', domain: 'Helpdesk', object: 'Classifications (all 90)', finding: 'Classification → SLA/asset/budget wiring entirely unset at both levels.', evidence: ['E-012', 'E-023'], note: 'Classification records not yet in the model.' },
    { register: 'VI-007', category: 'CONFIGURATION INCONSISTENCY', domain: 'Helpdesk', object: 'LM01 · PH05 · RH10/RH11 · PH02/PH02a', finding: 'Grouped-view vs record-form mismatches; config-identical action pairs.', evidence: ['E-005', 'E-015'], note: 'Record-form values not yet in the model.' },
    { register: 'VI-008', category: 'CONFIGURATION INCONSISTENCY', domain: 'Helpdesk', object: 'Email templates (5)', finding: 'All five templates have empty subject AND body; "Email failed to send" passively observed (OD-006).', evidence: ['E-017', 'E-020'], note: 'Template records not yet in the model.' }
  ];

  /* Full evaluation: findings PLUS rules that could not run because the
   * model (typically a crawled snapshot) lacks the required fields —
   * reported as NOT EVALUATED, never as a false pass. */
  function runAllDetailed(model) {
    var findings = [];
    var notEvaluated = [];
    RULES.forEach(function (rule) {
      var reason = rule.requires ? rule.requires(model) : null;
      if (reason) {
        notEvaluated.push({ ruleId: rule.id, register: rule.register, domain: rule.domain, reason: reason });
        return;
      }
      rule.run(model).forEach(function (f) {
        findings.push(Object.assign({
          ruleId: rule.id,
          register: rule.register,
          category: rule.category,
          domain: rule.domain,
          source: 'COMPUTED'
        }, f));
      });
    });
    return { findings: findings, notEvaluated: notEvaluated };
  }

  function runAll(model) { return runAllDetailed(model).findings; }

  /* Compile selected fixable findings into a desired-state patch — the
   * artefact a build plan consumes. Preview only until the execution
   * adapter exists; nothing here touches Concerto. */
  function compileFixPatch(findings) {
    return {
      kind: 'DESIRED-STATE-PATCH',
      generatedAt: new Date().toISOString(),
      note: 'Preview only. Execution requires the browser-harness adapter (not yet built) plus explicit per-plan authorisation. Every operation will produce a receipt and read-back verification.',
      operations: findings.filter(function (f) { return f.fixable && f.fix; }).map(function (f) {
        return {
          register: f.register,
          rule: f.ruleId,
          target: f.fix.target,
          field: f.fix.field,
          from: f.fix.from,
          to: f.fix.to
        };
      })
    };
  }

  var api = { runAll: runAll, runAllDetailed: runAllDetailed, compileFixPatch: compileFixPatch, REGISTER_ONLY: REGISTER_ONLY, RULES: RULES };
  if (typeof window !== 'undefined') window.StudioRules = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
