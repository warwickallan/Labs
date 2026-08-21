/* views/hdbuilder.js — the NEW HELPDESK designer.
 *
 * Design an entire helpdesk in the Studio — job types, statuses, actions,
 * allocation, results — with the workflow-logic checks running live and a
 * life-of-a-job preview drawn from the draft itself. BUILD turns the draft
 * into an ordered, dependency-aware plan of harness writer operations:
 * executable steps run through the audited /execute path (dry-run first),
 * anything the writer cannot do yet is STAGED with its exact recipe.
 */
(function () {
  'use strict';

  var TYPES = ['Reactive', 'Planned'];
  var state = { draft: null, key: null, tab: 'design', plan: null, execLog: [] };

  function storageKey(project) { return 'concerto-studio-hdbuilder-' + (project ? project.key : 'vanilla'); }

  function load(project) {
    try {
      var t = localStorage.getItem(storageKey(project));
      if (t) return JSON.parse(t);
    } catch (e) { /* fresh */ }
    return null;
  }
  function save(project) {
    try { localStorage.setItem(storageKey(project), JSON.stringify(state.draft)); } catch (e) { /* session-only */ }
  }

  function render(container, opts) {
    var el = window.StudioDom.el;
    var B = window.StudioHdBuilder;
    var project = opts.project || null;
    window.StudioDom.clear(container);
    function rerender() { render(container, opts); }
    function touch() { save(project); rerender(); }

    if (state.key !== storageKey(project)) {
      state.key = storageKey(project);
      state.draft = load(project);
      state.plan = null; state.execLog = [];
    }

    if (!state.draft) {
      container.appendChild(el('div', { class: 'stub' }, [
        el('h3', { text: 'Build a brand-new helpdesk' }),
        el('p', { text: 'Design job types, statuses and actions from scratch; the same workflow-logic checks that catch broken instances run live on the draft, the life-of-a-job preview draws it, and BUILD turns it into an ordered plan of audited harness operations against ' + (project ? project.name : 'an instance') + '.' }),
        el('p', {}, [
          el('button', { class: 'btn', style: 'font-weight:600', text: 'Start from the minimal viable journey', onclick: function () { state.draft = B.seedMinimal(project ? project.name + ' new helpdesk' : 'New helpdesk'); touch(); } }),
          document.createTextNode('  '),
          el('button', { class: 'btn', text: 'Start blank', onclick: function () { state.draft = B.blank(); touch(); } })
        ]),
        el('p', { class: 'muted', text: 'The minimal seed is the journey Vanilla discovery proved a helpdesk needs: log → assign → work → hold/release → complete → close, plus cancel — rename and grow from there.' })
      ]));
      return;
    }

    var d = state.draft;
    var v = B.validate(d);
    var statusNames = d.statuses.map(function (s) { return s.name; });

    /* ---- header ---------------------------------------------------------- */
    container.appendChild(el('div', { class: 'toolstrip' }, [
      el('input', {
        value: d.name, style: 'font-weight:700;min-width:220px',
        onchange: function (ev) { d.name = ev.target.value; touch(); }
      }),
      el('span', { class: 'seg' }, [
        el('button', { class: state.tab === 'design' ? 'on' : '', text: 'Design', onclick: function () { state.tab = 'design'; rerender(); } }),
        el('button', { class: state.tab === 'preview' ? 'on' : '', text: 'Preview', onclick: function () { state.tab = 'preview'; rerender(); } }),
        el('button', { class: state.tab === 'build' ? 'on' : '', text: 'Build', onclick: function () { state.tab = 'build'; state.plan = B.buildPlan(d); rerender(); } })
      ]),
      el('span', {
        class: 'src-chip',
        html: v.ok ? '✔ passes the workflow-logic checks'
          : '<b>' + v.issues.filter(function (i) { return i.severity === 'BLOCKER'; }).length + '</b> blocker(s) — see below'
      }),
      el('span', { style: 'flex:1' }),
      el('button', { class: 'btn', text: 'Export draft JSON', onclick: function () {
        var blob = new Blob([JSON.stringify({ kind: 'HD-BUILDER-DRAFT', formatVersion: 1, draft: d }, null, 2)], { type: 'application/json' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = 'NEW-HELPDESK-DRAFT.json'; a.click(); URL.revokeObjectURL(a.href);
      } }),
      el('button', { class: 'btn', text: 'Discard draft', onclick: function () {
        if (window.confirm('Discard this helpdesk draft?')) { state.draft = null; try { localStorage.removeItem(state.key); } catch (e) {} rerender(); }
      } })
    ]));

    var body = el('div', { style: 'flex:1;overflow:auto;padding:14px 22px' });
    container.appendChild(body);

    /* ---- validation panel (always visible) -------------------------------- */
    if (v.issues.length) {
      body.appendChild(el('details', { class: 'cfg-sec', open: 'open' }, [
        el('summary', { html: '<b>Workflow-logic checks</b> — ' + v.issues.length + ' issue(s)' }),
        el('table', { class: 'list' }, [el('tbody', {}, v.issues.map(function (i) {
          return el('tr', {}, [
            el('td', {}, [el('span', { class: 'conf-chip' + (i.severity === 'BLOCKER' ? '' : ' parsed'), text: i.severity })]),
            el('td', { text: i.issue })
          ]);
        }))])
      ]));
    }

    if (state.tab === 'preview') {
      var model = window.StudioSchema.completeModel(B.toModel(d));
      (d.jobTypes || []).forEach(function (t) {
        var out = window.StudioLifeFlow.render(model, t.name);
        body.appendChild(el('h4', { text: t.name + ' — life of a job' }));
        body.appendChild(el('div', { class: 'flow-embed', html: out && out.svg ? out.svg : '<p class="muted">Nothing to draw yet.</p>' }));
      });
      return;
    }

    if (state.tab === 'build') {
      renderBuild(body, d, project, rerender);
      return;
    }

    /* ---- Design tab ------------------------------------------------------- */

    /* job types */
    body.appendChild(el('h4', { text: 'Job types' }));
    body.appendChild(el('div', {}, TYPES.map(function (t) {
      var onIt = (d.jobTypes || []).some(function (j) { return j.name === t; });
      return el('label', { style: 'margin-right:18px' }, [
        el('input', { type: 'checkbox', checked: onIt ? 'checked' : null, onchange: function (ev) {
          if (ev.target.checked) d.jobTypes.push({ name: t });
          else d.jobTypes = d.jobTypes.filter(function (j) { return j.name !== t; });
          touch();
        } }),
        document.createTextNode(' ' + t)
      ]);
    })));

    /* statuses */
    var activeTypes = (d.jobTypes || []).map(function (j) { return j.name; });
    body.appendChild(el('h4', { text: 'Statuses (' + d.statuses.length + ')' }));
    body.appendChild(el('table', { class: 'list' }, [
      el('thead', {}, [el('tr', {}, ['Name', 'Types', 'Default for', 'Order', 'Terminal', 'Suppressed', ''].map(function (h) { return el('th', { text: h }); }))]),
      el('tbody', {}, d.statuses.map(function (st, i) {
        return el('tr', {}, [
          el('td', {}, [el('input', { value: st.name, onchange: function (ev) {
            var was = st.name; st.name = ev.target.value;
            d.actions.forEach(function (a) {
              a.availableIn = (a.availableIn || []).map(function (s) { return s === was ? st.name : s; });
              if (a.resultingStatus === was) a.resultingStatus = st.name;
              a.userSelectable = (a.userSelectable || []).map(function (s) { return s === was ? st.name : s; });
            });
            touch();
          } })]),
          el('td', {}, TYPES.map(function (t) {
            return el('label', { style: 'margin-right:8px;white-space:nowrap' }, [
              el('input', { type: 'checkbox', checked: (st.types || []).indexOf(t) !== -1 ? 'checked' : null, onchange: function (ev) {
                if (ev.target.checked) { if ((st.types = st.types || []).indexOf(t) === -1) st.types.push(t); }
                else st.types = (st.types || []).filter(function (x) { return x !== t; });
                touch();
              } }), document.createTextNode(t[0])
            ]);
          })),
          el('td', {}, activeTypes.map(function (t) {
            return el('label', { style: 'margin-right:8px;white-space:nowrap' }, [
              el('input', { type: 'checkbox', checked: (st.isDefaultFor || []).indexOf(t) !== -1 ? 'checked' : null, onchange: function (ev) {
                if (ev.target.checked) {
                  d.statuses.forEach(function (o) { o.isDefaultFor = (o.isDefaultFor || []).filter(function (x) { return x !== t; }); });
                  (st.isDefaultFor = st.isDefaultFor || []).push(t);
                } else st.isDefaultFor = (st.isDefaultFor || []).filter(function (x) { return x !== t; });
                touch();
              } }), document.createTextNode(t[0])
            ]);
          })),
          el('td', {}, [el('input', { type: 'number', value: st.ordering || 0, style: 'width:64px', onchange: function (ev) { st.ordering = parseInt(ev.target.value, 10) || 0; touch(); } })]),
          el('td', {}, [el('input', { type: 'checkbox', checked: st.terminal ? 'checked' : null, onchange: function (ev) { st.terminal = ev.target.checked; touch(); } })]),
          el('td', {}, [el('input', { type: 'checkbox', checked: st.suppressed ? 'checked' : null, onchange: function (ev) { st.suppressed = ev.target.checked; touch(); } })]),
          el('td', {}, [el('button', { class: 'btn', text: '✕', onclick: function () { d.statuses.splice(i, 1); touch(); } })])
        ]);
      }))
    ]));
    body.appendChild(el('button', { class: 'btn', text: '+ Status', onclick: function () {
      var name = window.prompt('Status name:'); if (!name || !name.trim()) return;
      d.statuses.push({ name: name.trim(), types: activeTypes.slice(0, 1), isDefaultFor: [], ordering: (d.statuses.length + 1) * 10 });
      touch();
    } }));

    /* actions */
    function multiSel(current, onSet) {
      return el('select', {
        multiple: 'multiple', size: '3', style: 'min-width:150px',
        onchange: function (ev) {
          onSet(Array.prototype.slice.call(ev.target.selectedOptions).map(function (o) { return o.value; }));
          touch();
        }
      }, statusNames.map(function (s) {
        return el('option', { value: s, text: s, selected: (current || []).indexOf(s) !== -1 ? 'selected' : null });
      }));
    }
    body.appendChild(el('h4', { text: 'Actions (' + d.actions.length + ')' }));
    body.appendChild(el('table', { class: 'list' }, [
      el('thead', {}, [el('tr', {}, ['Code', 'Name', 'Types', 'Available in', 'Results in', 'User selects', 'Mobile', 'Engine', ''].map(function (h) { return el('th', { text: h }); }))]),
      el('tbody', {}, d.actions.map(function (a, i) {
        return el('tr', {}, [
          el('td', {}, [el('input', { value: a.code || '', style: 'width:64px', onchange: function (ev) { a.code = ev.target.value.trim(); touch(); } })]),
          el('td', {}, [el('input', { value: a.name || '', onchange: function (ev) { a.name = ev.target.value; touch(); } })]),
          el('td', {}, TYPES.map(function (t) {
            return el('label', { style: 'margin-right:8px;white-space:nowrap' }, [
              el('input', { type: 'checkbox', checked: (a.types || []).indexOf(t) !== -1 ? 'checked' : null, onchange: function (ev) {
                if (ev.target.checked) { if ((a.types = a.types || []).indexOf(t) === -1) a.types.push(t); }
                else a.types = (a.types || []).filter(function (x) { return x !== t; });
                touch();
              } }), document.createTextNode(t[0])
            ]);
          })),
          el('td', {}, [multiSel(a.availableIn, function (vals) { a.availableIn = vals; })]),
          el('td', {}, [el('select', { onchange: function (ev) { a.resultingStatus = ev.target.value || null; touch(); } },
            [el('option', { value: '', text: '(no change)', selected: !a.resultingStatus ? 'selected' : null })]
              .concat(statusNames.map(function (s) { return el('option', { value: s, text: s, selected: a.resultingStatus === s ? 'selected' : null }); })))]),
          el('td', {}, [multiSel(a.userSelectable, function (vals) { a.userSelectable = vals; })]),
          el('td', {}, [el('input', { type: 'checkbox', checked: a.mobileAvailable ? 'checked' : null, onchange: function (ev) { a.mobileAvailable = ev.target.checked; touch(); } })]),
          el('td', {}, [el('input', { type: 'checkbox', checked: a.machineFired ? 'checked' : null, title: 'Engine/auto-fired — allowed to have no allocation', onchange: function (ev) { a.machineFired = ev.target.checked; touch(); } })]),
          el('td', {}, [el('button', { class: 'btn', text: '✕', onclick: function () { d.actions.splice(i, 1); touch(); } })])
        ]);
      }))
    ]));
    body.appendChild(el('button', { class: 'btn', text: '+ Action', onclick: function () {
      var code = window.prompt('Action code (e.g. NH10):'); if (!code || !code.trim()) return;
      var name = window.prompt('Action name:'); if (!name || !name.trim()) return;
      d.actions.push({ code: code.trim(), name: name.trim(), types: activeTypes.slice(0, 1), availableIn: [], userSelectable: [] });
      touch();
    } }));
  }

  /* ---- Build tab --------------------------------------------------------- */

  function renderBuild(body, d, project, rerender) {
    var el = window.StudioDom.el;
    var B = window.StudioHdBuilder;
    var plan = state.plan || (state.plan = B.buildPlan(d));

    body.appendChild(el('p', {
      html: plan.valid
        ? '<b>' + plan.steps.length + '</b> build steps — <b>' + plan.executableCount + '</b> executable through the audited harness write path, <b>' + plan.stagedCount + '</b> staged (recorded recipe; the writer cannot do these yet).'
        : '<b>The draft does not pass the workflow-logic checks.</b> Fix the blockers before building — a plan that builds a broken helpdesk is worse than no plan.'
    }));

    body.appendChild(el('table', { class: 'list' }, [
      el('thead', {}, [el('tr', {}, ['#', 'Operation', 'Object', 'Depends on', 'Mode', 'Status'].map(function (h) { return el('th', { text: h }); }))]),
      el('tbody', {}, plan.steps.map(function (s) {
        return el('tr', {}, [
          el('td', { text: s.n }), el('td', { text: s.op }), el('td', { text: s.object }),
          el('td', { text: s.dependsOn.length ? '#' + s.dependsOn.join(' #') : '—' }),
          el('td', {}, [el('span', { class: 'conf-chip' + (s.executable ? ' observed' : ''), text: s.executable ? 'EXECUTABLE' : 'STAGED' })]),
          el('td', { text: s.status })
        ]);
      }))
    ]));

    if (plan.valid && project) {
      body.appendChild(el('p', {}, [
        el('button', { class: 'btn', style: 'font-weight:600', text: 'CREATE WORK ORDER from this plan', onclick: function () {
          project.workOrders = project.workOrders || [];
          var wo = {
            id: 'WO-' + String(project.workOrders.length + 1).padStart(3, '0'),
            createdAt: new Date().toISOString(), status: 'OPEN', kind: 'NEW-HELPDESK',
            draftName: d.name,
            steps: plan.steps.map(function (s) {
              return { n: s.n, kind: s.op, object: s.object, detail: JSON.stringify(s.params),
                executable: s.executable, dependsOn: s.dependsOn, status: 'PENDING' };
            })
          };
          project.workOrders.push(wo);
          if (window.StudioProjects && window.StudioProjects.save) window.StudioProjects.save(project);
          window.alert(wo.id + ' created with ' + wo.steps.length + ' steps. Execution runs through the harness write path (dry-run first), with every step audited — ask Claude to execute it, or work the executable steps from the Build panel.');
          rerender();
        } })
      ]));
    } else if (plan.valid && !project) {
      body.appendChild(el('p', { class: 'muted', text: 'Open a project to create a work order against its instance.' }));
    }
  }

  window.StudioHdBuilderView = { render: render, _state: state };
})();
