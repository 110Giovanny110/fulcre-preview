// Fundo da home. Camada ESTATICA (imagem fixa de linhas + estrelas, em todo aparelho) + a cena 3D ao vivo da versao
// aprovada na primeira dobra (linhas e brilhos girando, tetraedro no fundo, a direita). O three.min.js entra por
// injecao, depois do conteudo (nao atrasa o primeiro desenho).
// 26/11 (pedido do dono): o 3D roda no computador E no celular, e o "reduzir movimento" do sistema nao o desliga.

// Quem recebe o 3D animado: qualquer aparelho com WebGL. Puro (testado em Node).
export function shouldAnimate3D({ webgl }) {
  return !!webgl;
}

// Opacidade da cena ao vivo conforme a rolagem: inteira no topo e some ate 70% da altura da primeira dobra,
// revelando a imagem parada (mesmo enquadramento, sem salto). Puro (testado em Node).
export function liveOpacity(scrollY, heroHeight) {
  const end = Math.max(1, heroHeight * 0.7);
  return Math.min(1, Math.max(0, 1 - scrollY / end));
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    const gl = window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'));
    // Libera o contexto de teste na hora (o navegador limita quantos contextos WebGL ficam abertos).
    if (gl) { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); }
    return !!gl;
  } catch {
    return false;
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.THREE) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('bg.js: falha ao carregar ' + src));
    document.head.appendChild(s);
  });
}

// Depois do conteudo: espera o load e um momento ocioso (requestIdleCallback; Safari nao tem, cai no setTimeout).
function afterContent() {
  const idle = () => new Promise((r) => ('requestIdleCallback' in window ? requestIdleCallback(() => r(), { timeout: 1500 }) : setTimeout(r, 200)));
  if (document.readyState === 'complete') return idle();
  return new Promise((r) => addEventListener('load', r, { once: true })).then(idle);
}

export function initBackground() {
  const root = document.documentElement;
  const host = document.querySelector('[data-bg-live]');
  const hero = document.querySelector('[data-hero]');

  root.dataset.bg = 'static';
  if (!host || !hero) return null;

  let ctl = null;
  let inView = true;
  let op = 1;
  const sync = () => {
    if (!ctl) return;
    if (inView && op > 0.01 && !document.hidden) ctl.resume(); else ctl.pause();
  };
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      op = liveOpacity(scrollY, hero.offsetHeight);
      host.style.opacity = String(op);
      sync();
    });
  };

  // O teste de WebGL cria um contexto de verdade, o que trava a tela (ate ~1 s em celular fraco ou sem GPU).
  // Por isso ele roda so depois do conteudo, junto com o resto do 3D, e nao na carga do modulo.
  return afterContent()
    .then(() => {
      if (!shouldAnimate3D({ webgl: hasWebGL() })) return null;
      return loadScript('assets/js/three.min.js')
        .then(() => import('./crystal-home.js?v=7'))
        .then(start);
    })
    .catch((e) => {
      // Sem 3D o site continua inteiro (fica a camada estatica). Registra para nao virar falha silenciosa.
      console.warn(e && e.message ? e.message : e);
      root.dataset.bg = 'static';
      host.replaceChildren(); // nao deixa canvas orfao se o 3D falhar no meio
      return null;
    });

  function start({ startCrystal }) {
    root.dataset.bg = 'live'; // mostra o canvas antes de medir o tamanho dele
    // Contexto WebGL descartado (celular voltando de outro app, pouca memoria): volta para a imagem parada ate ele voltar.
    ctl = startCrystal(host, {
      onLost: () => { root.dataset.bg = 'static'; },
      onRestored: () => { root.dataset.bg = 'live'; ctl.fit(true); sync(); },
    });
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    new IntersectionObserver((es) => { inView = es[es.length - 1].isIntersecting; sync(); }).observe(hero);
    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { ctl.fit(); onScroll(); }, 120); });
    document.addEventListener('visibilitychange', sync);
    return ctl;
  }
}
