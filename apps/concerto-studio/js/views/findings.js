/* findings.js — the Findings page: computed rule findings (checkbox-
 * selectable where fixable, with a fix-patch preview) plus the register-
 * known findings the models cannot yet compute. No execution path exists
 * yet — the page says so honestly.
 */
(function () {
  'use strict';

  var state = { selected: {}, showPatch: false };

  function catChipClass(cat) {
    if (cat === 'CONFIRMED DEFECT') return 'conf-chip'; /* styled red below */
    return 'conf-chip';
  }

  function render(container, model) {
    var el = window.StudioDom.el;
    window.StudioDom.clear(container);
    var page = el('div', { class: 'page' });
    container.appendChild(page);

    function rerender() { render(container, model); }

    var findings = window.StudioRules.runAll(model);
    var fixable = findings.filter(function (f) { return f.fixable; });
    var selectedFindings = fixable.filter(function (f, i) { return state.selected[f.ruleId + '|' + f.objectKey]; });

    page.appendChild(el('p', { class: 'muted' }, [
      document.createTextNode('Every finding below is produced by an explicit, evidence-referenced rule run against the loaded Vanilla model (the same rules will run against crawled instances). '),
      el('b', {}, ['Fix execution is not yet possible']),
      document.createTextNode(' — the execution adapter does not exist; Preview compiles the desired-state patch a build plan would consume.')
    ]));

    /* toolbar */
    page.appendChild(el('div', { class: 'toolstrip', style: 'border:1px solid var(--border);border-radius:8px;margin-bottom:16px' }, [
      el('span', { text: findings.length + ' computed findings · ' + fixable.length + ' fixable · ' + selectedFindings.length + ' selected' }),
      el('span', { style: 'flex:1' }),
      el('button', {
        class: 'btn', text: 'Select all fixable',
        onclick: function () {
          fixable.forEach(function (f) { state.selected[f.ruleId + '|' + f.objectKey] = true; });
          rerender();
        }
      }),
      el('button', {
        class: 'btn', text: 'Clear selection',
        onclick: function () { state.selected = {}; state.showPatch = false; rerender(); }
      }),
      el('button', {
        class: 'btn', text: state.showPatch ? 'Hide fix preview' : 'Preview fix (' + selectedFindings.length + ')',
        disabled: selectedFindings.length ? null : 'disabled',
        onclick: function () { state.showPatch = !state.showPatch; rerender(); }
      }),
      el('button', { class: 'btn', text: 'Fix selected', disabled: 'disabled', title: 'Requires the browser-harness execution adapter (not yet built) and explicit authorisation' })
    ]));

    if (state.showPatch && selectedFindings.length) {
      var patch = window.StudioRules.compileFixPatch(selectedFindings);
      page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
        el('h3', { text: 'Desired-state patch (preview)' }),
        el('pre', { style: 'font:12px Consolas,monospace;overflow:auto;background:var(--surface-2);padding:12px;border-radius:6px;margin:0', text: JSON.stringify(patch, null, 2) })
      ]));
    }

    /* computed findings table */
    page.appendChild(el('table', { class: 'list', style: 'margin-bottom:22px' }, [
      el('thead', {}, [el('tr', {}, ['', 'Register', 'Category', 'Domain', 'Object', 'Finding', 'Current → Proposed', 'Evidence'].map(function (h) { return el('th', { text: h }); }))]),
      el('tbody', {}, findings.map(function (f) {
        var key = f.ruleId + '|' + f.objectKey;
        return el('tr', {}, [
          el('td', {}, [f.fixable ? el('input', {
            type: 'checkbox',
            checked: state.selected[key] ? 'checked' : null,
            onchange: function (ev) { state.selected[key] = ev.target.checked; rerender(); }
          }) : null]),
          el('td', {}, [el('code', { text: f.register })]),
          el('td', {}, [el('span', { class: catChipClass(f.category) + (f.category === 'CONFIRMED DEFECT' ? '' : ''), style: f.category === 'CONFIRMED DEFECT' ? 'background:#fdeaea;color:var(--danger);border-color:#f5c6c0' : '', text: f.category })]),
          el('td', { text: f.domain }),
          el('td', { text: f.object }),
          el('td', {}, [
            el('div', { text: f.finding }),
            el('div', { class: 'muted', style: 'font-size:11.5px;margin-top:3px', text: f.why })
          ]),
          el('td', {}, [
            el('div', { style: 'font-size:11.5px', text: f.current }),
            el('div', { style: 'font-size:11.5px;color:var(--accent)', text: '→ ' + f.proposed })
          ]),
          el('td', {}, (f.evidence || []).map(function (id) { return el('span', { class: 'ev-chip', text: id }); })
            .concat([el('div', { class: 'muted', style: 'font-size:10.5px;margin-top:2px', text: f.confidence })]))
        ]);
      }))
    ]));

    /* register-only findings */
    page.appendChild(el('div', { class: 'tile' }, [
      el('h3', { text: 'Register-known findings (not yet computable from the models)' }),
      el('p', { class: 'muted', style: 'margin-top:0', text: 'Quoted from VANILLA-ISSUES.md. These families (response categories, classifications, per-record forms, email templates) are evidenced in the repo but not yet carried in the machine-readable models — when they are, these become computed rules.' }),
      el('table', { class: 'list' }, [
        el('thead', {}, [el('tr', {}, ['Register', 'Category', 'Object', 'Finding', 'Evidence'].map(function (h) { return el('th', { text: h }); }))]),
        el('tbody', {}, window.StudioRules.REGISTER_ONLY.map(function (f) {
          return el('tr', {}, [
            el('td', {}, [el('code', { text: f.register })]),
            el('td', {}, [el('span', { class: 'conf-chip', text: f.category })]),
            el('td', { text: f.object }),
            el('td', {}, [el('div', { text: f.finding }), el('div', { class: 'muted', style: 'font-size:11px', text: f.note })]),
            el('td', {}, (f.evidence || []).map(function (id) { return el('span', { class: 'ev-chip', text: id }); }))
          ]);
        }))
      ])
    ]));
  }

  window.StudioFindings = { render: render };
})();
