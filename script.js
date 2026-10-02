const KEY="norna_v6_data", THEME="norna_v6_theme";
const IS_NATIVE_APP=/NORNA-Android/i.test(navigator.userAgent);
const emptyData=()=>({
  profile:{photo:"",name:"",age:"",area:"",role:"",level:"",mode:"",location:"",study:"",opportunity:"",about:""},
  education:[],experience:[],journey:[],courses:[],skills:[],savedJobs:[],savedLearning:[],
  resumeText:"",resumeFileName:""
});
let data=load(), currentCourseFilter="Todos", currentJobTab="recommended", currentLearningTab="recommended", recommendedJobs=[], recommendedLearning=[], modalHandler=null, currentUser=null, syncTimer=null;
document.body.classList.toggle("native-app",IS_NATIVE_APP);

function load(){try{const r=localStorage.getItem(KEY);return r?JSON.parse(r):emptyData()}catch{return emptyData()}}
function normalizeData(source){const base=emptyData();source=source||{};return {...base,...source,profile:{...base.profile,...(source.profile||{})},education:Array.isArray(source.education)?source.education:[],experience:Array.isArray(source.experience)?source.experience:[],journey:Array.isArray(source.journey)?source.journey:[],courses:Array.isArray(source.courses)?source.courses:[],skills:Array.isArray(source.skills)?source.skills:[],savedJobs:Array.isArray(source.savedJobs)?source.savedJobs:[],savedLearning:Array.isArray(source.savedLearning)?source.savedLearning:[],resumeText:String(source.resumeText||""),resumeFileName:String(source.resumeFileName||"")}}
function save(){localStorage.setItem(KEY,JSON.stringify(data));clearTimeout(syncTimer);syncTimer=setTimeout(syncData,220)}
async function syncData(){
  try{
    const r=await fetch("/api/data",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
    if(r.status===401){location.replace(IS_NATIVE_APP?"/mobile.html?mode=login":"/acesso.html?mode=login");return}
    if(!r.ok)console.error("Falha ao salvar dados NORNA:",r.status);
  }catch(err){console.error("Falha de rede ao salvar dados NORNA:",err)}
}
async function bootstrap(){
  try{
    const me=await fetch("/api/me");
    if(me.status===401){location.replace(IS_NATIVE_APP?"/mobile.html?mode=login":"/acesso.html?mode=login");return}
    if(!me.ok)throw new Error("Falha ao validar a sessão: "+me.status);
    currentUser=await me.json();

    const r=await fetch("/api/data");
    if(r.status===401){location.replace(IS_NATIVE_APP?"/mobile.html?mode=login":"/acesso.html?mode=login");return}
    if(!r.ok)throw new Error("Falha ao carregar os dados: "+r.status);

    const payload=await r.json();
    data=normalizeData(payload.data);

    // Atualiza uma única vez currículos importados antes da sincronização
    // de competências fortes e cursos automáticos.
    if(data.resumeText&&Number(data.resumeSyncVersion||0)<2){
      try{
        await analyzeResumeText(data.resumeText,null);
        data.resumeSyncVersion=2;
        await syncData();
      }catch(err){
        console.warn("Não foi possível atualizar automaticamente o currículo antigo.",err);
      }
    }

    localStorage.setItem(KEY,JSON.stringify(data));
    renderAll();
  }catch(err){
    console.error("Erro ao iniciar a NORNA:",err);
    const t=document.getElementById("toast");
    if(t){t.textContent="Sua sessão continua ativa, mas houve um erro ao carregar a interface. Atualize a página.";t.classList.add("show")}
  }
}
function esc(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function val(id){return document.getElementById(id).value.trim()}
function clamp(v){return Math.min(100,Math.max(0,Number(v)||0))}
function toast(m){const t=document.getElementById("toast");t.textContent=m;t.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),1800)}
function normalUrl(u=""){if(!u)return"";return /^https?:\/\//i.test(u)?u:"https://"+u}
function tokens(t=""){return [...new Set(String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9+#.\s-]/g," ").split(/\s+/).filter(x=>x.length>2))]}
function profileTokens(){return tokens([data.profile.area,data.profile.role,data.profile.about,...data.skills.filter(s=>s.level>0).map(s=>s.name),...data.courses.map(c=>`${c.name} ${c.skill||""}`),...data.education.map(e=>`${e.course} ${e.institution}`),...data.experience.map(e=>`${e.role} ${e.description}`)].join(" "))}
function matchInfo(text=""){
  const mine=profileTokens(),target=tokens(text);
  if(!mine.length||!target.length)return{score:0,matches:[],gaps:target.slice(0,6)};
  const aliases={python:["python"],sql:["sql","mysql","postgresql"],"power bi":["power","bi"],dados:["data","dados","analytics"],"machine learning":["machine","learning","ml"],estatistica:["statistics","statistical","estatistica"],excel:["excel"],pandas:["pandas"],git:["git","github"]};
  const mineSet=new Set(mine), targetSet=new Set(target), matches=[];
  mine.forEach(t=>{if(targetSet.has(t))matches.push(t)});
  Object.entries(aliases).forEach(([label,words])=>{
    const mineHas=mineSet.has(label)||words.some(w=>mineSet.has(w));
    const targetHas=words.some(w=>targetSet.has(w));
    if(mineHas&&targetHas&&!matches.includes(label))matches.push(label);
  });
  const roleTerms=tokens([data.profile.role,data.profile.area].filter(Boolean).join(" "));
  let roleBonus=0; roleTerms.forEach(t=>{if(targetSet.has(t))roleBonus+=8});
  const denom=Math.max(3,Math.min(8,mine.length));
  const score=Math.min(100,Math.round(matches.length/denom*100)+Math.min(24,roleBonus));
  const gaps=target.filter(t=>!mineSet.has(t)).slice(0,6);
  return{score,matches:matches.slice(0,6),gaps};
}
function google(q){window.open("https://www.google.com/search?q="+encodeURIComponent(q),"_blank","noopener,noreferrer")}

// NAV
function pageLabel(page){
  const desktop=document.querySelector(`.nav-btn[data-page="${page}"]`);
  return desktop?.textContent?.trim()||"NORNA";
}

function go(page){
  const target=document.getElementById("page-"+page);
  if(!target)return;

  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  document.querySelectorAll(".native-nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.mobilePage===page));
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  target.classList.add("active");

  const title=document.getElementById("pageTitle");
  if(title)title.textContent=pageLabel(page);

  closeNativeMore();
  renderAll();
  window.scrollTo({top:0,behavior:"smooth"});
}

document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>go(b.dataset.page));
document.querySelectorAll(".go-page").forEach(b=>b.onclick=()=>go(b.dataset.go));
document.querySelectorAll("[data-mobile-page]").forEach(b=>b.onclick=()=>go(b.dataset.mobilePage));

const nativeMoreSheet=document.getElementById("nativeMoreSheet");
function openNativeMore(){
  if(!nativeMoreSheet)return;
  nativeMoreSheet.classList.add("open");
  nativeMoreSheet.setAttribute("aria-hidden","false");
}
function closeNativeMore(){
  if(!nativeMoreSheet)return;
  nativeMoreSheet.classList.remove("open");
  nativeMoreSheet.setAttribute("aria-hidden","true");
}
const nativeMoreButton=document.getElementById("nativeMoreButton");
if(nativeMoreButton)nativeMoreButton.onclick=openNativeMore;
document.querySelectorAll("[data-close-native-more]").forEach(b=>b.onclick=closeNativeMore);

// VISUAL / RESET
document.body.classList.remove("light","dark");
localStorage.removeItem(THEME);
document.getElementById("resetAll").onclick=()=>{if(confirm("Apagar todos os dados da NORNA neste navegador?")){data=emptyData();recommendedJobs=[];save();renderAll();toast("Dados zerados.")}};
document.getElementById("logoutButton").onclick=async()=>{try{await fetch("/api/logout",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"})}catch{}localStorage.removeItem(KEY);location.href=IS_NATIVE_APP?"/mobile.html?mode=login":"/"};

// MODAL
const modal=document.getElementById("modal");
function openModal(title,body,handler){document.getElementById("modalTitle").textContent=title;document.getElementById("modalBody").innerHTML=body;modalHandler=handler;modal.classList.add("open")}
function closeModal(){modal.classList.remove("open");modalHandler=null}
document.getElementById("modalClose").onclick=closeModal;
document.getElementById("modalCancel").onclick=closeModal;
document.getElementById("modalSave").onclick=()=>modalHandler&&modalHandler();
modal.onclick=e=>{if(e.target===modal)closeModal()};

// PERFIL
const pf={name:"profileName",age:"profileAge",area:"profileArea",role:"profileRole",level:"profileLevel",mode:"profileMode",location:"profileLocation",study:"profileStudy",opportunity:"profileOpportunity",about:"profileAbout"};
document.getElementById("saveProfile").onclick=()=>{Object.entries(pf).forEach(([k,id])=>data.profile[k]=val(id));save();renderAll();toast("Perfil salvo.")};
let profileAutosaveTimer=null;

function profileHeadline(){
  const p=data.profile;
  if(p.role)return p.role;
  return [p.area,p.level].filter(Boolean).join(" ")||"Perfil profissional";
}

function updateProfileHeader(){
  const p=data.profile;
  document.getElementById("topName").textContent=p.name||"Seu perfil";
  const age=document.getElementById("topAge");
  if(age)age.textContent=p.age?`${p.age} anos`:"";
  const meta=document.getElementById("topProfileMeta");
  if(meta)meta.textContent=profileHeadline();

  const hello=document.getElementById("dashHello");
  const greetingText=document.getElementById("dashGreetingText");
  if(hello&&greetingText){
    const greetings=[
      ["Olá de novo.","Como vai seu dia? Vamos continuar de onde você parou?"],
      ["Vamos continuar?","Um passo de cada vez também constrói uma trajetória."],
      ["Que bom ter você por aqui.","Vamos olhar seus próximos passos na NORNA?"],
      ["Mais um dia, mais um passo.","Veja o que já avançou e escolha o próximo movimento."],
      ["Seu caminho continua.","Hoje pode ser um bom dia para organizar o próximo passo."]
    ];
    const now=new Date();
    const index=(now.getFullYear()*372+(now.getMonth()+1)*31+now.getDate())%greetings.length;
    hello.textContent=greetings[index][0];
    greetingText.textContent=greetings[index][1];
  }
}

Object.entries(pf).forEach(([k,id])=>{
  const el=document.getElementById(id);
  if(!el)return;

  const update=()=>{
    // Mantém exatamente o que a pessoa está digitando.
    // Não redesenha o formulário a cada tecla, então espaços não somem.
    data.profile[k]=el.value;
    localStorage.setItem(KEY,JSON.stringify(data));
    updateProfileHeader();

    clearTimeout(profileAutosaveTimer);
    profileAutosaveTimer=setTimeout(()=>syncData(),700);
  };

  el.addEventListener(el.tagName==="SELECT"?"change":"input",update);
});
document.getElementById("profilePhoto").onchange=e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>1500000)return alert("Escolha uma imagem de até 1,5 MB.");const r=new FileReader();r.onload=()=>{data.profile.photo=r.result;save();renderAll();toast("Foto adicionada.")};r.readAsDataURL(f)};
document.getElementById("removePhoto").onclick=()=>{data.profile.photo="";save();renderAll()};
function placeholder(){return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" rx="34" fill="#c6b8af"/><circle cx="80" cy="61" r="28" fill="#9d6b66"/><path d="M35 143c4-31 22-46 45-46s41 15 45 46" fill="#9d6b66"/></svg>`)}
function renderProfile(){
  Object.entries(pf).forEach(([k,id])=>{
    const el=document.getElementById(id);
    if(el)el.value=data.profile[k]||"";
  });
  const p=data.profile.photo||placeholder();
  const profileAvatar=document.getElementById("profileAvatar");
  const topAvatar=document.getElementById("topAvatar");
  if(profileAvatar)profileAvatar.src=p;
  if(topAvatar)topAvatar.src=p;
  updateProfileHeader();
}
const topProfileChip=document.getElementById("topProfileChip");
if(topProfileChip)topProfileChip.onclick=()=>go("perfil");

// JORNADA
document.getElementById("addJourney").onclick=()=>journeyModal();
function journeyModal(i=null,preset=null){const x=preset||(i===null?{}:data.journey[i]);openModal(i===null?"Adicionar etapa":"Editar etapa",`<div class="field"><label>Etapa</label><input id="mTitle" value="${esc(x.title||"")}"></div><div class="field"><label>Descrição</label><textarea id="mDescription">${esc(x.description||"")}</textarea></div><div class="field"><label>Status</label><select id="mStatus"><option>Não iniciado</option><option>Em andamento</option><option>Concluído</option></select></div>`,()=>{const o={title:val("mTitle"),description:val("mDescription"),status:document.getElementById("mStatus").value};if(!o.title)return alert("Informe a etapa.");if(i===null)data.journey.push(o);else data.journey[i]=o;save();closeModal();renderAll();toast("Etapa salva.")});if(x.status)document.getElementById("mStatus").value=x.status}
function renderJourney(){const box=document.getElementById("journeyList");box.innerHTML="";data.journey.forEach((x,i)=>{const el=document.createElement("div");el.className="stack-item";el.innerHTML=`<h4>${i+1}. ${esc(x.title)}</h4><p>${esc(x.description||"")}</p><p>${esc(x.status)}</p><div class="item-actions"><button data-jedit="${i}">Editar</button><button class="danger" data-jdel="${i}">Excluir</button></div>`;box.appendChild(el)});document.getElementById("journeyEmpty").classList.toggle("hidden",data.journey.length>0)}
document.getElementById("journeyList").onclick=e=>{const a=e.target.closest("[data-jedit]"),d=e.target.closest("[data-jdel]");if(a)journeyModal(+a.dataset.jedit);if(d&&confirm("Excluir esta etapa?")){data.journey.splice(+d.dataset.jdel,1);save();renderAll()}};

// COMPETÊNCIAS
document.getElementById("addSkill").onclick=()=>skillModal();
function skillModal(i=null){const x=i===null?{}:data.skills[i];openModal(i===null?"Adicionar competência":"Editar competência",`<div class="field"><label>Competência</label><input id="mSkill" value="${esc(x.name||"")}"></div><div class="field"><label>Nível de domínio (0 a 100)</label><input id="mLevel" type="number" min="0" max="100" value="${x.level??0}"></div>`,()=>{const o={name:val("mSkill"),level:clamp(val("mLevel"))};if(!o.name)return alert("Informe a competência.");if(i===null)data.skills.push(o);else data.skills[i]=o;save();closeModal();renderAll();toast("Competência salva.")})}
function renderSkills(){
  const gs={strong:[],developing:[],next:[]};
  data.skills.forEach((x,i)=>gs[x.level>=70?"strong":x.level>0?"developing":"next"].push({...x,i}));

  [["strong","strongSkills","strongEmpty"],["developing","developingSkills","developingEmpty"],["next","nextSkills","nextEmpty"]].forEach(([g,l,e])=>{
    const box=document.getElementById(l);
    box.innerHTML="";

    gs[g].forEach(x=>{
      const el=document.createElement("div");
      el.className="skill-item skill-compact";
      el.innerHTML=`
        <div class="skill-top">
          <strong>${esc(x.name)}</strong>
          <span>${x.level}%</span>
        </div>
        ${x.source==="resume"?'<small class="skill-source">do currículo</small>':""}
        <div class="track"><div class="fill" style="width:${x.level}%"></div></div>
        <div class="item-actions">
          <button data-sedit="${x.i}">Editar</button>
          <button class="danger" data-sdel="${x.i}">Excluir</button>
        </div>`;
      box.appendChild(el);
    });

    document.getElementById(e).classList.toggle("hidden",gs[g].length>0);
  });
}
document.getElementById("page-competencias").onclick=e=>{const a=e.target.closest("[data-sedit]"),d=e.target.closest("[data-sdel]");if(a)skillModal(+a.dataset.sedit);if(d&&confirm("Excluir esta competência?")){data.skills.splice(+d.dataset.sdel,1);save();renderAll()}};

// CURSOS
document.getElementById("addCourse").onclick=()=>courseModal();
function skillOptions(selected=""){return `<option value="">Sem competência relacionada</option>`+data.skills.map(s=>`<option ${s.name===selected?"selected":""}>${esc(s.name)}</option>`).join("")}
function courseModal(i=null){const x=i===null?{}:data.courses[i];openModal(i===null?"Adicionar curso":"Editar curso",`<div class="field"><label>Nome do curso</label><input id="mName" value="${esc(x.name||"")}"></div><div class="field"><label>Plataforma / instituição</label><input id="mPlatform" value="${esc(x.platform||"")}"></div><div class="field"><label>Link</label><input id="mLink" value="${esc(x.link||"")}"></div><div class="field"><label>Status</label><select id="mStatus"><option>Quero fazer</option><option>Em andamento</option><option>Concluído</option><option>Pausado</option></select></div><div class="field"><label>Competência relacionada</label><select id="mSkill">${skillOptions(x.skill||"")}</select></div><div class="field"><label>Progresso (%)</label><input id="mProgress" type="number" min="0" max="100" value="${x.progress??0}"></div>`,()=>{const o={name:val("mName"),platform:val("mPlatform"),link:val("mLink"),status:document.getElementById("mStatus").value,skill:document.getElementById("mSkill").value,progress:clamp(val("mProgress"))};if(!o.name)return alert("Informe o curso.");if(o.status==="Concluído")o.progress=100;if(o.status==="Quero fazer")o.progress=0;if(i===null)data.courses.push(o);else data.courses[i]=o;save();closeModal();renderAll();toast("Curso salvo.")});if(x.status)document.getElementById("mStatus").value=x.status}
function renderCourses(){const arr=data.courses.map((x,i)=>({...x,i})).filter(x=>currentCourseFilter==="Todos"||x.status===currentCourseFilter),box=document.getElementById("courseList");box.innerHTML="";arr.forEach(x=>{const el=document.createElement("article");el.className="course-card";el.innerHTML=`<h3>${esc(x.name)}</h3><p>${esc(x.platform||"Plataforma não informada")}</p><p>${esc(x.status)}</p>${x.skill?`<p>Competência: ${esc(x.skill)}</p>`:""}${["Em andamento","Concluído"].includes(x.status)?`<div class="progress"><span>${x.progress}% concluído</span><div class="track"><div class="fill" style="width:${x.progress}%"></div></div></div>`:""}<div class="course-actions"><button class="open-btn" data-copen="${x.i}">Abrir</button><button class="edit-btn" data-cedit="${x.i}">Editar</button><button class="delete-btn" data-cdel="${x.i}">Excluir</button></div>`;box.appendChild(el)});document.getElementById("courseEmpty").classList.toggle("hidden",arr.length>0);box.classList.toggle("hidden",arr.length===0)}
document.querySelectorAll(".course-filter").forEach(b=>b.onclick=()=>{document.querySelectorAll(".course-filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentCourseFilter=b.dataset.filter;renderCourses()});
document.getElementById("courseList").onclick=e=>{const o=e.target.closest("[data-copen]"),a=e.target.closest("[data-cedit]"),d=e.target.closest("[data-cdel]");if(o){const x=data.courses[+o.dataset.copen];if(!x.link)return alert("Este curso não possui link.");window.open(normalUrl(x.link),"_blank","noopener,noreferrer")}if(a)courseModal(+a.dataset.cedit);if(d&&confirm("Excluir este curso?")){data.courses.splice(+d.dataset.cdel,1);save();renderAll()}};

// CURRÍCULO
function dedupeBy(items,keyFn){
  const seen=new Set();
  return (items||[]).filter(item=>{
    const key=String(keyFn(item)||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
    if(!key||seen.has(key))return false;
    seen.add(key);
    return true;
  });
}

function replaceResumeAnalysis(x){
  if(!x)return;
  const p=x.profile||{};

  // O currículo completa o perfil sem sobrescrever escolhas já feitas pela pessoa.
  ["name","about","area","role"].forEach(k=>{if(p[k]&&!data.profile[k])data.profile[k]=p[k]});

  data.education=dedupeBy(x.education||[],item=>`${item.course||""}|${item.institution||""}`);
  data.experience=dedupeBy(x.experience||[],item=>`${item.role||""}|${item.company||""}|${item.period||""}`);

  // Tudo que a NORNA identifica como competência no currículo é tratado como forte.
  const resumeSkills=(x.skills||[])
    .filter(item=>item?.name)
    .map(item=>({name:item.name,level:85,source:"resume"}));
  const manualSkills=(data.skills||[]).filter(item=>item?.source!=="resume");
  data.skills=dedupeBy([...resumeSkills,...manualSkills],item=>item.name);

  // Cursos/certificações do currículo entram automaticamente em Meus Cursos.
  const resumeCourses=(x.courses||[])
    .filter(item=>item?.name)
    .map(item=>({
      name:item.name,
      platform:item.platform||"",
      link:item.link||"",
      status:"Concluído",
      skill:item.skill||"",
      progress:100,
      source:"resume"
    }));
  const manualCourses=(data.courses||[]).filter(item=>item?.source!=="resume");
  data.courses=dedupeBy([...manualCourses,...resumeCourses],item=>`${item.name||""}|${item.platform||""}`);
}

function structuredResumeText(){
  const p=data.profile;
  const lines=[];
  if(p.name)lines.push(p.name);
  const headline=[profileHeadline(),p.location].filter(Boolean).join(" • ");
  if(headline)lines.push(headline);
  if(p.about)lines.push("", "RESUMO PROFISSIONAL", p.about);

  if(data.education.length){
    lines.push("", "FORMAÇÃO");
    data.education.forEach(x=>lines.push([x.course,x.institution,x.period].filter(Boolean).join(" — ")));
  }
  if(data.experience.length){
    lines.push("", "EXPERIÊNCIA");
    data.experience.forEach(x=>{
      lines.push([x.role,x.company,x.period].filter(Boolean).join(" — "));
      if(x.description)lines.push(x.description);
    });
  }
  if(data.skills.length){
    lines.push("", "COMPETÊNCIAS", data.skills.map(x=>x.name).filter(Boolean).join(", "));
  }
  return lines.join("\n").trim();
}

function renderResume(){
  const preview=document.getElementById("resumePreview");
  const fileName=document.getElementById("resumeFileName");
  const editButton=document.getElementById("editResume");
  if(!preview)return;

  const text=(data.resumeText||structuredResumeText()).trim();
  if(fileName)fileName.textContent=data.resumeFileName||"Nenhum currículo enviado.";
  if(editButton)editButton.disabled=!text;

  if(!text){
    preview.innerHTML='<div class="resume-empty"><span>▤</span><h3>Seu currículo aparecerá aqui</h3><p>Envie um arquivo para a NORNA ler e organizar.</p></div>';
    return;
  }

  preview.innerHTML=`<pre class="resume-text-preview">${esc(text)}</pre>`;
}

async function analyzeResumeText(text,status){
  const r=await fetch("/api/resume/analyze",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({text})
  });
  const j=await r.json();
  if(!r.ok)throw new Error(j.error||"Não foi possível analisar o currículo.");
  replaceResumeAnalysis(j.extracted);
  data.resumeSyncVersion=2;
  if(status)status.textContent=`Currículo lido: ${(j.extracted?.education||[]).length} formação(ões), ${(j.extracted?.experience||[]).length} experiência(s) e ${(j.extracted?.skills||[]).length} competência(s) identificadas.`;
  return j;
}

async function extractResumeTextFromFile(file){
  const name=(file.name||"").toLowerCase();
  if(name.endsWith(".txt")||name.endsWith(".md"))return await file.text();

  if(name.endsWith(".pdf")){
    if(!window.pdfjsLib)throw new Error("O leitor de PDF ainda não carregou. Atualize a página e tente novamente.");
    pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const buf=await file.arrayBuffer();
    const pdf=await pdfjsLib.getDocument({data:buf}).promise;
    const pages=[];

    for(let i=1;i<=pdf.numPages;i++){
      const page=await pdf.getPage(i);
      const content=await page.getTextContent();
      let lastY=null,line=[],lines=[];

      for(const item of content.items){
        const y=item.transform?.[5]??0;
        if(lastY!==null&&Math.abs(y-lastY)>3){
          if(line.length)lines.push(line.join(" "));
          line=[];
        }
        if(item.str?.trim())line.push(item.str.trim());
        lastY=y;
      }
      if(line.length)lines.push(line.join(" "));
      pages.push(lines.join("\n"));
    }
    return pages.join("\n\n");
  }

  if(name.endsWith(".docx")){
    if(!window.mammoth)throw new Error("O leitor de Word ainda não carregou. Atualize a página e tente novamente.");
    const buf=await file.arrayBuffer();
    const result=await mammoth.extractRawText({arrayBuffer:buf});
    return result.value||"";
  }

  throw new Error("Formato não suportado. Use PDF, DOCX, TXT ou MD.");
}

const resumeFile=document.getElementById("resumeFile");
if(resumeFile)resumeFile.onchange=async e=>{
  const file=e.target.files?.[0];
  if(!file)return;
  const status=document.getElementById("resumeImportStatus");
  status.textContent="Lendo e organizando o currículo...";

  try{
    const text=await extractResumeTextFromFile(file);
    if(text.trim().length<20)throw new Error("Não consegui extrair texto suficiente desse arquivo.");

    data.resumeText=text.trim();
    data.resumeFileName=file.name;
    await analyzeResumeText(data.resumeText,status);
    save();
    renderAll();
    toast("Currículo atualizado.");
  }catch(err){
    status.textContent=err.message||"Não foi possível analisar o arquivo.";
  }
};

const editResume=document.getElementById("editResume");
if(editResume)editResume.onclick=()=>{
  const current=(data.resumeText||structuredResumeText()).trim();
  if(!current)return;

  openModal(
    "Editar currículo",
    `<div class="field"><label>Conteúdo do currículo</label><textarea id="resumeEditorText" class="resume-editor-text">${esc(current)}</textarea></div><p class="muted">Ao salvar, a NORNA lê o texto novamente e atualiza formação, experiência e competências detectadas.</p>`,
    async()=>{
      const text=document.getElementById("resumeEditorText").value.trim();
      if(text.length<20)return alert("O currículo ficou curto demais.");
      const btn=document.getElementById("modalSave");
      btn.disabled=true;
      try{
        data.resumeText=text;
        await analyzeResumeText(text,null);
        save();
        closeModal();
        renderAll();
        toast("Currículo editado.");
      }catch(err){
        alert(err.message||"Não foi possível salvar o currículo.");
      }finally{
        btn.disabled=false;
      }
    }
  );
};

// VAGAS AO VIVO + COMPATIBILIDADE
document.getElementById("findJobs").onclick=async()=>{
  if(!data.profile.area&&!data.profile.role&&!data.skills.length&&!val("jobKeyword"))return alert("Preencha seu objetivo profissional, competências ou uma palavra-chave.");
  const mode=val("jobMode")||data.profile.mode,days=val("jobRecency"),keyword=val("jobKeyword"),min=+val("jobMinMatch");
  const query=[data.profile.role,data.profile.area,keyword].filter(Boolean).join(" ");
  const note=document.getElementById("jobSearchNote");note.textContent="Buscando vagas nas fontes conectadas...";
  try{
    const params=new URLSearchParams({query,keyword,role:data.profile.role||"",area:data.profile.area||"",location:data.profile.location||"",mode:mode||"",days:days||"7"});
    const r=await fetch("/api/jobs?"+params.toString()),j=await r.json();
    if(!r.ok)throw new Error(j.error||"A busca não respondeu.");
    recommendedJobs=(j.jobs||[]).map(x=>({...x,...matchInfo(`${x.title} ${x.description||""} ${x.category||""}`)}));
    recommendedJobs=recommendedJobs.filter(x=>x.score>=min).sort((a,b)=>b.score-a.score);
    note.textContent=`${j.note||""} ${recommendedJobs.length} passou(aram) pelo filtro de compatibilidade mínima.`;
    currentJobTab="recommended";setJobTab();renderJobs();
  }catch(err){recommendedJobs=[];renderJobs();note.textContent="Não foi possível consultar as fontes agora: "+(err.message||"erro temporário")}}
;
function renderJobCard(x,index,saved=false){return `<article class="opp-card"><div><h3>${esc(x.title)}${x.company?" — "+esc(x.company):""}</h3><p>${esc([x.location,x.category,x.publication_date].filter(Boolean).join(" • "))}</p><div class="tags">${(x.matches||[]).map(t=>`<span class="tag">✓ ${esc(t)}</span>`).join("")}${(x.gaps||[]).slice(0,4).map(t=>`<span class="tag gap">revisar: ${esc(t)}</span>`).join("")}</div><div class="opp-actions"><button data-job-open="${saved?"s":"r"}-${index}">Abrir vaga</button>${saved?`<button data-job-del="${index}" class="danger">Excluir</button>`:`<button data-job-save="${index}">Salvar</button>`}</div><p>Fonte: ${esc(x.source||"web")}</p></div><div class="score"><div class="score-circle">${x.score||0}%</div><p>compatibilidade</p></div></article>`}
function renderJobs(){document.getElementById("recommendedJobs").innerHTML=recommendedJobs.map((x,i)=>renderJobCard(x,i,false)).join("");const saved=data.savedJobs.map(x=>({...x,...matchInfo(`${x.title} ${x.description||""}`)}));document.getElementById("savedJobs").innerHTML=saved.map((x,i)=>renderJobCard(x,i,true)).join("");const visible=currentJobTab==="recommended"?recommendedJobs:saved;document.getElementById("jobEmpty").classList.toggle("hidden",visible.length>0)}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{currentJobTab=b.dataset.jobTab;setJobTab();renderJobs()});
function setJobTab(){document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.jobTab===currentJobTab));document.getElementById("recommendedJobs").classList.toggle("hidden",currentJobTab!=="recommended");document.getElementById("savedJobs").classList.toggle("hidden",currentJobTab!=="saved")}
document.getElementById("page-vagas").onclick=e=>{const s=e.target.closest("[data-job-save]"),d=e.target.closest("[data-job-del]"),o=e.target.closest("[data-job-open]");if(s){data.savedJobs.push(recommendedJobs[+s.dataset.jobSave]);save();renderAll();toast("Vaga salva.")}if(d&&confirm("Excluir vaga salva?")){data.savedJobs.splice(+d.dataset.jobDel,1);save();renderAll()}if(o){const [type,i]=o.dataset.jobOpen.split("-"),x=type==="s"?data.savedJobs[+i]:recommendedJobs[+i];if(x.url)window.open(x.url,"_blank","noopener,noreferrer")}};

// FORMAÇÕES / CURSOS RECOMENDADOS
document.getElementById("addLearning").onclick=()=>learningModal();
function learningModal(i=null){const x=i===null?{}:data.savedLearning[i];openModal(i===null?"Salvar formação":"Editar formação",`<div class="field"><label>Instituição / plataforma</label><input id="mInstitution" value="${esc(x.institution||"")}"></div><div class="field"><label>Curso / programa</label><input id="mProgram" value="${esc(x.program||"")}"></div><div class="field"><label>Tipo</label><input id="mType" value="${esc(x.type||"")}"></div><div class="field"><label>Modalidade</label><input id="mMode" value="${esc(x.mode||"")}"></div><div class="field"><label>Link</label><input id="mLink" value="${esc(x.link||"")}"></div><div class="field"><label>Nota / estrelas</label><input id="mRating" placeholder="Ex.: 4,7" value="${esc(x.rating||"")}"></div><div class="field"><label>Preço / promoção</label><input id="mPromo" value="${esc(x.promo||"")}"></div><div class="field"><label>Conteúdo / proposta</label><textarea id="mTopics">${esc(x.topics||"")}</textarea></div>`,()=>{const o={institution:val("mInstitution"),program:val("mProgram"),type:val("mType"),mode:val("mMode"),link:val("mLink"),rating:val("mRating"),promo:val("mPromo"),topics:val("mTopics")};if(!o.program)return alert("Informe o curso/programa.");if(i===null)data.savedLearning.push(o);else data.savedLearning[i]=o;save();closeModal();renderAll();toast("Formação salva.")})}
function learningCard(x,i){const m=matchInfo(`${x.program} ${x.type||""} ${x.topics||""}`);return `<article class="opp-card"><div><h3>${esc(x.program)}${x.institution?" — "+esc(x.institution):""}</h3><p>${esc([x.type,x.mode,x.rating?x.rating+"★":"",x.promo].filter(Boolean).join(" • "))}</p><p>${esc(x.topics||"")}</p><div class="opp-actions">${x.link?`<button data-learn-open="${i}">Abrir</button>`:""}<button data-learn-journey="${i}">Adicionar à Jornada</button><button data-learn-edit="${i}">Editar</button><button class="danger" data-learn-del="${i}">Excluir</button></div></div><div class="score"><div class="score-circle">${m.score}%</div><p>alinhamento</p></div></article>`}
function recommendedLearningCard(x,i){const m=matchInfo(`${x.program} ${x.type||""} ${x.topics||""}`);return `<article class="opp-card"><div><h3>${esc(x.program)}${x.institution?" — "+esc(x.institution):""}</h3><p>${esc([x.type,x.mode,x.rating?x.rating+"★":"",x.promo].filter(Boolean).join(" • "))}</p><p>${esc(x.topics||"")}</p><div class="opp-actions"><button data-rec-learn-open="${i}">Ver no site oficial</button><button data-rec-learn-save="${i}">Salvar</button><button data-rec-learn-journey="${i}">Adicionar à Jornada</button></div></div><div class="score"><div class="score-circle">${m.score}%</div><p>alinhamento</p></div></article>`}
function renderLearning(){
  document.getElementById("recommendedLearning").innerHTML=recommendedLearning.map(recommendedLearningCard).join("");
  document.getElementById("savedLearning").innerHTML=data.savedLearning.map(learningCard).join("");
  const gapCounts={};recommendedJobs.slice(0,12).forEach(j=>(j.gaps||[]).forEach(g=>gapCounts[g]=(gapCounts[g]||0)+1));
  const suggestions=Object.entries(gapCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  document.getElementById("learningGaps").innerHTML=suggestions.map(([g,n])=>`<article class="opp-card"><div><h3>Desenvolver: ${esc(g)}</h3><p>Este termo apareceu como lacuna em ${n} vaga(s) recomendada(s).</p><div class="opp-actions"><button data-gap-search="${esc(g)}">Buscar opções na NORNA</button></div></div><div class="score"><div class="score-circle">${n}×</div><p>nas vagas</p></div></article>`).join("");
  const visible=currentLearningTab==="recommended"?recommendedLearning:(currentLearningTab==="saved"?data.savedLearning:suggestions);
  document.getElementById("learningEmpty").classList.toggle("hidden",visible.length>0);
}
document.querySelectorAll(".learning-tab").forEach(b=>b.onclick=()=>{currentLearningTab=b.dataset.learningTab;setLearningTab();renderLearning()});
function setLearningTab(){
  document.querySelectorAll(".learning-tab").forEach(b=>b.classList.toggle("active",b.dataset.learningTab===currentLearningTab));
  document.getElementById("recommendedLearning").classList.toggle("hidden",currentLearningTab!=="recommended");
  document.getElementById("savedLearning").classList.toggle("hidden",currentLearningTab!=="saved");
  document.getElementById("learningGaps").classList.toggle("hidden",currentLearningTab!=="gaps");
}
document.getElementById("searchLearning").onclick=async()=>{
  const type=val("learningType"),mode=val("learningMode"),kw=val("learningKeyword")||data.profile.area||data.profile.role,price=val("learningPrice");
  const note=document.getElementById("learningSearchNote");note.textContent="Buscando opções dentro da NORNA...";
  try{
    const params=new URLSearchParams({type,mode,keyword:kw||"",price});
    const r=await fetch("/api/learning?"+params.toString()),j=await r.json();
    if(!r.ok)throw new Error(j.error||"Não foi possível pesquisar.");
    recommendedLearning=j.items||[];currentLearningTab="recommended";setLearningTab();renderLearning();note.textContent=j.note||`${recommendedLearning.length} opções encontradas.`;
  }catch(err){recommendedLearning=[];renderLearning();note.textContent=err.message||"A pesquisa não respondeu agora."}
};
document.getElementById("page-formacoes").onclick=e=>{
  const o=e.target.closest("[data-learn-open]"),j=e.target.closest("[data-learn-journey]"),a=e.target.closest("[data-learn-edit]"),d=e.target.closest("[data-learn-del]"),g=e.target.closest("[data-gap-search]");
  const ro=e.target.closest("[data-rec-learn-open]"),rs=e.target.closest("[data-rec-learn-save]"),rj=e.target.closest("[data-rec-learn-journey]");
  if(o)window.open(normalUrl(data.savedLearning[+o.dataset.learnOpen].link),"_blank","noopener,noreferrer");
  if(j){const x=data.savedLearning[+j.dataset.learnJourney];data.journey.push({title:x.program,description:`${x.institution||""} ${x.type||""}`.trim(),status:"Não iniciado"});save();renderAll();toast("Adicionado à Jornada.")}
  if(a)learningModal(+a.dataset.learnEdit);
  if(d&&confirm("Excluir esta formação?")){data.savedLearning.splice(+d.dataset.learnDel,1);save();renderAll()}
  if(ro){const x=recommendedLearning[+ro.dataset.recLearnOpen];if(x?.link)window.open(normalUrl(x.link),"_blank","noopener,noreferrer")}
  if(rs){const x=recommendedLearning[+rs.dataset.recLearnSave];if(x&&!data.savedLearning.some(y=>y.program===x.program&&y.institution===x.institution)){data.savedLearning.push({...x});save();renderAll();toast("Formação salva.")}}
  if(rj){const x=recommendedLearning[+rj.dataset.recLearnJourney];if(x){data.journey.push({title:x.program,description:`${x.institution||""} ${x.type||""}`.trim(),status:"Não iniciado"});save();renderAll();toast("Adicionado à Jornada.")}}
  if(g){document.getElementById("learningKeyword").value=g.dataset.gapSearch;document.getElementById("searchLearning").click()}
};

// NORNA IA
document.getElementById("aiAsk").onclick=async()=>{const q=val("aiQuestion");if(!q)return alert("Escreva uma pergunta para a NORNA.");const box=document.getElementById("aiAnswer");box.textContent="Pensando no seu fio...";try{const r=await fetch("/api/ai/coach",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:q})});const j=await r.json();box.textContent=r.ok?(j.answer||"Sem resposta agora."):(j.error||"Não foi possível consultar a NORNA IA.")}catch{box.textContent="A camada de IA não respondeu agora."}};

// DASHBOARD
function profileCompletion(){
  const p=data.profile;
  const checks=[p.name,p.age,p.area||p.role,p.level,p.mode,p.location,p.about];
  return Math.round(checks.filter(Boolean).length/checks.length*100);
}

function renderDashboard(){
  const p=data.profile;
  const statProfile=document.getElementById("statProfile");
  const statJourney=document.getElementById("statJourney");
  const statSkills=document.getElementById("statSkills");
  if(statProfile)statProfile.textContent=profileCompletion()+"%";
  if(statJourney)statJourney.textContent=data.journey.length;
  if(statSkills)statSkills.textContent=data.skills.length;

  const dashGoal=document.getElementById("dashGoal");
  const dashGoalText=document.getElementById("dashGoalText");
  if(dashGoal)dashGoal.textContent=profileHeadline()||"Ainda não definido";
  if(dashGoalText)dashGoalText.textContent=p.area?[`Área: ${p.area}`,p.mode,p.location].filter(Boolean).join(" • "):"Complete seu perfil para começar.";

  let next="Complete seu perfil";
  let txt="Nome, idade, objetivo e preferências ajudam a NORNA a personalizar sua jornada.";
  if(profileCompletion()>=70){next="Envie seu currículo";txt="Seu perfil já tem uma boa base. Agora adicione seu currículo."}
  if(data.resumeText){next="Organize sua jornada";txt="Com o currículo lido, escolha os próximos estudos e etapas."}
  if(data.journey.length){next="Acompanhe sua evolução";txt="Continue atualizando suas etapas conforme avança."}

  const dashNext=document.getElementById("dashNext");
  const dashNextText=document.getElementById("dashNextText");
  if(dashNext)dashNext.textContent=next;
  if(dashNextText)dashNextText.textContent=txt;

  updateProfileHeader();
}

function renderAll(){renderProfile();renderJourney();renderSkills();renderCourses();renderResume();renderJobs();renderLearning();renderDashboard();setJobTab();setLearningTab()}
bootstrap();