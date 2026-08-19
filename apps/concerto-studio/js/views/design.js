/* design.js — DESIGN mode: fork Vanilla into an editable desired state and
 * edit it on the same Diagram component (drag to move availability,
 * Alt-drag to copy, ✕ to remove, drag column headers to reorder,
 * + Status to add). Every edit is one undo step; the Deviation Schedule
 * is computed live against the immutable Vanilla baseline.
 */
(function () {
  'use strict';

  var panelState = { showSchedule: false, restoredChecked: false };

  function render(container, vanilla) {
    var el = window.StudioDom.el;
    var M = window.StudioModel;
    window.StudioDom.clear(container);

    function rerender() { render(container, vanilla); }

    /* one-time: offer to restore an autosaved design */
    if (!M.hasFork() && !panelState.restoredChecked) {
      panelState.restoredChecked = true;
      if (M.restore(vanilla)) { rerender(); return; }
    }

    if (!M.hasFork()) {
      container.appendChild(el('div', { class: 'page' }, [
        el('div', { class: 'stub' }, [
          el('h3', { text: 'Design a customer configuration' }),
          el('p', { text: 'DESIGN forks the immutable Vanilla baseline into an editable desired state. Vanilla itself is never modified — every change you make becomes an explicit deviation, computed live against the pinned baseline.' }),
          el('p', {}, [
            el('button', {
              class: 'btn', style: 'font-weight:600',
              text: 'Fork Vanilla → start designing',
              onclick: function () { M.fork(vanilla); rerender(); }
            }),
            document.createTextNode('  '),
            el('button', {
              class: 'btn', text: 'Import CUSTOMER-DESIRED-STATE.json…',
              onclick: function () { document.getElementById('designImportFile').click(); }
            })
          ]),
          el('input', {
            type: 'file', id: 'designImportFile', accept: '.json,application/json', hidden: 'hidden',
            onchange: function (ev) {
              var f = ev.target.files[0];
              if (!f) return;
              f.text().then(function (text) {
                try {
                  var warning = M.importJson(text, vanilla);
                  if (warning) window.alert(warning);
                  rerender();
                } catch (e) { window.alert('Import failed: ' + e.message); }
              });
            }
          })
        ])
      ]));
      return;
    }

    var desired = M.desired();
    var diff = window.StudioDiff.compare(vanilla, desired);
    var schedule = window.StudioDiff.deviationSchedule(diff);

    function onChange() { rerender(); }

    var page = el('div', { class: 'page wide' });
    container.appendChild(page);

    page.appendChild(el('div', { class: 'toolstrip' }, [
      el('button', { class: 'btn', text: '↶ Undo', disabled: M.canUndo() ? null : 'disabled', onclick: function () { M.undo(); rerender(); } }),
      el('button', { class: 'btn', text: '↷ Redo', disabled: M.canRedo() ? null : 'disabled', onclick: function () { M.redo(); rerender(); } }),
      el('span', {
        class: 'src-chip' + (diff.isEmpty ? '' : ' '),
        html: diff.isEmpty
          ? 'No deviations from Vanilla yet'
          : '<b>' + diff.summary.added + '</b> added · <b>' + diff.summary.removed + '</b> removed · <b>' + diff.summary.modified + '</b> modified'
      }),
      el('button', {
        class: 'btn', text: panelState.showSchedule ? 'Hide deviation schedule' : 'Show deviation schedule (' + schedule.length + ')',
        onclick: function () { panelState.showSchedule = !panelState.showSchedule; rerender(); }
      }),
      el('span', { style: 'flex:1' }),
      el('button', {
        class: 'btn', text: 'Export design JSON',
        onclick: function () {
          var blob = new Blob([M.exportJson()], { type: 'application/json' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'CUSTOMER-DESIRED-STATE.json';
          a.click();
          URL.revokeObjectURL(a.href);
        }
      }),
      el('button', {
        class: 'btn', text: 'Discard design',
        onclick: function () {
          if (window.confirm('Discard this design entirely? The Vanilla baseline is unaffected; this removes the fork and its autosave.')) {
            M.discard();
            rerender();
          }
        }
      })
    ]));

    if (panelState.showSchedule) {
      var body = el('tbody', {}, schedule.length ? schedule.map(function (r) {
        return el('tr', {}, [
          el('td', {}, [el('span', {
            class: 'conf-chip' + (r.kind === 'ADDED' ? ' observed' : r.kind === 'REMOVED' ? '' : ' parsed'),
            text: r.kind
          })]),
          el('td', { text: r.object }),
          el('td', { text: r.detail })
        ]);
      }) : [el('tr', {}, [el('td', { colspan: '3', text: 'No deviations — the design is identical to Vanilla.' })])]);
      page.appendChild(el('div', { style: 'padding:14px 22px;max-height:260px;overflow:auto;border-bottom:1px solid var(--border);background:var(--surface)' }, [
        el('table', { class: 'list' }, [
          el('thead', {}, [el('tr', {}, [el('th', { text: '' }), el('th', { text: 'Object' }), el('th', { text: 'Deviation' })])]),
          body
        ])
      ]));
    }

    var boardHost = el('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' });
    page.appendChild(boardHost);
    window.StudioDiagram.render(boardHost, desired, { editable: true, onChange: onChange });
  }

  window.StudioDesign = { render: render };
})();
