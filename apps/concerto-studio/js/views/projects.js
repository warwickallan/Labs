/* projects.js — PROJECTS: one card per customer engagement. Each card
 * shows the pinned instance, the live deviation and findings counts
 * (computed from the stored instance model — never stored, so they cannot
 * drift), and the change log size. OPEN restores the project's context
 * (instance + desired design) into the running Studio.
 */
(function () {
  'use strict';

  function fmtWhen(iso) {
    return iso ? String(iso).replace('T', ' ').slice(0, 16) : '—';
  }

  function promptNewProject(onDone) {
    var name = window.prompt('Project name (e.g. Kirklees):');
    if (!name || !name.trim()) return;
    var url = window.prompt('Instance URL:', 'https://customer.concertodemo.co.uk');
    if (url === null) return;
    var domains = window.prompt('Domains (comma-separated):', 'Reactive Helpdesk');
    if (domains === null) return;
    try {
      var rec = window.StudioProject.create({
        name: name.trim(),
        instanceUrl: (url || '').trim(),
        domains: domains.split(',').map(function (d) { return d.trim(); }).filter(Boolean)
      });
      /* Persist immediately. A project that exists only in this browser is
       * one refresh away from being lost — and startup prunes anything the
       * durable store does not know about. */
      window.StudioProject.persist(rec.key).then(function (r) {
        if (!r || r.saved !== true) {
          window.alert('"' + rec.name + '" was created, but could NOT be saved to the durable store' +
            (r && r.reason ? ' (' + r.reason + ')' : '') +
            '.\n\nIt exists in this browser only. Start the store and reopen Studio, or export the project, before doing real work in it.');
        }
        onDone();
      });
    } catch (e) { window.alert(e.message); }
  }

  function deviationCount(vanilla, rec) {
    if (!vanilla || !rec.instance || !rec.instance.model) return null;
    try {
      var d = window.StudioDiff.compare(vanilla, rec.instance.model);
      return d.summary.added + d.summary.removed + d.summary.modified;
    } catch (e) { return null; }
  }

  function findingsCount(rec) {
    if (!rec.instance || !rec.instance.model) return null;
    try { return window.StudioRules.runAllDetailed(rec.instance.model).findings.length; }
    catch (e) { return null; }
  }

  function render(container, vanilla) {
    var el = window.StudioDom.el;
    var P = window.StudioProject;
    window.StudioDom.clear(container);

    function rerender() { render(container, vanilla); }

    var page = el('div', { class: 'page' });
    container.appendChild(page);

    var cur = P.current();

    page.appendChild(el('div', { style: 'display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px' }, [
      el('button', { class: 'btn', style: 'font-weight:600', text: '+ New project', onclick: function () { promptNewProject(rerender); } }),
      el('span', { class: 'muted', style: 'font-size:12.5px;color:var(--text-dim)' }, [
        cur
          ? 'Current project: ' + cur.name + (cur.instanceUrl ? ' · ' + cur.instanceUrl : '')
          : 'No project open. A project pins one customer instance and carries its crawl, design and findings context.'
      ])
    ]));

    var projects = P.list();
    if (!projects.length) {
      page.appendChild(el('div', { class: 'stub' }, [
        el('h3', { text: 'No projects yet' }),
        el('p', { text: 'A project pins one customer instance: its URL, the last read-only crawl, the desired-state design forked from Vanilla, and a change log. Create one, connect on the Instance page, then save the context back into the project.' }),
        el('p', { class: 'muted', text: 'Project data stays in this browser (and in exports the team persists under apps/concerto-studio/projects/ — git-ignored, never in the public repository).' })
      ]));
      return;
    }

    function stat(big, label, cls) {
      return el('div', {}, [
        el('b', { class: cls, text: big }),
        el('span', { text: label })
      ]);
    }

    page.appendChild(el('div', { class: 'tiles' }, projects.map(function (rec) {
      var isCurrent = !!(cur && cur.key === rec.key);
      var dev = deviationCount(vanilla, rec);
      var fnd = findingsCount(rec);
      return el('div', { class: 'tile project-card' + (isCurrent ? ' current' : '') }, [
        el('h3', {}, [
          document.createTextNode(rec.name),
          isCurrent ? el('span', { class: 'conf-chip observed', style: 'margin-left:8px', text: 'OPEN' }) : null,
          /* never deleted quietly — surfaced, with the way to fix it */
          rec.unsaved ? el('span', {
            class: 'conf-chip', style: 'margin-left:8px;background:#fdeaea;color:var(--danger)',
            title: 'This project is only in this browser. Save it to the durable store.',
            text: 'NOT SAVED'
          }) : null
        ]),
        rec.unsaved ? el('div', { class: 'wrong-instance', style: 'margin:8px 0' }, [
          document.createTextNode('In this browser only — not in the durable store. '),
          el('button', {
            class: 'btn', text: 'Save now',
            onclick: function () {
              P.persist(rec.key).then(function (r) {
                if (!r || r.saved !== true) {
                  window.alert('Could not save: ' + ((r && r.reason) || 'unknown') +
                    '\n\nStart the store with:\npython apps/concerto-studio/store/store_server.py');
                }
                rerender();
              });
            }
          })
        ]) : null,
        /* TOP LEVEL answers only: which customer, is it healthy, open it.
           Everything else is one click away — a card that dumps domains,
           timestamps, build strings and four buttons hides the message. */
        el('div', { class: 'muted', text: rec.instanceUrl || '(no instance URL)' }),
        el('div', { class: 'stat-row', style: 'margin-top:12px' }, [
          stat(dev === null ? '—' : String(dev), 'deviations vs Vanilla', 'proj-dev'),
          stat(fnd === null ? '—' : String(fnd), 'open findings', 'proj-findings'),
          stat(String((rec.changeLog || []).length), 'change log entries', 'proj-changes')
        ]),
        el('div', { style: 'margin-top:12px;display:flex;gap:8px;flex-wrap:wrap' }, [
          el('button', {
            class: 'btn', style: 'font-weight:600', text: 'OPEN PROJECT',
            onclick: function () {
              P.open(rec.key);
              location.hash = '#diagram';
            }
          })
        ]),
        el('details', { class: 'cfg-sec', style: 'margin-top:10px' }, [
          el('summary', { text: 'Details & actions' }),
          el('div', { class: 'muted', style: 'font-size:12px', text: 'Domains: ' + ((rec.domains || []).join(', ') || '—') }),
          el('div', { class: 'muted', style: 'font-size:12px', text: 'Opened ' + fmtWhen(rec.lastOpenedAt) + ' · crawled ' + fmtWhen(rec.lastCrawlAt) }),
          rec.concertoBuild ? el('div', { class: 'muted', style: 'font-size:12px', text: 'Build ' + rec.concertoBuild }) : null,
          el('div', { style: 'margin-top:10px;display:flex;gap:8px;flex-wrap:wrap' }, [
            isCurrent ? el('button', {
              class: 'btn', text: 'Save current context into project',
              title: 'Stores the current instance snapshot, desired-state design and Vanilla fingerprints into this project',
              onclick: function () { P.captureContext(); rerender(); }
            }) : null,
            el('button', {
              class: 'btn', text: 'Export JSON',
              onclick: function () {
                var blob = new Blob([P.exportProject(rec.key)], { type: 'application/json' });
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = rec.key + '.project.json';
                a.click();
                URL.revokeObjectURL(a.href);
              }
            }),
            el('button', {
              class: 'btn', text: 'Delete',
              onclick: function () {
                if (window.confirm('Delete project "' + rec.name + '" from this browser? Any files persisted under apps/concerto-studio/projects/ are untouched.')) {
                  P.remove(rec.key);
                  rerender();
                }
              }
            })
          ].filter(Boolean))
        ].filter(Boolean))
      ]);
    })));
  }

  window.StudioProjects = { render: render };
})();
