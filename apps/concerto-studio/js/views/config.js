/* config.js — Vanilla · Configuration: the read-only reference view of
 * every configuration family the canonical models carry, across both
 * domains, plus the graded behaviour layer and cross-domain edges.
 */
(function () {
  'use strict';

  function render(container, model) {
    var el = window.StudioDom.el;
    window.StudioDom.clear(container);
    var page = el('div', { class: 'page' });
    container.appendChild(page);

    function section(title, node, note) {
      page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
        el('h3', { text: title }),
        note ? el('p', { class: 'muted', style: 'margin:0 0 10px', text: note }) : null,
        node
      ]));
    }
    function table(headers, rows) {
      return el('table', { class: 'list' }, [
        el('thead', {}, [el('tr', {}, headers.map(function (h) { return el('th', { text: h }); }))]),
        el('tbody', {}, rows.map(function (r) {
          return el('tr', {}, r.map(function (c) {
            return el('td', {}, [].concat(c === null || c === undefined ? '' : c));
          }));
        }))
      ]);
    }

    var hd = model.helpdesk, o = model.orders;

    section('Helpdesk Job Types', table(
      ['Type', 'Default status', 'Statuses', 'Actions in model'],
      hd.types.map(function (t) {
        return [t.name, t.defaultStatus || '— none set (noted benign gap)', t.statuses.join(' · '), String(t.actions.length)];
      })
    ));

    section('Job Statuses (13)', table(
      ['Status', 'Types', 'Default for', 'Ordering'],
      hd.statuses.map(function (s) {
        return [s.name, s.types.join(', '), s.isDefaultFor.join(', ') || '', Object.keys(s.ordering).map(function (t) { return t + ':' + s.ordering[t]; }).join(' ')];
      })
    ), 'Closed and Cancelled are single records shared by both Types (E-003).');

    section('Operative Statuses (9, type-agnostic)', el('p', {
      text: hd.operativeStatuses.map(function (x) { return x.name; }).join(' · ')
    }), 'The operative-status object has no Type field (U-003 resolved, E-013). No action carries an operative-status relationship in Vanilla.');

    section('Shared configuration facts', el('ul', {}, hd.sharedConfiguration.map(function (s) {
      return el('li', {}, [
        document.createTextNode(s.statement + ' '),
        el('span', { class: 'conf-chip' + (/OBSERVED/.test(s.confidence) ? ' observed' : ' structural'), text: s.confidence }),
        document.createTextNode(' '),
        el('span', {}, (s.evidence || []).map(function (id) { return el('span', { class: 'ev-chip', text: id }); }))
      ]);
    })));

    section('Order Statuses (11)', table(
      ['Status', 'Code', 'Sort', 'Default', 'Prevent application', 'Hub dashboard'],
      o.orderStatuses.map(function (s) {
        return [s.name, s.code || '', String(s.sort), s.isDefault ? '★ default' : '', s.preventApplication ? '✔' : '', s.hubDashboard ? '✔' : ''];
      })
    ));

    section('Order Priorities (7)', table(
      ['Priority', 'Default', 'Note'],
      o.orderPriorities.map(function (p) {
        return [p.name, p.isDefault ? '★' : '', p.note || ''];
      })
    ), 'Two records named "Default" — VO-001, the duplicate-name anomaly that motivates canonical keys.');

    section('Order Types (2)', table(
      ['Type', 'Code', 'Default'],
      o.orderTypes.map(function (t) { return [t.name, t.code || '', t.isDefault ? '★' : '']; })
    ));

    section('Budget Categories (11)', table(
      ['Category', 'Code', 'Code 2', 'Type', 'Rate/unit/qty'],
      o.budgetCategories.map(function (b) {
        return [b.name, b.code || '', b.code2 || '', b.type || '', b.rateUnitQty || ''];
      })
    ));

    section('Supplier Actions (13)', table(
      ['Key', 'Action', 'Available in (order statuses)', 'Resulting order status', 'Fires helpdesk action', 'Portal visible'],
      o.supplierActions.map(function (sa) {
        return [
          el('code', { text: sa.canonicalKey }),
          sa.observedCode + ' ' + sa.name,
          (sa.availableIn || []).join(' · ') || '—',
          sa.resultingOrderStatus || '—',
          sa.firesHelpdeskAction || '—',
          sa.portalVisible ? '✔' : el('b', { class: 'bad-text', text: '✘' })
        ];
      })
    ), 'Portal-invisible rows on the acceptance path (SP01, SP02, ORC10) are the VI-009 defect. Rows are clickable in a later pass; full detail is in the model.');

    section('Cross-domain edges (X-001..X-018)', el('ul', {}, model.crossDomain.map(function (e) {
      return el('li', {}, [
        el('span', { class: 'ev-chip', text: e.id }),
        document.createTextNode(' ' + e.edge + ' '),
        el('span', { class: 'conf-chip structural', text: e.grade })
      ]);
    })), 'All configuration truth — runtime verification is experiment E2.');

    section('Verified behaviours (B-001..B-013)', el('ul', {}, model.behaviours.map(function (b) {
      return el('li', {}, [
        el('span', { class: 'ev-chip', text: b.id }),
        document.createTextNode(' ' + b.claim + ' '),
        el('span', { class: 'conf-chip' + (b.grade === 'CONTROLLED_VERIFIED' ? ' observed' : ''), text: b.grade })
      ]);
    })));
  }

  window.StudioConfig = { render: render };
})();
