/**
 * letterbox.js
 *
 * Controls the full-screen letterbox overlay shown when a user clicks
 * a star. Handles media injection (video or image), Instagram linking,
 * score tracking, and localStorage persistence.
 */

import { saveDiscovered } from './storage.js';

// ── DOM refs ──────────────────────────────────────────────────────

const letterboxEl  = document.getElementById('letterbox');
const frameEl      = document.getElementById('lb-frame');
const frameLinkEl  = document.getElementById('lb-frame-link');
const avatarEl     = document.getElementById('lb-avatar');
const frameUnameEl = document.getElementById('lb-frame-uname');
const panelUnameEl = document.getElementById('lb-panel-uname');
const panelDreamEl = document.getElementById('lb-panel-dream');
const postLinkEl   = document.getElementById('lb-post-link');
const foundEl      = document.getElementById('found');

// ── State shared with main.js ─────────────────────────────────────

/** Incremented once per unique star, never on revisits */
export let foundCount = 0;

/** Injected by main.js after init so letterbox can persist discoveries */
let _discoveredToday = null;

/** @param {Set<string>} set */
export function setDiscoveredRef(set) {
  _discoveredToday = set;
}

/**
 * Sync foundCount after restoring localStorage state on boot.
 * @param {number} n
 */
export function setFoundCount(n) {
  foundCount = n;
}

// ── Helpers ───────────────────────────────────────────────────────

const CAPTION_MAX = 140;

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

function clearMediaFromFrame() {
  frameEl.querySelectorAll('.lb-media').forEach(el => el.remove());
}

function injectVideo(src) {
  const vid         = document.createElement('video');
  vid.className     = 'lb-media';
  vid.src           = src;
  vid.autoplay      = true;
  vid.loop          = true;
  vid.muted         = false;
  vid.playsInline   = true;
  vid.controls      = true;
  vid.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top center;z-index:1;border-radius:15px;';
  vid.oncanplay     = () => { if (avatarEl) avatarEl.style.display = 'none'; };
  frameEl.appendChild(vid);
  vid.play().catch(() => { vid.muted = true; vid.play(); });
}

function injectImage(src, alt) {
  const img         = document.createElement('img');
  img.className     = 'lb-media';
  img.src           = src;
  img.alt           = alt;
  img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#05050f;z-index:1;border-radius:15px;';
  img.onload        = () => { if (avatarEl) avatarEl.style.display = 'none'; };
  frameEl.appendChild(img);
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Open the letterbox for a given star.
 * First click: marks as viewed, increments score, persists to localStorage.
 * Subsequent clicks: re-opens without changing state.
 *
 * @param {import('./stars.js').StarObject} star
 */
export function openLetterbox(star) {
  // ── First-time discovery ──
  if (!star.viewed) {
    star.viewed = true;
    star.headMat.uniforms.uViewed.value   = 1.0;
    star.streakMat.uniforms.uViewed.value = 1.0;

    foundCount++;
    foundEl.textContent = foundCount;

    if (_discoveredToday) {
      _discoveredToday.add(star.data.id);
      saveDiscovered(_discoveredToday);
    }
  }

  // ── Populate text ──
  const uname = '@' + star.data.username;
  frameUnameEl.textContent = uname;
  panelUnameEl.textContent = uname;

  const caption = star.data.caption || 'their first step into the light';
  panelDreamEl.textContent = truncate(caption, CAPTION_MAX);

  // ── Wire Instagram links ──
  frameLinkEl.href        = star.data.postUrl;
  postLinkEl.href         = star.data.postUrl;
  postLinkEl.style.display = 'inline';

  // ── Inject media ──
  clearMediaFromFrame();
  if (avatarEl) avatarEl.style.display = 'flex'; // show placeholder while loading

  if (star.data.videoUrl) {
    injectVideo(star.data.videoUrl);
  } else if (star.data.thumbUrl) {
    injectImage(star.data.thumbUrl, uname);
  }

  letterboxEl.classList.add('open');
}

/**
 * Close the letterbox and clean up.
 */
export function closeLetterbox() {
  // Pause any playing video before hiding
  frameEl.querySelectorAll('video.lb-media').forEach(v => v.pause());

  letterboxEl.classList.remove('open');
  frameLinkEl.href = '#';

  // Clear hover state directly — avoids circular import with interaction.js
  document.getElementById('cursor').classList.remove('near-star');
  document.getElementById('star-tooltip').classList.remove('visible');
}