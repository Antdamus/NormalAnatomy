// A read/resume is never a new study action. The saved timestamp is an opaque
// compare-and-set version, not a comparison of two devices' wall clocks.
export const progressVersion = value => value?.updated_at ?? null;
export function sameProgress(a, b) {
  return !!a && !!b && a.audio_sha256 === b.audio_sha256 &&
    Math.abs(a.position - b.position) < 0.05 && a.rate === b.rate &&
    a.case_id === b.case_id && a.image_id === b.image_id;
}

export function createProgressSync({load, save, readCache, writeCache, apply,
  canApply, isCurrent = () => true, status = () => {}}) {
  let base = null, shown = null, pending = null, known = false, blocked = false;
  let saving = null, refreshing = null, activity = 0;
  const cache = () => writeCache({value: pending || shown, baseVersion: progressVersion(base), dirty: !!pending});
  async function receive(remote) {
    base = remote; known = true;
    if (!canApply()) {
      blocked = true;
      status('Newer progress is saved on another device. Playback here continues.');
      return;
    }
    blocked = false; pending = null; shown = remote; cache();
    if (remote) await apply(remote);
    status(remote ? 'Resumed saved position · synced' : 'Position will sync as you study');
  }
  async function start() {
    const cached = readCache();
    try {
      base = await load(); if (!isCurrent()) return null; known = true;
      // An offline draft is safe only while its original cloud version still
      // exists. A changed cloud version wins over an older cached session.
      if (cached?.dirty && cached.baseVersion === progressVersion(base)) pending = cached.value;
      shown = pending || base;
      cache();
    } catch {
      shown = cached?.value || null;
      if (cached?.dirty) pending = cached.value;
      base = cached?.baseVersion ? {updated_at: cached.baseVersion} : null;
      status('Using this device’s saved position · sync unavailable');
    }
    return shown;
  }
  function record(value, {intent = false} = {}) {
    if (!isCurrent() || (blocked && !intent)) return;
    const takeover = blocked && intent;
    if (intent) blocked = false;
    if (!takeover && sameProgress(value, pending || shown)) return;
    activity++; pending = {...value}; shown = pending; cache();status('Saving position…');
  }
  async function refresh() {
    if (refreshing) return refreshing;
    if (!isCurrent() || saving) return;
    refreshing = (async () => {
      const before = activity;
      try {
        const remote = await load();
        if (!isCurrent() || before !== activity || saving) return;
        known = true;
        if (progressVersion(remote) !== progressVersion(base) || blocked) await receive(remote);
      } catch { /* Keep the current position and any unsynced draft. */ }
    })();
    try { await refreshing; } finally { refreshing = null; }
  }
  async function flush() {
    if (saving) return saving;
    if (!isCurrent() || !pending || blocked || !known) return;
    saving = (async () => {
      try {
        while (pending && !blocked && isCurrent()) {
          const value = pending, before = activity;
          const saved = await save(value, progressVersion(base));
          if (!isCurrent()) return;
          if (!saved) {
            // Do not retry an old bookmark against a newly read version.
            blocked = true;
            const remote = await load(); if (!isCurrent()) return;
            base = remote; known = true;
            if (before === activity && canApply()) await receive(remote);
            else status('Newer progress is saved on another device. Playback here continues.');
            return;
          }
          base = saved; shown = pending === value ? saved : pending;
          if (pending === value) pending = null;
          cache(); status('Progress saved · synced');
        }
      } catch { status('Position saved on this device · sync pending'); }
    })();
    try { await saving; } finally { saving = null; }
  }
  return {start, record, flush, refresh};
}
