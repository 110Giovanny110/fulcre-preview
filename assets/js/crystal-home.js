// 3D da home (computador E celular). A MESMA cena do crystal.js classico da versao aprovada (esfera de linhas
// girando, estrelas, tetraedro dourado, mesmas luzes e materiais). O crystal.js classico segue para as paginas internas.
//
// 26/11 (pedido do dono): o fundo da primeira dobra volta a MEXER como na versao aprovada (linhas e brilhos girando)
// e o tetraedro e parte do fundo: a direita, mais escuro e transparente (nem centralizado, nem em destaque).
//
// Espera window.THREE (o bg.js injeta o three.min.js antes de importar este modulo).
// A camada estatica (fundo-cristal*.webp, linhas + estrelas) e um quadro parado DESTA cena, gerado por
// tools/gerar-fundo.mjs com renderStill(). O canvas ao vivo usa o mesmo enquadramento da imagem (setViewOffset
// sobre a area "cover"/largura 100% dela), entao ao rolar o canvas se dissolve na imagem parada sem salto.

export const PRESETS = {
  // Computador: imagem 16:9, mostrada com background-size:cover centralizada.
  desktop: { iw: 1920, ih: 1080, fov: 35, tet: [0, -2.55, -6], tetScale: 0.68, stars: 1600, seed: 7 },
  // Celular/tablet (<= 900 px): imagem vertical, largura 100% e ancorada embaixo.
  mobile: { iw: 720, ih: 1680, fov: 56, tet: [0, -7.4, -6], tetScale: 0.5, stars: 1000, seed: 7 },
};
// Tetraedro no canvas ao vivo: a direita, no fundo (mais escuro e transparente).
export const LIVE = {
  desktop: { tet: [7.0, 1.1, -6], tetScale: 0.85, opacity: 0.5 },
  mobile: { tet: [1.7, 1.0, -6], tetScale: 1.2, opacity: 0.22 }, // 27/11: maior e bem transparente, a direita atras do titulo
};
export const T0 = 2.4; // pose do quadro parado = primeiro quadro da animacao (escolhida numa varredura: duas faces douradas)

// PRNG com semente (mulberry32): as estrelas ficam no mesmo lugar na imagem e no canvas.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// live (opcional): posicao, escala e opacidade do tetraedro no canvas ao vivo. Sem live: o quadro parado de sempre.
function buildScene(T, p, live) {
  const L = live || { tet: p.tet, tetScale: p.tetScale, opacity: 1 };
  const see = L.opacity < 1;
  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(p.fov, p.iw / p.ih, 0.1, 100);
  cam.position.set(0, 0, 11);
  const group = new T.Group();
  scene.add(group);
  const geo = new T.TetrahedronGeometry(1.5, 0);
  const tet = new T.Mesh(geo, new T.MeshPhongMaterial({ color: 0xb8904f, specular: 0xffe7b8, shininess: 70, emissive: 0x140d04, flatShading: true, transparent: see, opacity: L.opacity }));
  tet.position.set(L.tet[0], L.tet[1], L.tet[2]);
  tet.scale.setScalar(L.tetScale);
  group.add(tet);
  tet.add(new T.LineSegments(new T.EdgesGeometry(geo), new T.LineBasicMaterial({ color: 0xfff1d6, transparent: true, opacity: 0.7 * L.opacity })));
  const shell = new T.LineSegments(new T.EdgesGeometry(new T.IcosahedronGeometry(6.5, 2)), new T.LineBasicMaterial({ color: 0x5b82ff, transparent: true, opacity: 0.12 }));
  group.add(shell);
  const rand = rng(p.seed);
  const arr = new Float32Array(p.stars * 3);
  for (let i = 0; i < p.stars; i++) {
    const rr = 3 + rand() * 12, a = rand() * 6.28, b = Math.acos(2 * rand() - 1);
    arr.set([rr * Math.sin(b) * Math.cos(a), rr * Math.sin(b) * Math.sin(a), rr * Math.cos(b)], i * 3);
  }
  const pg = new T.BufferGeometry();
  pg.setAttribute('position', new T.BufferAttribute(arr, 3));
  const dotMat = new T.PointsMaterial({ color: 0xbfcaf0, size: 0.03, transparent: true, opacity: 0.7 });
  const dots = new T.Points(pg, dotMat);
  group.add(dots);
  scene.add(new T.AmbientLight(0x2a3358, 0.5));
  // Luzes acompanham o tetraedro: ele fica iluminado como na composicao original (y = 1.6), em qualquer posicao.
  const dy = L.tet[1] - 1.6;
  const l1 = new T.PointLight(0x6f92ff, 1.1, 30); l1.position.set(-5, 3 + dy, 4); scene.add(l1);
  const l2 = new T.PointLight(0xffd59a, 1.0, 30); l2.position.set(5, -2 + dy, 5); scene.add(l2);
  const l3 = new T.DirectionalLight(0xffffff, 0.45); l3.position.set(0, 5, 5); scene.add(l3);

  // Mesma coreografia do crystal.js (t por quadro, mouse inclina o tetraedro e as estrelas).
  const pose = (t, cx, cy) => {
    tet.rotation.x = t * 0.9 + cy * 1.2;
    tet.rotation.y = t * 1.3 + cx * 1.6;
    shell.rotation.y = -t * 0.4;
    shell.rotation.x = t * 0.2;
    dots.rotation.y = t * 0.15 + cx * 0.3;
    l1.position.x = -5 + Math.sin(t * 2) * 2;
  };
  // Caixa do tetraedro na tela: projeta os 4 vertices (em px do canvas que esta sendo desenhado).
  const tetBox = (w, h) => {
    scene.updateMatrixWorld(true);
    cam.updateMatrixWorld(true);
    const pos = geo.attributes.position, v = new T.Vector3();
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(tet.matrixWorld).project(cam);
      const x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * h;
      l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y);
    }
    return { left: l, top: t, right: r, bottom: b };
  };
  return { scene, cam, dotMat, pose, tetBox, tet, shell, dots };
}

function makeRenderer(T, opts, clearAlpha = 1) {
  const r = new T.WebGLRenderer({ antialias: true, alpha: clearAlpha < 1, powerPreference: 'low-power', ...opts });
  r.setClearColor(0x060a14, clearAlpha); // mesmo chao da pagina: o canvas cobre a imagem parada por baixo dele
  return r;
}

// Quadro parado (usado pelo gerador das imagens do fundo). part: 'base' (linhas + estrelas, chao opaco),
// 'tri' (so o tetraedro, fundo transparente) ou 'full'. Devolve a caixa do tetraedro em px da imagem.
export function renderStill(canvas, kind, part = 'full') {
  const T = window.THREE, p = PRESETS[kind];
  const r = makeRenderer(T, { canvas, preserveDrawingBuffer: true }, part === 'tri' ? 0 : 1);
  r.setPixelRatio(1);
  r.setSize(p.iw, p.ih, false);
  const s = buildScene(T, p);
  s.tet.visible = part !== 'base';
  s.shell.visible = s.dots.visible = part !== 'tri';
  s.pose(T0, 0, 0);
  r.render(s.scene, s.cam);
  return { w: p.iw, h: p.ih, tet: s.tetBox(p.iw, p.ih) };
}

// Mesma regra do CSS (@media min-width:901px), para o canvas usar o mesmo enquadramento da imagem parada.
const wideMQ = typeof matchMedia === 'function' ? matchMedia('(min-width: 901px)') : null;
const kindOf = () => (wideMQ && wideMQ.matches ? 'desktop' : 'mobile');

// Libera da GPU as geometrias e materiais de uma cena que nao sera mais usada.
function disposeScene(scene) {
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}

// Canvas ao vivo dentro de `host` (fixo, do tamanho da camada parada). Contrato: { pause(), resume(), fit() }
// (+ frames, paused, kind e tetRect como ganchos de teste). hooks.onLost / hooks.onRestored: o navegador descartou /
// devolveu o contexto WebGL (comum no celular ao voltar de outro app); o bg.js volta para a imagem parada enquanto isso.
export function startCrystal(host, hooks = {}) {
  const T = window.THREE;
  if (!T) throw new Error('crystal-home: THREE nao carregado');
  const r = makeRenderer(T);
  host.appendChild(r.domElement);
  const layer = document.querySelector('[data-bg-static]');
  let kind = kindOf();
  let p = PRESETS[kind];
  let s = buildScene(T, p, LIVE[kind]);
  let box = { left: 0, top: 0, width: 1, height: 1 };
  let last = ''; // assinatura do ultimo enquadramento (fit so refaz quando algo mudou)
  let lost = false;

  // Recorta do quadro da imagem estatica (cover no computador; largura 100% ancorada embaixo no celular)
  // exatamente a regiao em que o canvas esta: linhas e estrelas do canvas caem em cima das da imagem.
  // force: refaz mesmo sem mudanca (contexto WebGL devolvido).
  function fit(force) {
    const k2 = kindOf();
    if (k2 !== kind) { disposeScene(s.scene); kind = k2; p = PRESETS[kind]; s = buildScene(T, p, LIVE[kind]); } // virou celular <-> computador
    // Celular: pixel ratio menor (mais leve); computador: ate 2.
    const dpr = Math.min(window.devicePixelRatio || 1, kind === 'mobile' ? 1.5 : 2);
    const vb = layer ? layer.getBoundingClientRect() : { width: document.documentElement.clientWidth, height: innerHeight };
    const hr0 = host.getBoundingClientRect();
    // No celular a barra do navegador some/aparece ao rolar e dispara resize, mas o fundo (100lvh) nao muda: nada a refazer.
    const sig = [kind, dpr, vb.width, vb.height, hr0.width, hr0.height].join('|');
    if (sig === last && force !== true) return;
    last = sig;
    r.setPixelRatio(dpr);
    const k = kind === 'desktop' ? Math.max(vb.width / p.iw, vb.height / p.ih) : vb.width / p.iw;
    const fw = p.iw * k, fh = p.ih * k;
    const py = layer ? getComputedStyle(layer).backgroundPositionY : '50%';
    const pv = parseFloat(py), oy = py.endsWith('px') ? -pv : (fh - vb.height) * (Number.isFinite(pv) ? pv : 50) / 100;
    const hr = host.getBoundingClientRect();
    box = { left: hr.left, top: hr.top, width: Math.max(1, hr.width), height: Math.max(1, hr.height) };
    r.setSize(box.width, box.height, false);
    s.cam.aspect = p.iw / p.ih;
    s.cam.setViewOffset(fw, fh, (fw - vb.width) / 2 + box.left - (vb.left || 0), oy + box.top - (vb.top || 0), box.width, box.height);
    s.cam.updateProjectionMatrix();
    // O tamanho do ponto depende da altura do canvas: compensa para as estrelas terem o tamanho da imagem.
    s.dotMat.size = 0.03 * (fh / box.height);
    draw(); // setSize limpa o canvas: redesenha o quadro atual
  }

  let t = T0, tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, frames = 0, prev = 0;
  addEventListener('mousemove', (e) => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; }, { passive: true });
  function draw() {
    if (lost) return;
    s.pose(t, cx, cy);
    r.render(s.scene, s.cam);
  }
  // Velocidade pelo TEMPO real (0,36 por segundo = 0,006 por quadro a 60 Hz, a da versao aprovada): numa tela de
  // 120 Hz nao gira mais rapido. No celular desenha no maximo ~60 quadros por segundo (bateria).
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!prev) { prev = now; return; }
    const dt = now - prev;
    if (kind === 'mobile' && dt < 15) return;
    prev = now;
    const k = Math.min(dt, 50) / (1000 / 60); // quadros de 60 Hz equivalentes (limita saltos depois de travadas)
    t += 0.006 * k;
    cx += (tx - cx) * Math.min(1, 0.05 * k);
    cy += (ty - cy) * Math.min(1, 0.05 * k);
    draw();
    frames++;
  }
  r.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); // permite o navegador devolver o contexto depois
    lost = true;
    api.pause();
    if (hooks.onLost) hooks.onLost();
  });
  r.domElement.addEventListener('webglcontextrestored', () => {
    lost = false;
    fit(true);
    if (hooks.onRestored) hooks.onRestored();
  });

  const api = {
    paused: true,
    get frames() { return frames; },
    get kind() { return kind; },
    pause() {
      if (api.paused) return;
      cancelAnimationFrame(raf);
      raf = 0;
      api.paused = true;
      host.dataset.state = 'paused';
    },
    resume() {
      if (!api.paused || lost) return;
      api.paused = false;
      prev = 0;
      host.dataset.state = 'running';
      raf = requestAnimationFrame(loop);
    },
    fit,
    // Caixa do tetraedro na janela (px CSS). Gancho de teste.
    tetRect() {
      const b = s.tetBox(box.width, box.height);
      return { left: b.left + box.left, top: b.top + box.top, right: b.right + box.left, bottom: b.bottom + box.top };
    },
  };
  host.dataset.state = 'paused';
  host.__crystal = api; // gancho de teste (e2e le frames/paused/tetRect)
  fit();
  return api;
}
