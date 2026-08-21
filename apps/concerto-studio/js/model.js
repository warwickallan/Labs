/* model.js — desired-state ownership. Forks the frozen Vanilla model into
 * an editable clone, provides the mutation API every editor projection
 * calls, JSON-snapshot undo/redo (one snapshot per user action — the
 * Launch pattern: crude, correct, instant at this scale), autosave to
 * localStorage, and export/import of CUSTOMER-DESIRED-STATE.json.
 *
 * Vanilla immutability: the fork records the base content fingerprints;
 * the Deviation Schedule is always COMPUTED against the pinned base by
 * diff.js — never stored, so it cannot drift.
 */
(function () {
  'use strict';

  var S = window.StudioSchema;
  var STORAGE_KEY = 'concerto-studio-design-v1';
  var FORMAT_VERSION = 1;

  var state = {
    desired: null,       /* editable clone (helpdesk domain editable today) */
    baseFingerprints: null,
    undoStack: [],
    redoStack: [],
    dirty: false
  };

  function editableSlice(model) {
    /* the parts DESIGN may change; everything else rides along read-only */
    return {
      helpdesk: {
        types: S.deepClone(model.helpdesk.types),
        statuses: S.deepClone(model.helpdesk.statuses),
        actions: S.deepClone(model.helpdesk.actions),
        availability: S.deepClone(model.helpdesk.availability),
        results: S.deepClone(model.helpdesk.results),
        operativeStatuses: S.deepClone(model.helpdesk.operativeStatuses),
        sharedConfiguration: model.helpdesk.sharedConfiguration
      },
      orders: model.orders,
      crossDomain: model.crossDomain,
      behaviours: model.behaviours,
      identities: model.identities,
      evidenceIndex: model.evidenceIndex,
      meta: model.meta
    };
  }

  function fork(vanilla) {
    state.desired = editableSlice(vanilla);
    state.baseFingerprints = vanilla.meta.sourceFingerprints;
    /* content fingerprint of the base AT FORK TIME — after a build lands,
       the current configuration moves on and the fork goes STALE; the view
       uses this to say so instead of showing reversed deviations. */
    state.baseContentFp = S.fingerprint(vanilla.helpdesk);
    state.undoStack = [];
    state.redoStack = [];
    state.dirty = false;
    autosave();
    return state.desired;
  }

  /* TRUE when the base this fork was taken from no longer matches the base
     being compared against (e.g. a work order was built in between). null =
     unknown (fork predates staleness tracking). */
  function staleAgainst(base) {
    if (!state.desired || !base || !base.helpdesk) return false;
    if (!state.baseContentFp) return null;
    return S.fingerprint(base.helpdesk) !== state.baseContentFp;
  }

  function hasFork() { return !!state.desired; }
  function desired() { return state.desired; }

  function snapshot() {
    state.undoStack.push(JSON.stringify(state.desired.helpdesk));
    if (state.undoStack.length > 100) state.undoStack.shift();
    state.redoStack = [];
  }
  function undo() {
    if (!state.undoStack.length) return false;
    state.redoStack.push(JSON.stringify(state.desired.helpdesk));
    state.desired.helpdesk = JSON.parse(state.undoStack.pop());
    state.dirty = true;
    autosave();
    return true;
  }
  function redo() {
    if (!state.redoStack.length) return false;
    state.undoStack.push(JSON.stringify(state.desired.helpdesk));
    state.desired.helpdesk = JSON.parse(state.redoStack.pop());
    state.dirty = true;
    autosave();
    return true;
  }

  function mutate(fn) {
    if (!state.desired) throw new Error('No design fork exists');
    snapshot();
    try {
      fn(state.desired.helpdesk);
    } catch (e) {
      /* roll the failed mutation back so undo history stays truthful */
      state.desired.helpdesk = JSON.parse(state.undoStack.pop());
      throw e;
    }
    state.dirty = true;
    autosave();
  }

  /* ---- mutation API (each call = one undo step) ------------------------ */

  var DESIGNED = 'DESIGNED';

  function addAvailability(action, status, type) {
    mutate(function (hd) {
      var exists = hd.availability.some(function (e) {
        return e.action === action && e.status === status && e.type === type;
      });
      if (!exists) hd.availability.push({ action: action, status: status, type: type, confidence: DESIGNED, evidence: [] });
    });
  }

  function removeAvailability(action, status, type) {
    mutate(function (hd) {
      hd.availability = hd.availability.filter(function (e) {
        return !(e.action === action && e.status === status && (type ? e.type === type : true));
      });
    });
  }

  /* move = remove from one status + add to another, ONE undo step */
  function moveAvailability(action, fromStatus, toStatus, type) {
    mutate(function (hd) {
      hd.availability = hd.availability.filter(function (e) {
        return !(e.action === action && e.status === fromStatus && (type ? e.type === type : true));
      });
      var types = type ? [type] : null;
      if (!types) {
        /* preserve the type memberships the action actually has */
        types = [];
        hd.actions.forEach(function (a) { if (a.name === action) types = a.types.slice(); });
      }
      types.forEach(function (t) {
        var exists = hd.availability.some(function (e) {
          return e.action === action && e.status === toStatus && e.type === t;
        });
        if (!exists) hd.availability.push({ action: action, status: toStatus, type: t, confidence: DESIGNED, evidence: [] });
      });
    });
  }

  function setResult(action, toStatus, kind, type) {
    mutate(function (hd) {
      hd.results = hd.results.filter(function (r) { return !(r.action === action && r.type === type); });
      if (toStatus) hd.results.push({ action: action, toStatus: toStatus, kind: kind || 'sets', type: type, confidence: DESIGNED, evidence: [] });
    });
  }

  function addStatus(name, types) {
    mutate(function (hd) {
      if (hd.statuses.some(function (s) { return s.name === name; })) return;
      var maxOrder = 0;
      hd.statuses.forEach(function (s) { maxOrder = Math.max(maxOrder, s.displayOrder === Infinity ? 0 : s.displayOrder); });
      var ordering = {};
      (types || ['Reactive']).forEach(function (t) { ordering[t] = maxOrder + 10; });
      hd.statuses.push({
        key: S.canonicalKey('hd', 'status', name),
        name: name,
        types: (types || ['Reactive']).slice(),
        isDefaultFor: [],
        ordering: ordering,
        displayOrder: maxOrder + 10,
        confidence: DESIGNED,
        evidence: []
      });
      (types || ['Reactive']).forEach(function (t) {
        hd.types.forEach(function (ty) { if (ty.name === t && ty.statuses.indexOf(name) === -1) ty.statuses.push(name); });
      });
    });
  }

  function addAction(spec) {
    /* spec: {code, name, group, applicability, types, mobileAvailable} */
    mutate(function (hd) {
      var fullName = spec.code + '. ' + spec.name;
      if (hd.actions.some(function (a) { return a.name === fullName || a.code === spec.code; })) {
        throw new Error('An action with that code or name already exists');
      }
      hd.actions.push({
        key: S.canonicalKey('hd', 'action', fullName),
        name: fullName,
        code: spec.code,
        active: true,
        applicability: spec.applicability || 'All jobs',
        mobileAvailable: !!spec.mobileAvailable,
        types: (spec.types || ['Reactive']).slice(),
        buttonGroup: spec.group || null,
        flags: [],
        addsTags: [],
        removesTags: [],
        tagNote: null,
        resultingType: null,
        hidden: false,
        orderStatusTrigger: null,
        orderApprovalTrigger: false,
        afpTrigger: false,
        ordersEffects: [],
        constraints: [],
        timer: null,
        hold: null,
        defaultOrdersProject: null,
        routesTo: null,
        emails: [],
        assignment: {},
        importanceUseFirst: false,
        availableInAnyStatus: false,
        availableIn: [],
        notesProvenance: DESIGNED,
        rawNotes: '',
        machineFired: false,
        firedBySupplierActions: [],
        confidence: DESIGNED,
        evidence: []
      });
      hd.actions.sort(function (a, b) { return a.name.localeCompare(b.name); });
      (spec.types || ['Reactive']).forEach(function (t) {
        hd.types.forEach(function (ty) { if (ty.name === t && ty.actions.indexOf(fullName) === -1) ty.actions.push(fullName); });
      });
    });
  }

  function removeAction(name) {
    mutate(function (hd) {
      hd.actions = hd.actions.filter(function (a) { return a.name !== name; });
      hd.availability = hd.availability.filter(function (e) { return e.action !== name; });
      hd.results = hd.results.filter(function (r) { return r.action !== name; });
      hd.types.forEach(function (t) {
        t.actions = t.actions.filter(function (n) { return n !== name; });
      });
    });
  }

  var EDITABLE_ACTION_FIELDS = ['applicability', 'mobileAvailable', 'buttonGroup', 'types'];

  function modifyAction(name, fields) {
    mutate(function (hd) {
      hd.actions.forEach(function (a) {
        if (a.name !== name) return;
        Object.keys(fields).forEach(function (k) {
          if (EDITABLE_ACTION_FIELDS.indexOf(k) === -1) throw new Error('Field not editable: ' + k);
          a[k] = fields[k];
        });
      });
    });
  }

  function removeStatus(name) {
    mutate(function (hd) {
      hd.statuses = hd.statuses.filter(function (s) { return s.name !== name; });
      hd.availability = hd.availability.filter(function (e) { return e.status !== name; });
      hd.results = hd.results.filter(function (r) { return r.toStatus !== name; });
      hd.types.forEach(function (t) {
        t.statuses = t.statuses.filter(function (n) { return n !== name; });
        if (t.defaultStatus === name) t.defaultStatus = null;
      });
    });
  }

  function reorderStatus(name, newDisplayOrder) {
    mutate(function (hd) {
      hd.statuses.forEach(function (s) {
        if (s.name === name) {
          s.displayOrder = newDisplayOrder;
          Object.keys(s.ordering).forEach(function (t) { s.ordering[t] = newDisplayOrder; });
        }
      });
      hd.statuses.sort(function (a, b) { return a.displayOrder - b.displayOrder || a.name.localeCompare(b.name); });
    });
  }

  function discard() {
    state.desired = null;
    state.baseFingerprints = null;
    state.undoStack = [];
    state.redoStack = [];
    state.dirty = false;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* private mode */ }
  }

  /* ---- persistence ------------------------------------------------------ */

  function exportJson() {
    return JSON.stringify({
      formatVersion: FORMAT_VERSION,
      kind: 'CUSTOMER-DESIRED-STATE',
      basedOnVanilla: state.baseFingerprints,
      exportedAt: new Date().toISOString(),
      helpdesk: state.desired.helpdesk
    }, null, 2);
  }

  function importJson(text, vanilla) {
    var data = JSON.parse(text);
    if (data.kind !== 'CUSTOMER-DESIRED-STATE') throw new Error('Not a CUSTOMER-DESIRED-STATE file');
    if (data.formatVersion !== FORMAT_VERSION) throw new Error('Unknown formatVersion ' + data.formatVersion);
    var warning = null;
    if (vanilla && !S.deepEqual(data.basedOnVanilla, vanilla.meta.sourceFingerprints)) {
      warning = 'This design was forked from a DIFFERENT Vanilla baseline (' +
        JSON.stringify(data.basedOnVanilla) + ' vs current ' +
        JSON.stringify(vanilla.meta.sourceFingerprints) + '). Deviations are computed against the CURRENT baseline.';
    }
    state.desired = editableSlice(vanilla);
    state.desired.helpdesk = data.helpdesk;
    state.baseFingerprints = data.basedOnVanilla;
    state.undoStack = [];
    state.redoStack = [];
    state.dirty = false;
    autosave();
    return warning;
  }

  function autosave() {
    try {
      if (state.desired) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          formatVersion: FORMAT_VERSION,
          basedOnVanilla: state.baseFingerprints,
          baseContentFp: state.baseContentFp || null,
          helpdesk: state.desired.helpdesk
        }));
      }
    } catch (e) { /* storage unavailable — session-only editing still works */ }
  }

  function restore(vanilla) {
    try {
      var text = localStorage.getItem(STORAGE_KEY);
      if (!text) return false;
      var data = JSON.parse(text);
      if (data.formatVersion !== FORMAT_VERSION) return false;
      state.desired = editableSlice(vanilla);
      state.desired.helpdesk = data.helpdesk;
      state.baseFingerprints = data.basedOnVanilla;
      state.baseContentFp = data.baseContentFp || null;
      state.undoStack = [];
      state.redoStack = [];
      state.dirty = false;
      return true;
    } catch (e) { return false; }
  }

  window.StudioModel = {
    fork: fork,
    staleAgainst: staleAgainst,
    hasFork: hasFork,
    desired: desired,
    undo: undo,
    redo: redo,
    canUndo: function () { return state.undoStack.length > 0; },
    canRedo: function () { return state.redoStack.length > 0; },
    isDirty: function () { return state.dirty; },
    addAvailability: addAvailability,
    removeAvailability: removeAvailability,
    moveAvailability: moveAvailability,
    setResult: setResult,
    addStatus: addStatus,
    removeStatus: removeStatus,
    reorderStatus: reorderStatus,
    addAction: addAction,
    removeAction: removeAction,
    modifyAction: modifyAction,
    discard: discard,
    exportJson: exportJson,
    importJson: importJson,
    restore: restore,
    _state: state
  };
})();
