/* overview.js — the landing dashboard. Everything shown here is computed
 * from the loaded canonical model + loader invariants, except the "known
 * defects" and "programme state" tiles, which are curated pointers into
 * the Labs registers (VANILLA-ISSUES.md / CURRENT_STATE.md) — the Studio
 * quotes them, it does not re-derive them.
 */
(function () {
  'use strict';

  /* Headline defects, curated from VANILLA-ISSUES.md (source of truth).
   * These seed the future Findings rule engine. */
  var HEADLINE_ISSUES = [
    { id: 'VI-009 / VO-002', cat: 'CONFIGURATION DEFECT', text: 'Supplier acceptance loop broken — SP01/ORC10 lack portal visibility; SP02 lacks portal visibility AND correct availability (four field changes across three actions).' },
    { id: 'VI-002', cat: 'UNREACHABLE STATE', text: 'Business Case - R is unreachable and offers zero exit actions.' },
    { id: 'VI-005', cat: 'CONFIGURATION INCONSISTENCY', text: 'No default Response category — reporter-wizard jobs arrive with NO SLA (verified, B-010).' },
    { id: 'VI-006', cat: 'CONFIGURATION INCONSISTENCY', text: 'Classification → SLA/asset wiring unset across all 90 records.' },
    { id: 'VI-007', cat: 'CONFIGURATION INCONSISTENCY', text: 'Grouped-view vs record-form mismatches (LM01, PH05); duplicate-config actions.' },
    { id: 'VI-008', cat: 'UNWIRED CONFIGURATION', text: 'All five email templates are empty shells; "Email failed to send" passively observed.' },
    { id: 'VI-010', cat: 'CONFIGURATION INCONSISTENCY', text: 'GM06 "Take off hold" tag automation appears inverted (identical to GM05).' },
    { id: 'VO-001', cat: 'STRONG ANOMALY', text: 'Duplicate "Default" order priorities.' }
  ];

  function render(container, model, invariants) {
    var el = window.StudioDom.el;
    window.StudioDom.clear(container);
    var page = el('div', { class: 'page' });
    container.appendChild(page);

    var failing = invariants.filter(function (c) { return !c.pass; });
    var hd = model.helpdesk, o = model.orders;

    var tiles = el('div', { class: 'tiles' });
    page.appendChild(tiles);

    /* source truth */
    tiles.appendChild(el('div', { class: 'tile' }, [
      el('h3', { text: 'Canonical source' }),
      el('div', {}, [
        el('span', { class: failing.length ? 'bad-text' : 'ok-text', style: 'font-weight:600', text: failing.length ? '✘ ' + failing.length + ' fidelity invariant(s) failing' : '✔ All ' + invariants.length + ' fidelity invariants pass' })
      ]),
      el('ul', {}, [
        el('li', { html: 'Environment: <code>' + model.meta.environment + '</code>' }),
        el('li', { text: 'Model generated: ' + model.meta.generatedAt.helpdesk + ' (Helpdesk) · ' + model.meta.generatedAt.orders + ' (Orders)' }),
        el('li', { text: model.evidenceIndex.length + ' evidence files backing the Helpdesk model' }),
        el('li', { html: 'Fingerprints: <code>hd:' + model.meta.sourceFingerprints.helpdesk + '</code> <code>ord:' + model.meta.sourceFingerprints.orders + '</code>' })
      ]),
      el('div', { class: 'muted', text: 'Read-only from ../../model/*.json — Vanilla is immutable.' })
    ]));

    /* helpdesk stats */
    tiles.appendChild(el('div', { class: 'tile' }, [
      el('h3', { text: 'Helpdesk domain' }),
      el('div', { class: 'stat-row' }, [
        el('div', {}, [el('b', { text: String(hd.types.length) }), el('span', { text: 'types' })]),
        el('div', {}, [el('b', { text: String(hd.statuses.length) }), el('span', { text: 'statuses' })]),
        el('div', {}, [el('b', { text: String(hd.actions.length) }), el('span', { text: 'actions' })]),
        el('div', {}, [el('b', { text: String(hd.availability.length + hd.results.length) }), el('span', { text: 'relationships' })]),
        el('div', {}, [el('b', { text: String(hd.operativeStatuses.length) }), el('span', { text: 'operative statuses' })])
      ]),
      el('div', { class: 'muted', text: 'Default: Reactive → With Helpdesk. ' + hd.actions.filter(function (a) { return a.machineFired; }).length + ' machine-fired actions with no status allocation.' })
    ]));

    /* orders stats */
    tiles.appendChild(el('div', { class: 'tile' }, [
      el('h3', { text: 'Orders domain' }),
      el('div', { class: 'stat-row' }, [
        el('div', {}, [el('b', { text: String(o.orderStatuses.length) }), el('span', { text: 'order statuses' })]),
        el('div', {}, [el('b', { text: String(o.orderPriorities.length) }), el('span', { text: 'priorities' })]),
        el('div', {}, [el('b', { text: String(o.orderTypes.length) }), el('span', { text: 'order types' })]),
        el('div', {}, [el('b', { text: String(o.budgetCategories.length) }), el('span', { text: 'budget categories' })]),
        el('div', {}, [el('b', { text: String(o.supplierActions.length) }), el('span', { text: 'supplier actions' })])
      ]),
      el('div', { class: 'muted', text: o.emptyTabs.length + ' of 32 Orders Admin tabs ship empty in Vanilla.' })
    ]));

    /* cross-domain + behaviours */
    tiles.appendChild(el('div', { class: 'tile' }, [
      el('h3', { text: 'Cross-domain & behaviour layer' }),
      el('div', { class: 'stat-row' }, [
        el('div', {}, [el('b', { text: String(model.crossDomain.length) }), el('span', { text: 'cross-domain edges (all STRUCTURAL)' })]),
        el('div', {}, [el('b', { text: String(model.behaviours.filter(function (b) { return b.grade === 'CONTROLLED_VERIFIED'; }).length) }), el('span', { text: 'controlled-verified behaviours' })]),
        el('div', {}, [el('b', { text: String(model.behaviours.filter(function (b) { return b.grade === 'PASSIVELY_OBSERVED'; }).length) }), el('span', { text: 'passively observed' })])
      ]),
      el('div', { class: 'muted', text: 'Every cross-domain edge is configuration truth only — runtime verification is experiment E2 (blocked on the VI-009 decision).' })
    ]));

    /* known defects */
    tiles.appendChild(el('div', { class: 'tile', style: 'grid-column: span 2' }, [
      el('h3', { text: 'Known Vanilla defects (from VANILLA-ISSUES.md — will seed the Findings engine)' }),
      el('ul', {}, HEADLINE_ISSUES.map(function (i) {
        return el('li', {}, [
          el('code', { text: i.id }),
          document.createTextNode(' '),
          el('span', { class: 'conf-chip', text: i.cat }),
          document.createTextNode(' ' + i.text)
        ]);
      }))
    ]));

    /* programme state */
    tiles.appendChild(el('div', { class: 'tile' }, [
      el('h3', { text: 'Programme state (CURRENT_STATE.md)' }),
      el('ul', {}, [
        el('li', { html: 'Structural discovery: <b class="ok-text">COMPLETE</b> (Helpdesk + Orders + operational surfaces)' }),
        el('li', { html: 'Experiments E0/E1: <b class="ok-text">CONTROLLED VERIFIED</b>' }),
        el('li', { html: 'E2 (cross-domain runtime): <b class="warn-text">blocked</b> on the VI-009 decision' }),
        el('li', { html: 'PPM Scheduler: <b class="warn-text">unmapped domain</b> — accommodated, not pretended' }),
        el('li', { html: 'Vanilla: <b class="ok-text">never modified</b>' })
      ])
    ]));
  }

  window.StudioOverview = { render: render };
})();
