/* Shared document library. All requests use the authenticated application server. */
(() => {
  const clone = value => JSON.parse(JSON.stringify(value));
  const image = source => new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = source;
  });
  const fields = scope => [...scope.querySelectorAll('input:not([type=file]),select,textarea')]
    .filter(el => !el.closest('#burak-document-bar') && el.id !== 'clientCatalog');
  const api = async (url, options) => {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) { const error = new Error(data.error || 'No se pudo guardar.'); error.status = response.status; throw error; }
    return data;
  };
  const download = (data, name) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  window.BurakDocuments = {
    fields,
    capture: scope => fields(scope).map(el => ({value:el.value, checked:el.checked})),
    restore: (scope, data) => fields(scope).forEach((el, i) => {
      if (data[i]) { el.value = data[i].value; if ('checked' in data[i]) el.checked = data[i].checked; }
    }),
    paint: async (canvas, source) => {
      const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (source && /^data:image\/(png|jpeg);base64,/.test(source)) {
        const img = await image(source);
        ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.drawImage(img,0,0,canvas.width,canvas.height); ctx.restore();
      }
    },
    mount: async adapter => {
      if (document.documentElement.dataset.editableExport || location.protocol === 'file:') return null;
      await window.BurakAdmin.ready;
      const style = document.createElement('style');
      style.textContent = '[hidden]{display:none!important}#burak-document-bar{position:sticky;top:0;z-index:9999;background:#fff;padding:12px;border:1px solid #c9d7e0;color:#142d45;display:flex;gap:8px;flex-wrap:wrap;align-items:center;font:14px Segoe UI,Arial}#burak-document-bar button,#burak-document-bar select{font:inherit;padding:9px;border:1px solid #b9cbd5;border-radius:5px;background:#f0f6f8;color:#142d45;cursor:pointer}#burak-document-bar [data-status]{flex-basis:100%}#burak-document-bar [data-error=true]{color:#b42318;font-weight:bold}@media print{#burak-document-bar{display:none!important}}';
      document.head.append(style);
      const bar = document.createElement('section'); bar.id = 'burak-document-bar';
      bar.innerHTML = '<strong>Documentos guardados</strong><button type="button" data-new>Nuevo</button><button type="button" data-save>Guardar documento</button><select data-list aria-label="Documentos guardados"><option value="">Selecciona un documento</option></select><button type="button" data-open>Abrir</button><button type="button" data-refresh>Actualizar lista</button><button type="button" data-copy>Descargar copia de seguridad</button><button type="button" data-import>Abrir copia de seguridad</button><input data-import-file type="file" accept=".json,application/json" hidden><span data-status role="status" aria-live="polite"></span>';
      if (adapter.kind === 'certificado') {
        bar.classList.add('compact-document-bar');
        bar.innerHTML = '<button type="button" data-new>Nuevo</button><button type="button" data-save>Guardar</button><details data-open-menu><summary>Abrir guardado</summary><div class="document-menu"><select data-list aria-label="Documentos guardados"><option value="">Selecciona un documento</option></select><button type="button" data-open>Abrir</button><button type="button" data-refresh>Actualizar lista</button></div></details><details data-more-menu><summary>Más opciones</summary><div class="document-menu"><button type="button" data-copy>Descargar copia de seguridad</button><button type="button" data-import>Abrir copia de seguridad</button><input data-import-file type="file" accept=".json,application/json" hidden><div data-legacy></div></div></details><span data-status role="status" aria-live="polite"></span>';
        style.textContent += '#burak-document-bar.compact-document-bar{position:relative;z-index:20;max-width:1200px;margin:12px auto;padding:8px 12px;box-sizing:border-box;border-radius:8px;font-size:13px}#burak-document-bar.compact-document-bar button{padding:7px 10px}#burak-document-bar.compact-document-bar [data-status]{font-size:12px;line-height:1.3}#burak-document-bar details{position:relative}#burak-document-bar summary{cursor:pointer;padding:7px 10px;border-radius:5px;border:1px solid #b9cbd5}#burak-document-bar .document-menu{position:absolute;top:100%;left:0;z-index:30;background:white;border:1px solid #b9cbd5;box-shadow:0 6px 18px #142d4522;border-radius:6px;padding:10px;display:flex;flex-wrap:wrap;gap:8px;width:320px;max-width:80vw}#burak-document-bar .document-menu select{width:100%;min-width:0}#burak-document-bar [data-more-menu] .document-menu{left:auto;right:0}#burak-document-bar [data-legacy]:empty{display:none}@media(max-width:500px){#burak-document-bar.compact-document-bar{margin:8px}#burak-document-bar .document-menu{position:static;width:auto;max-width:100%}}';
      }
      document.body.prepend(bar);
      const $ = selector => bar.querySelector(selector);
      const recovery = document.createElement('button');
      recovery.type = 'button'; recovery.hidden = true;
      recovery.textContent = 'Guardar mi captura como copia';
      bar.append(recovery);
      const message = (text, error=false) => { $('[data-status]').textContent=text; $('[data-status]').dataset.error=String(error); };
      const key = window.BurakAdmin.storageKey('document-pending-'+adapter.kind);
      let current = {id:crypto.randomUUID(), revision:0, folio:''}, dirty=false, loading=false, saving=null, timer;
      let baseline=JSON.stringify(adapter.read()), serial=0, identity=adapter.identity?.();
      const pending = () => {
        try { localStorage.setItem(key, JSON.stringify({...current, kind:adapter.kind, payload:adapter.read()})); }
        catch { /* Cloud save still works if browser quota is full. */ }
      };
      const refresh = async () => {
        const result = await api('/api/formats?kind='+encodeURIComponent(adapter.kind));
        $('[data-list]').replaceChildren(new Option('Selecciona un documento', ''));
        result.documents.forEach(d => $('[data-list]').add(new Option(d.folio+' · '+(d.title||'Sin cliente')+' · '+new Date(d.updatedAt).toLocaleString('es-MX'),d.id)));
        $('[data-list]').value=current.id;
      };
      const changed = () => {
        if (loading || JSON.stringify(adapter.read()) === baseline) return;
        if(adapter.identity && adapter.identity()!==identity){current={id:crypto.randomUUID(),revision:0,folio:''};identity=adapter.identity();adapter.folio('');}
        dirty=true; serial++; pending(); clearTimeout(timer);
        message('Cambios sin guardar. Guardando automáticamente…');
        timer=setTimeout(() => save().catch(()=>{}),1800);
      };
      const save = async () => {
        clearTimeout(timer);
        if (saving) { await saving; if (dirty) return save(); return current; }
        if (adapter.ready && !adapter.ready()) {message('Espera a que terminen de cargar las imágenes y pulsa Guardar documento.',true);throw new Error('Las imágenes siguen cargando.');}
        const data=clone(adapter.read()), started=serial, savingId=current.id;
        message('Guardando documento…'); $('[data-save]').disabled=true;
        saving=(async () => {
          try {
            let saved;
            try {
              saved=await api('/api/formats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...current,kind:adapter.kind,title:String(adapter.title?.()||'').slice(0,300),payload:data})});
            } catch (error) {
              if (error.status !== 409) throw error;
              // A mobile connection can lose the response after a successful save.
              // Only accept the remote version when its entire payload is identical.
              const remote = await api('/api/formats?kind='+adapter.kind+'&id='+encodeURIComponent(savingId));
              if (JSON.stringify(remote.payload) !== JSON.stringify(data)) throw error;
              saved = remote;
            }
            if(current.id!==savingId){await refresh().catch(()=>{});message('Documento anterior guardado. La captura actual sigue pendiente.');return current;}
            current={id:saved.id,revision:saved.revision,folio:saved.folio};
            recovery.hidden=true;
            adapter.folio(saved.folio);
            if (serial===started) { dirty=false; baseline=JSON.stringify(adapter.read()); adapter.saved?.(); try{localStorage.removeItem(key);}catch{} }
            else { pending(); dirty=true; }
            message('Guardado · '+saved.folio+'. '+('Disponible en esta administración desde otro equipo.'));
            await refresh().catch(()=>{});
            return current;
          } catch(error) { dirty=true; pending(); recovery.hidden=error.status!==409; message('NO SE GUARDÓ: '+error.message+(error.status===409?' Tu captura sigue aquí. Puedes guardarla como copia con un folio nuevo, sin reemplazar el documento existente.':' Puedes descargar una copia de seguridad.'),true); throw error; }
          finally { saving=null; $('[data-save]').disabled=false; }
        })();
        return saving;
      };
      const open = async identifier => {
        if(saving) await saving;
        if(dirty && !confirm('Hay cambios sin guardar. Descarga una copia si quieres conservarlos. ¿Abrir otro documento?'))return;
        const saved=await api('/api/formats?kind='+adapter.kind+'&id='+encodeURIComponent(identifier));
        loading=true;
        try { await adapter.write(clone(saved.payload)); current={id:saved.id,revision:saved.revision,folio:saved.folio};adapter.folio(saved.folio);identity=adapter.identity?.();baseline=JSON.stringify(adapter.read());dirty=false;serial++;clearTimeout(timer);localStorage.removeItem(key);message('Documento recuperado · '+saved.folio);bar.querySelector('[data-open-menu]')?.removeAttribute('open'); }
        finally{loading=false;}
      };
      const fresh = async () => {
        if(saving)await saving;
        if(dirty&&!confirm('Hay cambios sin guardar. ¿Iniciar un documento nuevo?'))return;
        loading=true;
        try {await adapter.new();current={id:crypto.randomUUID(),revision:0,folio:''};adapter.folio('');identity=adapter.identity?.();dirty=false;serial++;baseline=JSON.stringify(adapter.read());clearTimeout(timer);localStorage.removeItem(key);$('[data-list]').value='';message('Documento nuevo. El folio se asigna al guardar.');}
        finally{loading=false;}
      };
      recovery.onclick=async()=>{
        if (!confirm('Se conservarán tus datos, firmas y fotografías en un documento con folio nuevo. El documento anterior no se modificará. Revisa cuál usar para no registrar el mismo servicio dos veces. ¿Guardar como copia?')) return;
        try {
          if (saving) await saving.catch(()=>{});
          clearTimeout(timer);
          current={id:crypto.randomUUID(),revision:0,folio:''};
          adapter.folio(''); dirty=true; serial++; pending();
          await save();
          message('Copia guardada · '+current.folio+'. Ya puedes pulsar Guardar servicio y generar PDF.');
        } catch(error) { message('No se pudo guardar la copia: '+error.message+'. Tu captura se conserva en esta pantalla.',true); }
      };
      $('[data-save]').onclick=()=>save().catch(()=>{});
      $('[data-new]').onclick=()=>fresh().catch(e=>message(e.message,true));
      $('[data-refresh]').onclick=()=>refresh().catch(e=>message(e.message,true));
      $('[data-open]').onclick=()=>{if($('[data-list]').value)open($('[data-list]').value).catch(e=>message(e.message,true));};
      $('[data-copy]').onclick=async()=>{
        const unsaved={...current,kind:adapter.kind,payload:adapter.read()};
        try {const backup=await api('/api/formats?backup=1');backup.openDocument=unsaved;download(backup,'GS-BURAK-formatos-'+new Date().toISOString().slice(0,10)+'.json');}
        catch {download({applicationId:'gs-burak-formatos-v1',administracion:window.BurakAdmin.stage||'actual',openDocument:unsaved},'GS-BURAK-documento-sin-guardar.json');}
      };
      $('[data-import]').onclick=()=>$('[data-import-file]').click();
      $('[data-import-file]').onchange=async event=>{
        const file=event.target.files[0];if(!file)return;
        try{
          if(file.size>20*1024*1024)throw new Error('La copia supera 20 MB. Conserva el archivo y solicita ayuda para recuperarlo.');
          const raw=JSON.parse(await file.text()), backup=raw.formatDocuments||raw;
          if(backup.applicationId!=='gs-burak-formatos-v1')throw new Error('La copia no pertenece a GS BURAK.');
          if(backup.administracion!==(window.BurakAdmin.stage||'actual'))throw new Error('La copia pertenece a otra administración.');
          if(!confirm('Se añadirán los documentos que falten. Los documentos existentes y sus folios se conservarán. ¿Continuar?'))return;
          if(saving)await saving;
          if(backup.documents){const result=await api('/api/formats/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(backup)});await refresh();message(result.added+' documentos recuperados. Los existentes se conservaron.');}
          if(raw.openDocument?.kind===adapter.kind&&(!dirty||confirm('¿Abrir también la captura incluida en esta copia?'))){
            loading=true;await adapter.write(raw.openDocument.payload);current={id:crypto.randomUUID(),revision:0,folio:''};adapter.folio('');identity=adapter.identity?.();dirty=true;serial++;clearTimeout(timer);pending();message('Captura de la copia recuperada. Pulsa Guardar documento para incorporarla con un nuevo folio.');
          }
        }catch(error){message('No se pudo recuperar la copia: '+error.message,true);}
        finally{loading=false;event.target.value='';}
      };
      // Existing export buttons save first, so their PDF/JSON includes the official folio.
      for(const selector of adapter.exports||[])document.querySelectorAll(selector).forEach(button=>{
        let replay=false;
        button.addEventListener('click',async event=>{
          if(replay)return;
          event.preventDefault();event.stopImmediatePropagation();
          try{await save();replay=true;button.click();}catch{}finally{replay=false;}
        },true);
      });
      for(const selector of adapter.hide||[])document.querySelectorAll(selector).forEach(el=>{el.hidden=true;if(el.id==='saved')el.closest('label')?.setAttribute('hidden','');});
      ['input','change','pointerup','touchend','mouseup'].forEach(type=>document.addEventListener(type,event=>{
        if(!bar.contains(event.target))setTimeout(changed,100);
      }));
      document.addEventListener('click',event=>{if(!bar.contains(event.target))setTimeout(changed,100);});
      document.addEventListener('burak-document-new',()=>{if(loading)return;current={id:crypto.randomUUID(),revision:0,folio:''};identity=adapter.identity?.();adapter.folio('');setTimeout(changed,100);});
      document.addEventListener('burak-form-change',()=>setTimeout(changed,100));
      window.addEventListener('beforeunload',event=>{if(dirty||saving){event.preventDefault();event.returnValue='';}});
      await refresh();
      adapter.folio(''); baseline=JSON.stringify(adapter.read());
      message('Selecciona un documento guardado o empieza uno nuevo. El folio se asigna al guardar.');
      try {
        const raw=localStorage.getItem(key), saved=raw&&JSON.parse(raw);
        if(saved&&saved.kind===adapter.kind&&confirm('Hay una captura pendiente en este equipo. ¿Recuperarla antes de continuar?')){
          loading=true;await adapter.write(saved.payload);current={id:saved.id,revision:saved.revision,folio:saved.folio};adapter.folio(saved.folio);identity=adapter.identity?.();loading=false;dirty=true;serial++;message('Captura pendiente recuperada. Pulsa Guardar documento.');
        }
      }catch(error){loading=false;message('No se pudo recuperar la captura pendiente: '+error.message,true);}
      // Old browser documents are imported explicitly; no silent overwriting of cloud documents.
      const legacy=adapter.legacy?.()||[];
      if(legacy.length){
        const select=document.createElement('select');select.setAttribute('aria-label','Capturas anteriores de este navegador');select.add(new Option('Recuperar captura anterior de este navegador',''));
        legacy.forEach((d,i)=>select.add(new Option(d.title||'Captura anterior '+(i+1),String(i))));
        select.onchange=async()=>{if(select.value==='')return;if(dirty&&!confirm('¿Reemplazar los cambios sin guardar por esta captura anterior?'))return;loading=true;try{await adapter.write(clone(legacy[Number(select.value)].payload));current={id:crypto.randomUUID(),revision:0,folio:''};adapter.folio('');identity=adapter.identity?.();dirty=true;serial++;clearTimeout(timer);pending();message('Captura anterior recuperada. Pulsa Guardar documento para incorporarla.');}catch(e){message(e.message,true);}finally{loading=false;}};
        (bar.querySelector('[data-legacy]') || bar).append(select);
      }
      return {save,open,new:fresh,changed};
    }
  };
})();
