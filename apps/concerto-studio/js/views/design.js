/* design.js — DESIGN: the project design workspace.
 *
 *   PROJECT CURRENT → DESIGN → PROJECT DESIRED
 *
 * A design forks the project's CURRENT configuration, because a customer's
 * desired state is "what we change from where they are now" — not "what we
 * change from the standard product". Vanilla remains the comparison
 * baseline (Compare tab) and is never the parent of a customer design.
 * With no project open, the base IS Vanilla and the flow is unchanged.
 *
 *   CURRENT STATE → DESIRED STATE → DIFF → FINDINGS → BUILD PLAN →
 *   PREVIEW → EXECUTE → VERIFY
 *
 * Build is a function of Design (the action that applies the design), not a
 * separate destination. The Deviation Schedule is computed live against the
 * base the design was forked from.
 */
(function () {
  'use strict';

  var panelState = { tab: 'edit', view: 'diagram', showSchedule: false, restoredChecked: false };

  function promptNewAction(M, onDone) {
    var code = window.prompt('Action code (e.g. RH12):');
    if (!code || !code.trim()) return;
    var name = window.prompt('Action name (e.g. Escalate to manager):');
    if (!name || !name.trim()) return;
    var type = window.prompt('Helpdesk Type — Reactive or Planned:', 'Reactive');
    if (type !== 'Reactive' && type !== 'Planned') return void window.alert('Type must be exactly Reactive or Planned.');
    var group = window.prompt('Button group (blank for none):',
      type === 'Reactive' ? 'Reactive Helpdesk Tasks' : 'Planned Helpdesk Tasks') || '';
    try {
      M.addAction({ code: code.trim(), name: name.trim(), types: [type], group: group.trim() || null });
      onDone();
    } catch (e) { window.alert(e.message); }
  }

  function render(container, base, opts) {
    var el = window.StudioDom.el;
    var M = window.StudioModel;
    opts = opts || {};
    var vanilla = opts.vanilla || base;
    var project = opts.project || null;
    var baseName = project ? project.name + ' current configuration' : 'the Vanilla baseline';
    window.StudioDom.clear(container);
    function rerender() { render(container, base, opts); }

    if (!M.hasFork() && !panelState.restoredChecked) {
      panelState.restoredChecked = true;
      if (M.restore(base)) { rerender(); return; }
    }

    if (!M.hasFork()) {
      container.appendChild(el('div', { class: 'page' }, [
        el('div', { class: 'stub' }, [
          el('h3', { text: project ? 'Design ' + project.name : 'Design against Vanilla' }),
          el('p', { text: 'A design forks ' + baseName + ' into an editable desired state. ' +
            (project ? 'It starts from where this customer actually is, not from the standard product — Vanilla stays available in Compare as the reference. ' : '') +
            'The source is never modified: every change becomes an explicit deviation, computed live against the base it was forked from. Work the flow: Edit → Compare → Findings → Build.' }),
          el('p', {}, [
            el('button', { class: 'btn', style: 'font-weight:600', text: 'Fork ' + (project ? 'current configuration' : 'Vanilla') + ' → start designing', onclick: function () { M.fork(base); rerender(); } }),
            document.createTextNode('  '),
            el('button', { class: 'btn', text: 'Import CUSTOMER-DESIRED-STATE.json…', onclick: function () { document.getElementById('designImportFile').click(); } })
          ]),
          el('input', {
            type: 'file', id: 'designImportFile', accept: '.json,application/json', hidden: 'hidden',
            onchange: function (ev) {
              var f = ev.target.files[0]; if (!f) return;
              f.text().then(function (text) {
                try { var w = M.importJson(text, base); if (w) window.alert(w); rerender(); }
                catch (e) { window.alert('Import failed: ' + e.message); }
              });
            }
          })
        ])
      ]));
      return;
    }

    var desired = M.desired();
    var diff = window.StudioDiff.compare(base, desired);
    function onChange() { rerender(); }

    var page = el('div', { class: 'page wide' });
    container.appendChild(page);

    function tabBtn(id, label) {
      return el('button', { class: panelState.tab === id ? 'on' : '', text: label, onclick: function () { panelState.tab = id; rerender(); } });
    }

    page.appendChild(el('div', { class: 'toolstrip' }, [
      el('span', { class: 'seg' }, [tabBtn('edit', 'Edit'), tabBtn('srd', 'SRD'), tabBtn('compare', 'Compare'), tabBtn('findings', 'Findings'), tabBtn('build', 'Build')]),
      el('span', {
        class: 'src-chip',
        html: diff.isEmpty ? 'No deviations from ' + (project ? 'current' : 'Vanilla') + ' yet'
          : '<b>' + diff.summary.added + '</b> added · <b>' + diff.summary.removed + '</b> removed · <b>' + diff.summary.modified + '</b> modified'
      }),
      el('span', { style: 'flex:1' }),
      el('button', {
        class: 'btn', text: 'Export design JSON',
        onclick: function () {
          var blob = new Blob([M.exportJson()], { type: 'application/json' });
          var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
          a.download = 'CUSTOMER-DESIRED-STATE.json'; a.click(); URL.revokeObjectURL(a.href);
        }
      }),
      el('button', {
        class: 'btn', text: 'Discard design',
        onclick: function () {
          if (window.confirm('Discard this design entirely? The Vanilla baseline is unaffected; this removes the fork and its autosave.')) { M.discard(); rerender(); }
        }
      })
    ]));

    var body = el('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0;overflow:auto' });
    page.appendChild(body);

    if (panelState.tab === 'srd') { window.StudioSRDView.render(body, { vanilla: vanilla, base: base, project: project }); return; }
    if (panelState.tab === 'compare') { window.StudioCompare.render(body, vanilla, { base: base, project: project }); return; }
    if (panelState.tab === 'findings') { window.StudioFindings.render(body, base); return; }
    if (panelState.tab === 'build') {
      /* BUILD = a WORK ORDER for Claude: the grouped deviations become
         numbered steps Claude executes against the instance (or stages,
         when the platform blocks saving), each step tracked to done. */
      var grouped = (window.StudioDiff.groupDeviations || window.StudioDiff.deviationSchedule)(diff);
      var proj = window.StudioProject && window.StudioProject.current();
      body.appendChild(el('div', { class: 'tile', style: 'margin-bottom:12px' }, [
        el('h3', { text: 'Work order' }),
        el('p', { class: 'muted', style: 'margin-top:0', text: grouped.length
          ? grouped.length + ' change' + (grouped.length > 1 ? 's' : '') + ' between CURRENT and this design. Create the work order and tell Claude to execute it.'
          : 'No changes \u2014 the design matches the current instance.' }),
        grouped.length && proj ? el('button', { class: 'btn', text: 'CREATE WORK ORDER', onclick: function () {
          proj.workOrders = proj.workOrders || [];
          var wo = { id: 'WO-' + ('00' + (proj.workOrders.length + 1)).slice(-3), at: new Date().toISOString(),
            status: 'OPEN', steps: grouped.map(function (g, i) { return { n: i + 1, kind: g.kind, object: g.object, detail: g.detail, status: 'PENDING' }; }) };
          proj.workOrders.push(wo);
          window.StudioProject.save(proj.key, { workOrders: proj.workOrders });
          if (window.StudioProject.persist) window.StudioProject.persist(proj.key);
          rerender();
        } }) : null,
        proj && (proj.workOrders || []).length ? el('div', {}, proj.workOrders.slice().reverse().map(function (wo) {
          return el('details', { style: 'margin:8px 0', open: wo.status === 'OPEN' ? 'open' : null }, [
            el('summary', {}, [el('b', { text: wo.id + ' \u00b7 ' + wo.status }), el('span', { class: 'muted', text: ' \u00b7 ' + wo.at.slice(0, 16).replace('T', ' ') + ' \u00b7 ' + wo.steps.length + ' steps' })]),
            el('table', { class: 'list' }, [el('tbody', {}, wo.steps.map(function (st) {
              return el('tr', {}, [
                el('td', { text: String(st.n) }),
                el('td', {}, [el('span', { class: 'conf-chip', text: st.kind })]),
                el('td', { text: st.detail, style: 'font-size:12px' }),
                el('td', {}, [el('span', { class: 'conf-chip' + (st.status === 'DONE' ? ' observed' : ''), text: st.status })])
              ]);
            }))])
          ]);
        })) : null
      ]));
      var engineFold = el('details', { class: 'tile cfg-sec', style: 'margin-bottom:12px' });
      engineFold.appendChild(el('summary', { style: 'cursor:pointer;list-style:none' }, [
        el('b', { text: 'Build engine (validate / compile the staged plan)' })
      ]));
      var buildBox = el('div', { style: 'padding-top:8px' });
      engineFold.appendChild(buildBox);
      body.appendChild(engineFold);
      window.StudioBuild.render(buildBox, base);
      return;
    }

    /* ---- Edit tab ---- */
    var schedule = (window.StudioDiff.groupDeviations || window.StudioDiff.deviationSchedule)(diff);
    body.appendChild(el('div', { class: 'toolstrip' }, [
      el('span', { class: 'seg' }, [
        el('button', { class: panelState.view === 'diagram' ? 'on' : '', text: 'Diagram', onclick: function () { panelState.view = 'diagram'; rerender(); } }),
        el('button', { class: panelState.view === 'grid' ? 'on' : '', text: 'Grid', onclick: function () { panelState.view = 'grid'; rerender(); } })
      ]),
      el('button', { class: 'btn', text: '+ Action', onclick: function () { promptNewAction(M, onChange); } }),
      el('button', { class: 'btn', text: '↶ Undo', disabled: M.canUndo() ? null : 'disabled', onclick: function () { M.undo(); rerender(); } }),
      el('button', { class: 'btn', text: '↷ Redo', disabled: M.canRedo() ? null : 'disabled', onclick: function () { M.redo(); rerender(); } }),
      el('button', { class: 'btn', text: panelState.showSchedule ? 'Hide deviation schedule' : 'Deviation schedule (' + schedule.length + ')', onclick: function () { panelState.showSchedule = !panelState.showSchedule; rerender(); } })
    ]));

    if (panelState.showSchedule) {
      var tbody = el('tbody', {}, schedule.length ? schedule.map(function (r) {
        return el('tr', {}, [
          el('td', {}, [el('span', { class: 'conf-chip' + (r.kind === 'ADDED' ? ' observed' : r.kind === 'REMOVED' ? '' : ' parsed'), text: r.kind })]),
          el('td', { text: r.object }), el('td', { text: r.detail })
        ]);
      }) : [el('tr', {}, [el('td', { colspan: '3', text: 'No deviations — the design is identical to ' + baseName + '.' })])]);
      body.appendChild(el('div', { style: 'padding:14px 22px;max-height:240px;overflow:auto;border-bottom:1px solid var(--border);background:var(--surface)' }, [
        el('table', { class: 'list' }, [el('thead', {}, [el('tr', {}, [el('th', { text: '' }), el('th', { text: 'Object' }), el('th', { text: 'Deviation' })])]), tbody])
      ]));
    }

    var boardHost = el('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' });
    body.appendChild(boardHost);
    if (panelState.view === 'grid') window.StudioGrid.render(boardHost, desired, { editable: true, onChange: onChange });
    else window.StudioDiagram.render(boardHost, desired, { editable: true, onChange: onChange });
  }

  window.StudioDesign = { render: render };
})();
