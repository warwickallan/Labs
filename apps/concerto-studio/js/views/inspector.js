/* inspector.js — the right-side property inspector drawer, plus the tiny
 * DOM helper namespace (StudioDom) shared by all views.
 * Every panel shows provenance: confidence grade + evidence ids. Values
 * recovered from generated notes prose are marked 'parsed from notes'.
 */
(function () {
  'use strict';

  /* ---- DOM helpers (shared) ---- */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
    });
    return node;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }
  window.StudioDom = { el: el, clear: clear };

  /* ---- inspector ---- */

  function confChip(confidence) {
    var cls = 'conf-chip';
    if (/OBSERVED/.test(confidence || '')) cls += ' observed';
    else if (/STRUCTURAL/.test(confidence || '')) cls += ' structural';
    return el('span', { class: cls, text: confidence || 'UNKNOWN' });
  }
  function provChip(action) {
    if (action && action.notesProvenance === 'STRUCTURED-V2') {
      return el('span', { class: 'conf-chip structural', text: 'structured (model v2)', title: 'Explicit evidence-promoted field in the canonical model (E-015/E-023/E-024)' });
    }
    return el('span', { class: 'conf-chip parsed', text: 'parsed from notes', title: 'Recovered from generated notes prose, not a structured source field' });
  }
  function evChips(evidence) {
    return el('span', {}, (evidence || []).map(function (id) { return el('span', { class: 'ev-chip', text: id }); }));
  }
  function sec(title, children) {
    return el('div', { class: 'insp-sec' }, [el('h4', { text: title })].concat(children));
  }
  function kvTable(rows) {
    return el('table', {}, rows.filter(Boolean).map(function (r) {
      return el('tr', {}, [
        el('td', { text: r[0] }),
        el('td', {}, typeof r[1] === 'string' ? [document.createTextNode(r[1])] : [].concat(r[1]))
      ]);
    }));
  }

  var drawer, titleEl, bodyEl;
  function ensure() {
    drawer = document.getElementById('inspector');
    titleEl = document.getElementById('inspTitle');
    bodyEl = document.getElementById('inspBody');
  }
  function open(title, sections) {
    ensure();
    titleEl.textContent = title;
    clear(bodyEl);
    sections.filter(Boolean).forEach(function (s) { bodyEl.appendChild(s); });
    drawer.classList.remove('hidden');
  }
  function close() {
    ensure();
    drawer.classList.add('hidden');
    if (api.onClose) api.onClose();
  }

  function resultsFor(model, actionName) {
    return model.helpdesk.results.filter(function (r) { return r.action === actionName; });
  }
  function availabilityFor(model, actionName) {
    return model.helpdesk.availability.filter(function (e) { return e.action === actionName; });
  }

  /* ---- design-mode edit controls -------------------------------------- */

  function editSection(model, a, opts) {
    var M = window.StudioModel;
    function changed() { opts.onChange(); showAction(model, a.name, opts); }

    var rows = [];

    /* resulting status, per type the action belongs to */
    a.types.forEach(function (type) {
      var current = resultsFor(model, a.name).filter(function (r) { return r.type === type; })[0];
      var statuses = model.helpdesk.statuses.filter(function (s) { return s.types.indexOf(type) !== -1; });
      var sel = el('select', {
        onchange: function (ev) {
          var v = ev.target.value;
          M.setResult(a.name, v === '' ? null : v, kindSel.value, type);
          changed();
        }
      }, [el('option', { value: '', text: '(no status change)' })].concat(statuses.map(function (s) {
        var o = el('option', { value: s.name, text: s.name });
        if (current && current.toStatus === s.name) o.selected = true;
        return o;
      })));
      var kindSel = el('select', {
        onchange: function (ev) {
          if (current) { M.setResult(a.name, current.toStatus, ev.target.value, type); changed(); }
        }
      }, [
        el('option', { value: 'sets', text: 'sets status' }),
        el('option', { value: 'userSelects', text: 'user selects' })
      ]);
      if (current && current.kind === 'userSelects') kindSel.value = 'userSelects';
      rows.push(['Resulting status (' + type + ')', el('span', {}, [sel, document.createTextNode(' '), kindSel])]);
    });

    rows.push(['Mobile available', el('input', {
      type: 'checkbox', checked: a.mobileAvailable ? 'checked' : null,
      onchange: function (ev) { M.modifyAction(a.name, { mobileAvailable: ev.target.checked }); changed(); }
    })]);

    rows.push(['Button group', el('input', {
      type: 'text', value: a.buttonGroup || '', placeholder: '(none)',
      onchange: function (ev) { M.modifyAction(a.name, { buttonGroup: ev.target.value.trim() || null }); changed(); }
    })]);

    /* availability checklist per status the action's types allow */
    var availList = el('div', { style: 'max-height:180px;overflow:auto;border:1px solid var(--border);border-radius:6px;padding:6px 10px' },
      model.helpdesk.statuses
        .filter(function (s) { return s.types.some(function (t) { return a.types.indexOf(t) !== -1; }); })
        .map(function (s) {
          var type = s.types.filter(function (t) { return a.types.indexOf(t) !== -1; })[0];
          var ticked = availabilityFor(model, a.name).some(function (e) { return e.status === s.name; });
          return el('label', { style: 'display:block;font-size:12.5px;margin:2px 0' }, [
            el('input', {
              type: 'checkbox', checked: ticked ? 'checked' : null,
              onchange: function (ev) {
                if (ev.target.checked) M.addAvailability(a.name, s.name, type);
                else M.removeAvailability(a.name, s.name);
                changed();
              }
            }),
            document.createTextNode(' ' + s.name)
          ]);
        }));

    return sec('Edit (design)', [
      kvTable(rows),
      el('h4', { text: 'Available in', style: 'margin-top:10px' }),
      availList,
      el('div', { style: 'margin-top:10px' }, [
        el('button', {
          class: 'btn', style: 'color:var(--danger)', text: 'Remove action from design',
          onclick: function () {
            if (window.confirm('Remove "' + a.name + '" and every relationship touching it from the design? (Undo is available.)')) {
              M.removeAction(a.name);
              opts.onChange();
              close();
            }
          }
        })
      ])
    ]);
  }

  function showAction(model, actionName, opts) {
    var a = model.helpdesk.actions.filter(function (x) { return x.name === actionName; })[0];
    if (!a) return;

    var avail = availabilityFor(model, a.name);
    var results = resultsFor(model, a.name);
    var xEdges = model.crossDomain.filter(function (e) {
      return new RegExp('\\b' + a.code + '\\b').test(e.edge);
    });

    open(a.name, [
      (opts && opts.editable) ? editSection(model, a, opts) : null,
      sec('Identity', [kvTable([
        ['Canonical key', el('code', { text: a.key })],
        ['Code', a.code],
        ['Applies to', a.applicability + (a.types.length ? ' (in ' + a.types.join(' + ') + ' model)' : '')],
        ['Confidence', confChip(a.confidence)],
        ['Evidence', evChips(a.evidence)]
      ])]),
      sec('Configuration', [kvTable([
        ['Button group', el('span', {}, [document.createTextNode(a.buttonGroup || '— none (VI-004 for RH03b)'), document.createTextNode(' '), provChip(a)])],
        ['Mobile available', a.mobileAvailable ? 'yes (action gate; status gate also required — two-gate model)' : 'no'],
        a.hidden ? ['Hidden from user options', 'yes (renders on-device / engine only)'] : null,
        a.flags.length ? ['Flags', a.flags.join(', ')] : null,
        a.resultingType ? ['Resulting type', a.resultingType] : null,
        (a.constraints && a.constraints.length) ? ['Constraints (prerequisites)', a.constraints.join(', ') + ' — runtime semantics untested (U-012/E5)'] : null,
        a.timer ? ['Timer', a.timer] : null,
        a.hold ? ['Hold', a.hold] : null,
        a.orderStatusTrigger ? ['Fires on orders →', a.orderStatusTrigger] : null,
        a.orderApprovalTrigger ? ['Fires on order approval', 'yes'] : null,
        a.afpTrigger ? ['Fires on AFP approval', 'yes'] : null,
        (a.ordersEffects && a.ordersEffects.length) ? ['Orders effects', a.ordersEffects.join('; ')] : null,
        (a.emails && a.emails.length) ? ['Emails', a.emails.join(', ')] : null,
        a.defaultOrdersProject ? ['Default orders project', a.defaultOrdersProject] : null,
        a.routesTo ? ['Routes to', a.routesTo] : null,
        ['Machine-fired', a.machineFired ? 'yes — no status allocation; fired by an engine or trigger' : 'no']
      ])]),
      (a.addsTags.length || a.removesTags.length || a.tagNote) ? sec('Tag automation', [
        el('ul', {}, a.addsTags.map(function (t) { return el('li', { text: '+ adds "' + t + '"' }); })
          .concat(a.removesTags.map(function (t) { return el('li', { text: '− removes "' + t + '"' }); }))),
        a.tagNote ? el('div', { class: 'insp-notes', text: a.tagNote }) : null,
        el('div', {}, [provChip(a)])
      ]) : null,
      sec('Available from (' + avail.length + ')', [
        avail.length
          ? el('ul', {}, avail.map(function (e) {
              return el('li', {}, [
                document.createTextNode(e.status + ' (' + e.type + ') '),
                evChips(e.evidence)
              ]);
            }))
          : el('div', { class: 'insp-notes', text: 'Not allocated to any status — machine-fired or hidden (see U-004 / VI-007).' })
      ]),
      sec('Results in', [
        results.length
          ? el('ul', {}, results.map(function (r) {
              return el('li', {}, [
                document.createTextNode((r.kind === 'sets' ? '→ ' : '→ user selects: ') + r.toStatus + ' (' + r.type + ') '),
                confChip(r.confidence)
              ]);
            }))
          : el('div', { class: 'muted', text: 'No status change.' })
      ]),
      a.firedBySupplierActions.length ? sec('Fired by supplier actions (cross-domain)', [
        el('ul', {}, a.firedBySupplierActions.map(function (k) {
          var sa = model.orders.supplierActions.filter(function (s) { return s.canonicalKey === k; })[0];
          return el('li', { text: sa ? sa.observedCode + ' ' + sa.name : k });
        }))
      ]) : null,
      xEdges.length ? sec('Cross-domain edges', [
        el('ul', {}, xEdges.map(function (e) {
          return el('li', {}, [document.createTextNode(e.edge + ' '), el('span', { class: 'ev-chip', text: e.id })]);
        }))
      ]) : null,
      sec('Source notes (verbatim)', [el('div', { class: 'insp-notes', text: a.rawNotes || '—' })])
    ]);
  }

  function showStatus(model, statusName) {
    var s = model.helpdesk.statuses.filter(function (x) { return x.name === statusName; })[0];
    if (!s) return;
    var inbound = model.helpdesk.results.filter(function (r) { return r.toStatus === s.name; });
    var offered = model.helpdesk.availability.filter(function (e) { return e.status === s.name; });

    open(s.name, [
      sec('Identity', [kvTable([
        ['Canonical key', el('code', { text: s.key })],
        ['Helpdesk Types', s.types.join(', ')],
        s.isDefaultFor.length ? ['Default status for', s.isDefaultFor.join(', ')] : null,
        ['GUID (this environment only)', el('code', { text: (model.identities.statuses || {})[s.name] || 'not harvested' })],
        ['Confidence', confChip(s.confidence)],
        ['Evidence', evChips(s.evidence)]
      ])]),
      sec('Actions offered here (' + offered.length + ')', [
        offered.length
          ? el('ul', {}, offered.map(function (e) { return el('li', { text: e.action + ' (' + e.type + ')' }); }))
          : el('div', { class: 'insp-notes', text: 'No exit actions — a dead end unless an engine moves the job (see VI-002 for Business Case - R).' })
      ]),
      sec('Reached by (' + inbound.length + ')', [
        inbound.length
          ? el('ul', {}, inbound.map(function (r) {
              return el('li', { text: r.action + (r.kind === 'userSelects' ? ' (user selects)' : '') + ' (' + r.type + ')' });
            }))
          : el('div', { class: 'insp-notes', text: 'No action sets this status — creation-default or engine entry only.' })
      ])
    ]);
  }

  function showSupplierAction(model, canonicalKey) {
    var sa = model.orders.supplierActions.filter(function (s) { return s.canonicalKey === canonicalKey; })[0];
    if (!sa) return;
    open(sa.observedCode + ' ' + sa.name, [
      sec('Identity', [kvTable([
        ['Canonical key', el('code', { text: sa.key })],
        ['Observed code', sa.observedCode],
        ['Portal visible', sa.portalVisible ? 'yes' : el('b', { class: 'bad-text', text: 'NO — part of VI-009 if on the acceptance path' })],
        ['Acknowledge', sa.acknowledge ? 'yes' : 'no']
      ])]),
      sec('Availability (order statuses)', [
        (sa.availableIn || []).length
          ? el('ul', {}, sa.availableIn.map(function (n) { return el('li', { text: n }); }))
          : el('div', { class: 'insp-notes', text: 'No availability recorded.' })
      ]),
      sec('Effects', [kvTable([
        ['Resulting order status', sa.resultingOrderStatus || '—'],
        ['Fires helpdesk action', sa.firesHelpdeskAction || '—']
      ])])
    ]);
  }

  var api = {
    showAction: showAction,
    showStatus: showStatus,
    showSupplierAction: showSupplierAction,
    close: close,
    onClose: null
  };
  window.StudioInspector = api;

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('inspClose').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  });
})();
