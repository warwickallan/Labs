/* instance.js — INSTANCE: connect to a real Concerto instance through the
 * local harness (read-only), crawl it, and ingest the snapshot as the
 * instance model for Compare / Findings / Solution Design.
 *
 * The UI stays calm: URL + CONNECT, a state chip, CRAWL, per-family
 * progress, last-snapshot summary. Harness detail lives behind the
 * receipts disclosure. Never implies a write capability (there is none).
 */
(function () {
  'use strict';

  var URL_KEY = 'concerto-studio-instance-url';
  var state = {
    harness: null,        /* last probe result */
    session: null,        /* last session status */
    crawlId: null,
    crawlStatus: null,
    polling: false,
    showReceipts: false,
    message: null
  };

  function chipFor() {
    var el = window.StudioDom.el;
    var text, cls = 'src-chip';
    if (!state.harness || !state.harness.available) { text = '● harness offline'; cls += ' bad'; }
    else if (!state.session || state.session.state === 'DISCONNECTED') text = '● disconnected';
    else if (state.session.state === 'LOGIN_REQUIRED') text = '● LOGIN REQUIRED — sign in at the harness browser window';
    else if (state.crawlStatus && /CRAWLING/i.test(state.crawlStatus.state)) text = '● CRAWLING — read only';
    else text = '● CONNECTED — READ ONLY';
    return el('span', { class: cls, text: text });
  }

  /* Every crawl earns a stamped place on the open project's timeline, so it
   * can be re-opened in any view and compared with the capture before it.
   * The harness stamps a full ISO datetime. */
  function addToTimeline(record) {
    var P = window.StudioProject;
    var proj = P && P.current();
    if (!proj) return;
    var snaps = (proj.snapshots || []).slice();
    if (snaps.some(function (s) { return s.id === record.snapshotId; })) return;
    snaps.push({
      id: record.snapshotId,
      label: 'Crawl ' + record.snapshotId,
      path: null, /* held in the harness store, not a project file */
      capturedAt: record.meta.crawledAt || record.ingestedAt,
      source: 'harness crawl (read-only)'
    });
    P.save(proj.key, { snapshots: snaps, lastCrawlAt: record.meta.crawledAt || record.ingestedAt });
  }

  function ingestSnapshot(snapshotId, vanilla, rerender) {
    window.StudioHarness.snapshot(snapshotId).then(function (snap) {
      var record = window.StudioIngest.toInstanceRecord(snapshotId, snap, vanilla);
      var diff = window.StudioDiff.compare(vanilla, record.model);
      window.StudioApp.instance = record;
      window.StudioHarness.instanceStore.save(record);
      addToTimeline(record);
      state.message = 'Snapshot ' + snapshotId + ' ingested: ' +
        diff.summary.added + ' added / ' + diff.summary.removed + ' removed / ' +
        diff.summary.modified + ' modified vs Vanilla.';
      rerender();
    }).catch(function (e) {
      state.message = 'Snapshot ingest failed: ' + e.message;
      rerender();
    });
  }

  function render(container, vanilla) {
    var el = window.StudioDom.el;
    window.StudioDom.clear(container);
    var page = el('div', { class: 'page' });
    container.appendChild(page);

    function rerender() { render(container, vanilla); }

    /* initial probe */
    if (state.harness === null) {
      state.harness = { probing: true };
      window.StudioHarness.probe().then(function (p) {
        state.harness = p;
        if (p.available && p.session) state.session = p.session;
        rerender();
      });
    }

    /* THE TARGET IS THE PROJECT'S INSTANCE. The project already carries
     * its URL; asking again — and remembering the last one typed, whoever
     * it belonged to — is how one customer's configuration ends up in
     * another customer's project. With a project open the URL is shown,
     * not requested; only the no-project case offers a box. */
    var proj = window.StudioProject ? window.StudioProject.current() : null;
    var projectUrl = proj && proj.instanceUrl ? String(proj.instanceUrl).trim() : '';
    var typedUrl = '';
    try { typedUrl = localStorage.getItem(URL_KEY) || ''; } catch (e) { /* */ }

    var urlInput = null;
    var targetNode;
    if (projectUrl) {
      targetNode = el('span', { class: 'target-fixed' }, [
        el('b', { text: projectUrl }),
        el('span', { class: 'muted', style: 'font-size:11.5px', text: ' — this project’s instance' })
      ]);
    } else {
      urlInput = el('input', {
        type: 'text', value: typedUrl,
        placeholder: 'https://customer.concerto.co.uk',
        style: 'font:inherit;font-size:13px;padding:7px 12px;border:1px solid var(--border-strong);border-radius:6px;width:400px',
        onchange: function (ev) {
          try { localStorage.setItem(URL_KEY, ev.target.value.trim()); } catch (e) { /* */ }
        }
      });
      targetNode = urlInput;
    }
    function targetUrl() { return projectUrl || (urlInput ? urlInput.value.trim() : ''); }

    /* host identity — a login redirect is the same instance, a different
     * hostname is a different system */
    function hostOf(u) {
      try { return new URL(/^https?:/i.test(u) ? u : 'https://' + u).hostname.toLowerCase(); }
      catch (e) { return ''; }
    }
    var sessionHost = state.session && state.session.targetUrl ? hostOf(state.session.targetUrl) : '';
    var wantHost = hostOf(targetUrl());
    var wrongInstance = !!(sessionHost && wantHost && sessionHost !== wantHost);

    var connected = state.session && state.session.state === 'CONNECTED_READ_ONLY';
    var loginRequired = state.session && state.session.state === 'LOGIN_REQUIRED';
    var crawling = state.crawlStatus && /QUEUED|CRAWLING/i.test(state.crawlStatus.state);

    function pollSession() {
      if (state.polling) return;
      state.polling = true;
      (function tick() {
        window.StudioHarness.sessionStatus().then(function (s) {
          var was = state.session && state.session.state;
          state.session = s;
          if (s.state === 'LOGIN_REQUIRED') { setTimeout(tick, 3000); }
          else { state.polling = false; }
          if (was !== s.state) rerender();
        }).catch(function () { state.polling = false; });
      })();
    }

    function pollCrawl(cid) {
      window.StudioHarness.crawlStatus(cid).then(function (st) {
        state.crawlStatus = st;
        if (/QUEUED|CRAWLING/i.test(st.state)) {
          setTimeout(function () { pollCrawl(cid); }, 1500);
          rerender();
        } else {
          rerender();
          if ((st.state === 'COMPLETE' || st.state === 'PARTIAL') && st.snapshotId) {
            ingestSnapshot(st.snapshotId, vanilla, rerender);
          }
        }
      }).catch(function (e) { state.message = 'crawl status failed: ' + e.message; rerender(); });
    }

    page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
      el('h3', { text: 'Target instance' }),
      el('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' }, [
        targetNode,
        el('button', {
          class: 'btn', text: 'CONNECT (read-only)',
          disabled: (state.harness && state.harness.available && !crawling) ? null : 'disabled',
          onclick: function () {
            var url = targetUrl();
            if (!url) return;
            state.message = 'Opening the harness browser…';
            rerender();
            window.StudioHarness.connect(url).then(function (s) {
              state.session = s;
              state.message = s.state === 'LOGIN_REQUIRED'
                ? 'Sign in at the harness browser window — the Studio never enters credentials. This page resumes automatically.'
                : null;
              if (s.state === 'LOGIN_REQUIRED') pollSession();
              rerender();
            }).catch(function (e) { state.message = 'Connect failed: ' + e.message; rerender(); });
          }
        }),
        el('button', {
          class: 'btn', text: crawling ? 'CRAWLING…' : 'CRAWL INSTANCE',
          disabled: (connected && !crawling && !wrongInstance) ? null : 'disabled',
          title: wrongInstance ? 'The harness is connected to a different instance'
            : (connected ? 'Read-only crawl of Helpdesk + Orders admin' : 'Requires CONNECTED — READ ONLY'),
          onclick: function () {
            /* the expected instance travels with the request; the harness
               refuses the crawl if its session is elsewhere */
            window.StudioHarness.crawl(['helpdesk', 'orders'], targetUrl()).then(function (r) {
              state.crawlId = r.crawlId;
              state.crawlStatus = { state: 'QUEUED', progress: {} };
              rerender();
              pollCrawl(r.crawlId);
            }).catch(function (e) { state.message = 'Crawl failed to start: ' + e.message; rerender(); });
          }
        }),
        chipFor()
      ]),
      wrongInstance ? el('p', { class: 'wrong-instance' }, [
        el('b', { text: 'The harness browser is on ' + sessionHost + ', not ' + wantHost + '. ' }),
        document.createTextNode('Press CONNECT to point it at this project’s instance. Nothing from another system can be captured into this project.')
      ]) : null,
      state.message ? el('p', { class: 'muted', style: 'margin-bottom:0', text: state.message }) : null,
      (!state.harness || !state.harness.available) ? el('p', { class: 'muted', style: 'margin-bottom:0' }, [
        document.createTextNode((state.harness && state.harness.reason) || 'Probing harness…'),
        document.createTextNode(' Launcher: '),
        el('code', { text: 'python apps/concerto-studio/harness/server.py' })
      ]) : null
    ]));

    /* what the instance said when it refused — plain, with the next step */
    if (state.crawlStatus && (state.crawlStatus.notCrawled || []).length) {
      page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
        el('h3', { text: 'Some of this instance could not be read' }),
        el('p', { class: 'muted', style: 'margin-top:0', text:
          'The crawl kept everything it could. What follows is what Concerto itself said — not a Studio failure, and nothing has been guessed to fill the gap.' }),
        el('ul', { style: 'margin:0;font-size:12.5px' }, state.crawlStatus.notCrawled.map(function (n) {
          return el('li', { style: 'margin:6px 0' }, [
            el('b', { text: n.family + ': ' }),
            document.createTextNode(n.reason || 'no reason given')
          ]);
        })),
        el('p', { class: 'muted', style: 'font-size:12px;margin-bottom:0', text:
          'These families stay UNKNOWN in the model rather than empty — the views and documents will say so.' })
      ]));
    }

    /* crawl progress */
    if (state.crawlStatus && state.crawlStatus.progress && Object.keys(state.crawlStatus.progress).length) {
      var prog = state.crawlStatus.progress;
      page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
        el('h3', { text: 'Crawl ' + (state.crawlStatus.state || '') }),
        el('table', { class: 'list', style: 'max-width:460px' }, [
          el('tbody', {}, Object.keys(prog).map(function (fam) {
            var p = prog[fam];
            return el('tr', {}, [
              el('td', { text: fam }),
              el('td', { text: p.done + '/' + p.total }),
              el('td', {}, [el('div', { style: 'background:var(--surface-2);border-radius:4px;height:8px;width:120px' }, [
                el('div', { style: 'background:var(--accent);height:8px;border-radius:4px;width:' + (p.total ? Math.round(100 * p.done / p.total) : 0) + '%' })
              ])])
            ]);
          }))
        ]),
        state.crawlStatus.error ? el('p', { class: 'bad-text', text: state.crawlStatus.error }) : null,
        (state.crawlStatus.notCrawled || []).length ? el('ul', { class: 'muted', style: 'font-size:12px' },
          state.crawlStatus.notCrawled.map(function (n) {
            return el('li', { text: 'NOT CRAWLED: ' + n.family + ' — ' + n.reason });
          })) : null
      ]));
    }

    /* last ingested snapshot */
    var inst = window.StudioApp.instance;
    page.appendChild(el('div', { class: 'tile', style: 'margin-bottom:16px' }, [
      el('h3', { text: 'Last snapshot' }),
      inst ? el('div', {}, [
        el('table', { class: 'list', style: 'max-width:640px' }, [el('tbody', {}, [
          el('tr', {}, [el('td', { text: 'Snapshot' }), el('td', {}, [el('code', { text: inst.snapshotId })])]),
          el('tr', {}, [el('td', { text: 'Instance' }), el('td', { text: inst.meta.targetUrl })]),
          el('tr', {}, [el('td', { text: 'Crawled' }), el('td', { text: inst.meta.crawledAt + (inst.meta.concertoBuild ? ' · build ' + inst.meta.concertoBuild : '') })]),
          el('tr', {}, [el('td', { text: 'Counts' }), el('td', { text: JSON.stringify(inst.meta.counts || {}) })]),
          el('tr', {}, [el('td', { text: 'Warnings' }), el('td', { text: String((inst.meta.warnings || []).length) })]),
          el('tr', {}, [el('td', { text: 'Not crawled' }), el('td', { text: (inst.meta.notCrawled || []).map(function (n) { return n.family; }).join(', ') || '—' })])
        ])]),
        el('p', {}, [
          el('a', { href: '#compare', class: 'btn', style: 'text-decoration:none', text: 'Compare with Vanilla' }),
          document.createTextNode('  '),
          el('a', { href: '#findings', class: 'btn', style: 'text-decoration:none', text: 'Run Findings against instance' })
        ])
      ]) : el('p', { class: 'muted', text: 'No snapshot ingested yet.' })
    ]));

    /* receipts disclosure */
    page.appendChild(el('div', { class: 'tile' }, [
      el('h3', { text: 'Harness receipts' }),
      el('button', {
        class: 'btn', text: state.showReceipts ? 'Hide' : 'Show receipts',
        onclick: function () {
          state.showReceipts = !state.showReceipts;
          rerender();
        }
      }),
      state.showReceipts ? el('div', { id: 'receiptsHost', style: 'margin-top:10px' }, [el('p', { class: 'muted', text: 'Loading…' })]) : null
    ]));
    if (state.showReceipts) {
      window.StudioHarness.receipts().then(function (r) {
        var host = document.getElementById('receiptsHost');
        if (!host) return;
        window.StudioDom.clear(host);
        host.appendChild(el('table', { class: 'list' }, [
          el('thead', {}, [el('tr', {}, ['When', 'Kind', 'Target', 'Outcome', 'Counts', 'Errors'].map(function (h) { return el('th', { text: h }); }))]),
          el('tbody', {}, (r.receipts || []).slice().reverse().map(function (rec) {
            return el('tr', {}, [
              el('td', { text: rec.finishedAt || rec.recordedAt }),
              el('td', { text: rec.kind }),
              el('td', { text: rec.target || '' }),
              el('td', {}, [el('span', { class: 'conf-chip' + (rec.outcome === 'COMPLETE' ? ' observed' : ''), style: rec.outcome === 'FAILED' ? 'background:#fdeaea;color:var(--danger)' : '', text: rec.outcome })]),
              el('td', { style: 'font-size:11px', text: JSON.stringify(rec.counts || {}) }),
              el('td', { style: 'font-size:11px', text: (rec.errors || []).join('; ') })
            ]);
          }))
        ]));
      }).catch(function () { /* offline */ });
    }
  }

  window.StudioInstance = { render: render, _state: state };
})();
