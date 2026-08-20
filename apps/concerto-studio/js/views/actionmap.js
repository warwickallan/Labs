/* actionmap.js — the Action Map: AVAILABLE FROM | ACTION | RESULTS IN.
 * Recreates the semantics of Concerto's Action/status map without its
 * visual chaos: the default view draws NO edges; hovering or pinning a
 * status/action lights only its own relationships. Overlays opt into the
 * more technical layers (user-selects, machine-fired/trigger edges).
 */
(function () {
  'use strict';

  var D = function () { return window.StudioDom; };

  var COLORS = {
    availability: '#8fa3b8',
    sets: '#0f766e',
    userSelects: '#b45309',
    machine: '#7e22ce'
  };

  var state = {
    type: 'All',
    search: '',
    showMachine: false,   /* persistently draw machine-fired sets-edges */
    pinned: null          /* {kind:'action'|'from'|'to', name} */
  };

  function typeVisible(t) { return state.type === 'All' || state.type === t; }

  function render(container, model) {
    if (window.StudioSchema && window.StudioSchema.completeModel) model = window.StudioSchema.completeModel(model);
    var el = D().el;
    D().clear(container);
    var page = el('div', { class: 'page wide' });
    container.appendChild(page);

    function rerender() { render(container, model); }

    /* ---- data projections ---- */
    var avail = model.helpdesk.availability.filter(function (e) { return typeVisible(e.type); });
    var results = model.helpdesk.results.filter(function (r) { return typeVisible(r.type); });

    var actions = model.helpdesk.actions.filter(function (a) {
      if (state.type !== 'All' && a.types.indexOf(state.type) === -1) return false;
      if (state.search && a.name.toLowerCase().indexOf(state.search.toLowerCase()) === -1) return false;
      return true;
    });
    var actionVisible = {};
    actions.forEach(function (a) { actionVisible[a.name] = true; });

    var fromStatuses = model.helpdesk.statuses.filter(function (s) {
      return state.type === 'All' || s.types.indexOf(state.type) !== -1;
    });
    var toStatuses = fromStatuses;

    /* ---- toolstrip ---- */
    page.appendChild(el('div', { class: 'toolstrip' }, [
      el('label', { text: 'Type' }),
      el('span', { class: 'seg' }, ['All', 'Reactive', 'Planned'].map(function (o) {
        return el('button', { class: o === state.type ? 'on' : '', text: o, onclick: function () { state.type = o; state.pinned = null; rerender(); } });
      })),
      el('input', {
        type: 'search', placeholder: 'Filter actions…', value: state.search,
        oninput: function (e) { state.search = e.target.value; rerender(); }
      }),
      el('label', { class: 'check' }, [
        el('input', {
          type: 'checkbox',
          onchange: function (e) { state.showMachine = e.target.checked; draw(); }
        }),
        document.createTextNode('Machine-fired / trigger edges')
      ]),
      el('span', { style: 'flex:1' }),
      el('span', { class: 'map-legend' }, [
        el('span', { class: 'k' }, [el('span', { class: 'swatch', style: 'border-color:' + COLORS.availability }), document.createTextNode('available in')]),
        el('span', { class: 'k' }, [el('span', { class: 'swatch', style: 'border-color:' + COLORS.sets }), document.createTextNode('sets status')]),
        el('span', { class: 'k' }, [el('span', { class: 'swatch', style: 'border-color:' + COLORS.userSelects + ';border-top-style:dashed' }), document.createTextNode('user selects')]),
        el('span', { class: 'k' }, [el('span', { class: 'swatch', style: 'border-color:' + COLORS.machine + ';border-top-style:dotted' }), document.createTextNode('machine-fired')])
      ])
    ]));

    /* ---- lanes ---- */
    var wrap = el('div', { id: 'mapWrap' });
    var lanes = el('div', { id: 'mapLanes', style: 'position:relative' });
    wrap.appendChild(lanes);
    page.appendChild(wrap);

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'mapSvg';
    lanes.appendChild(svg);

    var fromRows = {}, actionRows = {}, toRows = {};

    function lane(title, items, rowsMap, kind, labelFn, subFn, clickFn) {
      var l = el('div', { class: 'lane' }, [el('h4', { text: title })]);
      items.forEach(function (it) {
        var name = labelFn(it);
        var row = el('div', {
          class: 'lrow',
          'data-action': kind === 'action' ? name : null,
          'data-status': kind === 'action' ? null : name
        }, [
          document.createTextNode(name),
          subFn && subFn(it) ? el('small', { text: subFn(it) }) : null
        ]);
        row.addEventListener('mouseenter', function () { if (!state.pinned) light({ kind: kind, name: name }); });
        row.addEventListener('mouseleave', function () { if (!state.pinned) light(null); });
        row.addEventListener('click', function (ev) {
          ev.stopPropagation();
          if (state.pinned && state.pinned.kind === kind && state.pinned.name === name) {
            state.pinned = null; light(null);
          } else {
            state.pinned = { kind: kind, name: name };
            light(state.pinned);
            if (clickFn) clickFn(it);
          }
          markPinned();
        });
        rowsMap[name] = row;
        l.appendChild(row);
      });
      return l;
    }

    lanes.appendChild(lane('Available in', fromStatuses, fromRows, 'from',
      function (s) { return s.name; },
      function (s) { return s.isDefaultFor.length ? 'Default status (' + s.isDefaultFor.join(', ') + ')' : null; },
      function (s) { window.StudioInspector.showStatus(model, s.name); }));

    lanes.appendChild(lane('Action', actions, actionRows, 'action',
      function (a) { return a.name; },
      function (a) {
        var bits = [a.buttonGroup || 'no group'];
        if (a.machineFired) bits.push('machine-fired');
        var r = results.filter(function (x) { return x.action === a.name; });
        if (!r.length) bits.push('no status change');
        return bits.join(' · ');
      },
      function (a) { window.StudioInspector.showAction(model, a.name); }));

    lanes.appendChild(lane('Results in', toStatuses, toRows, 'to',
      function (s) { return s.name; },
      null,
      function (s) { window.StudioInspector.showStatus(model, s.name); }));

    wrap.addEventListener('click', function () {
      if (state.pinned) { state.pinned = null; light(null); markPinned(); }
    });

    function markPinned() {
      [fromRows, actionRows, toRows].forEach(function (map) {
        Object.keys(map).forEach(function (k) { map[k].classList.remove('pinned'); });
      });
      if (state.pinned) {
        var map = state.pinned.kind === 'action' ? actionRows : state.pinned.kind === 'from' ? fromRows : toRows;
        if (map[state.pinned.name]) map[state.pinned.name].classList.add('pinned');
      }
    }

    /* ---- edge computation ---- */

    function edgesFor(focus) {
      var out = [];
      function pushAvail(e) {
        if (!actionVisible[e.action] || !fromRows[e.status]) return;
        out.push({ from: fromRows[e.status], to: actionRows[e.action], color: COLORS.availability, dash: null });
      }
      function pushResult(r, machine) {
        if (!actionVisible[r.action] || !toRows[r.toStatus]) return;
        var color = machine ? COLORS.machine : (r.kind === 'userSelects' ? COLORS.userSelects : COLORS.sets);
        var dash = machine ? '2,4' : (r.kind === 'userSelects' ? '6,4' : null);
        out.push({ from: actionRows[r.action], to: toRows[r.toStatus], color: color, dash: dash });
      }
      var machineByAction = {};
      model.helpdesk.actions.forEach(function (a) { machineByAction[a.name] = a.machineFired; });

      if (focus) {
        if (focus.kind === 'action') {
          avail.forEach(function (e) { if (e.action === focus.name) pushAvail(e); });
          results.forEach(function (r) { if (r.action === focus.name) pushResult(r, machineByAction[r.action]); });
        } else if (focus.kind === 'from') {
          avail.forEach(function (e) { if (e.status === focus.name) pushAvail(e); });
          avail.forEach(function (e) {
            if (e.status !== focus.name) return;
            results.forEach(function (r) { if (r.action === e.action) pushResult(r, machineByAction[r.action]); });
          });
        } else if (focus.kind === 'to') {
          results.forEach(function (r) {
            if (r.toStatus !== focus.name) return;
            pushResult(r, machineByAction[r.action]);
            avail.forEach(function (e) { if (e.action === r.action) pushAvail(e); });
          });
        }
      }
      if (state.showMachine && !focus) {
        results.forEach(function (r) { if (machineByAction[r.action]) pushResult(r, true); });
      }
      return out;
    }

    var currentFocus = null;

    function draw() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var w = lanes.scrollWidth, h = lanes.scrollHeight;
      svg.setAttribute('width', w);
      svg.setAttribute('height', h);
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);

      edgesFor(currentFocus).forEach(function (e) {
        var x1 = e.from.offsetLeft + e.from.offsetWidth;
        var y1 = e.from.offsetTop + e.from.offsetHeight / 2;
        var x2 = e.to.offsetLeft;
        var y2 = e.to.offsetTop + e.to.offsetHeight / 2;
        var mx = (x1 + x2) / 2;
        var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', 'M' + x1 + ',' + y1 + ' C' + mx + ',' + y1 + ' ' + mx + ',' + y2 + ' ' + x2 + ',' + y2);
        p.setAttribute('fill', 'none');
        p.setAttribute('stroke', e.color);
        p.setAttribute('stroke-width', '1.6');
        if (e.dash) p.setAttribute('stroke-dasharray', e.dash);
        svg.appendChild(p);
      });
    }

    function light(focus) {
      currentFocus = focus;
      var connected = { from: {}, action: {}, to: {} };
      if (focus) {
        edgesFor(focus); /* side effect free; recompute names below */
        if (focus.kind === 'action') {
          connected.action[focus.name] = true;
          avail.forEach(function (e) { if (e.action === focus.name) connected.from[e.status] = true; });
          results.forEach(function (r) { if (r.action === focus.name) connected.to[r.toStatus] = true; });
        } else if (focus.kind === 'from') {
          connected.from[focus.name] = true;
          avail.forEach(function (e) {
            if (e.status !== focus.name || !actionVisible[e.action]) return;
            connected.action[e.action] = true;
            results.forEach(function (r) { if (r.action === e.action) connected.to[r.toStatus] = true; });
          });
        } else {
          connected.to[focus.name] = true;
          results.forEach(function (r) {
            if (r.toStatus !== focus.name || !actionVisible[r.action]) return;
            connected.action[r.action] = true;
            avail.forEach(function (e) { if (e.action === r.action) connected.from[e.status] = true; });
          });
        }
      }
      function apply(map, set) {
        Object.keys(map).forEach(function (k) {
          map[k].classList.remove('lit', 'dim');
          if (focus) map[k].classList.add(set[k] ? 'lit' : 'dim');
        });
      }
      apply(fromRows, connected.from);
      apply(actionRows, connected.action);
      apply(toRows, connected.to);
      draw();
    }

    draw();
    if (state.pinned) { light(state.pinned); markPinned(); }
  }

  window.StudioActionMap = { render: render, _state: state };
})();
