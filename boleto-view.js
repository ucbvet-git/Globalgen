// Embedded in the standalone Orçamento HTML during release preparation.
function createGbgBoletoView(config){
  let overlay=null,controller=null,requestId=0,owner='',customer='',filter='',invoiceFilter='',next='',selected='',selectedDocument='',pdf=null,nativePending=false,loading=false;
  let titleButtons=[],batchButtons=[];
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value)||0);
  const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value.split('-').reverse().join('/'):'—';
  const live=id=>id===requestId&&overlay?.isConnected&&!!config.user()&&config.user().uid===owner;
  function begin(){controller?.abort();controller=new AbortController();owner=config.user()?.uid;return ++requestId;}
  function canShare(file){try{return !!window.AndroidShare||!!(file&&navigator.share&&navigator.canShare?.({files:[file]}));}catch(_){return false;}}
  function clearPdf(){pdf=null;nativePending=false;if(overlay){overlay.querySelector('[data-pdf]').hidden=true;overlay.querySelector('[data-pdf-status]').textContent='';}}
  function busy(value){loading=value;if(overlay){overlay.querySelector('[data-consultar]').disabled=value;overlay.querySelector('[data-proxima]').disabled=value;
    for(const entry of [...titleButtons,...batchButtons])entry.button.disabled=value||!entry.allowed;}}
  function clearResults(){titleButtons=[];batchButtons=[];next='';overlay.querySelector('[data-lista]').replaceChildren();overlay.querySelector('[data-lotes]').replaceChildren();overlay.querySelector('[data-proxima]').hidden=true;}
  function reset(clientChanged=false){++requestId;controller?.abort();customer='';filter='';invoiceFilter='';if(clientChanged){selected='';selectedDocument='';}clearPdf();
    if(overlay){clearResults();overlay.querySelector('[data-clientes]').replaceChildren();status('Consulte novamente para atualizar os títulos.');busy(false);}}
  function close(){++requestId;controller?.abort();controller=null;clearPdf();customer='';next='';selected='';selectedDocument='';titleButtons=[];batchButtons=[];loading=false;
    if(overlay){overlay.remove();overlay=null;}}
  function status(text,error=false){if(!overlay)return;const e=overlay.querySelector('[data-status]');e.textContent=text;e.classList[error?'add':'remove']('gbg-nf-error');}
  const safe=value=>String(value).replace(/[^A-Za-z0-9_-]/g,'_');
  async function receivePdf(route,body,name,label,message){
    if(loading)return;
    const id=begin();clearPdf();busy(true);status('Consultando o Senior e preparando o PDF...');
    try{
      const response=await config.api(route,{method:'POST',signal:controller.signal,body});
      const blob=await response.blob();if(!live(id))return;
      if(!/^application\/pdf(?:;|$)/i.test(response.headers.get('Content-Type')||'')||!blob.size)throw new Error('A API não retornou um PDF de boleto.');
      const base64=await config.base64(blob);if(!live(id))return;
      const file=typeof File==='function'?new File([blob],name,{type:'application/pdf'}):null;
      pdf={blob,base64,file,name,message};
      const panel=overlay.querySelector('[data-pdf]');panel.hidden=false;
      panel.querySelector('[data-pdf-title]').textContent='PDF pronto · '+label;
      panel.querySelector('[data-compartilhar]').hidden=!canShare(file);
      panel.querySelector('[data-pdf-status]').textContent='Escolha Abrir, Baixar ou Compartilhar.';
      status('PDF recebido do Senior.');panel.scrollIntoView?.({behavior:'smooth',block:'nearest'});
    }catch(error){if(live(id))status(error.message,true);}
    finally{if(live(id))busy(false);}
  }
  function generate(title){return receivePdf('/boletos/pdf',{customerCode:title.customerCode,titleNumber:title.number},
    'GBG-Boleto-'+title.customerCode+'-'+safe(title.number)+'.pdf','Título '+title.number,
    'Olá! Segue a segunda via do boleto GLOBALGEN, título '+title.number+'.');}
  function generateInvoice(invoice,code){return receivePdf('/boletos/invoice-pdf',{
    customerCode:code,invoiceNumber:invoice.number,invoiceSeries:invoice.series,invoiceBranch:invoice.branch},
    'GBG-Boletos-'+code+'-NF-'+safe(invoice.series)+'-'+safe(invoice.number)+'.pdf','NF '+invoice.series+' / '+invoice.number,
    'Olá! Seguem os boletos em aberto GLOBALGEN da NF '+invoice.series+' / '+invoice.number+'.');}
  function renderBatches(invoices){
    const code=customer;
    const list=overlay.querySelector('[data-lotes]');list.replaceChildren();batchButtons=[];
    for(const invoice of invoices){const card=document.createElement('section');card.className='gbg-nf-note gbg-boleto-batch';
      card.innerHTML='<h3>NF '+escape(invoice.series)+' / '+escape(invoice.number)+'</h3><p>Um PDF com todos os boletos em aberto desta nota fiscal.</p>'+
        (filter?'<p class="gbg-nf-status">Gerar todos considera a NF inteira, inclusive outros títulos da nota.</p>':'')+
        '<button type="button" data-gerar-nf'+(invoice.canGenerate===true?'':' disabled')+'>Gerar todos em aberto da NF</button>'+
        (invoice.blockReason?'<p class="gbg-nf-warning">'+escape(invoice.blockReason)+'</p>':'');
      const button=card.querySelector('[data-gerar-nf]');button.disabled=invoice.canGenerate!==true;
      button.onclick=()=>{if(button.isConnected&&!button.disabled&&!loading)return generateInvoice(invoice,code);};
      batchButtons.push({button,allowed:invoice.canGenerate===true});list.append(card);
    }
  }
  async function load(more=false){
    const raw=overlay.querySelector('[data-cliente]').value.trim(),digits=raw.replace(/\D/g,''),title=overlay.querySelector('[data-titulo]').value.trim(),nf=overlay.querySelector('[data-nota]').value.trim();
    if(!(/^\d{1,9}$/.test(raw)&&Number(raw)>0)&&!(/^[\d./\s-]+$/.test(raw)&&[11,14].includes(digits.length))){status('Informe CPF/CNPJ ou Código ERP.',true);return;}
    if(title&&!/^[A-Za-z0-9/._-]{1,15}$/.test(title)){status('Informe o título com até 15 letras, números ou separadores / - . _.',true);return;}
    if(nf&&(!/^\d{1,9}$/.test(nf)||Number(nf)===0)){status('Informe o número exato da nota fiscal, com até 9 dígitos.',true);return;}
    const invoice=nf?String(Number(nf)):'';
    const id=begin();clearPdf();busy(true);status('Consultando títulos no Senior...');
    try{
      let code=(selectedDocument===digits?selected:'')||(/^\d{1,9}$/.test(raw)?String(Number(raw)):'');
      const append=more&&!!next&&code===customer&&title===filter&&invoice===invoiceFilter;
      if(!append)clearResults();
      if(!code){
        const found=await(await config.api('/boletos/customers?document='+encodeURIComponent(digits),{signal:controller.signal})).json();if(!live(id))return;
        const choices=overlay.querySelector('[data-clientes]');choices.replaceChildren();
        if(!found.length){status('Nenhum cliente disponível para este documento e login.');return;}
        if(found.length>1){
          for(const choice of found){const button=document.createElement('button');button.type='button';button.textContent=choice.codigoCliente+' · '+choice.nome+' · '+choice.cidade+'/'+choice.uf;
            button.onclick=()=>{if(loading)return;selected=choice.codigoCliente;selectedDocument=digits;choices.replaceChildren();load(false);};choices.append(button);}
          status('Escolha o cadastro do cliente para consultar os títulos.');return;
        }
        code=found[0].codigoCliente;selected=code;selectedDocument=digits;
      }
      customer=code;filter=title;invoiceFilter=invoice;
      const response=await config.api('/boletos?customerCode='+encodeURIComponent(code)+(title?'&titleNumber='+encodeURIComponent(title):'')+(invoice?'&invoiceNumber='+encodeURIComponent(invoice):'')+(append?'&cursor='+encodeURIComponent(next):''),{signal:controller.signal});
      const data=await response.json();if(!live(id))return;
      next=data.nextCursor||'';
      renderBatches(invoice?data.invoices||[]:[]);
      const list=overlay.querySelector('[data-lista]');
      for(const item of data.titles||[]){
        const article=document.createElement('article');article.className='gbg-nf-note gbg-boleto-title';
        article.innerHTML='<h3>Título '+escape(item.number)+'</h3><p>Cliente '+escape(item.customerCode)+' · Situação '+escape(item.status)+
          '<br>NF: '+(item.invoiceNumber?escape(item.invoiceSeries)+' / '+escape(item.invoiceNumber):'Não vinculada')+
          '<br>Vencimento: '+date(item.dueDate)+'</p><div class="gbg-boleto-values"><div>Valor original<strong>'+money(item.originalAmount)+'</strong></div><div>Saldo em aberto<strong>'+money(item.openAmount)+'</strong></div></div>'+
          '<p>Portador: '+escape(item.portador||'—')+' · Carteira: '+escape(item.carteira||'—')+'</p>'+
          '<button type="button" data-gerar'+(item.canGenerate===true?'':' disabled')+'>Gerar segunda via deste título</button>'+
          (item.blockReason?'<p class="gbg-nf-warning">'+escape(item.blockReason)+'</p>':'');
        const button=article.querySelector('[data-gerar]');button.disabled=item.canGenerate!==true;
        button.onclick=()=>{if(button.isConnected&&!button.disabled&&!loading)return generate(item);};titleButtons.push({button,allowed:item.canGenerate===true});list.append(article);
      }
      status(list.children.length?list.children.length+' título(s) disponível(is) para este login.':'Nenhum título disponível para este cliente, filtros e login.');
      overlay.querySelector('[data-proxima]').hidden=!next;
    }catch(error){if(live(id))status(error.message,true);}
    finally{if(live(id))busy(false);}
  }
  function pdfStatus(text){if(overlay)overlay.querySelector('[data-pdf-status]').textContent=text;}
  function openPdf(){if(!pdf||!live(requestId))return;
    try{if(window.AndroidShare?.openPdf){window.AndroidShare.openPdf(pdf.base64,pdf.name);pdfStatus('Abrindo o PDF...');return;}
      const url=URL.createObjectURL(pdf.blob),tab=window.open(url,'_blank');if(tab)try{tab.opener=null;}catch(_){}
      setTimeout(()=>URL.revokeObjectURL(url),300000);pdfStatus(tab?'PDF aberto. Use as opções do navegador para salvar ou compartilhar.':'A abertura foi bloqueada. Toque novamente ou escolha Baixar.');
    }catch(error){pdfStatus(error.message);}}
  function download(){if(!pdf||!live(requestId))return;try{if(window.AndroidShare?.openPdf){openPdf();return;}config.download(pdf.blob,pdf.name);pdfStatus('Download iniciado. Use as opções do navegador para localizar o PDF.');}catch(error){pdfStatus(error.message);}}
  async function share(){if(!pdf||!live(requestId))return;const current=pdf;
    try{if(window.AndroidShare?.sharePdf){nativePending=true;window.AndroidShare.sharePdf(current.base64,current.name,current.message);pdfStatus('Escolha o aplicativo para compartilhar o PDF.');return;}
      if(!current.file||!navigator.share||!navigator.canShare?.({files:[current.file]})){pdfStatus('Compartilhamento indisponível. Abra ou baixe o PDF.');return;}
      await navigator.share({title:'Boletos GLOBALGEN',text:current.message,files:[current.file]});
      if(pdf===current)pdfStatus('Compartilhamento concluído.');
    }catch(error){if(pdf===current&&error.name!=='AbortError')pdfStatus(error.message);}}
  function nativeResult(success,message){if(!nativePending||!pdf||!live(requestId))return false;nativePending=false;pdfStatus(message||(success?'Compartilhamento aberto.':'Não foi possível compartilhar. Abra o PDF e tente novamente.'));return true;}
  function open(initial=''){
    if(!config.user())return;close();config.enter?.();
    overlay=document.createElement('section');overlay.className='gbg-doc-screen no-print';overlay.setAttribute('aria-label','Boletos — segunda via');
    overlay.innerHTML='<div class="gbg-home-card"><div class="gbg-home-bar"><h1>GLOBALGEN</h1><button type="button" data-inicio>Início</button></div>'+
      '<div class="gbg-boleto-heading"><img src="icons/gbg-boletos.svg" width="48" height="48" alt=""><h2 class="gbg-doc-title">Boletos — segunda via</h2></div>'+
      '<p>Consulte o cliente e, se desejar, informe o título ou a nota fiscal.</p>'+
      '<form class="gbg-nf-search"><label>CPF/CNPJ ou Código ERP<input data-cliente inputmode="numeric" maxlength="18" autocomplete="off" required></label>'+
      '<label>Título (opcional)<input data-titulo maxlength="15" autocomplete="off" placeholder="Número exato do título"></label>'+
      '<label>Nota Fiscal (opcional)<input data-nota inputmode="numeric" maxlength="9" autocomplete="off" placeholder="Número exato da NF"></label><button type="submit" data-consultar>Consultar</button></form>'+
      '<div data-clientes class="gbg-nf-options"></div><div data-status class="gbg-nf-status" role="status" aria-live="polite"></div><div data-lotes></div><div data-lista></div><button type="button" data-proxima hidden>Carregar mais</button>'+
      '<section data-pdf hidden class="gbg-nf-note"><h3 data-pdf-title></h3><div class="gbg-nf-options"><button type="button" data-abrir>Abrir PDF</button><button type="button" data-baixar>Baixar PDF</button><button type="button" data-compartilhar>Compartilhar PDF</button></div><div data-pdf-status class="gbg-nf-status" role="status"></div></section>'+
      '<button type="button" data-fechar class="gbg-doc-back">Voltar para NFs e Boletos</button></div>';
    document.body.append(overlay);
    overlay.querySelector('[data-fechar]').onclick=()=>{close();config.back?.();};
    overlay.querySelector('[data-inicio]').onclick=()=>{close();config.home?.();};
    overlay.querySelector('form').onsubmit=event=>{event.preventDefault();document.activeElement?.blur?.();load(false);};overlay.querySelector('[data-proxima]').onclick=()=>load(true);
    overlay.querySelector('[data-cliente]').oninput=()=>reset(true);
    for(const key of ['[data-titulo]','[data-nota]'])overlay.querySelector(key).oninput=()=>reset(false);
    overlay.querySelector('[data-cliente]').value=/^\d{1,9}$/.test(String(initial))?String(initial):'';
    overlay.querySelector('[data-abrir]').onclick=openPdf;overlay.querySelector('[data-baixar]').onclick=download;overlay.querySelector('[data-compartilhar]').onclick=share;
    config.scroll?.();
  }
  return {open,close,nativeResult};
}
// ── FIM SEGUNDA VIA DE BOLETOS ──
