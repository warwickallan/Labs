/* useredits.js — WARWICK EDITS ANYWHERE, CLAUDE ACTS ON THEM.
 *
 * The working model is AI-led: the views render Studio's understanding, and
 * the human corrects it wherever it is wrong — then says "I've made changes"
 * in the chat, and Claude reads exactly what changed and carries it through
 * (model, instance, documents).
 *
 * Mechanism: double-click any table cell or value in a project view to edit
 * it in place. Each change is recorded on the OPEN PROJECT as
 *   { at, view, section, row, before, after, status: 'PENDING' }
 * and persisted to the durable store. Nothing else is touched — the edit is
 * an instruction to Claude, not a direct model write: Studio's truth changes
 * only when the change is carried through and the edit marked APPLIED.
 * Claude reads them via StudioUserEdits.pending() / the Evidence panel.
 */
(function () {
  'use strict';

  function proj() { return window.StudioProject && window.StudioProject.current(); }

  function record(edit) {
    var p = proj();
    if (!p) return null;
    p.userEdits = p.userEdits || [];
    edit.at = new Date().toISOString();
    edit.status = 'PENDING';
    p.userEdits.push(edit);
    window.StudioProject.save(p.key, { userEdits: p.userEdits });
    if (window.StudioProject.persist) window.StudioProject.persist(p.key);
    return edit;
  }

  function contextOf(cell) {
    var row = cell.closest('tr');
    var rowLabel = '';
    if (row) {
      var first = row.querySelector('td,th');
      rowLabel = first && first !== cell ? (first.innerText || '').trim().slice(0, 60) : '';
    }
    var section = '';
    var n = cell.closest('table, .tile, .insp-sec') || cell;
    while (n && !section) {
      var h = n.querySelector && n.querySelector('h1,h2,h3,h4,legend');
      if (h && !h.contains(cell)) section = (h.innerText || '').trim().slice(0, 60);
      n = n.parentElement;
    }
    var view = (location.hash || '#').slice(1) || 'unknown';
    return { view: view, section: section, row: rowLabel };
  }

  function editable(cell) {
    if (cell.closest('#sidebar, #topbar, button, a, input, select, textarea')) return false;
    if (!proj()) return false;
    var t = (cell.innerText || '').trim();
    return t.length > 0 && t.length < 300;
  }

  document.addEventListener('dblclick', function (ev) {
    var cell = ev.target.closest('td, li, p, span.editable-value');
    if (!cell || !editable(cell)) return;
    if (cell.getAttribute('data-editing')) return;
    var before = (cell.innerText || '').trim();
    cell.setAttribute('data-editing', '1');
    cell.setAttribute('contenteditable', 'true');
    cell.style.outline = '2px solid var(--accent)';
    cell.focus();
    var finish = function (commit) {
      cell.removeAttribute('contenteditable');
      cell.removeAttribute('data-editing');
      cell.style.outline = '';
      var after = (cell.innerText || '').trim();
      if (!commit || after === before) { cell.innerText = before; return; }
      var ctx = contextOf(cell);
      record({ view: ctx.view, section: ctx.section, row: ctx.row, before: before, after: after });
      cell.style.background = 'rgba(230,170,60,0.25)';
      cell.title = 'Edited — pending for Claude (' + before + ' → ' + after + ')';
    };
    var onKey = function (e) {
      if (e.key === 'Enter') { e.preventDefault(); cell.blur(); }
      if (e.key === 'Escape') { cell.removeEventListener('blur', onBlur); finish(false); }
    };
    var onBlur = function () { cell.removeEventListener('keydown', onKey); finish(true); };
    cell.addEventListener('keydown', onKey);
    cell.addEventListener('blur', onBlur, { once: true });
  });

  window.StudioUserEdits = {
    pending: function () {
      var p = proj();
      return ((p && p.userEdits) || []).filter(function (e) { return e.status === 'PENDING'; });
    },
    all: function () { var p = proj(); return (p && p.userEdits) || []; },
    markApplied: function (idx, note) {
      var p = proj(); if (!p || !p.userEdits || !p.userEdits[idx]) return false;
      p.userEdits[idx].status = 'APPLIED';
      if (note) p.userEdits[idx].appliedNote = note;
      window.StudioProject.save(p.key, { userEdits: p.userEdits });
      if (window.StudioProject.persist) window.StudioProject.persist(p.key);
      return true;
    },
    record: record
  };
})();
