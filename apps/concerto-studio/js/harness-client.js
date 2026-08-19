/* harness-client.js — the Concerto adapter boundary.
 *
 * The Studio never talks to Concerto directly: everything goes through
 * this adapter interface. The first implementation will be a separate
 * local Python service driving a browser harness (crawl first, execution
 * later, per the techniques proven in docs/DISCOVERY-TECHNIQUES-AND-
 * LESSONS.md); an HTTP/API adapter can replace it without touching the
 * editor. TODAY no adapter exists — this stub declares the interface and
 * reports honest unavailability, so the Instance/Build UIs can be real
 * about their state instead of pretending.
 *
 * Contract (all methods return Promises):
 *   probe()                 -> {available, version?, reason?}
 *   connect(url)            -> {sessionState, fingerprint?}   READ-ONLY
 *   crawl(url, domains)     -> {snapshotId, model}            READ-ONLY
 *   execute(plan, approval) -> {receiptId, results}           GATED
 *   readBack(targets)       -> {model}
 *
 * Invariants the real adapter must keep: a human signs in (the adapter
 * never enters credentials); first connection is read-only; every
 * execution appends one truthful receipt and is verified by read-back;
 * write scope is gated (never the Vanilla demo tenant) plus exact-plan
 * approval.
 */
(function () {
  'use strict';

  var NOT_BUILT = 'The browser-harness service is not built yet. It will run as a separate local Python service; the Studio calls it over localhost HTTP.';

  var api = {
    available: false,
    reason: NOT_BUILT,
    probe: function () { return Promise.resolve({ available: false, reason: NOT_BUILT }); },
    connect: function () { return Promise.reject(new Error(NOT_BUILT)); },
    crawl: function () { return Promise.reject(new Error(NOT_BUILT)); },
    execute: function () { return Promise.reject(new Error('Execution requires the adapter AND explicit authorisation — neither exists.')); },
    readBack: function () { return Promise.reject(new Error(NOT_BUILT)); }
  };

  /* snapshot store: crawled instance snapshots will live here (browser
   * storage now; the harness service will also file them under
   * apps/concerto-studio/snapshots/, which is git-ignored). */
  var SNAP_KEY = 'concerto-studio-snapshots-v1';
  api.snapshots = {
    list: function () {
      try { return JSON.parse(localStorage.getItem(SNAP_KEY) || '[]'); } catch (e) { return []; }
    },
    add: function (snap) {
      var all = api.snapshots.list();
      all.unshift(snap);
      localStorage.setItem(SNAP_KEY, JSON.stringify(all));
    }
  };

  window.StudioHarness = api;
})();
