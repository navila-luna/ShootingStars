/**
 * scene.js
 *
 * Owns the Three.js renderer, scene, camera, ambient star field,
 * nebula planes, and GLSL shader source strings shared by shooting stars.
 *
 * Nothing in here knows about posts or UI — it's pure 3D infrastructure.
 */

// ── Renderer & scene setup ────────────────────────────────────────

const container = document.getElementById('canvas-container');

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x020408, 1);
container.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020408, 0.0015);

export const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  3000
);
camera.position.set(0, 0, 130);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Ambient background star field ─────────────────────────────────

(function buildAmbientField() {
  const N   = 5000;
  const pos = new Float32Array(N * 3);
  const sz  = new Float32Array(N);
  const al  = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    const r  = 180 + Math.random() * 1400;
    pos[i * 3]     = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = r * Math.cos(ph);
    sz[i] = 1.2 + Math.random() * 3.2;
    al[i] = 0.2 + Math.random() * 0.7;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize',    new THREE.BufferAttribute(sz,  1));
  geo.setAttribute('aAlpha',   new THREE.BufferAttribute(al,  1));

  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float aSize;
      attribute float aAlpha;
      varying float vAlpha;
      uniform float uTime;
      void main() {
        vAlpha = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 0.82 + 0.18 * sin(uTime * 1.6 + position.x * 0.4 + position.z * 0.3);
        gl_PointSize = aSize * tw * (280.0 / -mv.z);
        gl_Position  = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        vec2  uv = gl_PointCoord - 0.5;
        float d  = length(uv);
        if (d > 0.5) discard;
        float a   = smoothstep(0.5, 0.0, d) * vAlpha;
        vec3  col = mix(vec3(0.78, 0.88, 1.0), vec3(1.0, 0.94, 0.85), fract(vAlpha * 7.3));
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true,
    depthWrite:  false,
  });

  scene.add(new THREE.Points(geo, mat));
  // Expose so the animation loop can tick uTime
  scene.userData.ambientMat = mat;
}());

// ── Nebula planes ─────────────────────────────────────────────────

[
  { col: 0x110840, x: -90, y:  40, z: -280, s: 300, r:  .4 },
  { col: 0x081530, x:  110, y: -60, z: -480, s: 380, r: 1.1 },
  { col: 0x180530, x:    0, y:  90, z: -680, s: 450, r: 2.0 },
].forEach(({ col, x, y, z, s, r }) => {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(s, s),
    new THREE.MeshBasicMaterial({
      color:     col,
      transparent: true,
      opacity:   .14,
      depthWrite: false,
      blending:  THREE.AdditiveBlending,
    })
  );
  mesh.position.set(x, y, z);
  mesh.rotation.z = r;
  scene.add(mesh);
});

// ── GLSL shader sources (shared by all shooting stars) ────────────

export const HEAD_VERT = /* glsl */`
  uniform float uSize;
  uniform float uViewed;
  void main() {
    vec4  mv = modelViewMatrix * vec4(position, 1.0);
    float s  = uViewed > 0.5 ? uSize * 1.6 : uSize;
    gl_PointSize = s * (300.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }`;

export const HEAD_FRAG = /* glsl */`
  uniform float uTime;
  uniform float uPulse;
  uniform float uViewed;
  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if (d > 0.5) discard;

    // Viewed (meteoroid) — amber/orange ember
    if (uViewed > 0.5) {
      float core = exp(-d * 16.0) * 2.5;
      float glow = exp(-d * 4.5)  * (0.6 + 0.3 * sin(uTime * 1.6));
      float halo = exp(-abs(d - 0.28) * 22.0) * 0.5;
      vec3 col = core * vec3(1.0, .6, .22)
               + glow * vec3(.85, .32, .08)
               + halo * vec3(.7,  .25, .05);
      gl_FragColor = vec4(col, clamp(core + glow + halo, 0., 1.));
      return;
    }

    // Unviewed — white-hot nucleus, ice-blue pulsing halos
    float nuc  = exp(-d * 40.)  * 3.5;
    float core = exp(-d * 18.)  * 2.0;
    float h1   = exp(-abs(d - (.16 + uPulse * .07)) * 45.) * (.8  + uPulse * .5);
    float h2   = exp(-abs(d - (.30 + uPulse * .04)) * 30.) * (.35 + uPulse * .25);
    float cor  = exp(-d * 5.5)  * .5;
    float alpha = clamp(nuc + core + h1 + h2 + cor, 0., 1.);
    vec3 col = nuc  * vec3(1,    1,    1)
             + core * vec3(.9,   .96,  1)
             + h1   * vec3(.6,   .78,  1)
             + h2   * vec3(.4,   .55,  .95)
             + cor  * vec3(.3,   .45,  .85);
    gl_FragColor = vec4(col, alpha);
  }`;

export const STREAK_VERT = /* glsl */`
  attribute float aTaper;
  attribute float aOffset;
  varying float vTaper;
  varying float vOffset;
  void main() {
    vTaper  = aTaper;
    vOffset = aOffset;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

export const STREAK_FRAG = /* glsl */`
  uniform float uTime;
  uniform float uViewed;
  varying float vTaper;
  varying float vOffset;
  void main() {
    if (uViewed > 0.5) { discard; return; }
    float b     = vOffset * vOffset;
    float sh    = .75 + .25 * sin(uTime * 6. - vOffset * 14.);
    float edge  = smoothstep(0., .35, vTaper) * smoothstep(1., .65, vTaper);
    float alpha = b * sh * edge * .92;
    vec3  col   = mix(vec3(.25, .35, .8), vec3(.75, .88, 1.), vOffset);
    gl_FragColor = vec4(col, clamp(alpha, 0., 1.));
  }`;