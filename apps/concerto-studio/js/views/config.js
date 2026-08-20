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
    if (window.StudioSchema && window.StudioSchema.completeModel) model = window.StudioSchema.completeModel(model);
    var el = window.StudioDom.el;
    window.StudioDom.clear(container);
    var page = el('div', { class: 'page' });
    container.appendChild(page);
    page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
      el('h3', { text: 'What this page is' }),
      el('p', { style: 'margin:0;font-size:13px', text:
        'The complete configuration record for this system, in plain terms: the job types it runs, the statuses work moves through, how many actions exist and where their detail lives, the tags that mark supplier/order state, the response categories behind each priority, and the Orders side. Statuses and actions are explored visually in Diagram / Action Map / Matrix; this page is the reference of record.' })
    ]));

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
        return [s.name + (s.suppressed ? '  \u2014 SUPPRESSED (hidden from use; deletable candidate)' : ''), s.types.join(', '), s.isDefaultFor.join(', ') || '', Object.keys(s.ordering).map(function (t) { return t + ':' + s.ordering[t]; }).join(' ')];
      })
    ), 'Closed and Cancelled are single records shared by both Types (E-003).');

    section('Operative Statuses (' + hd.operativeStatuses.length + ', type-agnostic)', el('p', {
      text: hd.operativeStatuses.map(function (x) { return x.name; }).join(' · ')
    }), 'The operative-status object has no Type field (U-003 resolved, E-013). No action carries an operative-status relationship in Vanilla.');

    /* Actions — the overview; the full detail lives in the Matrix */
    if ((hd.actions || []).length) {
      var byGroup = {};
      hd.actions.forEach(function (a) { var g = a.buttonGroup || 'Not allocated'; (byGroup[g] = byGroup[g] || []).push(a); });
      section('Actions (' + hd.actions.length + ') by button group', el('table', { class: 'list' }, [
        el('thead', {}, [el('tr', {}, [el('th', { text: 'Group' }), el('th', { text: 'Count' }), el('th', { text: 'Actions' })])]),
        el('tbody', {}, Object.keys(byGroup).sort().map(function (g) {
          return el('tr', {}, [
            el('td', {}, [el('b', { text: g })]),
            el('td', { text: String(byGroup[g].length) }),
            el('td', { style: 'font-size:12px', text: byGroup[g].map(function (a) { return a.code || a.name.split('.')[0]; }).join(' \u00b7 ') })
          ]);
        }))
      ]), 'Every action, grouped as the helpdesk page groups its buttons. Field-level detail (flags, outcomes, availability) is the Matrix view; the workflow shape is the Diagram.');
    }

    /* Orders side — statuses, priorities, supplier actions */
    var ord = model.orders || {};
    if ((ord.orderStatuses || []).length || (ord.orderPriorities || []).length || (ord.supplierActions || []).length) {
      section('Orders & supplier portal',
        el('div', {}, [
          (ord.orderStatuses || []).length ? el('p', { style: 'font-size:12.5px' }, [
            el('b', { text: 'Order statuses (' + ord.orderStatuses.length + '): ' }),
            document.createTextNode(ord.orderStatuses.map(function (x) { return x.name || x; }).join(' \u00b7 '))
          ]) : null,
          (ord.orderPriorities || []).length ? el('p', { style: 'font-size:12.5px' }, [
            el('b', { text: 'Order priorities (' + ord.orderPriorities.length + '): ' }),
            document.createTextNode(ord.orderPriorities.map(function (x) { return (x.name || x) + (x.isDefault ? ' (default)' : ''); }).join(' \u00b7 '))
          ]) : null,
          (ord.supplierActions || []).length ? el('p', { style: 'font-size:12.5px' }, [
            el('b', { text: 'Supplier portal actions (' + ord.supplierActions.length + '): ' }),
            document.createTextNode(ord.supplierActions.map(function (x) { return x.name || x.canonicalKey || x; }).join(' \u00b7 '))
          ]) : null
        ]),
        'The purchase-order lifecycle behind each job, and the actions a supplier can take on the portal / contractor app. Each supplier action drives the job-side workflow through the order status it sets.');
    }

    /* Job tags — what the coloured chips on a job mean, in plain words */
    if ((hd.tags || []).length) {
      section('Job tags (' + hd.tags.length + ')', el('table', { class: 'list' }, [
        el('thead', {}, [el('tr', {}, [el('th', { text: 'Tag' }), el('th', { text: 'Tracks' }), el('th', { text: 'Meaning' })])]),
        el('tbody', {}, hd.tags.map(function (t) {
          var fam = t.family === 'QuoteRequest' ? 'Quote request' : t.family || '';
          var meaning = t.family === 'Order' ? 'State of the purchase order behind the job'
            : t.family === 'QuoteRequest' ? 'Progress of a quote being sought for the job'
            : 'Where the job itself has got to';
          return el('tr', {}, [el('td', {}, [el('b', { text: t.name })]), el('td', { text: fam }), el('td', { text: meaning })]);
        }))
      ]), 'Tags are applied and removed by the workflow engine as the supplier/order side progresses — they are read-only markers, not user actions.');
    }

    /* Response categories — the SLA promise behind each priority */
    if ((hd.responseCategories || []).length) {
      var fmtRC = function (c) {
        var r = c.initialResponseHours ? c.initialResponseHours + ' h' : (c.initialResponseDays ? c.initialResponseDays + ' d' : '—');
        var pr = c.permanentRepairHours ? c.permanentRepairHours + ' h' : (c.permanentRepairDays ? c.permanentRepairDays + ' d' : '—');
        return el('tr', {}, [
          el('td', {}, [el('b', { text: c.name })]), el('td', { text: r }), el('td', { text: pr }),
          el('td', { text: c.supplier || '' }), el('td', { text: c.orderPriority || '' }),
          el('td', {}, c.anomaly ? [el('span', { class: 'warn-text', text: '⚠ ' + c.anomaly })] : [])
        ]);
      };
      section('Response categories (' + hd.responseCategories.length + ') — the SLA promise per priority',
        el('table', { class: 'list' }, [
          el('thead', {}, [el('tr', {}, ['Category', 'Initial response', 'Permanent repair', 'Delivered by', 'Order priority', ''].map(function (h) { return el('th', { text: h }); }))]),
          el('tbody', {}, hd.responseCategories.map(fmtRC))
        ]),
        'Each category pairs a helpdesk priority with the order priority the supplier is measured against. Initial response = first attendance; permanent repair = full fix.');
    }

    section('Shared configuration facts', el('ul', {}, (hd.sharedConfiguration || []).map(function (s) {
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
