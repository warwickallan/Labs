/* design.js — DESIGN: the project design workspace.
 *
 *   PROJECT CURRENT → DESIGN → PROJECT DESIRED
 *
 * The page LEADS with CURRENT — the verified configuration as it stands —
 * because that is the ground truth every proposal is measured against.
 * A design forks the project's CURRENT configuration, because a customer's
 * desired state is "what we change from where they are now" — not "what we
 * change from the standard product". Vanilla remains the comparison
 * baseline (Compare tab) and is never the parent of a customer design.
 * With no project open, the base IS Vanilla and the flow is unchanged.
 *
 *   CURRENT STATE → PROPOSED STATE → DIFF → FINDINGS → BUILD PLAN →
 *   PREVIEW → EXECUTE → VERIFY
 *
 * STALENESS: a fork pins a content fingerprint of the base it was taken
 * from. When a work order is built the current configuration moves on, and
 * an old fork would show REVERSED deviations (built changes as "proposed").
 * The view detects that and says so, instead of showing nonsense.
 *
 * Build is a function of Design (the action that applies the design), not a
 * separate destination. New helpdesk (the from-scratch builder) lives here
 * too — see js/views/hdbuilder.js.
 */
(function () {
  'use strict';

  var panelState = { tab: 'current', view: 'diagram', showSchedule: false, restoredChecked: false };

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

    var hasFork = M.hasFork();
    var desired = hasFork ? M.desired() : null;
    var diff = hasFork ? window.StudioDiff.compare(base, desired) : null;
    var stale = hasFork ? M.staleAgainst(base) : false;
    function onChange() { rerender(); }

    var page = el('div', { class: 'page wide' });
    container.appendChild(page);

    function tabBtn(id, label) {
      return el('button', { class: panelState.tab === id ? 'on' : '', text: label, onclick: function () { panelState.tab = id; rerender(); } });
    }

    var proposedLabel = hasFork
      ? 'Proposed' + (diff && !diff.isEmpty ? ' (' + (diff.summary.added + diff.summary.removed + diff.summary.modified) + ')' : '')
      : 'Proposed';
    page.appendChild(el('div', { class: 'toolstrip' }, [
      el('span', { class: 'seg' }, [
        tabBtn('current', 'Current'),
        tabBtn('edit', proposedLabel),
        tabBtn('builder', 'New helpdesk'),
        tabBtn('srd', 'SRD'),
        tabBtn('compare', 'Compare'),
        tabBtn('findings', 'Findings'),
        tabBtn('build', 'Build')
      ]),
      el('span', {
        class: 'src-chip',
        html: !hasFork ? 'Showing: <b>current configuration</b> — no proposed design yet'
          : stale ? '⚠ proposed design is <b>STALE</b> (forked before the last build)'
          : diff.isEmpty ? 'No deviations from ' + (project ? 'current' : 'Vanilla') + ' yet'
          : '<b>' + diff.summary.added + '</b> added · <b>' + diff.summary.removed + '</b> removed · <b>' + diff.summary.modified + '</b> modified'
      }),
      el('span', { style: 'flex:1' }),
      hasFork ? el('button', {
        class: 'btn', text: 'Export design JSON',
        onclick: function () {
          var blob = new Blob([M.exportJson()], { type: 'application/json' });
          var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
          a.download = 'CUSTOMER-DESIRED-STATE.json'; a.click(); URL.revokeObjectURL(a.href);
        }
      }) : null,
      hasFork ? el('button', {
        class: 'btn', text: 'Discard design',
        onclick: function () {
          if (window.confirm('Discard this design entirely? The base configuration is unaffected; this removes the fork and its autosave.')) { M.discard(); rerender(); }
        }
      }) : null
    ].filter(Boolean)));

    var body = el('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0;overflow:auto' });
    page.appendChild(body);

    /* ---- Current tab: the verified configuration, read-only -------------- */
    if (panelState.tab === 'current') {
      var prov = project
        ? 'CURRENT — ' + project.name + (project.lastCrawlAt ? ', last verified ' + project.lastCrawlAt : '') +
          ((project.changeLog || []).length ? ' · ' + project.changeLog.length + ' recorded change(s)' : '')
        : 'CURRENT — Vanilla baseline (immutable reference)';
      body.appendChild(el('div', { class: 'toolstrip' }, [
        el('span', { class: 'seg' }, [
          el('button', { class: panelState.view === 'diagram' ? 'on' : '', text: 'Diagram', onclick: function () { panelState.view = 'diagram'; rerender(); } }),
          el('button', { class: panelState.view === 'grid' ? 'on' : '', text: 'Grid', onclick: function () { panelState.view = 'grid'; rerender(); } })
        ]),
        el('span', { class: 'src-chip', text: prov }),
        el('span', { style: 'flex:1' }),
        el('span', { class: 'src-chip', text: 'Read-only — propose changes in the Proposed tab' })
      ]));
      var curHost = el('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' });
      body.appendChild(curHost);
      if (panelState.view === 'grid') window.StudioGrid.render(curHost, base, { editable: false });
      else window.StudioDiagram.render(curHost, base, { editable: false });
      return;
    }

    /* ---- New helpdesk (from-scratch builder) ------------------------------ */
    if (panelState.tab === 'builder') {
      if (window.StudioHdBuilderView) {
        window.StudioHdBuilderView.render(body, { vanilla: vanilla, base: base, project: project });
      } else {
        body.appendChild(el('div', { class: 'stub' }, [el('p', { text: 'Builder module not loaded.' })]));
      }
      return;
    }

    if (panelState.tab === 'srd') { window.StudioSRDView.render(body, { vanilla: vanilla, base: base, project: project }); return; }
    if (panelState.tab === 'compare') { window.StudioCompare.render(body, vanilla, { base: base, project: project }); return; }
    if (panelState.tab === 'findings') { window.StudioFindings.render(body, base); return; }

    /* ---- fork-dependent tabs: offer the fork when none exists ------------- */
    if (!hasFork) {
      body.appendChild(el('div', { class: 'stub' }, [
        el('h3', { text: project ? 'Design ' + project.name : 'Design against Vanilla' }),
        el('p', { text: 'A design forks ' + baseName + ' into an editable PROPOSED state. ' +
          (project ? 'It starts from where this customer actually is, not from the standard product — Vanilla stays available in Compare as the reference. ' : '') +
          'The source is never modified: every change becomes an explicit deviation, computed live against the base it was forked from.' }),
        el('p', {}, [
          el('button', { class: 'btn', style: 'font-weight:600', text: 'Fork ' + (project ? 'current configuration' : 'Vanilla') + ' → start designing', onclick: function () { M.fork(base); panelState.tab = 'edit'; rerender(); } }),
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
      ]));
      return;
    }

    /* ---- stale-fork banner ------------------------------------------------ */
    if (stale) {
      body.appendChild(el('div', {
        style: 'padding:12px 22px;background:#fdf3e2;border-bottom:1px solid #e8c37a;display:flex;gap:14px;align-items:center'
      }, [
        el('span', { html: '<b>⚠ This proposed design is stale.</b> It was forked before the current ' +
          'configuration last changed (e.g. a work order was built), so its deviations no longer mean ' +
          'what they say — built changes can appear as still-proposed, or reversed.' }),
        el('span', { style: 'flex:1' }),
        el('button', {
          class: 'btn', style: 'font-weight:600',
          text: 'Re-fork from current',
          onclick: function () {
            if (window.confirm('Discard the stale design and fork the CURRENT configuration afresh? Unbuilt proposals in the stale fork will be lost (export the design JSON first if you want to keep them).')) {
              M.discard(); M.fork(base); rerender();
            }
          }
        })
      ]));
    }

    if (panelState.tab === 'build') {
      var buildBox = el('div', {});
      var engineFold = el('div', { style: 'flex:1;overflow:auto' });
      var grouped = (window.StudioDiff.groupDeviations || window.StudioDiff.deviationSchedule)(diff);
      var proj = project;
      engineFold.appendChild(el('div', { style: 'padding:14px 22px' }, [
        grouped.length && proj ? el('button', { class: 'btn', text: 'CREATE WORK ORDER', onclick: function () {
          var wo = { id: 'WO-' + String((proj.workOrders || []).length + 1).padStart(3, '0'), createdAt: new Date().toISOString(),
            status: 'OPEN', steps: grouped.map(function (g, i) { return { n: i + 1, kind: g.kind, object: g.object, detail: g.detail, status: 'PENDING' }; }) };
          proj.workOrders = proj.workOrders || [];
          proj.workOrders.push(wo);
          if (window.StudioProjects && window.StudioProjects.save) window.StudioProjects.save(proj);
          rerender();
        } }) : null,
        proj && (proj.workOrders || []).length ? el('div', {}, proj.workOrders.slice().reverse().map(function (wo) {
          return el('div', { style: 'margin:10px 0' }, [
            el('h4', { text: wo.id + ' · ' + wo.status + ' · ' + wo.createdAt.slice(0, 16).replace('T', ' ') }),
            el('table', { class: 'list' }, [el('tbody', {}, wo.steps.map(function (st) {
              return el('tr', {}, [
                el('td', { text: '#' + st.n }), el('td', { text: st.kind }),
                el('td', { text: st.object }), el('td', { text: st.detail }), el('td', { text: st.status })
              ]);
            }))])
          ]);
        })) : null
      ].filter(Boolean)));
      engineFold.appendChild(buildBox);
      body.appendChild(engineFold);
      window.StudioBuild.render(buildBox, base);
      return;
    }

    /* ---- Proposed (edit) tab ---------------------------------------------- */
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
