/* grid.js — the Matrix: one row per Action, sortable/filterable, the
 * precise-inspection projection of the same model as the Diagram.
 * Read-only in VANILLA; the same component gains safe inline edits in
 * DESIGN mode later.
 */
(function () {
  'use strict';

  var state = { type: 'All', search: '', sortKey: 'code', sortDir: 1 };

  var COLS = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'group', label: 'Group' },
    { key: 'applicability', label: 'Applies to' },
    { key: 'availCount', label: 'Available in', title: 'Statuses offering this action' },
    { key: 'resulting', label: 'Resulting status' },
    { key: 'userSelects', label: 'User selects' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'email', label: 'Email' },
    { key: 'tags', label: 'Tag automation' },
    { key: 'machine', label: 'Machine-fired' }
  ];

  function project(model) {
    return model.helpdesk.actions
      .filter(function (a) {
        if (state.type !== 'All' && a.types.indexOf(state.type) === -1) return false;
        if (state.search && a.name.toLowerCase().indexOf(state.search.toLowerCase()) === -1) return false;
        return true;
      })
      .map(function (a) {
        var avail = model.helpdesk.availability.filter(function (e) {
          return e.action === a.name && (state.type === 'All' || e.type === state.type);
        });
        var availNames = [];
        avail.forEach(function (e) { if (availNames.indexOf(e.status) === -1) availNames.push(e.status); });
        var results = model.helpdesk.results.filter(function (r) {
          return r.action === a.name && (state.type === 'All' || r.type === state.type);
        });
        var sets = [], selects = [];
        results.forEach(function (r) {
          var arr = r.kind === 'sets' ? sets : selects;
          if (arr.indexOf(r.toStatus) === -1) arr.push(r.toStatus);
        });
        return {
          action: a,
          code: a.code,
          name: a.name.replace(/^[A-Z0-9]+[a-z]?\.\s*/, ''),
          group: a.buttonGroup || '—',
          applicability: a.applicability,
          availCount: availNames.length,
          availNames: availNames,
          resulting: sets.join(' · ') || '—',
          userSelects: selects.length ? selects.join(' · ') : '',
          mobile: a.mobileAvailable,
          supplier: a.flags.indexOf('supplier_assignment') !== -1,
          email: a.flags.some(function (f) { return f.indexOf('email') !== -1; }),
          tags: (a.addsTags.length ? '+' + a.addsTags.length : '') +
                (a.removesTags.length ? ' −' + a.removesTags.length : '') || '',
          machine: a.machineFired
        };
      })
      .sort(function (x, y) {
        var a = x[state.sortKey], b = y[state.sortKey];
        if (typeof a === 'boolean') { a = a ? 1 : 0; b = b ? 1 : 0; }
        if (a < b) return -state.sortDir;
        if (a > b) return state.sortDir;
        return 0;
      });
  }

  function render(container, model, opts) {
    var el = window.StudioDom.el;
    var editable = opts && opts.editable;
    window.StudioDom.clear(container);
    var page = el('div', { class: 'page wide' });
    container.appendChild(page);

    function rerender() { render(container, model, opts); }

    page.appendChild(el('div', { class: 'toolstrip' }, [
      el('label', { text: 'Type' }),
      el('span', { class: 'seg' }, ['All', 'Reactive', 'Planned'].map(function (o) {
        return el('button', { class: o === state.type ? 'on' : '', text: o, onclick: function () { state.type = o; rerender(); } });
      })),
      el('input', {
        type: 'search', placeholder: 'Filter actions…', value: state.search,
        oninput: function (e) { state.search = e.target.value; rerender(); }
      }),
      el('span', { style: 'flex:1' }),
      el('span', { class: 'map-legend', text: editable
        ? 'Mobile is editable inline · click a row for full editing · click a header to sort'
        : 'Click a row for full detail · click a header to sort' })
    ]));

    var rows = project(model);
    var scroller = el('div', { style: 'flex:1;overflow:auto;padding:0 22px 30px' });
    page.appendChild(scroller);

    var thead = el('thead', {}, [el('tr', {}, COLS.map(function (c) {
      return el('th', {
        text: c.label + (state.sortKey === c.key ? (state.sortDir === 1 ? ' ▲' : ' ▼') : ''),
        title: c.title || '',
        style: 'cursor:pointer;white-space:nowrap;position:sticky;top:0',
        onclick: function () {
          if (state.sortKey === c.key) state.sortDir = -state.sortDir;
          else { state.sortKey = c.key; state.sortDir = 1; }
          rerender();
        }
      });
    }))]);

    var tbody = el('tbody', {}, rows.map(function (r) {
      function tick(v) { return v ? '✔' : ''; }
      return el('tr', {
        style: 'cursor:pointer',
        onclick: function () {
          window.StudioInspector.showAction(model, r.action.name,
            editable ? { editable: true, onChange: opts.onChange } : undefined);
        }
      }, [
        el('td', {}, [el('code', { text: r.code })]),
        el('td', { text: r.name }),
        el('td', { text: r.group }),
        el('td', { text: r.applicability }),
        el('td', { title: r.availNames.join(', '), text: r.availCount ? String(r.availCount) : '—' }),
        el('td', { text: r.resulting }),
        el('td', { text: r.userSelects }),
        editable ? el('td', {}, [el('input', {
          type: 'checkbox', checked: r.mobile ? 'checked' : null,
          onclick: function (ev) { ev.stopPropagation(); },
          onchange: function (ev) {
            window.StudioModel.modifyAction(r.action.name, { mobileAvailable: ev.target.checked });
            opts.onChange();
          }
        })]) : el('td', { text: tick(r.mobile) }),
        el('td', { text: tick(r.supplier) }),
        el('td', { text: tick(r.email) }),
        el('td', { text: r.tags }),
        el('td', { text: tick(r.machine) })
      ]);
    }));

    scroller.appendChild(el('table', { class: 'list' }, [thead, tbody]));
    scroller.insertBefore(
      el('p', { class: 'muted', style: 'font-size:12px', text: rows.length + ' actions shown. Availability counts reflect the current Type filter.' }),
      scroller.firstChild
    );
  }

  window.StudioGrid = { render: render, _state: state };
})();
