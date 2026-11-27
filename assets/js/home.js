// Entrada em modulo da home v4 (so o index.html carrega). site.js segue como script classico
// porque as paginas internas dependem dele. Os modulos novos da home sao ligados aqui.
import { initMenu } from './menu.js?v=7';
import { initBackground } from './bg.js?v=7';
import { initCalc } from './calc.js?v=7';
import { initWaModal } from './wa.js?v=7';

// T3: fundo. Camada estatica sempre; 3D animado so no computador, carregado depois do conteudo (bg.js).
initBackground();

// O topo existe em toda a home. Se faltar, falha ALTO (erro no console e excecao), em vez de exportar
// null: a T6 chama menu.close() ao abrir o modal do WhatsApp, e um menu "mudo" deixaria os dois empilhados.
const nav = document.querySelector('[data-menu]');
if (!nav) {
  const msg = 'home.js: elemento [data-menu] (topo) nao encontrado.';
  console.error(msg);
  throw new Error(msg);
}

// T6: o modal do WhatsApp recebe menu.close como gancho (abrir um fecha o outro).
export const menu = initMenu(nav);

// T6: modal do WhatsApp. Todo [data-wa-open] (bolinha, calculadora, Quem faz) abre o modal; abrir fecha o menu.
// Se o modal faltar, initWaModal devolve false e o href="#contato" de cada link segue valendo.
initWaModal({ onBeforeOpen: menu.close });

// T5: calculadora "Faca a conta" (busca precos.json so quando a secao se aproxima).
const calcEl = document.querySelector("[data-calc]");
if (calcEl) initCalc(calcEl);
