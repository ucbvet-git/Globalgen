// Embedded in the standalone Gestão HTML during release preparation.
function createGbgBoletoModelView(config){
  let overlay=null,controller=null,requestId=0,owner='',revision=0,previousOverflow='',working=false;
  let rowButtons=[];
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const permitted=()=>config.user()?.isAdmin===true;
  const live=id=>id===requestId&&overlay?.isConnected&&permitted()&&config.user().uid===owner;
  function begin(){controller?.abort();controller=new AbortController();owner=config.user()?.uid;return ++requestId;}
  function close(){++requestId;controller?.abort();controller=null;revision=0;rowButtons=[];working=false;if(overlay){overlay.remove();overlay=null;document.body.style.overflow=previousOverflow;}}
  function busy(value){working=value;if(overlay){for(const key of ['[data-salvar]','[data-recarregar]','[data-novo]'])overlay.querySelector(key).disabled=value;for(const button of rowButtons)button.disabled=value;}}
  function status(text){if(overlay)overlay.querySelector('[data-status]').textContent=text;}
  function edit(row=null){revision=row?.revision||0;
    for(const [key,value] of [['portador',row?.portador||''],['carteira',row?.carteira||''],['modelo',row?.modelo||'']]){const input=overlay.querySelector('[data-'+key+']');input.value=value;input.readOnly=key!=='modelo'&&!!row;}
    overlay.querySelector('[data-salvar]').textContent=row?'Salvar alteração':'Cadastrar modelo';status(row?'Altere o modelo e salve. Para outra combinação, escolha Novo cadastro.':'Informe os três campos para cadastrar uma combinação.');}
  async function load(message=''){
    const id=begin();status('Carregando modelos...');busy(true);
    try{const rows=await(await config.api('/management/boleto-models',{signal:controller.signal})).json();if(!live(id))return;
      const list=overlay.querySelector('[data-lista]');list.replaceChildren();rowButtons=[];
      for(const row of rows){const article=document.createElement('article');article.className='gbg-nf-note';
        article.innerHTML='<h3>'+escape(row.portador)+' · '+escape(row.carteira)+' · '+escape(row.modelo)+'</h3><p>Última alteração: '+escape(row.alteradoEmUtc?new Date(row.alteradoEmUtc).toLocaleString('pt-BR'):'—')+' · '+escape(row.alteradoPor||'—')+'</p><div class="gbg-nf-options"><button type="button" data-editar>Editar modelo</button><button type="button" data-excluir class="gbg-model-delete">Excluir cadastro</button></div>';
        const editButton=article.querySelector('[data-editar]'),deleteButton=article.querySelector('[data-excluir]');
        editButton.onclick=()=>{if(working)return;edit(row);overlay.querySelector('[data-modelo]').focus();};
        deleteButton.onclick=()=>remove(row);rowButtons.push(editButton,deleteButton);list.append(article);}
      edit();status(message||(rows.length?rows.length+' modelo(s) cadastrado(s).':'Nenhum modelo cadastrado.'));
    }catch(error){if(live(id)){status(error.message);overlay.querySelector('[data-lista]').replaceChildren();}}
    finally{if(live(id))busy(false);}
  }
  async function save(){
    if(!permitted()||working)return;
    const portador=overlay.querySelector('[data-portador]').value,carteira=overlay.querySelector('[data-carteira]').value,modelo=overlay.querySelector('[data-modelo]').value.trim().toUpperCase();
    if(!/^[0-9]{4}$/.test(portador)||!/^[0-9]{2}$/.test(carteira)||!/^[A-Z]{4}[0-9]{3}\.BLO$/.test(modelo)){status('Use Portador com 4 dígitos, Carteira com 2 dígitos e modelo com 4 letras + 3 números + .BLO.');return;}
    const id=begin();busy(true);status('Salvando modelo...');
    try{await config.api('/management/boleto-models',{method:'POST',signal:controller.signal,body:{portador,carteira,modelo,expectedRevision:revision}});if(!live(id))return;
      await load('Modelo salvo.');
    }catch(error){if(live(id))status(error.message);}
    finally{if(live(id))busy(false);}
  }
  async function remove(row){
    if(!permitted()||working)return;
    if(!config.confirm('Excluir o cadastro '+row.portador+' / '+row.carteira+' — '+row.modelo+'? O histórico será mantido e esta combinação poderá ser cadastrada novamente.'))return;
    const id=begin();busy(true);status('Excluindo cadastro...');
    try{
      await config.api('/management/boleto-models/'+encodeURIComponent(row.portador)+'/'+encodeURIComponent(row.carteira)+'?expectedRevision='+encodeURIComponent(row.revision),{method:'DELETE',signal:controller.signal});
      if(!live(id))return;await load('Cadastro excluído. O histórico foi preservado.');
    }catch(error){if(live(id))status(error.message);}
    finally{if(live(id))busy(false);}
  }
  async function open(){if(!permitted())return;close();previousOverflow=document.body.style.overflow;
    overlay=document.createElement('div');overlay.className='gbg-nf-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Modelos de Bloquetos');
    overlay.innerHTML='<div class="gbg-nf-card"><div class="gbg-nf-top"><h2>Modelos de Bloquetos</h2><button type="button" data-fechar>Fechar</button></div><p>Um modelo por Portador e Carteira. Os códigos mantêm os zeros à esquerda. Os arquivos .BLO devem existir no Senior.</p>'+
      '<form class="gbg-nf-search"><label>Portador (4 dígitos)<input data-portador inputmode="numeric" maxlength="4" pattern="[0-9]{4}" required placeholder="0244"></label><label>Carteira (2 dígitos)<input data-carteira inputmode="numeric" maxlength="2" pattern="[0-9]{2}" required placeholder="01"></label><label>Modelo de Bloqueto<input data-modelo maxlength="11" pattern="[A-Za-z]{4}[0-9]{3}\\.[Bb][Ll][Oo]" required placeholder="FRCR023.BLO" style="text-transform:uppercase"></label><button type="submit" data-salvar>Cadastrar modelo</button></form>'+
      '<div class="gbg-nf-options"><button type="button" data-novo>Novo cadastro</button><button type="button" data-recarregar>Recarregar lista</button></div><div data-status role="status" class="gbg-nf-status"></div><div data-lista></div></div>';
    document.body.append(overlay);document.body.style.overflow='hidden';overlay.querySelector('[data-fechar]').onclick=close;
    overlay.querySelector('form').onsubmit=event=>{event.preventDefault();save();};overlay.querySelector('[data-novo]').onclick=()=>edit();overlay.querySelector('[data-recarregar]').onclick=()=>load();
    await load();
  }
  return {open,close};
}
// ── FIM MODELOS DE BLOQUETOS ──
