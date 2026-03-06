/**
 * main.js
 *
 * Application entry point. Orchestrates the boot sequence:
 *   1. Prune stale localStorage keys
 *   2. Load today's posts from posts.json
 *   3. Build the 3D scene
 *   4. Restore previously discovered stars
 *   5. Start the animation loop
 *
 * All heavy lifting is delegated to focused modules:
 *   storage.js    — localStorage
 *   data.js       — posts.json fetch
 *   scene.js      — Three.js renderer / shaders
 *   stars.js      — star geometry + animation tick
 *   interaction.js — input (mouse, keyboard, touch)
 *   letterbox.js  — overlay UI
 */

import { pruneOldKeys, loadDiscovered } from './storage.js';
import { loadPosts }                    from './data.js';
import { buildScene, starObjects, tick } from './stars.js';
import { processKeys, castRay, camTarget } from './interaction.js';
import { setDiscoveredRef, setFoundCount, openLetterbox, closeLetterbox } from './letterbox.js';

// ── Wire interaction events → letterbox ──────────────────────────
// interaction.js dispatches custom events to avoid circular imports.
window.addEventListener('star:click',  e => openLetterbox(e.detail));
window.addEventListener('star:close',  ()  => closeLetterbox());

// ── Boot ──────────────────────────────────────────────────────────

async function init() {
  pruneOldKeys();

  const discoveredToday = loadDiscovered();
  // Give letterbox.js a reference so it can persist new discoveries
  setDiscoveredRef(discoveredToday);

  // Fetch today's posts
  const posts = await loadPosts();

  if (posts.length === 0) {
    // No posts yet today — show ambient field with a gentle message
    document.getElementById('total').textContent = '0';
    document.getElementById('found').textContent  = '0';

    const hint = document.getElementById('hint');
    if (hint) hint.textContent = 'no new stars yet today — check back soon';

    revealScene();
    startLoop();
    return;
  }

  // Build shooting stars from post data
  buildScene(posts);

  // Restore viewed state for stars already discovered earlier today
  let restoredCount = 0;

  starObjects.forEach(star => {
    if (!discoveredToday.has(star.data.id)) return;

    star.viewed = true;
    star.headMat.uniforms.uViewed.value   = 1.0;
    star.streakMat.uniforms.uViewed.value = 1.0;
    restoredCount++;
  });

  // Sync counter with restored count
  // foundCount in letterbox.js is 0 at this point; we set the DOM directly
  // and letterbox will increment correctly from here
  document.getElementById('found').textContent = restoredCount;

  // Re-export so letterbox starts counting from the right number
  // (letterbox.foundCount is a let — we sync it via a setter)
  setFoundCount(restoredCount);

  revealScene();
  startLoop();
}

// ── Animation loop ────────────────────────────────────────────────

function startLoop() {
  function frame() {
    requestAnimationFrame(frame);
    tick(processKeys, castRay, camTarget);
  }
  frame();
}

// ── Reveal sequence ───────────────────────────────────────────────

function revealScene() {
  const veil = document.getElementById('veil');
  const hint = document.getElementById('hint');

  setTimeout(() => veil?.classList.add('gone'), 200);
  setTimeout(() => veil?.remove(), 3000);
  setTimeout(() => {
    hint?.classList.add('fade');
    setTimeout(() => hint?.remove(), 1600);
  }, 9000);
}

// ── Sync foundCount across module boundary ────────────────────────
// letterbox.js owns foundCount as a let export; we need to set its
// initial value after restoring from localStorage.


// ── Run ───────────────────────────────────────────────────────────

init().catch(err => console.error('[ShootingStars] Init failed:', err));