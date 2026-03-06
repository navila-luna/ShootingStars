/**
 * storage.js
 *
 * Date-scoped localStorage helpers for tracking which stars a visitor
 * has already discovered. Keys automatically expire the next day, so
 * progress resets daily without any server involvement.
 *
 * Key format: `shootingstars:YYYY-MM-DD`
 */

const LS_PREFIX = 'shootingstars';

/** @returns {string} Today's date as YYYY-MM-DD */
export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Load today's discovered star IDs from localStorage.
 * @returns {Set<string>}
 */
export function loadDiscovered() {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}:${todayKey()}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * Persist the current discovered set for today.
 * @param {Set<string>} set
 */
export function saveDiscovered(set) {
  try {
    localStorage.setItem(
      `${LS_PREFIX}:${todayKey()}`,
      JSON.stringify([...set])
    );
  } catch {
    // Silently fail — storage quota exceeded or private browsing
  }
}

/**
 * Remove all keys from previous days so storage doesn't grow unbounded.
 */
export function pruneOldKeys() {
  try {
    const today = todayKey();
    Object.keys(localStorage)
      .filter(k => k.startsWith(LS_PREFIX + ':') && !k.endsWith(today))
      .forEach(k => localStorage.removeItem(k));
  } catch {
    // Ignore — storage may be unavailable
  }
}