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
    selected: null,         /* action name */
    present: 'board',       /* board | flow (process-flow journeys) */
    flow: 'reactive',
    flowZoom: 1
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
    var seen = {}, sets = [], selects = [];
    results.forEach(function (r) {
      var k = r.kind + '|' + r.toStatus;
      if (seen[k]) return;
      seen[k] = true;
      (r.kind === 'userSelects' ? selects : sets).push(r.toStatus);
    });
    var chip = el('div', { class: 'dresult' + (!sets.length ? ' userselects' : '') });
    if (sets.length) {
      chip.appendChild(el('span', { class: 'arrow', text: '→ ' }));
      chip.appendChild(document.createTextNode(sets.join(' · ')));
    }
    if (selects.length) {
      if (sets.length) chip.appendChild(document.createTextNode('  ·  '));
      chip.appendChild(el('span', { class: 'arrow', text: '→ ' }));
      /* keep cards calm: many user-select targets compress in simple view */
      var label = (state.detail === 'simple' && selects.length > 2)
        ? 'user selects (' + selects.length + ' statuses)'
        : 'user selects: ' + selects.join(' · ');
      chip.appendChild(document.createTextNode(label));
      chip.title = 'User selects: ' + selects.join(', ');
    }
    return chip;
  }

  function card(model, action, rerender, opts, statusName) {
    var el = D().el;
    var badges = window.StudioSchema.actionBadges(action);
    if (state.detail === 'simple') {
      badges = badges.filter(function (b) {
        return ['mobile', 'supplier', 'machine', 'email'].indexOf(b.kind) !== -1;
      });
    }
    var editable = opts && opts.editable;
    var c = el('div', {
      class: 'dcard' + (state.selected === action.name ? ' selected' : ''),
      'data-action': action.name,
      'data-status': statusName || null,
      draggable: editable ? 'true' : null,
      title: editable ? 'Drag to another status to MOVE availability · Alt-drag to COPY' : null,
      onclick: function () {
        state.selected = action.name;
        window.StudioInspector.showAction(model, action.name,
          editable ? { editable: true, onChange: opts.onChange } : undefined);
        rerender();
      }
    }, [
      el('div', { class: 'dname' }, [
        document.createTextNode(action.name),
        editable && statusName ? el('button', {
          class: 'dcard-remove', title: 'Remove availability from ' + statusName, text: '✕',
          onclick: function (ev) {
            ev.stopPropagation();
            window.StudioModel.removeAvailability(action.name, statusName);
            opts.onChange();
          }
        }) : null
      ]),
      resultChip(model, action),
      badges.length ? el('div', { class: 'badges' }, badges.map(function (b) {
        return el('span', { class: 'badge ' + b.kind, text: b.label });
      })) : null
    ]);
    if (editable) {
      c.addEventListener('dragstart', function (ev) {
        ev.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'action', action: action.name, fromStatus: statusName || null }));
        ev.dataTransfer.effectAllowed = 'copyMove';
      });
    }
    return c;
  }

  function makeDropTarget(colEl, statusName, opts) {
    if (!opts || !opts.editable) return;
    colEl.addEventListener('dragover', function (ev) {
      ev.preventDefault();
      ev.dataTransfer.dropEffect = ev.altKey ? 'copy' : 'move';
      colEl.classList.add('drop-hover');
    });
    colEl.addEventListener('dragleave', function () { colEl.classList.remove('drop-hover'); });
    colEl.addEventListener('drop', function (ev) {
      ev.preventDefault();
      colEl.classList.remove('drop-hover');
      var data;
      try { data = JSON.parse(ev.dataTransfer.getData('text/plain')); } catch (e) { return; }
      if (!data) return;
      if (data.kind === 'action') {
        if (statusName === null) {
          /* dropped on the Not-allocated column = remove this availability */
          if (data.fromStatus) window.StudioModel.removeAvailability(data.action, data.fromStatus);
        } else if (!data.fromStatus || ev.altKey) {
          window.StudioModel.addAvailability(data.action, statusName, typeForAdd(data.action));
        } else if (data.fromStatus !== statusName) {
          window.StudioModel.moveAvailability(data.action, data.fromStatus, statusName, null);
        } else return;
        opts.onChange();
      } else if (data.kind === 'status' && statusName && data.status !== statusName) {
        /* reorder: place the dragged status just before the drop target */
        var target = window.StudioModel.desired().helpdesk.statuses.filter(function (s) { return s.name === statusName; })[0];
        if (target) {
          window.StudioModel.reorderStatus(data.status, (target.displayOrder || 0) - 1);
          opts.onChange();
        }
      }
    });
  }

  function typeForAdd(actionName) {
    /* when copying availability, default to the action's own first type */
    var m = window.StudioModel.desired();
    var a = m.helpdesk.actions.filter(function (x) { return x.name === actionName; })[0];
    return a && a.types.length ? a.types[0] : 'Reactive';
  }

  function column(model, status, rerender, opts) {
    var el = D().el;
    var isCollapsed = !!state.collapsed[status.name];
    var editable = opts && opts.editable;

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
      'data-status': status.name,
      draggable: editable ? 'true' : null,
      title: isCollapsed ? 'Expand' : (editable ? 'Drag to reorder · click name for details' : 'Click name for details · chevron to collapse'),
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
      editable ? el('button', {
        class: 'dcard-remove', title: 'Remove this status (and its relationships) from the design', text: '✕',
        onclick: function (ev) {
          ev.stopPropagation();
          if (window.confirm('Remove status "' + status.name + '" and every relationship touching it from the design? (Undo is available.)')) {
            window.StudioModel.removeStatus(status.name);
            opts.onChange();
          }
        }
      }) : null,
      el('span', { class: 'count', text: String(actions.length) })
    ]);
    if (editable) {
      head.addEventListener('dragstart', function (ev) {
        ev.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'status', status: status.name }));
      });
    }

    var col = el('div', { class: 'dcol' + (isCollapsed ? ' collapsed' : '') }, [head]);
    makeDropTarget(col, status.name, opts);
    if (!isCollapsed) {
      col.appendChild(el('div', { class: 'dcol-cards' },
        actions.map(function (a) { return card(model, a, rerender, opts, status.name); })));
    }
    return col;
  }

  function machineColumn(model, rerender, opts) {
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
    makeDropTarget(col, null, opts);
    if (!isCollapsed) {
      col.appendChild(el('div', { class: 'dcol-cards' },
        actions.map(function (a) { return card(model, a, rerender, opts, null); })));
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

  /* ---- FLOW presentation ------------------------------------------------
   * The same model drawn as a Bellrock-style process-flow journey (see
   * References/Process Flows): swimlanes, numbered steps, owner chips.
   * The Board answers "what is configured"; the Flow answers "what is the
   * journey". Printable via a standalone landscape page.
   */
  var FLOW_LABELS = [['Reactive', 'Reactive job'], ['Planned', 'Planned (PPM) job']];

  function cssEsc(s) { return String(s).replace(/["\\]/g, '\\$&'); }

  /* The second layer: click a milestone, see exactly what a job can do there
   * — every action, where it leads, and how it leaves the happy path. This is
   * the detail that stays OFF the diagram until asked for. */
  function statusDetailCard(el, model, name, detail) {
    detail = detail || { actions: [], exits: [] };
    var forward = detail.actions.filter(function (a) { return a.to && detail.exits.indexOf(a) === -1; });
    var noChange = detail.actions.filter(function (a) { return !a.to; });
    function row(a) {
      return el('tr', {}, [
        el('td', {}, [el('b', { text: a.code || '' })]),
        el('td', { text: a.verb }),
        el('td', {}, [a.to ? el('span', { text: '→ ' + a.to }) : el('span', { class: 'muted', text: 'no status change' })])
      ]);
    }
    return el('div', { class: 'tile', style: 'margin:14px 0' }, [
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, [
        el('h3', { text: 'At “' + name + '” a job can…', style: 'margin:0' }),
        el('button', { class: 'btn', style: 'font-size:12px', text: 'Open full status detail', onclick: function () { window.StudioInspector.showStatus(model, name); } })
      ]),
      detail.actions.length ? el('table', { class: 'list', style: 'margin-top:10px' }, [
        el('tbody', {}, [].concat(
          forward.length ? [el('tr', {}, [el('td', { colspan: '3', class: 'muted', style: 'font-size:11px', text: 'MOVES THE JOB ON' })])] : [],
          forward.map(row),
          detail.exits.length ? [el('tr', {}, [el('td', { colspan: '3', class: 'muted', style: 'font-size:11px', text: 'LEAVES THE HAPPY PATH' })])] : [],
          detail.exits.map(row),
          noChange.length ? [el('tr', {}, [el('td', { colspan: '3', class: 'muted', style: 'font-size:11px', text: 'ADMIN / IN-PLACE (no status change)' })])] : [],
          noChange.map(row)
        ))
      ]) : el('p', { class: 'muted', text: 'No actions recorded here.' })
    ]);
  }

  function renderFlow(page, model, rerender) {
    var el = D().el;
    if (!state.flowType) state.flowType = 'Reactive';
    page.appendChild(el('div', { class: 'toolstrip' }, [
      el('span', { class: 'seg' }, [
        el('button', { text: 'Board', onclick: function () { state.present = 'board'; rerender(); } }),
        el('button', { class: 'on', text: 'Life of a job' })
      ]),
      el('span', { class: 'seg' }, FLOW_LABELS.map(function (f) {
        return el('button', {
          class: state.flowType === f[0] ? 'on' : '', text: f[1],
          onclick: function () { state.flowType = f[0]; state.flowOpen = null; rerender(); }
        });
      })),
      el('span', { style: 'flex:1' }),
      el('button', { class: 'btn', text: '−', title: 'Zoom out', onclick: function () { state.flowZoom = Math.max(0.4, (state.flowZoom || 1) - 0.15); apply(); } }),
      el('button', { class: 'btn', text: '+', title: 'Zoom in', onclick: function () { state.flowZoom = Math.min(2.5, (state.flowZoom || 1) + 0.15); apply(); } }),
      el('button', { class: 'btn', text: 'Fit', onclick: function () { state.flowZoom = 1; apply(); } }),
      el('button', {
        class: 'btn', text: 'Open for printing',
        title: 'All five journeys, one per landscape A4 page — use the browser’s Print for a PDF',
        onclick: function () {
          var w = window.open('', '_blank');
          var body = FLOW_LABELS.map(function (f) {
            var o = window.StudioLifeFlow.render(model, f[0]);
            return o.missing ? '' : '<h2>' + f[1] + '</h2>' + o.svg;
          }).join('<div style="page-break-after:always"></div>');
          w.document.write('<!doctype html><meta charset="utf-8"><title>Life of a job — process flows</title>' +
            '<style>body{font-family:Segoe UI,Arial,sans-serif;margin:24px}h2{color:#0e3e33}svg{max-width:100%}@media print{h2{page-break-before:always}}</style>' + body);
          w.document.close();
        }
      })
    ]));

    var wrap = el('div', { id: 'diagramWrap', style: 'padding:18px' });
    var host = el('div', { id: 'flowHost', style: 'transform-origin:0 0;margin:0 auto;max-width:1000px' });
    var detailHost = el('div', { id: 'flowDetail', style: 'max-width:1000px;margin:0 auto' });
    wrap.appendChild(host);
    wrap.appendChild(detailHost);
    page.appendChild(wrap);
    function apply() { host.style.transform = 'scale(' + (state.flowZoom || 1) + ')'; }

    var out = window.StudioLifeFlow.render(model, state.flowType);
    if (out.missing) {
      host.appendChild(el('p', { class: 'muted', style: 'text-align:center', text: 'This job type has no reachable lifecycle in this configuration yet.' }));
    } else {
      host.innerHTML = out.svg;
      var openStatus = function (name) {
        state.flowOpen = state.flowOpen === name ? null : name;
        D().clear(detailHost);
        if (state.flowOpen) detailHost.appendChild(statusDetailCard(el, model, name, out.detail[name]));
        host.querySelectorAll('[data-status] rect').forEach(function (r) { r.setAttribute('stroke-width', '1.3'); });
        if (state.flowOpen) { var g = host.querySelector('[data-status="' + cssEsc(state.flowOpen) + '"] rect'); if (g) g.setAttribute('stroke-width', '3'); }
      };
      host.querySelectorAll('[data-status]').forEach(function (g) {
        g.addEventListener('click', function () { openStatus(g.getAttribute('data-status')); });
      });
      if (state.flowOpen && out.detail[state.flowOpen]) detailHost.appendChild(statusDetailCard(el, model, state.flowOpen, out.detail[state.flowOpen]));
    }
    apply();

    /* drag-to-pan, same feel as the board */
    var panning = null;
    wrap.addEventListener('mousedown', function (e) {
      panning = { x: e.clientX, y: e.clientY, left: wrap.scrollLeft, top: wrap.scrollTop };
      wrap.classList.add('panning');
    });
    window.addEventListener('mousemove', function (e) {
      if (!panning) return;
      wrap.scrollLeft = panning.left - (e.clientX - panning.x);
      wrap.scrollTop = panning.top - (e.clientY - panning.y);
    });
    window.addEventListener('mouseup', function () { panning = null; wrap.classList.remove('panning'); });
  }

  function render(container, model, opts) {
    if (window.StudioSchema && window.StudioSchema.completeModel) model = window.StudioSchema.completeModel(model);
    var el = D().el;
    D().clear(container);
    var page = el('div', { class: 'page wide' });
    container.appendChild(page);

    function rerender() { render(container, model, opts); }

    /* FLOW presentation replaces the whole page (read-only journeys);
     * the editable design board never shows it. */
    if (state.present === 'flow' && !(opts && opts.editable) && window.StudioFlow) {
      renderFlow(page, model, rerender);
      return;
    }

    page.appendChild(el('div', { class: 'toolstrip' }, [
      (!(opts && opts.editable) && window.StudioFlow) ? el('span', { class: 'seg' }, [
        el('button', { class: 'on', text: 'Board' }),
        el('button', { text: 'Flow', onclick: function () { state.present = 'flow'; rerender(); } })
      ]) : null,
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
      board.appendChild(machineColumn(model, rerender, opts));
      /* Suppressed statuses are configuration noise: hidden from use in the
         instance, so never drawn. They remain in the model and Configuration
         names them as deletable candidates. */
      model.helpdesk.statuses.filter(function (s) { return !s.suppressed; }).forEach(function (s) {
        if (state.type !== 'All' && s.types.indexOf(state.type) === -1) return;
        board.appendChild(column(model, s, rerender, opts));
      });
      if (opts && opts.editable) {
        board.appendChild(el('div', { class: 'dcol' }, [
          el('button', {
            class: 'btn add-status', text: '+ Status',
            onclick: function () {
              var name = window.prompt('Name for the new status:');
              if (!name || !name.trim()) return;
              var type = window.prompt('Helpdesk Type for the new status — Reactive or Planned:', 'Reactive');
              if (type !== 'Reactive' && type !== 'Planned') return void window.alert('Type must be exactly Reactive or Planned.');
              window.StudioModel.addStatus(name.trim(), [type]);
              opts.onChange();
            }
          })
        ]));
      }
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
