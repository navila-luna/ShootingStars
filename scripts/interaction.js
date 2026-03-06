/**
 * interaction.js
 *
 * All user input: mouse/touch drag, scroll zoom, keyboard pan,
 * raycasting for star hover, and the custom cursor.
 *
 * Exports `processKeys()` and `castRay()` for the animation loop,
 * and `camTarget` for the camera lerp in stars.js.
 */

import { camera } from './scene.js';
import { starObjects } from './stars.js';

// ── Camera state ──────────────────────────────────────────────────

export const camTarget = { x: 0, y: 0, z: 130 };

const PAN_LIMIT = 340;
const ZOOM_MIN  = 18;
const ZOOM_MAX  = 220;

// ── DOM refs ──────────────────────────────────────────────────────

const cursorEl = document.getElementById('cursor');
const tooltip  = document.getElementById('star-tooltip');
const ttName   = document.getElementById('tt-name');

// ── Raycasting ────────────────────────────────────────────────────

const raycaster = new THREE.Raycaster();
const mouseNDC  = new THREE.Vector2(-9, -9); // start off-screen

/** @type {import('./stars.js').StarObject | null} */
let hoveredStar = null;

export function castRay() {
  raycaster.setFromCamera(mouseNDC, camera);

  const hitMeshes = starObjects.map(s => s.hitSphere);
  const hits      = raycaster.intersectObjects(hitMeshes);

  if (hits.length) {
    const star = starObjects.find(s => s.hitSphere === hits[0].object);
    if (star && star !== hoveredStar) {
      hoveredStar = star;
      ttName.textContent = '@' + star.data.username;
      cursorEl.classList.add('near-star');
      tooltip.classList.add('visible');
    }
  } else if (hoveredStar) {
    hoveredStar = null;
    cursorEl.classList.remove('near-star');
    tooltip.classList.remove('visible');
  }
}

// ── Keyboard ──────────────────────────────────────────────────────

const keys = {};

window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === 'Escape') window.dispatchEvent(new CustomEvent('star:close'));
});

window.addEventListener('keyup', e => {
  keys[e.key] = false;
});

export function processKeys() {
  const speed = keys['Shift'] ? 2.2 : 0.9;
  if (keys['ArrowLeft']  || keys['a']) camTarget.x = Math.max(-PAN_LIMIT, camTarget.x - speed);
  if (keys['ArrowRight'] || keys['d']) camTarget.x = Math.min( PAN_LIMIT, camTarget.x + speed);
  if (keys['ArrowUp']    || keys['w']) camTarget.y = Math.min( PAN_LIMIT, camTarget.y + speed);
  if (keys['ArrowDown']  || keys['s']) camTarget.y = Math.max(-PAN_LIMIT, camTarget.y - speed);
}

// ── Mouse ─────────────────────────────────────────────────────────

let drag = null;

window.addEventListener('mousedown', e => {
  if (e.target.closest('#letterbox')) return;
  drag = { sx: e.clientX, sy: e.clientY, cx: camTarget.x, cy: camTarget.y };
});

window.addEventListener('mouseup', () => { drag = null; });

window.addEventListener('mousemove', e => {
  // Move custom cursor
  cursorEl.style.left = e.clientX + 'px';
  cursorEl.style.top  = e.clientY + 'px';

  // Move tooltip alongside cursor
  tooltip.style.left = e.clientX + 'px';
  tooltip.style.top  = e.clientY + 'px';

  // Update NDC for raycaster
  mouseNDC.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;

  // Pan camera while dragging
  if (!drag) return;
  camTarget.x = Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, drag.cx - (e.clientX - drag.sx) * 0.14));
  camTarget.y = Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, drag.cy + (e.clientY - drag.sy) * 0.14));
});

window.addEventListener('click', () => {
  if (hoveredStar) {
    window.dispatchEvent(new CustomEvent('star:click', { detail: hoveredStar }));
  }
});

// ── Scroll (zoom + horizontal pan) ───────────────────────────────

window.addEventListener('wheel', e => {
  e.preventDefault();
  camTarget.z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, camTarget.z + e.deltaY * 0.13));
  camTarget.x = Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, camTarget.x + e.deltaX * 0.06));
}, { passive: false });

// ── Touch ─────────────────────────────────────────────────────────

let touchOrigin = null;

window.addEventListener('touchstart', e => {
  touchOrigin = {
    x:  e.touches[0].clientX,
    y:  e.touches[0].clientY,
    cx: camTarget.x,
    cy: camTarget.y,
  };
}, { passive: true });

window.addEventListener('touchmove', e => {
  if (!touchOrigin) return;
  camTarget.x = Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, touchOrigin.cx - (e.touches[0].clientX - touchOrigin.x) * 0.14));
  camTarget.y = Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, touchOrigin.cy + (e.touches[0].clientY - touchOrigin.y) * 0.14));
  e.preventDefault();
}, { passive: false });