/* solutiondesign.js — the Solution Design page: choose an edition, preview
 * the generated document inline, open it in its own tab for printing
 * (browser print → PDF), or download the standalone HTML.
 */
(function () {
  'use strict';

  var state = { edition: 'vanilla' };

  function buildDocument(vanilla) {
    var M = window.StudioModel;
    var isCustomer = state.edition === 'customer' && M.hasFork();
    var model = isCustomer ? M.desired() : vanilla;
    var findings = window.StudioRules.runAll(model);
    var diff = isCustomer ? window.StudioDiff.compare(vanilla, M.desired()) : null;
    return window.StudioSolDesign.generate(model, {
      edition: isCustomer ? 'customer' : 'vanilla',
      diff: diff,
      findings: findings
    });
  }

  function render(container, vanilla) {
    var el = window.StudioDom.el;
    var M = window.StudioModel;
    window.StudioDom.clear(container);
    var page = el('div', { class: 'page wide' });
    container.appendChild(page);

    function rerender() { render(container, vanilla); }

    var customerAvailable = M.hasFork();
    if (state.edition === 'customer' && !customerAvailable) state.edition = 'vanilla';

    page.appendChild(el('div', { class: 'toolstrip' }, [
      el('label', { text: 'Edition' }),
      el('span', { class: 'seg' }, [
        el('button', { class: state.edition === 'vanilla' ? 'on' : '', text: 'Vanilla', onclick: function () { state.edition = 'vanilla'; rerender(); } }),
        el('button', {
          class: state.edition === 'customer' ? 'on' : '',
          text: 'Customer' + (customerAvailable ? '' : ' (no design fork)'),
          disabled: customerAvailable ? null : 'disabled',
          onclick: function () { state.edition = 'customer'; rerender(); }
        })
      ]),
      el('span', { style: 'flex:1' }),
      el('button', {
        class: 'btn', text: 'Open for printing',
        title: 'Opens the document in its own tab — use the browser\'s Print for a PDF',
        onclick: function () {
          var w = window.open('', '_blank');
          w.document.write(buildDocument(vanilla));
          w.document.close();
        }
      }),
      el('button', {
        class: 'btn', text: 'Download HTML',
        onclick: function () {
          var blob = new Blob([buildDocument(vanilla)], { type: 'text/html' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = (state.edition === 'customer' ? 'CUSTOMER' : 'VANILLA') + '-SOLUTION-DESIGN.html';
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
    frame.setAttribute('srcdoc', buildDocument(vanilla));
    page.appendChild(frame);
  }

  window.StudioSolutionDesignView = { render: render, _state: state };
})();
