/* solutiondesign.js — the Solution Design page: choose an edition, preview
 * the generated document inline, open it in its own tab for printing
 * (browser print → PDF), or download the standalone HTML.
 *
 * PROJECT CONTEXTUAL. With a project selected, the editions are that
 * project's own states — Current, Day-One baseline, Desired design — and
 * the document describes THAT engagement: its instance, its changes and
 * verifications, its findings, its open customer decisions, its coverage
 * gaps. The generic Vanilla Solution Design is not produced here; Vanilla
 * belongs to Settings → Vanilla baselines.
 */
(function () {
  'use strict';

  var state = { edition: null };

  function editionsFor(project) {
    var M = window.StudioModel;
    var SS = window.StudioSnapshots;
    if (!project) return [{ id: 'vanilla', label: 'Vanilla', available: true }];
    var base = SS && SS.byRole(project, 'baseline');
    return [
      { id: 'current', label: 'Current configuration', available: !!(SS && SS.currentModel(project)) },
      { id: 'baseline', label: 'Day-One baseline', available: !!(base && SS.entryRecord(project, base)) },
      { id: 'desired', label: 'Desired design', available: !!(M && M.hasFork()) }
    ];
  }

  function modelFor(edition, base, opts) {
    var M = window.StudioModel;
    var SS = window.StudioSnapshots;
    var project = opts.project;
    if (!project) return opts.vanilla || base;
    if (edition === 'desired' && M.hasFork()) return M.desired();
    if (edition === 'baseline') return SS ? SS.baselineModel(project) : null;
    return SS ? SS.currentModel(project) : base;
  }

  function buildDocument(base, opts) {
    var SS = window.StudioSnapshots;
    var project = opts.project;
    var vanilla = opts.vanilla || base;
    var model = modelFor(state.edition, base, opts) || base;
    var findings = window.StudioRules.runAll(model);

    if (!project) {
      return window.StudioSolDesign.generate(model, { edition: 'vanilla', findings: findings });
    }

    /* The comparison baseline is the project's OWN Day-One for a current or
     * desired document; the Day-One document itself is compared with
     * Vanilla, because that is the only earlier thing it can be measured
     * against. */
    var dayOne = SS ? SS.baselineModel(project) : null;
    var against = (state.edition === 'baseline' || !dayOne) ? vanilla : dayOne;
    var againstLabel = (state.edition === 'baseline' || !dayOne)
      ? 'Vanilla ' + vanilla.meta.generatedAt.helpdesk
      : project.name + ' Day-One';
    var diff = window.StudioDiff.compare(against, model);
    var entry = SS ? SS.selectedEntry(project) : null;
    var rec = (SS && entry) ? SS.entryRecord(project, entry) : null;

    return window.StudioSolDesign.generate(model, {
      edition: state.edition === 'desired' ? 'customer' : 'instance',
      project: project,
      stateLabel: state.edition === 'desired' ? 'Desired design'
        : state.edition === 'baseline' ? 'Day-One baseline' : 'Current configuration',
      snapshotStamp: entry ? SS.stampLabel(entry) : null,
      baselineLabel: againstLabel,
      ingestReport: rec && rec.meta ? rec.meta.ingestReport : null,
      diff: diff,
      deviations: window.StudioDiff.deviationSchedule(diff),
      notCrawled: null,
      findings: findings
    });
  }

  function render(container, base, opts) {
    var el = window.StudioDom.el;
    opts = opts || {};
    var project = opts.project || null;
    window.StudioDom.clear(container);
    var page = el('div', { class: 'page wide' });
    container.appendChild(page);

    function rerender() { render(container, base, opts); }

    var editions = editionsFor(project);
    var chosen = editions.filter(function (e) { return e.id === state.edition && e.available; })[0];
    if (!chosen) {
      chosen = editions.filter(function (e) { return e.available; })[0] || editions[0];
      state.edition = chosen.id;
    }

    page.appendChild(el('div', { class: 'toolstrip' }, [
      el('label', { text: project ? project.name : 'Edition' }),
      el('span', { class: 'seg' }, editions.map(function (e) {
        return el('button', {
          class: state.edition === e.id ? 'on' : '',
          text: e.label + (e.available ? '' : ' (none)'),
          disabled: e.available ? null : 'disabled',
          onclick: function () { state.edition = e.id; rerender(); }
        });
      })),
      project ? el('span', { class: 'src-chip', text: 'The Vanilla Solution Design lives in Settings → Vanilla baselines' }) : null,
      el('span', { style: 'flex:1' }),
      el('button', {
        class: 'btn', text: 'Open for printing',
        title: 'Opens the document in its own tab — use the browser\'s Print for a PDF',
        onclick: function () {
          var w = window.open('', '_blank');
          w.document.write(buildDocument(base, opts));
          w.document.close();
        }
      }),
      el('button', {
        class: 'btn', text: 'Download HTML',
        onclick: function () {
          var blob = new Blob([buildDocument(base, opts)], { type: 'text/html' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = ((project ? project.key.toUpperCase() + '-' : '') + String(state.edition || 'vanilla').toUpperCase()) + '-SOLUTION-DESIGN.html';
          a.click();
          URL.revokeObjectURL(a.href);
        }
      })
    ]));

    /* inline preview via a sandboxed same-origin iframe (srcdoc) */
    var frame = el('iframe', {
      style: 'flex:1;border:0;background:#fff;width:100%',
      title: 'Solution Design preview'
    });
    frame.setAttribute('srcdoc', buildDocument(base, opts));
    page.appendChild(frame);
  }

  window.StudioSolutionDesignView = { render: render, _state: state };
})();
