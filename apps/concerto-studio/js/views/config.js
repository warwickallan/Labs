/* config.js — Configuration: the read-only view of every configuration
 * family the CURRENT MODEL carries, across both domains, plus the graded
 * behaviour layer and cross-domain edges.
 *
 * It renders whatever model it is handed — the Vanilla baseline, a
 * project's Day-One, a project's current state — so nothing here may be
 * hard-coded from one instance. Counts come from the data, absences are
 * named, and an empty family says "not captured", never "none".
 */
(function () {
  'use strict';


  /* Said from the data, not from memory of another instance: which
   * acceptance-path actions are portal-invisible here, which records were
   * never opened, and which are observed to be ABSENT. */
  function supplierNote(o) {
    var parts = [];
    var invisible = o.supplierActions.filter(function (sa) {
      return sa.detailObserved !== false && sa.portalVisible === false &&
        (sa.portalAcceptAction || sa.portalRejectAction || sa.acknowledge);
    }).map(function (sa) { return sa.canonicalKey; });
    if (invisible.length) {
      parts.push('Portal-invisible on the acceptance path: ' + invisible.join(', ') +
        ' — this is the VI-009 defect.');
    }
    var unread = o.supplierActions.filter(function (sa) { return sa.detailObserved === false; })
      .map(function (sa) { return sa.canonicalKey; });
    if (unread.length) {
      parts.push(unread.join(', ') + ' are present in this instance but were never opened individually — ' +
        'their fields are shown as unknown rather than filled in from the baseline.');
    }
    var absent = (o.unknowns || []).filter(function (u) { return u.kind === 'OBSERVED-ABSENT'; })
      .map(function (u) { return u.canonicalKey; });
    if (absent.length) {
      parts.push('Absent from this instance (observed): ' + absent.join(', ') + '.');
    }
    return parts.join(' ');
  }

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
      /* An empty family is a GAP IN THE CAPTURE, not a statement that the
       * instance has none of them. An empty grid would read as the latter. */
      if (!rows.length) {
        return el('p', { class: 'warn-text', style: 'margin:0;font-size:12.5px',
          text: 'Not captured for this instance — unknown, not empty.' });
      }
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

    section('Job Statuses (' + hd.statuses.length + ')', table(
      ['Status', 'Types', 'Default for', 'Ordering'],
      hd.statuses.map(function (s) {
        return [s.name, s.types.join(', '), s.isDefaultFor.join(', ') || '', Object.keys(s.ordering).map(function (t) { return t + ':' + s.ordering[t]; }).join(' ')];
      })
    ), 'Closed and Cancelled are single records shared by both Types (E-003).');

    section('Operative Statuses (' + hd.operativeStatuses.length + ', type-agnostic)', el('p', {
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

    section('Order Statuses (' + o.orderStatuses.length + ')', table(
      ['Status', 'Code', 'Sort', 'Default', 'Prevent application', 'Hub dashboard'],
      o.orderStatuses.map(function (s) {
        return [s.name, s.code || '', String(s.sort), s.isDefault ? '★ default' : '', s.preventApplication ? '✔' : '', s.hubDashboard ? '✔' : ''];
      })
    ));

    section('Order Priorities (' + o.orderPriorities.length + ')', table(
      ['Priority', 'Default', 'Note'],
      o.orderPriorities.map(function (p) {
        return [p.name, p.isDefault ? '★' : '', p.note || ''];
      })
    ), 'Two records named "Default" — VO-001, the duplicate-name anomaly that motivates canonical keys.');

    section('Order Types (' + o.orderTypes.length + ')', table(
      ['Type', 'Code', 'Default'],
      o.orderTypes.map(function (t) { return [t.name, t.code || '', t.isDefault ? '★' : '']; })
    ));

    section('Budget Categories (' + o.budgetCategories.length + ')', table(
      ['Category', 'Code', 'Code 2', 'Type', 'Rate/unit/qty'],
      o.budgetCategories.map(function (b) {
        return [b.name, b.code || '', b.code2 || '', b.type || '', b.rateUnitQty || ''];
      })
    ));

    section('Supplier Actions (' + o.supplierActions.length + ')', table(
      ['Key', 'Action', 'Available in (order statuses)', 'Resulting order status', 'Fires helpdesk action', 'Portal visible'],
      o.supplierActions.map(function (sa) {
        var unread = sa.detailObserved === false;
        return [
          el('code', { text: sa.canonicalKey }),
          unread ? el('i', { class: 'muted', text: 'present — detail not observed' })
            : (sa.observedCode + ' ' + sa.name),
          unread ? '?' : ((sa.availableIn || []).join(' · ') || '—'),
          unread ? '?' : (sa.resultingOrderStatus || '—'),
          unread ? '?' : (sa.firesHelpdeskAction || '—'),
          unread ? '?' : (sa.portalVisible ? '✔' : el('b', { class: 'bad-text', text: '✘' }))
        ];
      })
    ), supplierNote(o));

    /* Families a capture may simply not contain. An empty list here means
     * "not captured for this instance", never "this instance has none". */
    function notCaptured(what) {
      return el('p', { class: 'warn-text', style: 'margin:0;font-size:12.5px',
        text: what + ' were not captured for this instance — unknown, not empty.' });
    }

    section('Cross-domain edges (' + model.crossDomain.length + ')',
      model.crossDomain.length
        ? el('ul', {}, model.crossDomain.map(function (e) {
          return el('li', {}, [
            el('span', { class: 'ev-chip', text: e.id }),
            document.createTextNode(' ' + e.edge + ' '),
            el('span', { class: 'conf-chip structural', text: e.grade })
          ]);
        }))
        : notCaptured('Cross-domain edges'),
      model.crossDomain.length ? 'All configuration truth — runtime verification is experiment E2.' : '');

    section('Verified behaviours (' + model.behaviours.length + ')',
      model.behaviours.length
        ? el('ul', {}, model.behaviours.map(function (b) {
          return el('li', {}, [
            el('span', { class: 'ev-chip', text: b.id }),
            document.createTextNode(' ' + b.claim + ' '),
            el('span', { class: 'conf-chip' + (b.grade === 'CONTROLLED_VERIFIED' ? ' observed' : ''), text: b.grade })
          ]);
        }))
        : notCaptured('Behavioural experiments'));
  }

  window.StudioConfig = { render: render };
})();
