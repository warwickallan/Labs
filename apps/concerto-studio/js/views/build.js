/* build.js — BUILD: the staged plan compiled from desired vs actual.
 * No target instance exists yet, so the plan previews against the Vanilla
 * baseline (actual = Vanilla) and is honestly non-executable. Receipts
 * and read-back render as designed placeholders.
 */
(function () {
  'use strict';

  var state = { plan: null, showJson: false };

  function render(container, vanilla) {
    var el = window.StudioDom.el;
    var M = window.StudioModel;
    window.StudioDom.clear(container);

    function rerender() { render(container, vanilla); }

    if (!M.hasFork()) {
      container.appendChild(el('div', { class: 'page' }, [
        el('div', { class: 'stub' }, [
          el('h3', { text: 'Build' }),
          el('p', { text: 'BUILD compiles the difference between a desired state and the actual instance into a dependency-ordered, staged operation plan — validated, previewed, and (once the execution adapter exists and is explicitly authorised) executed with receipts and read-back verification.' }),
          el('p', { text: 'There is no design fork yet — create one in DESIGN to have desired-state changes to build.' }),
          el('p', {}, [el('a', { href: '#design', class: 'btn', style: 'text-decoration:none', text: 'Go to Design' })])
        ])
      ]));
      return;
    }

    var diff = window.StudioDiff.compare(vanilla, M.desired());
    var page = el('div', { class: 'page' });
    container.appendChild(page);

    page.appendChild(el('div', { class: 'toolstrip', style: 'border:1px solid var(--border);border-radius:8px;margin-bottom:16px' }, [
      el('span', {
        class: 'src-chip',
        html: 'Target: <b>none connected</b> — previewing against the Vanilla baseline · desired-state changes: ' +
          diff.summary.added + ' added / ' + diff.summary.removed + ' removed / ' + diff.summary.modified + ' modified'
      }),
      el('span', { style: 'flex:1' }),
      el('button', {
        class: 'btn', text: 'Validate',
        onclick: function () { state.plan = window.StudioBuildPlan.compile(diff); state.showJson = false; rerender(); }
      }),
      el('button', {
        class: 'btn', text: 'Preview Build (JSON)',
        onclick: function () { state.plan = window.StudioBuildPlan.compile(diff); state.showJson = true; rerender(); }
      }),
      el('button', { class: 'btn', text: 'BUILD', disabled: 'disabled', title: 'Requires the execution adapter, a connected authorised instance, and explicit per-plan approval — none exist yet' })
    ]));

    if (!state.plan) {
      page.appendChild(el('p', { class: 'muted', text: 'Run Validate or Preview Build to compile the staged plan from the current desired-state changes.' }));
      return;
    }

    var plan = state.plan;

    /* warnings */
    if (plan.warnings.length) {
      page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
        el('h3', { text: 'Validation (' + plan.warnings.length + ')' }),
        el('ul', {}, plan.warnings.map(function (w) {
          return el('li', {}, [
            el('span', { class: 'conf-chip', style: w.severity === 'WARNING' ? 'background:#fef6e0;color:#92650a;border-color:#f0dfae' : '', text: w.severity }),
            document.createTextNode(' ' + w.text)
          ]);
        }))
      ]));
    } else {
      page.appendChild(el('p', { class: 'ok-text', text: '✔ Validation raised no warnings.' }));
    }

    /* unresolved identities */
    if (plan.unresolvedIdentities.length) {
      page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
        el('h3', { text: 'Unresolved identities (' + plan.unresolvedIdentities.length + ')' }),
        el('ul', {}, plan.unresolvedIdentities.map(function (u) {
          return el('li', {}, [el('code', { text: u.key }), document.createTextNode(' — ' + u.reason)]);
        }))
      ]));
    }

    if (state.showJson) {
      page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
        el('h3', { text: 'Plan JSON' }),
        el('pre', { style: 'font:11.5px Consolas,monospace;overflow:auto;max-height:420px;background:var(--surface-2);padding:12px;border-radius:6px;margin:0', text: JSON.stringify(plan, null, 2) })
      ]));
    }

    /* staged operations */
    plan.passes.forEach(function (p) {
      var ops = plan.operations.filter(function (o) { return o.pass === p.pass; });
      if (!ops.length) return;
      page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:14px' }, [
        el('h3', { text: 'Pass ' + p.pass + ' · ' + p.title + ' (' + ops.length + ')' }),
        el('table', { class: 'list' }, [
          el('thead', {}, [el('tr', {}, ['Op', 'Object', 'Target', 'Detail'].map(function (h) { return el('th', { text: h }); }))]),
          el('tbody', {}, ops.map(function (o) {
            return el('tr', {}, [
              el('td', {}, [el('code', { text: o.op })]),
              el('td', { text: o.objectType }),
              el('td', { text: o.target }),
              el('td', { style: 'font-size:12px', text: o.detail })
            ]);
          }))
        ])
      ]));
    });

    /* execution status + receipts placeholders */
    page.appendChild(el('div', { class: 'tile' }, [
      el('h3', { text: 'Execution · receipts · read-back' }),
      el('ul', { class: 'muted', style: 'font-size:12.5px' }, [
        el('li', { text: 'Execution status: NOT EXECUTABLE — ' + plan.executableReason }),
        el('li', { text: 'When execution exists: every run appends one immutable receipt (intended plan fingerprint, executed operations, what Concerto returned, what was read back, whether it matched) to receipts/ (git-ignored).' }),
        el('li', { text: 'Success is defined as pass 6 re-diffing EMPTY — never as "the requests were sent".' })
      ])
    ]));
  }

  window.StudioBuild = { render: render, _state: state };
})();
