/* compare.js — COMPARE: Added / Removed / Modified / Unchanged at object
 * and field level. Today the comparison is Vanilla (baseline) vs the
 * DESIGN desired state; the same engine (diff.js) will compare Vanilla vs
 * a crawled customer instance once the Instance adapter exists — this
 * view only needs a different right-hand model to do so.
 */
(function () {
  'use strict';

  var state = { kind: 'All', object: 'All' };
  var KINDS = ['All', 'Added', 'Removed', 'Modified', 'Unchanged'];
  var OBJECTS = ['All', 'Statuses', 'Actions', 'Availability', 'Results'];

  function render(container, vanilla) {
    var el = window.StudioDom.el;
    var M = window.StudioModel;
    window.StudioDom.clear(container);

    function rerender() { render(container, vanilla); }

    if (!M.hasFork()) {
      container.appendChild(el('div', { class: 'page' }, [
        el('div', { class: 'stub' }, [
          el('h3', { text: 'Compare' }),
          el('p', { text: 'Compare shows Added / Removed / Modified / Unchanged at object and field level. Right now it compares the Vanilla baseline against your DESIGN desired state; once the Instance crawl exists, the same engine compares Vanilla against any crawled customer instance.' }),
          el('p', { text: 'There is no design fork yet — start one in DESIGN to have something to compare.' }),
          el('p', {}, [el('a', { href: '#design', class: 'btn', style: 'text-decoration:none', text: 'Go to Design' })])
        ])
      ]));
      return;
    }

    var diff = window.StudioDiff.compare(vanilla, M.desired());
    var page = el('div', { class: 'page wide' });
    container.appendChild(page);

    function seg(options, current, onPick) {
      return el('span', { class: 'seg' }, options.map(function (o) {
        return el('button', { class: o === current ? 'on' : '', text: o, onclick: function () { onPick(o); } });
      }));
    }

    page.appendChild(el('div', { class: 'toolstrip' }, [
      el('label', { text: 'Show' }),
      seg(KINDS, state.kind, function (v) { state.kind = v; rerender(); }),
      el('label', { text: 'Objects' }),
      seg(OBJECTS, state.object, function (v) { state.object = v; rerender(); }),
      el('span', { style: 'flex:1' }),
      el('span', {
        class: 'src-chip',
        html: 'Vanilla vs Design · <b>' + diff.summary.added + '</b> added · <b>' + diff.summary.removed + '</b> removed · <b>' + diff.summary.modified + '</b> modified'
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
