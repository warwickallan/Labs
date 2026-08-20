/* harness-client.js — the Concerto adapter boundary (Studio side).
 *
 * Talks to the local harness service (harness/server.py on
 * http://127.0.0.1:8602), which owns the Playwright browser. READ-ONLY:
 * the service has no write endpoint (its /execute refuses by design) and
 * /health reports writeCapability:false — the UI must never imply
 * otherwise. A human signs in at the harness's visible browser window;
 * the Studio never sees or sends credentials.
 *
 * Contract:
 *   probe()            -> {available, writeCapability, session, reason?}
 *   connect(url)       -> session status  (read-only; never credentials)
 *   sessionStatus()    -> live session status
 *   crawl(domains)     -> {crawlId}
 *   crawlStatus(id)    -> {state, progress, counts, warnings, notCrawled}
 *   snapshot(id)       -> INSTANCE-SNAPSHOT json
 *   receipts()         -> receipt index
 *   execute()          -> always rejects (no write capability exists)
 */
(function () {
  'use strict';

  var BASE = 'http://127.0.0.1:8602';

  function call(method, path, payload) {
    return fetch(BASE + path, {
      method: method,
      headers: payload ? { 'Content-Type': 'application/json' } : undefined,
      body: payload ? JSON.stringify(payload) : undefined
    }).then(function (r) {
      return r.json().then(function (body) {
        if (!r.ok) throw new Error(body.error || ('harness error ' + r.status));
        return body;
      });
    });
  }

  var api = {
    base: BASE,
    probe: function () {
      return call('GET', '/health')
        .then(function (h) {
          return { available: true, writeCapability: h.writeCapability, session: h.session, versions: h };
        })
        .catch(function (e) {
          return { available: false, reason: 'Harness service not running (start apps/concerto-studio/harness/server.py). ' + e.message };
        });
    },
    connect: function (url) { return call('POST', '/session/connect', { url: url }); },
    sessionStatus: function () { return call('GET', '/session/status'); },
    disconnect: function () { return call('POST', '/session/disconnect', {}); },
    /* expectInstance states which instance the caller believes it is
     * crawling; the harness refuses if its session is on another host */
    crawl: function (domains, expectInstance) {
      return call('POST', '/crawl', { domains: domains, expectInstance: expectInstance || null });
    },
    crawlStatus: function (id) { return call('GET', '/crawl/' + id + '/status'); },
    snapshot: function (id) { return call('GET', '/snapshot/' + id); },
    receipts: function () { return call('GET', '/receipts'); },
    /* Disciplined write path. Gated in the harness by harness.config.json
       (writeEnabled), audited with before/after/revert, receipted. apply
       defaults to false — a dry run that records the before-state and the
       planned change without touching the instance. The harness answers 403
       when writing is not enabled, with the exact opt-in instruction. */
    execute: function (op, apply) {
      return call('POST', '/execute', Object.assign({}, op, { apply: !!apply }));
    }
  };

  /* ---- instance model store (normalised model + meta only — raw crawl
   * artifacts stay with the harness snapshots on disk) ---- */
  var STORE_KEY = 'concerto-studio-instance-v1';
  api.instanceStore = {
    save: function (record) {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(record)); } catch (e) { /* too large / private mode */ }
    },
    load: function () {
      try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; }
    },
    clear: function () { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* */ } }
  };

  window.StudioHarness = api;
})();
