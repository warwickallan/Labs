/* solutiondesign.js — SOLUTION DESIGN: the customer-facing document for the
 * selected project. It tells the customer what has been delivered, in their
 * language, and is what they sign off against — so it never carries known
 * faults, internal registers or software concerns. The consultant's
 * exhaustive report is the separate TECHNICAL DESIGN view.
 */
(function () {
  'use strict';

  function buildDocument(base, opts) {
    var SS = window.StudioSnapshots;
    var project = opts.project;
    var vanilla = opts.vanilla || base;
    var model = (SS && project) ? (SS.currentModel(project) || base) : base;
    var diff = window.StudioDiff.compare(vanilla, model);
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

  function render(container, base, opts) {
    if (window.StudioSchema && window.StudioSchema.completeModel) container = window.StudioSchema.completeModel(container);
    var el = window.StudioDom.el;
    opts = opts || {};
    var project = opts.project || null;
    window.StudioDom.clear(container);
    var page = el('div', { class: 'page wide' });
    container.appendChild(page);

    var doc = buildDocument(base, opts);
    var docName = (project ? project.key.toUpperCase() + '-' : 'VANILLA-') + 'SOLUTION-DESIGN';

    page.appendChild(el('div', { class: 'toolstrip' }, [
      el('span', { class: 'src-chip', text: 'Customer-facing — describes the delivered system for sign-off. The consultant’s report is the Technical Design view.' }),
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
      title: 'Solution Design preview'
    });
    frame.setAttribute('srcdoc', doc);
    page.appendChild(frame);
  }

  window.StudioSolutionDesignView = { render: render };
})();
