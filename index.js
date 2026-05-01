const SUPABASE_URL = "https://rsqqhbwzzcqwrtjaqtap.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzcXFoYnd6emNxd3J0amFxdGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0ODQ1MzYsImV4cCI6MjA5MzA2MDUzNn0.MyvPCJYbZ3L_K1rwk0QZnsTlxPq_ZBGCMy86C4FG0Bs";

let ag = [];
let usr = {};
let hist = [];
let cnt = 1;
async function loadAgendamentos(){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/agendamentos`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });

  const data = await res.json();
  ag = data;
  renderDash();
  renderFila();
}

loadAgendamentos();
  const pages=['dashboard','novo','fila','historico','usuarios'];
  const labels={dashboard:'Dashboard',novo:'Novo Agendamento',fila:'Fila FIFO',historico:'Histórico',usuarios:'Usuários'};

  function ts(){return new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}
  function today(){return new Date().toLocaleDateString('pt-BR');}
  function log(m){hist.unshift({m,t:ts()});}

  function go(p){
    pages.forEach(id=>{document.getElementById('pg-'+id).style.display='none';});
    document.getElementById('pg-'+p).style.display='';
    document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.p===p));
    document.getElementById('page-label').textContent=labels[p];
    if(p==='dashboard')renderDash();
    if(p==='fila')renderFila();
    if(p==='historico')renderHist();
    if(p==='usuarios')renderUsr();
  }

  document.querySelectorAll('.nav-item').forEach(el=>el.addEventListener('click',()=>go(el.dataset.p)));

  function badg(s){
    const m={Aguardando:'b-wait Aguardando',Em_andamento:'b-prog Em andamento',Concluído:'b-done Concluído',Cancelado:'b-cancel Cancelado'};
    const parts=(m[s]||'b-wait '+s).split(' ');
    return `<span class="badge ${parts[0]}">${parts.slice(1).join(' ')||s}</span>`;
  }
  function prioC(p){return p==='Urgente'?'prio-u':p==='Alta'?'prio-a':'prio-n';}

  function renderDash(){
    document.getElementById('s-total').textContent = ag.filter(x => x.status !== 'Cancelado').length;
    document.getElementById('s-fila').textContent=ag.filter(x=>x.status==='Aguardando').length;
    document.getElementById('s-prog').textContent=ag.filter(x=>x.status==='Em_andamento').length;
    document.getElementById('s-done').textContent=ag.filter(x=>x.status==='Concluído').length;
    const fila=ag.filter(x=>x.status==='Aguardando').slice(0,4);
    document.getElementById('d-fc').textContent=ag.filter(x=>x.status==='Aguardando').length+' na fila';
    const dl=document.getElementById('d-fila');
    dl.innerHTML=fila.length?fila.map((a,i)=>`<div class="ticket"><div style="display:flex;align-items:center"><div class="q-num">${i+1}</div><div><div class="t-name">${a.nome}</div><div class="t-type">${a.tipo}</div></div></div><div class="t-right">${badg(a.status)}<span class="t-time ${prioC(a.prio)}">${a.prio}</span></div></div>`).join(''):'<div class="empty-msg">FILA VAZIA</div>';
    const tm={};ag.forEach(a=>{tm[a.tipo]=(tm[a.tipo]||0)+1;});
    const tot=ag.length||1;
    document.getElementById('d-tipos').innerHTML=Object.entries(tm).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([t,n])=>`<div style="display:flex;align-items:center;gap:8px;font-size:10px"><span style="color:var(--txt2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t}</span><span style="color:var(--cyan);min-width:16px;text-align:right">${n}</span><div class="bar-bg"><div class="bar-fg" style="width:${Math.round(n/tot*100)}%"></div></div></div>`).join('');
  }

  async function submitAg(){
    const nome=document.getElementById('fn').value.trim();
    const setor=document.getElementById('fs').value.trim();
    const tipo=document.getElementById('ft').value;
    const desc=document.getElementById('fd').value.trim();
    const prio=document.getElementById('fp').value;
    const data=document.getElementById('fdata').value;

    if(!nome||!setor||!tipo){
      showAlert('Preencha os campos obrigatórios.',false);
      return;
    }

    const novo = {
      nome,
      setor,
      tipo,
      desc,
      prio,
      data: data || today(),
      status: 'Aguardando',
      hora: ts()
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/agendamentos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify(novo)
    });

    if(res.ok){
      showAlert("Agendamento salvo!", true);
      log(`Novo chamado — ${nome} / ${tipo}`);
      loadAgendamentos();
      clearF();
    } else {
      showAlert("Erro ao salvar", false);
    }
  }

  function showAlert(msg,ok){
    const el=document.getElementById('n-alert');
    el.style.color=ok?'var(--green)':'#f44336';
    el.style.borderColor=ok?'rgba(0,230,118,.25)':'rgba(244,67,54,.25)';
    el.style.background=ok?'rgba(0,230,118,.08)':'rgba(244,67,54,.08)';
    el.style.border='1px solid';
    el.textContent=msg;el.style.display='block';
    setTimeout(()=>{el.style.display='none';},4000);
  }

  function clearF(){
    ['fn','fs','fd','fdata'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('ft').value='';
    document.getElementById('fp').value='Normal';
  }

  async function avancar(id){
    const a = ag.find(x=>x.id===id);
    if(!a) return;

    let novoStatus = a.status === 'Aguardando'
      ? 'Em_andamento'
      : 'Concluído';
    log(`#${id} → ${novoStatus}`);
    await fetch(`${SUPABASE_URL}/rest/v1/agendamentos?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ status: novoStatus })
    });

    loadAgendamentos();
  }
  async function cancelar(id){
    await fetch(`${SUPABASE_URL}/rest/v1/agendamentos?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ status: 'Cancelado' })
    });
    log(`#${id} cancelado`);

    await loadAgendamentos();
  }

  function renderFila(){
    const lista=ag.filter(x=>x.status!=='Concluído'&&x.status!=='Cancelado');
    const el=document.getElementById('fila-tbl');
    if(!lista.length){el.innerHTML='<div class="empty-msg">FILA VAZIA — SISTEMA OCIOSO</div>';return;}
    el.innerHTML='<table class="data-table"><thead><tr><th>#</th><th>Solicitante</th><th>Setor</th><th>Tipo</th><th>Prio</th><th>Status</th><th>Hora</th><th>Ações</th></tr></thead><tbody>'+lista.map(a=>'<tr><td style="color:var(--cyan);font-weight:700">#'+a.id+'</td><td style="font-weight:600">'+a.nome+'</td><td style="color:var(--txt3)">'+a.setor+'</td><td>'+a.tipo+'</td><td class="'+prioC(a.prio)+'" style="font-size:10px;font-weight:700">'+a.prio+'</td><td>'+badg(a.status)+'</td><td style="color:var(--txt3)">'+a.hora+'</td><td style="display:flex;gap:5px;flex-wrap:wrap">'+(a.status!=='Concluído'?'<button class="btn-sm btn-go" onclick="avancar('+a.id+')">'+(a.status==='Aguardando'?'Iniciar':'Concluir')+'</button>':'')+(a.status!=='Cancelado'&&a.status!=='Concluído'?'<button class="btn-sm btn-kill" onclick="cancelar('+a.id+')">Cancelar</button>':'')+'</td></tr>').join('')+'</tbody></table>';
  }

  function renderHist(){
    const el = document.getElementById('hist-list');

    const lista = ag
      .filter(x => x.status === 'Concluído' || x.status === 'Cancelado')
      .sort((a,b) => b.id - a.id);

    if(!lista.length){
      el.innerHTML = '<div class="empty-msg">NENHUMA AÇÃO REGISTRADA</div>';
      return;
    }

    el.innerHTML = lista.map(a => `
      <div class="hist-item">
        <span class="hist-msg">
          ↳ #${a.id} — ${a.nome} (${a.tipo}) → ${a.status}
        </span>
        <span class="hist-time">${a.hora || ''}</span>
      </div>
    `).join('');
  }

  function renderUsr(){
    const el=document.getElementById('usr-tbl');
    const list=Object.values(usr);
    if(!list.length){el.innerHTML='<div class="empty-msg">NENHUM USUÁRIO CADASTRADO</div>';return;}
    el.innerHTML='<table class="data-table"><thead><tr><th></th><th>Nome</th><th>Setor</th><th>Chamados</th><th>Último acesso</th></tr></thead><tbody>'+list.map(u=>'<tr><td><div class="avatar">'+u.nome.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()+'</div></td><td style="font-weight:600">'+u.nome+'</td><td style="color:var(--txt3)">'+u.setor+'</td><td style="color:var(--cyan);font-weight:700">'+u.count+'</td><td style="color:var(--txt3);font-size:10px">'+u.ul+'</td></tr>').join('')+'</tbody></table>';
  }

  function initClock(){
    const el=document.getElementById('clock');
    function tick(){el.textContent=new Date().toLocaleString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).toUpperCase();}
    tick();setInterval(tick,30000);
  }

  initClock();
  renderDash();
  document.getElementById('fdata').min=new Date().toISOString().split('T')[0];

  