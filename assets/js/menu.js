// Menu do topo da home (celular: painel de vidro; computador: links soltos, sem painel).
// initMenu(root) -> { open(), close(), isOpen() }. Chamado por home.js; o modal do WhatsApp usa close().
const FOCUSABLE = 'a[href],button:not([disabled])';

export function initMenu(root) {
  const btn = root.querySelector('[data-menu-btn]');
  const panel = root.querySelector('[data-menu-panel]');
  const scrim = root.querySelector('[data-menu-scrim]');
  if (!btn || !panel || !scrim) throw new Error('initMenu: faltam [data-menu-btn], [data-menu-panel] ou [data-menu-scrim] dentro do elemento raiz.');
  const desktop = matchMedia('(min-width: 900px)');
  let opened = false;

  const isOpen = () => opened;

  function set(state) {
    opened = state;
    root.classList.toggle('is-open', state);
    btn.setAttribute('aria-expanded', String(state));
    btn.setAttribute('aria-label', state ? 'Fechar menu' : 'Abrir menu');
  }

  function open() {
    if (opened || desktop.matches) return;
    set(true);
  }

  function close({ restoreFocus = true } = {}) {
    if (!opened) return;
    const hadFocus = root.contains(document.activeElement);
    set(false);
    if (restoreFocus && hadFocus && !desktop.matches) btn.focus();
  }

  btn.addEventListener('click', () => (opened ? close() : open()));
  scrim.addEventListener('click', () => close());
  // Tocar num item: o navegador rola ate a ancora (suave) e o painel fecha.
  panel.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });

  document.addEventListener('keydown', (e) => {
    if (!opened) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    // Foco preso: o ciclo e botao -> 4 links -> botao de contato -> botao.
    const items = [btn, ...panel.querySelectorAll(FOCUSABLE)];
    const first = items[0], last = items[items.length - 1];
    const active = document.activeElement;
    if (!items.includes(active)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  });

  // Ao passar para o layout de computador, nao deixa estado de painel aberto para tras.
  desktop.addEventListener('change', () => { if (desktop.matches) close({ restoreFocus: false }); });

  // Fundo de vidro so depois de rolar.
  const onScroll = () => { root.toggleAttribute('data-scrolled', scrollY > 8); };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  return { open, close, isOpen };
}
