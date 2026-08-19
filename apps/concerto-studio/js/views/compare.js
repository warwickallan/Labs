/* compare.js — COMPARE: Added / Removed / Modified / Unchanged at object
 * and field level. Today the comparison is Vanilla (baseline) vs the
 * DESIGN desired state; the same engine (diff.js) will compare Vanilla vs
 * a crawled customer instance once the Instance adapter exists — this
 * view only needs a different right-hand model to do so.
 */
(function () {
  'use strict';

  var state = { kind: 'All', object: 'All', pair: 'vanilla-design' };
  var KINDS = ['All', 'Added', 'Removed', 'Modified', 'Unchanged'];
  var OBJECTS = ['All', 'Statuses', 'Actions', 'Availability', 'Results'];

  /* one pure diff engine, multiple model sources */
  var PAIRS = [
    { id: 'vanilla-design', label: 'Vanilla ↔ Design', needs: 'design' },
    { id: 'vanilla-instance', label: 'Vanilla ↔ Instance', needs: 'instance' },
    { id: 'instance-design', label: 'Instance ↔ Design', needs: 'both' }
  ];

  function render(container, vanilla) {
    var el = window.StudioDom.el;
    var M = window.StudioModel;
    window.StudioDom.clear(container);

    function rerender() { render(container, vanilla); }

    var hasDesign = M.hasFork();
    var inst = window.StudioApp.instance;
    var hasInstance = !!(inst && inst.model);

    function pairAvailable(p) {
      if (p.needs === 'design') return hasDesign;
      if (p.needs === 'instance') return hasInstance;
      return hasDesign && hasInstance;
    }
    var current = PAIRS.filter(function (p) { return p.id === state.pair; })[0];
    if (!pairAvailable(current)) {
      current = PAIRS.filter(pairAvailable)[0] || null;
      state.pair = current ? current.id : state.pair;
    }

    if (!current) {
      container.appendChild(el('div', { class: 'page' }, [
        el('div', { class: 'stub' }, [
          el('h3', { text: 'Compare' }),
          el('p', { text: 'Compare shows Added / Removed / Modified / Unchanged at object and field level, between any two of: the Vanilla baseline, a crawled instance snapshot, and your DESIGN desired state. One diff engine, multiple model sources.' }),
          el('p', { text: 'Nothing to compare yet — fork a design in DESIGN, or crawl an instance from INSTANCE.' })
        ])
      ]));
      return;
    }

    var base = current.id === 'instance-design' ? inst.model : vanilla;
    var right = current.id === 'vanilla-instance' ? inst.model : M.desired();
    var diff = window.StudioDiff.compare(base, right);
    var page = el('div', { class: 'page wide' });
    container.appendChild(page);

    function seg(options, current, onPick) {
      return el('span', { class: 'seg' }, options.map(function (o) {
        return el('button', { class: o === current ? 'on' : '', text: o, onclick: function () { onPick(o); } });
      }));
    }

    page.appendChild(el('div', { class: 'toolstrip' }, [
      el('span', { class: 'seg' }, PAIRS.map(function (p) {
        return el('button', {
          class: p.id === state.pair ? 'on' : '',
          text: p.label,
          disabled: pairAvailable(p) ? null : 'disabled',
          title: pairAvailable(p) ? '' : (p.needs === 'instance' ? 'Crawl an instance first' : p.needs === 'both' ? 'Needs an instance snapshot and a design fork' : 'Fork a design first'),
          onclick: function () { state.pair = p.id; rerender(); }
        });
      })),
      el('label', { text: 'Show' }),
      seg(KINDS, state.kind, function (v) { state.kind = v; rerender(); }),
      el('label', { text: 'Objects' }),
      seg(OBJECTS, state.object, function (v) { state.object = v; rerender(); }),
      el('span', { style: 'flex:1' }),
      el('span', {
        class: 'src-chip',
        html: current.label.replace('↔', 'vs') + ' · <b>' + diff.summary.added + '</b> added · <b>' + diff.summary.removed + '</b> removed · <b>' + diff.summary.modified + '</b> modified'
      })
    ]));

    var rows = [];
    function want(kind, object) {
      return (state.kind === 'All' || state.kind === kind) &&
        (state.object === 'All' || state.object === object);
    }

    function objRows(objDiff, objectLabel) {
      objDiff.added.forEach(function (x) { if (want('Added', objectLabel)) rows.push({ kind: 'Added', object: objectLabel, key: x.key, detail: '' }); });
      objDiff.removed.forEach(function (x) { if (want('Removed', objectLabel)) rows.push({ kind: 'Removed', object: objectLabel, key: x.key, detail: '' }); });
      objDiff.modified.forEach(function (x) {
        if (!want('Modified', objectLabel)) return;
        rows.push({
          kind: 'Modified', object: objectLabel, key: x.key,
          detail: x.changes.map(function (c) {
            return c.field + ': ' + JSON.stringify(c.base) + ' → ' + JSON.stringify(c.desired);
          }).join('  ·  ')
        });
      });
      objDiff.unchanged.forEach(function (x) { if (want('Unchanged', objectLabel)) rows.push({ kind: 'Unchanged', object: objectLabel, key: x.key, detail: '' }); });
    }
    objRows(diff.statuses, 'Statuses');
    objRows(diff.actions, 'Actions');

    function edgeRows(edgeDiff, objectLabel, describe) {
      edgeDiff.added.forEach(function (e) { if (want('Added', objectLabel)) rows.push({ kind: 'Added', object: objectLabel, key: describe(e), detail: '' }); });
      edgeDiff.removed.forEach(function (e) { if (want('Removed', objectLabel)) rows.push({ kind: 'Removed', object: objectLabel, key: describe(e), detail: '' }); });
      if (want('Unchanged', objectLabel) && edgeDiff.unchanged) {
        rows.push({ kind: 'Unchanged', object: objectLabel, key: '(' + edgeDiff.unchanged + ' unchanged relationships — not listed individually)', detail: '' });
      }
    }
    edgeRows(diff.availability, 'Availability', function (e) { return e.action + ' available in ' + e.status + ' (' + e.type + ')'; });
    edgeRows(diff.results, 'Results', function (r) { return r.action + ' → ' + (r.kind === 'userSelects' ? 'user selects ' : '') + r.toStatus + ' (' + r.type + ')'; });

    var kindStyle = {
      Added: 'background:#e5f3e9;color:var(--ok);border-color:#c3e2cc',
      Removed: 'background:#fdeaea;color:var(--danger);border-color:#f5c6c0',
      Modified: 'background:#fef6e0;color:#92650a;border-color:#f0dfae',
      Unchanged: ''
    };

    page.appendChild(el('div', { style: 'flex:1;overflow:auto;padding:16px 22px' }, [
      rows.length
        ? el('table', { class: 'list' }, [
            el('thead', {}, [el('tr', {}, ['', 'Object', 'Item', 'Field changes'].map(function (h) { return el('th', { text: h }); }))]),
            el('tbody', {}, rows.map(function (r) {
              return el('tr', {}, [
                el('td', {}, [el('span', { class: 'conf-chip', style: kindStyle[r.kind], text: r.kind })]),
                el('td', { text: r.object }),
                el('td', { text: r.key }),
                el('td', { style: 'font-size:12px', text: r.detail })
              ]);
            }))
          ])
        : el('p', { class: 'muted', text: 'Nothing matches the current filters.' })
    ]));
  }

  window.StudioCompare = { render: render, _state: state };
})();
