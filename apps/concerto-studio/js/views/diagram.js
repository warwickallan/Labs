/* diagram.js — the Vanilla workflow diagram: one column per Status, one
 * card per Action available in that Status. Read-only projection of the
 * frozen Vanilla model (the same component will later render the editable
 * desired-state model in DESIGN mode).
 */
(function () {
  'use strict';

  var D = function () { return window.StudioDom; };

  /* view state survives page switches within the session */
  var state = {
    type: 'All',            /* All | Reactive | Planned */
    surface: 'All',         /* All | Mobile | Supplier */
    detail: 'simple',       /* simple | technical */
    search: '',
    collapsed: {},          /* statusName -> true */
    zoom: 1,
    selected: null          /* action name */
  };

  function actionMatches(a) {
    if (state.surface === 'Mobile' && !a.mobileAvailable) return false;
    if (state.surface === 'Supplier' && a.flags.indexOf('supplier_assignment') === -1) return false;
    if (state.search) {
      var q = state.search.toLowerCase();
      if (a.name.toLowerCase().indexOf(q) === -1) return false;
    }
    return true;
  }

  function typeVisible(t) { return state.type === 'All' || state.type === t; }

  function resultChip(model, action) {
    var el = D().el;
    var results = model.helpdesk.results.filter(function (r) {
      return r.action === action.name && typeVisible(r.type);
    });
    if (!results.length) return el('div', { class: 'dresult', text: 'no status change' });
    var seen = {}, parts = [];
    results.forEach(function (r) {
      var label = (r.kind === 'userSelects' ? 'user selects · ' : '') + r.toStatus;
      if (!seen[label]) { seen[label] = true; parts.push({ label: label, kind: r.kind }); }
    });
    var chip = el('div', { class: 'dresult' + (parts[0].kind === 'userSelects' ? ' userselects' : '') });
    parts.forEach(function (p, i) {
      if (i > 0) chip.appendChild(document.createTextNode('  ·  '));
      chip.appendChild(el('span', { class: 'arrow', text: '→ ' }));
      chip.appendChild(document.createTextNode(p.label));
    });
    return chip;
  }

  function card(model, action, rerender) {
    var el = D().el;
    var badges = window.StudioSchema.actionBadges(action);
    if (state.detail === 'simple') {
      badges = badges.filter(function (b) {
        return ['mobile', 'supplier', 'machine', 'email'].indexOf(b.kind) !== -1;
      });
    }
    var c = el('div', {
      class: 'dcard' + (state.selected === action.name ? ' selected' : ''),
      onclick: function () {
        state.selected = action.name;
        window.StudioInspector.showAction(model, action.name);
        rerender();
      }
    }, [
      el('div', { class: 'dname', text: action.name }),
      resultChip(model, action),
      badges.length ? el('div', { class: 'badges' }, badges.map(function (b) {
        return el('span', { class: 'badge ' + b.kind, text: b.label });
      })) : null
    ]);
    return c;
  }

  function column(model, status, rerender) {
    var el = D().el;
    var isCollapsed = !!state.collapsed[status.name];

    var edges = model.helpdesk.availability.filter(function (e) {
      return e.status === status.name && typeVisible(e.type);
    });
    /* dedupe by action when both types contribute the same availability */
    var seen = {}, actions = [];
    edges.forEach(function (e) {
      if (seen[e.action]) return;
      seen[e.action] = true;
      var a = model.helpdesk.actions.filter(function (x) { return x.name === e.action; })[0];
      if (a && actionMatches(a)) actions.push(a);
    });

    var head = el('div', {
      class: 'dcol-head',
      title: isCollapsed ? 'Expand' : 'Click name for details · chevron to collapse',
      onclick: function (ev) {
        if (isCollapsed || ev.target.classList.contains('chev')) {
          state.collapsed[status.name] = !isCollapsed;
          rerender();
        } else {
          window.StudioInspector.showStatus(model, status.name);
        }
      }
    }, [
      el('span', { class: 'chev', text: isCollapsed ? '▸' : '▾', style: 'cursor:pointer;color:var(--text-faint)' }),
      el('span', { text: status.name }),
      status.isDefaultFor.length ? el('span', { class: 'default-star', title: 'Default status for ' + status.isDefaultFor.join(', '), text: '★' }) : null,
      el('span', { class: 'count', text: String(actions.length) })
    ]);

    var col = el('div', { class: 'dcol' + (isCollapsed ? ' collapsed' : '') }, [head]);
    if (!isCollapsed) {
      col.appendChild(el('div', { class: 'dcol-cards' },
        actions.map(function (a) { return card(model, a, rerender); })));
    }
    return col;
  }

  function machineColumn(model, rerender) {
    var el = D().el;
    var name = 'Not allocated';
    var isCollapsed = !!state.collapsed[name];
    var actions = model.helpdesk.actions.filter(function (a) {
      var hasAvail = model.helpdesk.availability.some(function (e) { return e.action === a.name; });
      if (hasAvail) return false;
      if (state.type !== 'All' && a.types.indexOf(state.type) === -1) return false;
      return actionMatches(a);
    });
    var head = el('div', {
      class: 'dcol-head',
      title: 'Actions with no status allocation — machine-fired or hidden (U-004, VI-007)',
      onclick: function () { state.collapsed[name] = !isCollapsed; rerender(); }
    }, [
      el('span', { class: 'chev', text: isCollapsed ? '▸' : '▾', style: 'color:var(--text-faint)' }),
      el('span', { text: name }),
      el('span', { class: 'count', text: String(actions.length) })
    ]);
    var col = el('div', { class: 'dcol machine' + (isCollapsed ? ' collapsed' : '') }, [head]);
    if (!isCollapsed) {
      col.appendChild(el('div', { class: 'dcol-cards' },
        actions.map(function (a) { return card(model, a, rerender); })));
    }
    return col;
  }

  function seg(options, current, onPick) {
    var el = D().el;
    return el('span', { class: 'seg' }, options.map(function (o) {
      return el('button', {
        class: o === current ? 'on' : '', text: o,
        onclick: function () { onPick(o); }
      });
    }));
  }

  function render(container, model) {
    var el = D().el;
    D().clear(container);
    var page = el('div', { class: 'page wide' });
    container.appendChild(page);

    function rerender() { render(container, model); }

    page.appendChild(el('div', { class: 'toolstrip' }, [
      el('label', { text: 'Type' }),
      seg(['All', 'Reactive', 'Planned'], state.type, function (v) { state.type = v; rerender(); }),
      el('label', { text: 'Surface' }),
      seg(['All', 'Mobile', 'Supplier'], state.surface, function (v) { state.surface = v; rerender(); }),
      el('label', { text: 'Detail' }),
      seg(['simple', 'technical'], state.detail, function (v) { state.detail = v; rerender(); }),
      el('input', {
        type: 'search', placeholder: 'Filter actions…', value: state.search,
        oninput: function (e) { state.search = e.target.value; renderBoard(); }
      }),
      el('span', { class: 'spacer', style: 'flex:1' }),
      el('button', { class: 'btn', text: '−', title: 'Zoom out', onclick: function () { state.zoom = Math.max(0.4, state.zoom - 0.1); applyZoom(); } }),
      el('button', { class: 'btn', text: '+', title: 'Zoom in', onclick: function () { state.zoom = Math.min(1.6, state.zoom + 0.1); applyZoom(); } }),
      el('button', { class: 'btn', text: '100%', onclick: function () { state.zoom = 1; applyZoom(); } }),
      el('button', {
        class: 'btn', text: 'Expand all',
        onclick: function () { state.collapsed = {}; rerender(); }
      })
    ]));

    var wrap = el('div', { id: 'diagramWrap' });
    var board = el('div', { id: 'diagramBoard' });
    wrap.appendChild(board);
    page.appendChild(wrap);

    function applyZoom() { board.style.transform = 'scale(' + state.zoom + ')'; }

    function renderBoard() {
      D().clear(board);
      board.appendChild(machineColumn(model, rerender));
      model.helpdesk.statuses.forEach(function (s) {
        if (state.type !== 'All' && s.types.indexOf(state.type) === -1) return;
        board.appendChild(column(model, s, rerender));
      });
      applyZoom();
    }
    renderBoard();

    /* drag-to-pan on the board background */
    var panning = null;
    wrap.addEventListener('mousedown', function (e) {
      if (e.target.closest('.dcard') || e.target.closest('.dcol-head')) return;
      panning = { x: e.clientX, y: e.clientY, left: wrap.scrollLeft, top: wrap.scrollTop };
      wrap.classList.add('panning');
    });
    window.addEventListener('mousemove', function (e) {
      if (!panning) return;
      wrap.scrollLeft = panning.left - (e.clientX - panning.x);
      wrap.scrollTop = panning.top - (e.clientY - panning.y);
    });
    window.addEventListener('mouseup', function () {
      panning = null;
      wrap.classList.remove('panning');
    });

    window.StudioInspector.onClose = function () {
      if (state.selected) { state.selected = null; renderBoard(); }
    };
  }

  window.StudioDiagram = { render: render, _state: state };
})();
