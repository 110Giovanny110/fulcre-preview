// Fulcre · comportamentos do site (base: Direção H)
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  // 26/11 (pedido do dono): o site NAO obedece ao "reduzir movimento" do sistema; as animacoes rodam para todo mundo.
  var fine = matchMedia('(pointer: fine)').matches;
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function onView(el, cb, th) {
    if (!('IntersectionObserver' in window)) { cb(); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); cb(); } }); }, { threshold: th || 0.2 });
    io.observe(el);
  }

  // Entrada escalonada por seção
  $$('section, header, footer').forEach(function (s) {
    onView(s, function () { $$('.rv', s).forEach(function (el, i) { setTimeout(function () { el.classList.add('in'); }, i * 80); }); }, 0.12);
  });
  setTimeout(function () { $$('.rv').forEach(function (el) { el.classList.add('in'); }); }, 5000);

  // Borda luminosa segue o mouse
  $$('.glow').forEach(function (el) {
    el.addEventListener('mousemove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', e.clientX - r.left + 'px');
      el.style.setProperty('--my', e.clientY - r.top + 'px');
    });
  });

  // Botões magnéticos
  if (fine) $$('.magnet').forEach(function (b) {
    b.addEventListener('mousemove', function (e) {
      var r = b.getBoundingClientRect();
      b.style.transform = 'translate(' + (e.clientX - r.left - r.width / 2) * 0.2 + 'px,' + (e.clientY - r.top - r.height / 2) * 0.3 + 'px)';
    });
    b.addEventListener('mouseleave', function () { b.style.transform = ''; });
  });

  // Chama cb(true/false) sempre que o elemento entra ou sai da tela. Sem IntersectionObserver: considera visivel.
  function watch(el, cb) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver(function (es) { cb(es[es.length - 1].isIntersecting); }).observe(el);
  }

  // Hub (T4a): a Fulcre no centro, ligada a cada frente. As linhas saem do nucleo ate o centro de cada no
  // (posicao vinda do CSS: --x/--y ou --xm/--ym), e os pulsos de luz correm do nucleo para fora, na cor do tipo.
  // Anima so com o hub na tela; fora dela pausa.
  // data-state: running | paused (lido pelo e2e).
  $$('[data-hub]').forEach(function (hub) {
    var svg = hub.querySelector(':scope > svg');
    var nodes = $$('.node', hub);
    var NS = 'http://www.w3.org/2000/svg';
    var D = 34; // comprimento do pulso
    var anims = [], visible = false, lastW = 0;
    function sync() {
      anims.forEach(function (a) { if (visible) a.play(); else a.pause(); });
      hub.classList.toggle('is-on', visible);
      hub.dataset.state = visible ? 'running' : 'paused';
    }
    function build() {
      anims.forEach(function (a) { a.cancel(); });
      anims = [];
      svg.innerHTML = '';
      var W = hub.clientWidth, H = hub.clientHeight;
      lastW = W;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var cx = W / 2, cy = H / 2, vertical = H > W;
      nodes.forEach(function (n, i) {
        var nx = n.offsetLeft, ny = n.offsetTop; // o no e centrado no ponto (translate -50%)
        var d = vertical
          ? 'M' + cx + ',' + cy + ' C' + cx + ',' + (cy + ny) / 2 + ' ' + nx + ',' + (cy + ny) / 2 + ' ' + nx + ',' + ny
          : 'M' + cx + ',' + cy + ' C' + (cx + nx) / 2 + ',' + cy + ' ' + (cx + nx) / 2 + ',' + ny + ' ' + nx + ',' + ny;
        var wire = document.createElementNS(NS, 'path');
        wire.setAttribute('d', d); wire.setAttribute('class', 'wire');
        svg.appendChild(wire);
        if (!wire.getTotalLength) return;
        var len = wire.getTotalLength();
        var pl = document.createElementNS(NS, 'path');
        pl.setAttribute('d', d); pl.setAttribute('class', 'pulse ' + (n.classList.contains('prod') ? 'prod' : 'svc'));
        // Um traco de D px por volta: antes do inicio (offset D) ele esta escondido no nucleo; no fim (offset -len), sob o no.
        pl.style.strokeDasharray = D + ' ' + (len + D);
        pl.style.strokeDashoffset = D;
        svg.appendChild(pl);
        // 26/11 (pedido do dono): no celular (hub vertical) a velocidade de sempre, que ele aprovou (2,2 a 3 s por raio).
        // No computador as linhas sao bem mais longas e o mesmo tempo ficava rapido demais: la a velocidade e
        // constante e mais lenta (~75 px/s, minimo 3,4 s por raio).
        var dur = vertical ? 2200 + (i % 3) * 400 : Math.max(3400, (len + D) / 0.075) + (i % 3) * 300;
        if (pl.animate) anims.push(pl.animate([{ strokeDashoffset: D }, { strokeDashoffset: -len }], { duration: dur, iterations: Infinity, delay: i * (vertical ? 300 : 450), easing: 'cubic-bezier(.4,0,.2,1)' }));
      });
      sync();
    }
    build();
    watch(hub, function (v) { visible = v; sync(); });
    var t;
    addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { if (hub.clientWidth !== lastW) build(); }, 150); });
  });

  // Faixa (T4a): a animacao e so CSS; aqui so liga .is-on quando ela esta na tela (fora dela fica pausada).
  $$('[data-marquee]').forEach(function (mq) {
    watch(mq, function (v) { mq.classList.toggle('is-on', v); });
  });
  // Botao de pausa da faixa (WCAG 2.2.2): pausa e continua; o rotulo fica fixo (Pausar a faixa) e o estado vai em aria-pressed; foco de TECLADO na dobra tambem pausa (:has(:focus-visible); clique de mouse nao prende a pausa).
  $$('[data-mq-toggle]').forEach(function (btn) {
    var mq = btn.closest('section').querySelector('[data-marquee]');
    btn.addEventListener('click', function () {
      var p = mq.classList.toggle('is-paused');
      btn.setAttribute('aria-pressed', String(p));
    });
  });

  // Zap: baloes chegando em sequencia, em loop, so com o cartao na tela
  $$('.chat').forEach(function (chat) {
    var msgs = $$('b', chat);
    var k = 0, timer = 0, on = false;
    function step() {
      timer = 0;
      if (!on) return;
      if (k < msgs.length) { msgs[k++].classList.add('on'); timer = setTimeout(step, 900); return; }
      timer = setTimeout(function () { msgs.forEach(function (m) { m.classList.remove('on'); }); k = 0; step(); }, 2600);
    }
    watch(chat, function (v) {
      on = v;
      if (on && !timer) step();
      if (!on && timer) { clearTimeout(timer); timer = 0; }
    });
  });

  // CRM: um cartao avanca de etapa de tempos em tempos, so com o cartao na tela
  $$('.kan').forEach(function (kan) {
    var cols = $$('.col', kan), iv = 0;
    function tick() {
      var from = cols[0].querySelectorAll('.card').length > 1 ? 0 : (cols[1].querySelectorAll('.card').length > 1 ? 1 : -1);
      if (from < 0) { // recomeca: devolve os cartoes para a primeira coluna
        $$('.card', cols[2]).slice(1).forEach(function (c) { cols[0].appendChild(c); c.classList.remove('fly'); void c.offsetWidth; c.classList.add('fly'); });
        return;
      }
      var card = cols[from].querySelector('.card:last-of-type');
      cols[from + 1].appendChild(card);
      card.classList.remove('fly'); void card.offsetWidth; card.classList.add('fly');
    }
    watch(kan, function (v) {
      if (v && !iv) iv = setInterval(tick, 1700);
      if (!v && iv) { clearInterval(iv); iv = 0; }
    });
  });

  // T4b: animacoes decorativas (escudo, cadeado, relogio e sol do dia). A animacao e so CSS e fica parada
  // (--play: paused); aqui so liga .is-on com o bloco na tela.
  // data-state: running | paused (lido pelo e2e).
  $$('[data-anim]').forEach(function (el) {
    el.dataset.state = 'paused';
    watch(el, function (v) { el.classList.toggle('is-on', v); el.dataset.state = v ? 'running' : 'paused'; });
  });

  // T7: content-visibility (site.css) so vale para o primeiro desenho. Desliga (html.cv-off) depois do load + ocioso, ou na
  // primeira rolagem, toque, tecla ou clique em ancora, o que vier antes: sem salto de layout ao rolar e ancoras certas.
  (function () {
    var root = document.documentElement, done = false;
    function off() {
      if (done) return; done = true;
      root.classList.add('cv-off');
      ['scroll', 'wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (t) { removeEventListener(t, off, true); });
    }
    ['scroll', 'wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (t) { addEventListener(t, off, { capture: true, passive: true }); });
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a[href*="#"]')) off(); }, true);
    function later() { setTimeout(function () { if ('requestIdleCallback' in window) requestIdleCallback(off, { timeout: 3000 }); else off(); }, 1500); }
    if (document.readyState === 'complete') later(); else addEventListener('load', later);
    window.__cvOff = off; // usado pelos testes
  })();

  // T7: pontos que piscam (selo da primeira dobra e painel da Dor) so animam com o bloco na tela.
  // [data-live] liga .is-on (so classe); o CSS le --play.
  $$('[data-live]').forEach(function (el) {
    watch(el, function (v) { el.classList.toggle('is-on', v); });
  });

  // T4b: Como funciona. A linha dourada cresce com a rolagem (--p) e cada passo acende (.lit) ao passar de 62%
  // da janela. So escuta a rolagem com a lista na tela.
  // --tail faz a linha terminar no centro do ultimo numero (e nao no fim do texto do ultimo passo).
  $$('[data-steps]').forEach(function (ol) {
    var items = $$(':scope > li', ol), on = false, ticking = false;
    var DOT = 14; // centro do .dot em relacao ao topo do passo
    function tail() { var last = items[items.length - 1]; if (last) ol.style.setProperty('--tail', Math.max(DOT, last.offsetHeight - DOT) + 'px'); }
    tail();
    addEventListener('resize', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { tail(); update(); }); } });
    function update() {
      ticking = false;
      if (!items.length) return;
      var mid = innerHeight * 0.62, r = ol.getBoundingClientRect();
      var top = r.top + DOT, len = Math.max(1, r.height - DOT - (parseFloat(ol.style.getPropertyValue('--tail')) || DOT));
      ol.style.setProperty('--p', Math.min(1, Math.max(0, (mid - top) / len)).toFixed(3));
      items.forEach(function (li) { li.classList.toggle('lit', li.getBoundingClientRect().top + DOT < mid); });
    }
    addEventListener('scroll', function () { if (on && !ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    watch(ol, function (v) { on = v; if (v) update(); });
  });

  // Links para #contato com data-assunto (ex.: "Pedir proposta" dos servicos) marcam no formulario a opcao de
  // texto igual (R5). O navegador segue a ancora normalmente.
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented) return; // o modal do WhatsApp (wa.js, [data-wa-open]) ja tratou este clique
    var a = e.target.closest ? e.target.closest('a[href="#contato"][data-assunto]') : null;
    if (!a) return;
    var sel = document.querySelector('#lead select[name=necessidade]');
    if (!sel) return;
    var want = a.getAttribute('data-assunto');
    if (want === 'Outro assunto') want = 'Ainda não sei'; // reserva sem modal: o formulário não tem "Outro assunto"
    var opt = Array.prototype.filter.call(sel.options, function (o) { return o.textContent.trim() === want; })[0];
    if (!opt) { console.warn('site.js: o formulario nao tem a opcao "' + want + '" (data-assunto).'); return; }
    sel.value = opt.value;
    sel.removeAttribute('aria-invalid');
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Formulário de contato
  var form = document.getElementById('lead');
  if (form) {
    var box = document.getElementById('lead-box');
    var err = document.getElementById('lead-err');
    var btn = form.querySelector('button[type=submit]');
    var wa = form.elements.whatsapp;
    wa.addEventListener('input', function () {
      var d = wa.value.replace(/\D/g, '').slice(0, 13), o;
      if (d.length >= 12 && d.slice(0, 2) === '55') d = d.slice(2); // colou +55: o servidor espera so DDD + numero
      d = d.slice(0, 11); o = d;
      if (d.length > 2) o = '(' + d.slice(0, 2) + ') ' + d.slice(2);
      if (d.length > 7) o = '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(d.length - 4);
      wa.value = o;
    });
    function check() {
      var bad = [], f = form.elements;
      [f.nome, f.empresa].forEach(function (el) { if (el.value.trim().length < 2) bad.push(el); });
      var digits = f.whatsapp.value.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 11) bad.push(f.whatsapp);
      if (!f.necessidade.value) bad.push(f.necessidade);
      $$('input,select', form).forEach(function (el) { el.removeAttribute('aria-invalid'); });
      bad.forEach(function (el) { el.setAttribute('aria-invalid', 'true'); });
      if (bad.length) { bad[0].focus(); return 'Confira os campos marcados.'; }
      if (!f.consentimento.checked) { f.consentimento.focus(); return 'Para enviar, marque a caixa de consentimento.'; }
      return '';
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = check();
      err.textContent = msg;
      if (msg) return;
      var f = form.elements;
      var dados = {
        nome: f.nome.value.trim(), whatsapp: f.whatsapp.value.replace(/\D/g, ''), empresa: f.empresa.value.trim(),
        necessidade: f.necessidade.value, consentimento: true, site: f.site.value,
        pagina: location.pathname, origem: new URLSearchParams(location.search).get('utm_source') || document.referrer || 'formulario-home'
      };
      btn.disabled = true; var old = btn.textContent; btn.textContent = 'Enviando...';
      fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function () {
          box.classList.add('sent');
          var done = box.querySelector('.done'); done.setAttribute('tabindex', '-1'); done.focus();
          if (window.dataLayer) window.dataLayer.push({ event: 'generate_lead', necessidade: dados.necessidade });
        })
        .catch(function () {
          err.innerHTML = 'Não conseguimos enviar agora. Tente de novo em instantes ou chame no <a class="link" href="https://wa.me/5511963131588" target="_blank" rel="noopener">WhatsApp (11) 96313-1588</a>.';
        })
        .then(function () { btn.disabled = false; btn.textContent = old; });
    });
  }

  // Bolinha do WhatsApp: aparece depois de 40s e some perto do formulário
  var fab = document.querySelector('.wa-fab'), contato = document.getElementById('contato');
  if (fab && contato) {
    var near = false, ready = false;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { near = es[0].isIntersecting; fab.classList.toggle('show', ready && !near); }).observe(contato);
    setTimeout(function () { ready = true; if (!near) fab.classList.add('show'); }, 40000);
  }
})();

// Calculadora: fica fechada atras de um botao e abre no clique.
(function () {
  var sec = document.querySelector('[data-calc]');
  var btn = sec && sec.querySelector('[data-calc-open]');
  if (!btn) return;
  sec.classList.add('gated');
  btn.addEventListener('click', function () {
    sec.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    var first = sec.querySelector('.calc .seg button');
    if (first) first.focus({ preventScroll: true });
    var box = sec.querySelector('.calc');
    if (box && box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
})();
