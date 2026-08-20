/* solutiondesign.js — the document page for the selected project.
 *
 * SOLUTION DESIGN (default) — customer-facing. It tells the customer what
 * has been delivered, in their language, and is something they sign off
 * against. It never carries internal fault registers, capture states or
 * software concerns. One document per project: the current/agreed design
 * and its deviations from the relevant Vanilla reference.
 *
 * TECHNICAL DESIGN (second tab) — the implementation team's exhaustive
 * generated document (the former Solution Design format, renamed). It may
 * legitimately contain known faults, gaps and internal register codes —
 * that is its job. Its historical states (Day-One / Current / Proposed)
 * sit inside this tab as version controls, not in the primary UX.
 *
 * Vanilla's own Technical Design lives in Settings → Vanilla.
 */
(function () {
  'use strict';

  var state = { tab: 'solution', tdVersion: 'current' };

  function projectModels(project, base, opts) {
    var SS = window.StudioSnapshots;
    var M = window.StudioModel;
    return {
      current: (SS && project) ? (SS.currentModel(project) || base) : base,
      baseline: (SS && project) ? SS.baselineModel(project) : null,
      desired: (M && M.hasFork()) ? M.desired() : null
    };
  }

  function buildSolutionDesign(base, opts) {
    var project = opts.project;
    var vanilla = opts.vanilla || base;
    var models = projectModels(project, base, opts);
    var model = models.current || base;
    var diff = window.StudioDiff.compare(vanilla, model);
    var SS = window.StudioSnapshots;
    var entry = (SS && project) ? (SS.byRole(project, 'current') || SS.selectedEntry(project)) : null;
    var rec = (SS && project && entry) ? SS.entryRecord(project, entry) : null;
    var ratified = window.StudioSettings && window.StudioSettings.ratified && window.StudioSettings.ratified();
    return window.StudioSolDesignCustomer.generate(model, {
      project: project,
      vanilla: vanilla,
      ratified: ratified || null,
      stamp: (entry && SS) ? SS.stampLabel(entry) : null,
      deviations: window.StudioDiff.deviationSchedule(diff),
      ingestReport: rec && rec.meta ? rec.meta.ingestReport : null
    });
  }

  function buildTechnicalDesign(base, opts) {
    var project = opts.project;
    var vanilla = opts.vanilla || base;
    var models = projectModels(project, base, opts);
    var model = state.tdVersion === 'baseline' ? models.baseline
      : state.tdVersion === 'proposed' ? models.desired
        : models.current;
    model = model || base;
    var against = (state.tdVersion === 'baseline' || !models.baseline) ? vanilla : models.baseline;
    var diff = window.StudioDiff.compare(against, model);
    var SS = window.StudioSnapshots;
    var entry = (SS && project) ? SS.selectedEntry(project) : null;
    var rec = (SS && project && entry) ? SS.entryRecord(project, entry) : null;
    return window.StudioSolDesign.generate(model, {
      edition: state.tdVersion === 'proposed' ? 'customer' : (project ? 'instance' : 'vanilla'),
      project: project,
      stateLabel: state.tdVersion === 'proposed' ? 'Proposed design'
        : state.tdVersion === 'baseline' ? 'Day-One baseline' : 'Current configuration',
      snapshotStamp: (entry && SS) ? SS.stampLabel(entry) : null,
      baselineLabel: (state.tdVersion === 'baseline' || !models.baseline)
        ? 'Vanilla ' + vanilla.meta.generatedAt.helpdesk
        : (project ? project.name + ' Day-One' : 'Vanilla'),
      ingestReport: rec && rec.meta ? rec.meta.ingestReport : null,
      diff: diff,
      deviations: window.StudioDiff.deviationSchedule(diff),
      findings: window.StudioRules.runAll(model)
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

    var isSolution = state.tab === 'solution';
    var doc = isSolution ? buildSolutionDesign(base, opts) : buildTechnicalDesign(base, opts);
    var docName = (project ? project.key.toUpperCase() + '-' : '') +
      (isSolution ? 'SOLUTION-DESIGN' : 'TECHNICAL-DESIGN' + '-' + state.tdVersion.toUpperCase());

    var models = projectModels(project, base, opts);

    page.appendChild(el('div', { class: 'toolstrip' }, [
      el('span', { class: 'seg' }, [
        el('button', {
          class: isSolution ? 'on' : '', text: 'Solution Design',
          title: 'Customer-facing: what has been delivered, for sign-off',
          onclick: function () { state.tab = 'solution'; rerender(); }
        }),
        el('button', {
          class: !isSolution ? 'on' : '', text: 'Technical Design',
          title: 'Implementation team: exhaustive configuration, faults and evidence',
          onclick: function () { state.tab = 'technical'; rerender(); }
        })
      ]),
      !isSolution && project ? el('label', { text: 'Version' }) : null,
      !isSolution && project ? el('span', { class: 'seg' }, [
        el('button', { class: state.tdVersion === 'current' ? 'on' : '', text: 'Current', onclick: function () { state.tdVersion = 'current'; rerender(); } }),
        el('button', {
          class: state.tdVersion === 'baseline' ? 'on' : '', text: 'Day-One',
          disabled: models.baseline ? null : 'disabled',
          onclick: function () { state.tdVersion = 'baseline'; rerender(); }
        }),
        el('button', {
          class: state.tdVersion === 'proposed' ? 'on' : '', text: 'Proposed',
          disabled: models.desired ? null : 'disabled',
          title: models.desired ? null : 'No proposed design yet — start one in Design',
          onclick: function () { state.tdVersion = 'proposed'; rerender(); }
        })
      ]) : null,
      isSolution ? el('span', { class: 'src-chip', text: 'Customer-facing — describes the delivered system for sign-off' })
        : el('span', { class: 'src-chip', text: 'Internal — may contain known faults, gaps and register codes' }),
      el('span', { style: 'flex:1' }),
      el('button', {
        class: 'btn', text: 'Open for printing',
        title: 'Opens the document in its own tab — use the browser’s Print for a PDF',
        onclick: function () {
          var w = window.open('', '_blank');
          w.document.write(doc);
          w.document.close();
        }
      }),
      el('button', {
        class: 'btn', text: 'Download HTML',
        onclick: function () {
          var blob = new Blob([doc], { type: 'text/html' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = docName + '.html';
          a.click();
          URL.revokeObjectURL(a.href);
        }
      })
    ]));

    var frame = el('iframe', {
      style: 'flex:1;border:0;background:#fff;width:100%',
      title: isSolution ? 'Solution Design preview' : 'Technical Design preview'
    });
    frame.setAttribute('srcdoc', doc);
    page.appendChild(frame);
  }

  window.StudioSolutionDesignView = { render: render, _state: state };
})();
