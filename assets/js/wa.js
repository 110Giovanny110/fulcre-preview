// Modal "Fale com a Fulcre no WhatsApp" (T6).
// Exporta buildWaUrl, maskPhone, phoneDigits (puros, testados em Node) e initWaModal / openWaModal (usam o DOM).
// Fluxo: o clique em "Falar com a Fulcre no WhatsApp" abre o WhatsApp NO MESMO GESTO (window.open antes de qualquer
// fetch, com location.href de reserva se o pop-up for bloqueado) e so depois grava o contato em /api/lead.
// Se a gravacao falhar, o WhatsApp ja esta aberto: nada se perde do lado do visitante.
const WA_NUMERO = '5511963131588';
const ORIGEM = 'modal-whatsapp';

export function buildWaUrl(nome, assunto) {
  return 'https://wa.me/' + WA_NUMERO + '?text=' + encodeURIComponent('Oi, aqui é ' + nome + '. Vim pelo site da Fulcre, sobre ' + assunto + '.');
}

// So digitos; com 12 ou 13 digitos comecando em 55 tira o 55 (mesma regra do servidor, functions/api/lead.js).
export function phoneDigits(v) {
  let d = String(v || '').replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  return d;
}

// Mascara (DD) 9XXXX-XXXX enquanto digita. Aceita colar "+55 11 ..." (o 55 sai quando ha 12 ou 13 digitos).
export function maskPhone(v) {
  let d = String(v || '').replace(/\D/g, '').slice(0, 13);
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
  return '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(d.length - 4);
}

let dlg = null, form = null, opener = null, beforeOpen = () => {};
const MSG = {
  nome: 'Escreva seu nome para a gente saber como chamar você.',
  whatsapp: 'Use DDD e número, como (11) 91234-5678.',
  assunto: 'Escolha o assunto.',
  consent: 'Para continuar, marque a caixa de consentimento.',
};

function setErr(el, id, msg) {
  const box = document.getElementById(id);
  if (box) box.textContent = msg;
  if (el) { if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); }
  return !msg;
}

function validate() {
  const f = form.elements;
  const nome = f.nome.value.trim().replace(/\s+/g, ' ');
  const dig = phoneDigits(f.whatsapp.value);
  const assunto = form.querySelector('input[name=assunto]:checked');
  const bad = [];
  if (!setErr(f.nome, 'wm-nome-e', nome.length < 2 ? MSG.nome : '')) bad.push(f.nome);
  if (!setErr(f.whatsapp, 'wm-wa-e', /^\d{10,11}$/.test(dig) ? '' : MSG.whatsapp)) bad.push(f.whatsapp);
  const chips = form.querySelector('fieldset');
  if (!setErr(chips, 'wm-as-e', assunto ? '' : MSG.assunto)) bad.push(form.querySelector('input[name=assunto]'));
  if (!setErr(f.consentimento, 'wm-c-e', f.consentimento.checked ? '' : MSG.consent)) bad.push(f.consentimento);
  if (bad.length) { bad[0].focus(); return null; }
  return { nome, dig, assunto: assunto.value };
}

function submit(e) {
  e.preventDefault();
  const v = validate();
  if (!v) return;
  // 1) mesmo gesto do clique: abre o WhatsApp antes de qualquer await/fetch.
  const url = buildWaUrl(v.nome, v.assunto);
  const w = window.open(url, '_blank');
  if (w) { try { w.opener = null; } catch { /* sem acesso: segue */ } } else location.href = url; // pop-up bloqueado
  // 2) em paralelo, grava o contato. Falhar aqui nao impede nada (o WhatsApp ja abriu).
  const corpo = {
    nome: v.nome, whatsapp: v.dig, empresa: '', necessidade: v.assunto, consentimento: true,
    site: form.elements.site.value, pagina: location.pathname, origem: ORIGEM,
  };
  fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), keepalive: true })
    .then((r) => { if (!r.ok) console.warn('wa.js: o contato nao foi gravado (HTTP ' + r.status + '); o WhatsApp abriu mesmo assim.'); })
    .catch(() => console.warn('wa.js: o contato nao foi gravado (sem rede); o WhatsApp abriu mesmo assim.'));
  form.reset();
  clearErrors();
  dlg.close();
}

function clearErrors() {
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  form.querySelectorAll('.err').forEach((p) => { p.textContent = ''; });
}

// assunto: texto de um chip (ex.: "Fulcre CRM"); desconhecido ou vazio deixa nenhum marcado.
// from: quem abriu (para devolver o foco); padrao = o elemento em foco agora.
export function openWaModal(assunto, from) {
  if (!dlg) throw new Error('openWaModal: initWaModal nao foi chamado (faltam #wa-modal e o formulario).');
  if (dlg.open) return;
  opener = from || document.activeElement;
  beforeOpen(); // fecha o menu antes (R3)
  clearErrors();
  form.querySelectorAll('input[name=assunto]').forEach((r) => { r.checked = !!assunto && r.value === assunto; });
  dlg.showModal();
  form.elements.nome.focus();
}

export function initWaModal({ onBeforeOpen } = {}) {
  dlg = document.getElementById('wa-modal');
  form = dlg && dlg.querySelector('form');
  if (!dlg || !form || typeof dlg.showModal !== 'function') { dlg = null; return false; } // sem modal: o href="#contato" segue valendo
  beforeOpen = typeof onBeforeOpen === 'function' ? onBeforeOpen : () => {};
  const wa = form.elements.whatsapp;
  wa.addEventListener('input', () => { wa.value = maskPhone(wa.value); });
  form.addEventListener('submit', submit);
  form.addEventListener('input', (e) => { // some o erro do campo assim que ele e corrigido
    const el = e.target;
    if (el.getAttribute && el.getAttribute('aria-invalid')) { el.removeAttribute('aria-invalid'); const p = form.querySelector('#' + (el.getAttribute('aria-describedby') || '-')); if (p) p.textContent = ''; }
    if (el.name === 'assunto') { const p = document.getElementById('wm-as-e'); if (p) p.textContent = ''; form.querySelector('fieldset').removeAttribute('aria-invalid'); }
  });
  dlg.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dlg.close()));
  // Clique no fundo escuro: so fecha se o aperto E o clique foram no fundo. Arrastar de dentro de um campo (selecionar
  // texto) e soltar sobre o fundo nao fecha nem apaga o que foi digitado.
  let downNoFundo = false;
  dlg.addEventListener('pointerdown', (e) => { downNoFundo = e.target === dlg; });
  dlg.addEventListener('click', (e) => { const fecha = downNoFundo && e.target === dlg; downNoFundo = false; if (fecha) dlg.close(); });
  dlg.addEventListener('close', () => { // ESC, "Agora não", X, fundo ou envio: o foco volta para quem abriu
    const o = opener; opener = null;
    if (o && o.isConnected && typeof o.focus === 'function') o.focus();
  });
  // R6: todo [data-wa-open] abre o modal com o seu data-assunto. Fase de captura + preventDefault: o handler R5 do
  // site.js (marca o select e deixa rolar) ve defaultPrevented e nao age.
  document.addEventListener('click', (e) => {
    const el = e.target.closest ? e.target.closest('[data-wa-open]') : null;
    if (!el || e.defaultPrevented) return;
    e.preventDefault();
    openWaModal(el.dataset.assunto, el);
  }, true);
  return true;
}
