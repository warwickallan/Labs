/* views/srd.js — the SRD tab inside Design.
 *
 * Paste or drop an SRD / tender fragment; it is parsed into atomic
 * requirements, each assessed against the VANILLA baseline as
 * PRESENT / NOT-PRESENT / UNKNOWN with its matched evidence; a per-row
 * "AI suggested" button turns a gap into a proposed configuration change,
 * applied to the DESIGN fork for review (provenance AI-SUGGESTED). The whole
 * lot persists on the project so it survives a reload and feeds UAT.
 */
(function () {
  'use strict';

  function render(body, opts) {
    var el = window.StudioDom.el;
    opts = opts || {};
    var vanilla = opts.vanilla;
    var base = opts.base || vanilla;         // the baseline requirements are judged against
    var P = window.StudioProject;
    var proj = P && P.current();
    var M = window.StudioModel;

    function persist(patch) {
      if (!proj) return;
      P.save(proj.key, patch);
      if (P.persist) P.persist(proj.key);
    }
    function rerender() { render(clear(body), opts); }
    function clear(b) { window.StudioDom.clear(b); return b; }

    var srd = (proj && proj.srd) || { text: '', requirements: [], assessedAt: null };

    /* input tile */
    var ta = el('textarea', {
      style: 'width:100%;min-height:120px;font-size:13px;font-family:inherit;padding:8px;box-sizing:border-box',
      placeholder: 'Paste part of a tender document or a full SRD here — or drop a .txt / .md / .csv file anywhere in this panel. Sentences with “shall / must / should” become requirements.'
    });
    ta.value = srd.text || '';

    var inputTile = el('div', { class: 'tile', style: 'margin-bottom:12px' }, [
      el('h3', { text: 'Requirements input (SRD / tender)', style: 'margin-top:0' }),
      ta,
      el('div', { style: 'display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap' }, [
        el('button', { class: 'btn', text: 'Assess against baseline', onclick: function () { doAssess(ta.value); } }),
        el('label', { class: 'btn', style: 'cursor:pointer' }, [
          document.createTextNode('Upload file…'),
          el('input', { type: 'file', accept: '.txt,.md,.csv,.text', style: 'display:none',
            onchange: function (e) { readFile(e.target.files[0]); } })
        ]),
        srd.requirements.length ? el('span', { class: 'muted', style: 'font-size:12px', text: srd.requirements.length + ' requirements · assessed ' + (srd.assessedAt || '') }) : null,
        srd.requirements.length ? el('button', { class: 'btn', text: 'Clear', onclick: function () { persist({ srd: { text: '', requirements: [], assessedAt: null } }); rerender(); } }) : null
      ])
    ]);
    body.appendChild(inputTile);

    /* drag-drop onto the panel */
    body.ondragover = function (e) { e.preventDefault(); body.style.outline = '2px dashed var(--accent)'; };
    body.ondragleave = function () { body.style.outline = ''; };
    body.ondrop = function (e) { e.preventDefault(); body.style.outline = ''; if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]); };

    function readFile(file) {
      if (!file) return;
      var r = new FileReader();
      r.onload = function () { ta.value = String(r.result || ''); doAssess(ta.value); };
      r.readAsText(file);
    }

    function doAssess(text) {
      var reqs = window.StudioSRD.parseRequirements(text);
      var res = window.StudioSRD.assess(reqs, base);
      var rows = res.rows.map(function (r, i) { return Object.assign({ id: 'R' + i }, r, { suggestion: null, applied: false }); });
      persist({ srd: { text: text, requirements: rows, summary: res.summary, assessedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') } });
      rerender();
    }

    if (!srd.requirements.length) {
      body.appendChild(el('div', { class: 'tile' }, [
        el('p', { class: 'muted', style: 'margin:0', text: 'No requirements assessed yet. Paste or drop an SRD above and press “Assess against baseline”.' })
      ]));
      return;
    }

    /* summary */
    var sum = srd.summary || { PRESENT: 0, 'NOT-PRESENT': 0, UNKNOWN: 0, total: srd.requirements.length };
    body.appendChild(el('div', { class: 'tile', style: 'margin-bottom:12px' }, [
      el('div', { style: 'display:flex;gap:14px;flex-wrap:wrap;align-items:center' }, [
        chip(el, 'Present', sum.PRESENT, 'observed'),
        chip(el, 'Not present', sum['NOT-PRESENT'], 'danger'),
        chip(el, 'Unknown', sum.UNKNOWN, 'warn'),
        el('span', { class: 'muted', style: 'font-size:12px', text: 'of ' + sum.total + ' requirements, judged against ' + (opts.project ? 'current' : 'Vanilla') })
      ])
    ]));

    /* requirements table */
    body.appendChild(el('div', { class: 'tile', style: 'overflow-x:auto' }, [
      el('table', { class: 'list', style: 'min-width:760px' }, [
        el('thead', {}, [el('tr', {}, ['Ref', 'Requirement', 'Verdict', 'Evidence / basis', 'Action'].map(function (h) { return el('th', { text: h }); }))]),
        el('tbody', {}, srd.requirements.map(function (r) {
          return el('tr', {}, [
            el('td', {}, [el('b', { text: r.ref }), r.clause ? el('div', { class: 'muted', style: 'font-size:11px', text: 'cl. ' + r.clause }) : null,
              el('div', { class: 'muted', style: 'font-size:11px', text: r.priority })]),
            el('td', { style: 'font-size:12.5px', text: r.text }),
            el('td', {}, [verdictChip(el, r.verdict)]),
            el('td', { style: 'font-size:11.5px' }, [
              el('div', { text: r.basis }),
              (r.evidence || []).length ? el('div', { class: 'muted', style: 'margin-top:3px', text: r.evidence.join(' · ') }) : null,
              r.suggestion ? el('div', { class: 'ok-text', style: 'margin-top:4px', text: (r.applied ? '✔ applied: ' : 'suggested: ') + suggestionLabel(r.suggestion) }) : null
            ]),
            el('td', {}, [
              r.verdict !== 'PRESENT' && !r.applied ? el('button', {
                class: 'btn', style: 'font-size:12px', text: 'AI suggested',
                onclick: function () { aiSuggest(r); }
              }) : (r.applied ? el('span', { class: 'conf-chip observed', text: 'in design' }) : el('span', { class: 'muted', style: 'font-size:11px', text: '—' }))
            ])
          ]);
        }))
      ])
    ]));

    body.appendChild(el('p', { class: 'muted', style: 'font-size:12px', text:
      'Verdicts are a deterministic first pass carrying their evidence — correct any in the chat and Claude will re-judge. “AI suggested” drafts a configuration change into the Design (marked AI-SUGGESTED) for your review before Build.' }));

    function aiSuggest(row) {
      var sug = window.StudioSRD.suggest(row, base);
      row.suggestion = sug;
      if (sug.op && M) {
        try {
          if (!M.hasFork()) M.fork(base);
          if (sug.op.op === 'addStatus') M.addStatus(sug.op.name, sug.op.types);
          else if (sug.op.op === 'addAction') {
            var code = (sug.op.name.match(/^([A-Z]{1,3}\d{2,3}[a-z]?)/) || [])[1] || ('X' + Math.floor(Math.random() * 90 + 10));
            M.addAction({ code: code, name: sug.op.name.replace(/^[A-Z]{1,3}\d{2,3}[a-z]?[.\s-]+/, ''), group: 'Reactive Helpdesk Tasks', types: ['Reactive'] });
          }
          row.applied = true;
          if (proj) { proj.changeLog = proj.changeLog || []; proj.changeLog.push({ at: new Date().toISOString(), by: 'AI-SUGGESTED', what: suggestionLabel(sug) + ' (from ' + row.ref + ')', revert: 'Remove the added element from the design fork' }); }
        } catch (e) { row.suggestion = Object.assign({}, sug, { rationale: sug.rationale + ' — could not auto-apply: ' + e.message }); }
      }
      var reqs = srd.requirements.map(function (x) { return x.ref === row.ref ? row : x; });
      persist({ srd: Object.assign({}, srd, { requirements: reqs }), changeLog: proj ? proj.changeLog : undefined });
      rerender();
    }
  }

  function suggestionLabel(s) {
    if (!s) return '';
    if (s.kind === 'add-status') return 'add status “' + s.name + '”';
    if (s.kind === 'add-action') return 'add action “' + s.name + '”';
    if (s.kind === 'review') return 'flagged for Claude to design a change';
    return s.note || s.kind;
  }

  function chip(el, label, n, tone) {
    return el('span', { style: 'display:inline-flex;align-items:center;gap:6px;font-size:13px' }, [
      el('span', { class: 'conf-chip' + (tone === 'observed' ? ' observed' : ''), style: tone === 'danger' ? 'background:#fdeaea;color:var(--danger)' : tone === 'warn' ? 'background:#fef6e6;color:#8a6d1a' : '', text: String(n) }),
      el('b', { text: label })
    ]);
  }
  function verdictChip(el, v) {
    var tone = v === 'PRESENT' ? 'background:#e7f5ee;color:#1e6b4f' : v === 'NOT-PRESENT' ? 'background:#fdeaea;color:var(--danger)' : 'background:#fef6e6;color:#8a6d1a';
    return el('span', { class: 'conf-chip', style: tone, text: v });
  }

  window.StudioSRDView = { render: render };
})();
