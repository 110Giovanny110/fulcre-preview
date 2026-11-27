// Tarefa 5: calculadora "Faca a conta".
// Parte pura (quote, formatBRL, usePrecos): sem DOM, testada em tests/unit/calc.test.js.
// Parte de tela (initCalc): chamada pelo home.js. Os NUMEROS vem so de /assets/data/precos.json.

let P = null;

/** Entrega a tabela de precos (JSON). No navegador o initCalc busca; nos testes, o before() le do disco. */
export function usePrecos(tabela) {
  if (!tabela || typeof tabela !== 'object') throw new Error('calc.js: tabela de precos invalida.');
  P = tabela;
}
export function getPrecos() {
  if (!P) throw new Error('calc.js: precos ainda nao carregados (chame usePrecos).');
  return P;
}

const ok = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const cents = (n) => Math.round(n * 100) / 100;
const ITENS = ['crm', 'zap', 'site', 'site-landing', 'ia', 'sistema'];

function pack(mercado, fulcre, modelo, cta, extra) {
  mercado = cents(mercado);
  fulcre = cents(fulcre);
  const economia = Math.max(0, cents(mercado - fulcre));
  const economiaPct = mercado > 0 ? Math.min(100, Math.round((economia / mercado) * 100)) : 0;
  return { mercado, fulcre, economia, economiaPct, modelo, cta, ...extra };
}

/**
 * quote(item, { mensalHoje, meses }) -> { mercado, fulcre, economia, economiaPct, modelo, cta, ... }
 * - 'site' | 'site-landing' | 'sistema': pagamento unico.
 * - 'ia': 'unico+mensal'; traz implantacao e mensalidade (cada uma com mercado e fulcre) e os totais em 12 meses.
 * - 'crm': 'mensal'. Sem `meses`, os valores sao POR MES; com `meses`, o total no periodo (dos dois lados).
 * - 'zap': 'unico' (licenca) contra `mensalHoje` x `meses` (padrao: media de mercado e os meses do precos.json, hoje 12); cta 'lista'.
 * economia nunca e negativa nem NaN, em qualquer valor.
 */
export function quote(item, opts = {}) {
  const t = getPrecos();
  if (!ITENS.includes(item)) throw new Error(`calc.js: item desconhecido "${item}".`);
  const hoje = opts && ok(opts.mensalHoje) ? opts.mensalHoje : undefined;
  const mesesOpt = opts && Number.isFinite(opts.meses) && opts.meses > 0 ? Math.round(opts.meses) : undefined;

  if (item === 'ia') {
    const meses = t.ia.meses;
    const { implantacao, mensalidade } = t.ia;
    return pack(
      implantacao.mercado + mensalidade.mercado * meses,
      implantacao.fulcre + mensalidade.fulcre * meses,
      'unico+mensal', 'preco',
      { implantacao: { ...implantacao }, mensalidade: { ...mensalidade }, meses }
    );
  }
  if (item === 'crm') {
    const mensalHoje = hoje ?? t.crm.mercado;
    const m = mesesOpt ?? 1;
    return pack(mensalHoje * m, t.crm.fulcre * m, 'mensal', 'preco',
      { mensalHoje, mensalFulcre: t.crm.fulcre, meses: m });
  }
  if (item === 'zap') {
    const mensalHoje = hoje ?? t.zap.mercadoMensal;
    const meses = mesesOpt ?? t.zap.meses;
    return pack(mensalHoje * meses, t.zap.licenca, 'unico', 'lista', { mensalHoje, meses });
  }
  const linha = t[item];
  return pack(linha.mercado, linha.fulcre, 'unico', 'preco', {});
}

/** 4490 -> "R$ 4.490"; 158.5 -> "R$ 158,50". Valor invalido ou negativo vira "R$ 0". */
export function formatBRL(n) {
  if (!ok(n)) n = 0;
  const v = cents(n);
  const inteiro = Math.floor(v);
  const frac = Math.round((v - inteiro) * 100);
  const milhar = String(inteiro).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return 'R$ ' + milhar + (frac ? ',' + String(frac).padStart(2, '0') : '');
}

// ---------------------------------------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------------------------------------
const BEN_SERVICO = [
  'Proposta por escrito, com escopo, prazo e preço, antes de qualquer pagamento',
  'Você aprova antes de a gente começar',
  'Você acompanha de perto, sem surpresa no meio do caminho',
  'Suporte com gente, pelo WhatsApp',
];
// Textos (sem numeros): o que cada item oferece, so o que as Regras e os Termos sustentam.
const META = {
  crm: { tipo: 'prod', assunto: 'Fulcre CRM', cta: 'Quero esse preço', slider: { min: 50, max: 1500, step: 1 },
    ben: ['Preço travado enquanto a assinatura estiver ativa', 'Cancela quando quiser, sem multa', 'Você exporta seus dados quando quiser', 'Garantia de 30 dias depois da compra'],
    neutro: 'Seu valor de hoje já é menor que o da Fulcre. O que muda é o resto: preço travado, cancela sem multa e gente no suporte.',
    valor: ['Nenhum contato esquecido', 'Próximo passo de cada cliente marcado', 'Todas as vendas numa tela'] },
  zap: { tipo: 'prod', assunto: 'Fulcre Zap', cta: 'Entrar na lista de fundadores', slider: { min: 20, max: 600, step: 1 },
    ben: ['Pagamento único, sem mensalidade', 'Seus dados ficam no seu computador', 'Garantia de 30 dias depois da compra', 'Suporte incluso nos primeiros 12 meses'],
    neutro: 'Nesse valor, o preço fica parecido. O ganho é outro: você paga uma vez e seus dados ficam no seu computador.',
    valor: ['Confirmação no WhatsApp, sozinha', 'Lembrete antes do horário', 'Menos horário vazio na agenda'] },
  site: { tipo: 'svc', assunto: 'Site', cta: 'Quero esse preço', ben: BEN_SERVICO,
    valor: ['Aparece quando pesquisam sua empresa', 'Explica o que você faz', 'Leva direto ao seu WhatsApp'] },
  ia: { tipo: 'svc', assunto: 'Automação ou agente de IA', cta: 'Quero esse preço', ben: BEN_SERVICO,
    valor: ['Resposta na hora, 24h', 'Tira dúvidas e marca horário', 'Passa para você quando precisa'] },
  sistema: { tipo: 'svc', assunto: 'Sistema', cta: 'Quero esse preço', ben: BEN_SERVICO,
    valor: ['Fim do trabalho repetido', 'Do jeito que sua empresa trabalha', 'Tudo num lugar só'] },
};

export function initCalc(root) {
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];
  const f = (name) => root.querySelector(`[data-f="${name}"]`);
  let srTimer = 0;
  const card = $('.calc');
  // assina: 3a pergunta (so produtos). 'nao' = compara com a media de mercado; 'sim' = abre o controle "quanto voce paga".
  const state = { grupo: 'produto', item: 'crm', sub: 'site', assina: 'nao', hoje: {} };

  const fail = (e) => {
    console.error('calc.js: nao foi possivel carregar os precos.', e);
    root.dataset.state = 'error';
  };

  // Numero com transicao curta. O texto final e sempre exato.
  function setNum(name, value) {
    const el = f(name);
    const to = ok(value) ? value : 0;
    const from = el._v;
    el._v = to;
    cancelAnimationFrame(el._raf);
    if (from === undefined || from === to) { el.textContent = formatBRL(to); return; }
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 380);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = formatBRL(k >= 1 ? to : from + (to - from) * e);
      if (k < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }

  const currentKey = () => (state.item === 'site' && state.sub === 'site-landing' ? 'site-landing' : state.item);

  function render() {
    const t = getPrecos();
    const meta = META[state.item];
    card.dataset.tipo = meta.tipo;
    root.dataset.item = currentKey();

    $$('[data-grupo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.grupo === state.grupo)));
    $$('[data-opts]').forEach((g) => { g.hidden = g.dataset.opts !== state.grupo; });
    $$('[data-item]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.item === state.item)));
    $('[data-var]').hidden = state.item !== 'site';
    $$('[data-sub]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sub === state.sub)));
    $$('[data-q3]').forEach((el) => { el.hidden = !meta.slider; });
    $$('[data-assina]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.assina === state.assina)));
    // Ja paga hoje (so produtos): o controle deslizante aparece e a conta usa o valor dele.
    const usaHoje = !!meta.slider && state.assina === 'sim';

    // controle deslizante: so no CRM e no Zap, e so para quem ja paga por uma ferramenta assim
    const slider = $('[data-slider]');
    const rng = $('#calc-hoje');
    let opts;
    if (usaHoje) {
      const s = meta.slider;
      if (state.hoje[state.item] === undefined) {
        const base = state.item === 'crm' ? t.crm.mercado : t.zap.mercadoMensal;
        state.hoje[state.item] = Math.min(s.max, Math.max(s.min, Math.round(base / s.step) * s.step));
      }
      rng.min = s.min; rng.max = s.max; rng.step = s.step; rng.value = state.hoje[state.item];
      rng.style.setProperty('--p', ((Number(rng.value) - s.min) / (s.max - s.min)) * 100 + '%');
      const txt = formatBRL(Number(rng.value)) + ' por mês';
      f('hoje').textContent = txt;
      rng.setAttribute('aria-valuetext', txt);
      slider.hidden = false;
      opts = { mensalHoje: Number(rng.value), meses: state.item === 'crm' ? t.crm.meses : t.zap.meses };
    } else {
      slider.hidden = true;
      if (meta.slider) opts = { meses: state.item === 'crm' ? t.crm.meses : t.zap.meses }; // media de mercado
    }

    const q = quote(currentKey(), opts);
    const em = (n) => `${n} meses`;

    // 26/11 (pedido do dono): numero grande = valor POR MES (onde existe mensalidade); embaixo, o total em 12 meses.
    // "Voce economiza" = 12 meses. Itens de pagamento unico (site, sistema; e a licenca do Zap) mostram o valor unico.
    const mensal = state.item === 'crm' || state.item === 'zap' || state.item === 'ia';
    const noPeriodo = `em ${em(q.meses)}`;
    let mVal, fVal, mSub, fSub, rotF = 'Na Fulcre';
    if (state.item === 'crm') {
      mVal = q.mensalHoje; fVal = q.mensalFulcre; rotF = 'Na Fulcre por mês';
      mSub = `${formatBRL(q.mercado)} ${noPeriodo}`;
      fSub = `${formatBRL(q.fulcre)} ${noPeriodo}`;
    } else if (state.item === 'zap') {
      mVal = q.mensalHoje; fVal = q.fulcre;
      mSub = `${formatBRL(q.mercado)} ${noPeriodo}`;
      fSub = 'licença, paga uma vez';
    } else if (state.item === 'ia') {
      mVal = q.mensalidade.mercado; fVal = q.mensalidade.fulcre; rotF = 'Na Fulcre por mês';
      mSub = `+ ${formatBRL(q.implantacao.mercado)} de implantação · ${formatBRL(q.mercado)} ${noPeriodo}`;
      fSub = `+ ${formatBRL(q.implantacao.fulcre)} de implantação · ${formatBRL(q.fulcre)} ${noPeriodo}`;
    } else {
      mVal = q.mercado; fVal = q.fulcre;
      mSub = fSub = 'pagamento único';
    }
    const rotMkt = (usaHoje ? 'Você paga hoje' : 'Média do mercado') + (mensal ? ' por mês' : '');
    $('.t-mkt .tl').textContent = rotMkt;
    $('.t-fulcre .tl').textContent = rotF;
    $('.t-eco .tl').textContent = mensal ? `Você economiza ${noPeriodo}` : 'Você economiza';
    setNum('mercado', mVal);
    setNum('fulcre', fVal);
    f('mercado-sub').textContent = mSub;
    f('fulcre-sub').textContent = fSub;

    // Economia: se hoje ja e menor que a Fulcre, mostra algo neutro e verdadeiro (nunca "R$ 0" com cara de erro).
    const neutro = q.economia <= 0;
    $('.t-eco').dataset.neutro = String(neutro);
    if (!neutro) setNum('economia', q.economia);
    // Neutro: com o valor do usuario usa o texto do item; contra a media de mercado, um texto que nao fala de "valor de hoje".
    const neutroTxt = usaHoje ? meta.neutro || '' : 'O preço fica parecido com a média de mercado. O ganho está nas Regras da Fulcre: preço travado, sem multa e gente no suporte.';
    f('eco-sub').textContent = neutro ? neutroTxt : `${q.economiaPct}% a menos que ${usaHoje ? 'o que você paga hoje' : 'a média de mercado'}`;

    // O que muda na pratica: 3 itens curtos com check verde, para quem ainda nao paga por uma ferramenta assim (e nos servicos).
    const valor = $('[data-valor]');
    valor.hidden = usaHoje || !meta.valor;
    if (!valor.hidden) f('valor-l').replaceChildren(...meta.valor.map((txt) => { const li = document.createElement('li'); li.textContent = txt; return li; }));

    f('ben').replaceChildren(...meta.ben.map((txt) => { const li = document.createElement('li'); li.textContent = txt; return li; }));

    const notas = [`Média de mercado pesquisada em ${t.data}.`];
    if (meta.tipo === 'svc') notas.push('O valor final vem na proposta escrita.');
    if (meta.slider) notas.push(`A conta compara ${em(q.meses)} ${usaHoje ? 'do que você paga hoje' : 'da média de mercado'} com o preço da Fulcre.`);
    if (state.item === 'zap') {
      notas.push(`${formatBRL(t.zap.lista)} para os ${t.zap.vagasLista} primeiros da lista de fundadores. Renovação opcional de atualizações e suporte: ${formatBRL(t.zap.renovacao)} por ano.`);
      notas.push('O Zap está em construção: entrar na lista não gera cobrança.');
    }
    f('nota').textContent = notas.join(' ');

    // Botao: assunto certo a cada troca (contrato R6: a T6 liga [data-wa-open])
    const cta = f('cta');
    cta.dataset.assunto = meta.assunto;
    cta.querySelector('.cta-t').textContent = q.cta === 'lista' ? 'Entrar na lista de fundadores' : meta.cta;

    // Leitor de tela: o resumo so e atualizado 400 ms depois da ultima mudanca (o controle dispara 'input' a cada passo).
    const resumo = `${rotMkt}: ${formatBRL(mVal)}. ${rotF}: ${formatBRL(fVal)}.` + (neutro ? '' : ` Você economiza ${formatBRL(q.economia)}${mensal ? ' ' + noPeriodo : ''}.`);
    clearTimeout(srTimer);
    srTimer = setTimeout(() => { f('sr').textContent = resumo; }, 4e2); // 400 ms
    root.dataset.state = 'ready';
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !root.contains(b) || !P) return;
    if (b.dataset.grupo) {
      if (state.grupo === b.dataset.grupo) return;
      state.grupo = b.dataset.grupo;
      state.item = state.grupo === 'produto' ? 'crm' : 'site';
    } else if (b.dataset.item) {
      state.item = b.dataset.item;
    } else if (b.dataset.sub) {
      state.sub = b.dataset.sub;
    } else if (b.dataset.assina) {
      state.assina = b.dataset.assina;
    } else return;
    render();
  });
  $('#calc-hoje').addEventListener('input', (e) => {
    if (!P) return;
    state.hoje[state.item] = Number(e.target.value);
    render();
  });

  // Busca a tabela so quando a secao se aproxima (lazy). Sem IntersectionObserver, busca ja.
  let started = false;
  const load = () => {
    if (started) return;
    started = true;
    root.dataset.state = 'loading';
    fetch('assets/data/precos.json?v=7')
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((json) => { usePrecos(json); render(); })
      .catch(fail);
  };
  root.dataset.state = 'idle';
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '800px 0px' });
    io.observe(root);
  } else load();
  return { render };
}
