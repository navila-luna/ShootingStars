/**
 * stars.js
 *
 * Builds and animates the shooting star objects (head points + streak
 * meshes + invisible hit spheres). Exposes `buildScene()` which is called
 * once after posts.json has loaded, and `tick()` which is called every frame.
 */

import { scene, camera, renderer, HEAD_VERT, HEAD_FRAG, STREAK_VERT, STREAK_FRAG } from './scene.js';

// ── Module state ──────────────────────────────────────────────────

/** @type {StarObject[]} — populated by buildScene() */
export const starObjects = [];

const clock = new THREE.Clock();
let   startTime = null;

/**
 * @typedef {Object} StarObject
 * @property {THREE.Group}         group
 * @property {THREE.ShaderMaterial} headMat
 * @property {THREE.ShaderMaterial} streakMat
 * @property {THREE.Mesh}          hitSphere
 * @property {import('./data.js').Post} data
 * @property {number} ox        — grid origin X
 * @property {number} oy        — grid origin Y
 * @property {number} phase
 * @property {number} driftR
 * @property {number} driftSpd
 * @property {boolean} viewed
 * @property {THREE.Vector2} blastDir
 */

// ── Geometry helpers ──────────────────────────────────────────────

/**
 * Build a tapered streak mesh for a single star.
 * @param {number} len  — streak length
 * @param {number} hw   — half-width at head
 * @returns {THREE.BufferGeometry}
 */
function buildStreakGeometry(len, hw) {
  const SEG     = 40;
  const verts   = [];
  const tapers  = [];
  const offsets = [];
  const idx     = [];

  for (let s = 0; s <= SEG; s++) {
    const t   = s / SEG;
    const x   = -t * len;
    const w   = hw * (1 - t) * (1 - t);
    const off = 1 - t;
    verts.push(x,  w, 0); tapers.push(0); offsets.push(off);
    verts.push(x,  0, 0); tapers.push(1); offsets.push(off);
    verts.push(x, -w, 0); tapers.push(0); offsets.push(off);
  }

  for (let s = 0; s < SEG; s++) {
    const b = s * 3;
    idx.push(b, b + 3, b + 1,  b + 3, b + 4, b + 1,
             b + 1, b + 4, b + 2,  b + 4, b + 5, b + 2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts),   3));
  geo.setAttribute('aTaper',   new THREE.BufferAttribute(new Float32Array(tapers),  1));
  geo.setAttribute('aOffset',  new THREE.BufferAttribute(new Float32Array(offsets), 1));
  geo.setIndex(idx);
  return geo;
}

/**
 * Distribute n stars across a shuffled grid with organic jitter.
 * @param {number} n
 * @returns {{ x: number, y: number, z: number }[]}
 */
function gridPositions(n) {
  const SPREAD = 350;
  const cols   = Math.ceil(Math.sqrt(n * 1.5));
  const rows   = Math.ceil(n / cols);
  const cw     = (SPREAD * 2) / cols;
  const ch     = (SPREAD * 2) / rows;
  const MARGIN = 0.18;

  return shuffle([...Array(cols * rows).keys()])
    .slice(0, n)
    .map(idx => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      return {
        x: -SPREAD + (col + MARGIN + Math.random() * (1 - MARGIN * 2)) * cw,
        y: -SPREAD + (row + MARGIN + Math.random() * (1 - MARGIN * 2)) * ch,
        z: -50 + Math.random() * 160,
      };
    });
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Build all shooting star objects for the loaded posts.
 * Call once after STARS_DATA is ready.
 * @param {import('./data.js').Post[]} posts
 */
export function buildScene(posts) {
  const positions = gridPositions(posts.length);

  posts.forEach((data, i) => {
    const p        = positions[i];
    const angle    = (-28 + (Math.random() * 24 - 12)) * Math.PI / 180;
    const phase    = Math.random() * Math.PI * 2;
    const driftR   = 3.5 + Math.random() * 4;
    const driftSpd = 0.012 + Math.random() * 0.010;

    // Group anchors position & rotation
    const group = new THREE.Group();
    group.position.set(p.x, p.y, p.z);
    group.rotation.z = angle;

    // Head (point sprite)
    const headMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:   { value: 0 },
        uPulse:  { value: 0 },
        uViewed: { value: 0 },
        uSize:   { value: 48 },
      },
      vertexShader:   HEAD_VERT,
      fragmentShader: HEAD_FRAG,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    });
    const headGeo = new THREE.BufferGeometry();
    headGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
    group.add(new THREE.Points(headGeo, headMat));

    // Streak
    const streakMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:   { value: 0 },
        uViewed: { value: 0 },
      },
      vertexShader:   STREAK_VERT,
      fragmentShader: STREAK_FRAG,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
      side:        THREE.DoubleSide,
    });
    group.add(new THREE.Mesh(buildStreakGeometry(22 + Math.random() * 16, 0.55), streakMat));
    scene.add(group);

    // Invisible hit sphere for raycasting
    const hitSphere = new THREE.Mesh(
      new THREE.SphereGeometry(3.5, 6, 6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitSphere.position.set(p.x, p.y, p.z);
    scene.add(hitSphere);

    starObjects.push({
      group, headMat, streakMat, hitSphere, data,
      ox: p.x, oy: p.y,
      phase, driftR, driftSpd,
      viewed:   false,
      blastDir: new THREE.Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize(),
    });
  });

  document.getElementById('total').textContent = posts.length;
}

/**
 * Per-frame update — called by the main animation loop.
 * @param {Function} processKeys  — camera keyboard handler from interaction.js
 * @param {Function} castRay      — raycaster from interaction.js
 * @param {{ x:number, y:number, z:number }} camTarget
 */
export function tick(processKeys, castRay, camTarget) {
  const t = clock.getElapsedTime();
  if (startTime === null) startTime = t;

  const progress = Math.min((t - startTime) / 5.5, 1);
  const calm     = easeOutExpo(progress);
  const blast    = 1 - calm;

  // Tick ambient star field
  if (scene.userData.ambientMat) {
    scene.userData.ambientMat.uniforms.uTime.value = t;
  }

  // Tick each shooting star
  starObjects.forEach(s => {
    s.headMat.uniforms.uTime.value   = t;
    s.streakMat.uniforms.uTime.value = t;

    if (s.viewed) return; // meteoroid — no drift, no pulse

    s.headMat.uniforms.uPulse.value = 0.5 + 0.5 * Math.sin(t * 2.4 + s.phase);

    const nx = s.ox + Math.sin(t * s.driftSpd + s.phase)          * s.driftR * calm + s.blastDir.x * blast * 40;
    const ny = s.oy + Math.cos(t * s.driftSpd * 0.65 + s.phase * 1.4) * s.driftR * 0.45 * calm + s.blastDir.y * blast * 25;

    s.group.position.x    = nx;
    s.group.position.y    = ny;
    s.hitSphere.position.x = nx;
    s.hitSphere.position.y = ny;
  });

  processKeys();

  // Smooth camera lerp
  camera.position.x += (camTarget.x - camera.position.x) * 0.07;
  camera.position.y += (camTarget.y - camera.position.y) * 0.07;
  camera.position.z += (camTarget.z - camera.position.z) * 0.07;
  camera.lookAt(camTarget.x * 0.1, camTarget.y * 0.1, 0);

  castRay();
  renderer.render(scene, camera);
}

function easeOutExpo(x) {
  return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
}