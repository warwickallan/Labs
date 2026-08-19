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
  function parsedChip() {
    return el('span', { class: 'conf-chip parsed', text: 'parsed from notes', title: 'Recovered from build_model.py generated notes prose, not a structured source field' });
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

  function showAction(model, actionName) {
    var a = model.helpdesk.actions.filter(function (x) { return x.name === actionName; })[0];
    if (!a) return;

    var avail = availabilityFor(model, a.name);
    var results = resultsFor(model, a.name);
    var xEdges = model.crossDomain.filter(function (e) {
      return new RegExp('\\b' + a.code + '\\b').test(e.edge);
    });

    open(a.name, [
      sec('Identity', [kvTable([
        ['Canonical key', el('code', { text: a.key })],
        ['Code', a.code],
        ['Applies to', a.applicability + (a.types.length ? ' (in ' + a.types.join(' + ') + ' model)' : '')],
        ['Confidence', confChip(a.confidence)],
        ['Evidence', evChips(a.evidence)]
      ])]),
      sec('Configuration', [kvTable([
        ['Button group', el('span', {}, [document.createTextNode(a.buttonGroup || '— none (VI-004 for RH03b)'), document.createTextNode(' '), parsedChip()])],
        ['Mobile available', a.mobileAvailable ? 'yes (action gate; status gate also required — two-gate model)' : 'no'],
        a.flags.length ? ['Flags', el('span', {}, [document.createTextNode(a.flags.join(', ') + ' '), parsedChip()])] : null,
        a.resultingType ? ['Resulting type', el('span', {}, [document.createTextNode(a.resultingType + ' '), parsedChip()])] : null,
        ['Machine-fired', a.machineFired ? 'yes — no status allocation; fired by an engine or trigger' : 'no']
      ])]),
      (a.addsTags.length || a.removesTags.length) ? sec('Tag automation', [
        el('ul', {}, a.addsTags.map(function (t) { return el('li', { text: '+ adds "' + t + '"' }); })
          .concat(a.removesTags.map(function (t) { return el('li', { text: '− removes "' + t + '"' }); }))),
        el('div', {}, [parsedChip()])
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
