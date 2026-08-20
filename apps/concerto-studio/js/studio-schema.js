/* studio-schema.js — the ONLY place that knows Concerto's shapes.
 *
 * Canonical-key scheme, note parsing, badge vocabulary, confidence grades,
 * deep clone/equal/freeze helpers. No DOM, no fetch, no state.
 *
 * Identity rule (from model/IDENTITIES.json semantics): Concerto GUIDs are
 * environment identities, never portable. Display names are NOT guaranteed
 * unique (duplicate 'Default' order priorities, four SP07 supplier actions).
 * Canonical keys are '<domain>:<objectType>:<kebab-name>' with an explicit
 * disambiguator where the source model already carries one (canonicalKey).
 */
(function () {
  'use strict';

  var CONFIDENCE = {
    OBSERVED: 'VERIFIED — OBSERVED',
    STRUCTURAL: 'VERIFIED — STRUCTURAL',
    INFERRED: 'INFERRED',
    UNKNOWN: 'UNKNOWN'
  };

  function kebab(name) {
    return String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /* domain: 'hd' (Helpdesk), 'ord' (Orders), 'x' (cross-domain) */
  function canonicalKey(domain, objectType, name, disambiguator) {
    var key = domain + ':' + objectType + ':' + kebab(disambiguator || name);
    return key;
  }

  /* ---- Action note parsing -------------------------------------------
   * VANILLA-HELPDESK.json carries per-action detail in machine-generated
   * `notes` prose (build_model.py). The format is consistent:
   *   "Button group: <g>. [Job type: <t>.] [Flags: a, b.] [Record view
   *    (E-008): Resulting type <T>; ... adds tag '<x>', removes tag '<y>'.]"
   * Everything parsed here is graded PARSED-FROM-NOTES so the UI can show
   * its provenance honestly. Anything unmatched stays in rawNotes.
   */
  function parseActionNotes(notes) {
    var out = {
      buttonGroup: null,
      flags: [],
      addsTags: [],
      removesTags: [],
      resultingType: null,
      rawNotes: notes || ''
    };
    if (!notes) return out;

    var m = notes.match(/Button group:\s*([^.]+)\./);
    if (m) out.buttonGroup = m[1].trim();

    m = notes.match(/Flags:\s*([^.]+)\./);
    if (m) {
      out.flags = m[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }

    m = notes.match(/Resulting type\s+([A-Za-z]+)/);
    if (m) out.resultingType = m[1];

    var re = /adds tag '([^']+)'/g, t;
    while ((t = re.exec(notes)) !== null) out.addsTags.push(t[1]);
    re = /removes tag '([^']+)'/g;
    while ((t = re.exec(notes)) !== null) out.removesTags.push(t[1]);

    return out;
  }

  /* ---- Badge vocabulary ----------------------------------------------
   * Small meaningful badges, not visual noise. Each returns {label, kind}
   * where kind maps to a CSS class. Derived ONLY from evidenced fields.
   */
  /* Complete a model in place so every view can render it. Models arrive
   * from the canonical loader, deterministic crawls, AI inspection and
   * imports; only the first guarantees every field. A missing list must
   * read as EMPTY, never crash a view — absence of data is a fact the
   * views know how to state. */
  function completeModel(m) {
    if (!m) return m;
    /* the canonical Vanilla model is deep-frozen AND complete — hands off */
    if (Object.isFrozen(m)) return m;
    var safe = function (fn) { try { fn(); } catch (e) { /* frozen sub-tree = canonical = already complete */ } };
    safe(function () { m.helpdesk = m.helpdesk || {}; });
    if (!m.helpdesk) return m;
    var hd = m.helpdesk;
    hd.types = hd.types || [];
    hd.statuses = hd.statuses || [];
    hd.actions = hd.actions || [];
    hd.availability = hd.availability || [];
    hd.results = hd.results || [];
    hd.operativeStatuses = hd.operativeStatuses || [];
    hd.tags = hd.tags || [];
    hd.responseCategories = hd.responseCategories || [];
    safe(function () { hd.statuses.forEach(function (st) {
      st.types = st.types || ['Reactive', 'Planned'];
      st.isDefaultFor = st.isDefaultFor || [];
      st.ordering = st.ordering || {};
      st.suppressed = !!st.suppressed;
      st.suppressed = !!st.suppressed;
    }); });
    safe(function () { hd.actions.forEach(function (a) {
      a.flags = (a.flags || []).filter(function (f) { return typeof f === 'string'; });
      a.addsTags = a.addsTags || [];
      a.removesTags = a.removesTags || [];
      a.types = a.types || ['Reactive', 'Planned'];
      a.firedBySupplierActions = a.firedBySupplierActions || [];
      a.availableIn = a.availableIn || [];
      a.emails = a.emails || [];
      a.constraints = a.constraints || [];
      a.ordersEffects = a.ordersEffects || [];
    }); });
    safe(function () { hd.types.forEach(function (t) {
      t.statuses = t.statuses || [];
      t.actions = t.actions || [];
    }); });
    safe(function () {
      m.orders = m.orders || {};
      var o = m.orders;
      o.orderStatuses = o.orderStatuses || [];
      o.orderPriorities = o.orderPriorities || [];
      o.supplierActions = o.supplierActions || [];
      o.unknowns = o.unknowns || [];
    });
    safe(function () { m.crossDomain = m.crossDomain || {}; });
    safe(function () { m.meta = m.meta || {}; });
    return m;
  }

  function actionBadges(action) {
    var badges = [];
    if (action.mobileAvailable) badges.push({ label: 'Mobile', kind: 'mobile' });
    /* Records arrive from crawls, AI inspection and imports — never assume
       a field. A view that crashes on a sparse action hides the whole model. */
    var flags = (action.flags || []).filter(function (f) { return typeof f === 'string'; });
    if (flags.indexOf('supplier_assignment') !== -1) badges.push({ label: 'Supplier', kind: 'supplier' });
    if (flags.some(function (f) { return f.indexOf('email') === 0 || f.indexOf('email_') !== -1; })) {
      badges.push({ label: 'Email', kind: 'email' });
    }
    if (flags.indexOf('attachments') !== -1) badges.push({ label: 'Attach', kind: 'neutral' });
    if (flags.indexOf('admin_only') !== -1) badges.push({ label: 'Admin', kind: 'neutral' });
    if ((action.addsTags && action.addsTags.length) || (action.removesTags && action.removesTags.length)) {
      badges.push({ label: 'Tags', kind: 'tags' });
    }
    if (action.applicability === 'Non-planned only') badges.push({ label: 'Reactive', kind: 'reactive' });
    else if (action.applicability === 'Planned only') badges.push({ label: 'Planned', kind: 'planned' });
    if (action.machineFired) badges.push({ label: 'Machine-fired', kind: 'machine' });
    return badges;
  }

  /* ---- Generic helpers ------------------------------------------------ */

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  function deepFreeze(o) {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) {
      Object.freeze(o);
      Object.keys(o).forEach(function (k) { deepFreeze(o[k]); });
    }
    return o;
  }

  function deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null || typeof a !== 'object') return a === b;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    var ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every(function (k) { return deepEqual(a[k], b[k]); });
  }

  /* Stable content fingerprint (FNV-1a over canonical JSON) — used to pin
   * which Vanilla content a desired state was forked from. Not crypto. */
  function fingerprint(obj) {
    var s = JSON.stringify(obj);
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8);
  }

  var api = {
    CONFIDENCE: CONFIDENCE,
    kebab: kebab,
    completeModel: completeModel,
    canonicalKey: canonicalKey,
    parseActionNotes: parseActionNotes,
    actionBadges: actionBadges,
    deepClone: deepClone,
    deepFreeze: deepFreeze,
    deepEqual: deepEqual,
    fingerprint: fingerprint
  };

  if (typeof window !== 'undefined') window.StudioSchema = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
