// Embedded in the standalone Orçamento HTML during release preparation.
function createGbgDocumentsView(config){
  let screen=null;
  function close(){if(screen){screen.remove();screen=null;}}
  function open(){
    if(!config.user())return;close();config.enter?.();
    screen=document.createElement('section');screen.className='gbg-doc-screen no-print';screen.setAttribute('aria-label','NFs e Boletos');
    screen.innerHTML='<div class="gbg-home-card"><div class="gbg-home-bar"><h1>GLOBALGEN</h1><button type="button" data-inicio>Início</button></div>'+
      '<h2 class="gbg-doc-title">NFs e Boletos</h2><p>Escolha o documento para continuar.</p>'+
      '<button type="button" class="gbg-home-option gbg-doc-option" data-boletos><img src="icons/gbg-boletos.svg" width="64" height="64" alt=""><span>Boletos<small>Consultar e gerar segunda via</small></span></button>'+
      '<button type="button" class="gbg-home-option gbg-doc-option" disabled><img src="icons/gbg-notas-fiscais.svg" width="64" height="64" alt=""><span>Notas Fiscais<small>Segunda via · Em breve</small></span></button></div>';
    document.body.append(screen);
    screen.querySelector('[data-inicio]').onclick=()=>{close();config.home?.();};
    screen.querySelector('[data-boletos]').onclick=()=>{close();config.boletos?.();};
    config.scroll?.();
  }
  return {open,close};
}
// ── FIM TELA NFs E BOLETOS ──
