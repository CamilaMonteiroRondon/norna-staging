const KEY="norna_v6_data", THEME="norna_v6_theme";
const emptyData=()=>({profile:{photo:"",name:"",area:"",role:"",level:"",mode:"",location:"",study:"",opportunity:"",about:""},education:[],experience:[],journey:[],courses:[],skills:[],savedJobs:[],savedLearning:[]});
let data=load(), currentCourseFilter="Todos", currentJobTab="recommended", currentLearningTab="recommended", recommendedJobs=[], recommendedLearning=[], modalHandler=null, currentUser=null, syncTimer=null;

function load(){try{const r=localStorage.getItem(KEY);return r?JSON.parse(r):emptyData()}catch{return emptyData()}}
function normalizeData(source){const base=emptyData();source=source||{};return {...base,...source,profile:{...base.profile,...(source.profile||{})},education:Array.isArray(source.education)?source.education:[],experience:Array.isArray(source.experience)?source.experience:[],journey:Array.isArray(source.journey)?source.journey:[],courses:Array.isArray(source.courses)?source.courses:[],skills:Array.isArray(source.skills)?source.skills:[],savedJobs:Array.isArray(source.savedJobs)?source.savedJobs:[],savedLearning:Array.isArray(source.savedLearning)?source.savedLearning:[]}}
function save(){localStorage.setItem(KEY,JSON.stringify(data));clearTimeout(syncTimer);syncTimer=setTimeout(syncData,220)}
async function syncData(){try{const r=await fetch("/api/data",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});if(r.status===401)location.href="/?login=1"}catch{}}
async function bootstrap(){try{const me=await fetch("/api/me");if(!me.ok){location.href="/?login=1";return}currentUser=await me.json();const r=await fetch("/api/data");if(!r.ok){location.href="/?login=1";return}const payload=await r.json();data=normalizeData(payload.data);localStorage.setItem(KEY,JSON.stringify(data));renderAll()}catch{location.href="/?login=1"}}
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
document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>go(b.dataset.page));
document.querySelectorAll(".go-page").forEach(b=>b.onclick=()=>go(b.dataset.go));
function go(page){document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));document.getElementById("page-"+page).classList.add("active");document.getElementById("pageTitle").textContent=document.querySelector(`.nav-btn[data-page="${page}"]`).textContent;renderAll()}

// THEME / RESET
document.body.classList.remove("light");
if(localStorage.getItem(THEME)==="dark")document.body.classList.add("dark");
document.getElementById("themeToggle").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem(THEME,document.body.classList.contains("dark")?"dark":"warm")};
document.getElementById("resetAll").onclick=()=>{if(confirm("Apagar todos os dados da NORNA neste navegador?")){data=emptyData();recommendedJobs=[];save();renderAll();toast("Dados zerados.")}};
document.getElementById("logoutButton").onclick=async()=>{try{await fetch("/api/logout",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"})}catch{}localStorage.removeItem(KEY);location.href="/"};

// MODAL
const modal=document.getElementById("modal");
function openModal(title,body,handler){document.getElementById("modalTitle").textContent=title;document.getElementById("modalBody").innerHTML=body;modalHandler=handler;modal.classList.add("open")}
function closeModal(){modal.classList.remove("open");modalHandler=null}
document.getElementById("modalClose").onclick=closeModal;
document.getElementById("modalCancel").onclick=closeModal;
document.getElementById("modalSave").onclick=()=>modalHandler&&modalHandler();
modal.onclick=e=>{if(e.target===modal)closeModal()};

// PERFIL
const pf={name:"profileName",area:"profileArea",role:"profileRole",level:"profileLevel",mode:"profileMode",location:"profileLocation",study:"profileStudy",opportunity:"profileOpportunity",about:"profileAbout"};
document.getElementById("saveProfile").onclick=()=>{Object.entries(pf).forEach(([k,id])=>data.profile[k]=val(id));save();renderAll();toast("Perfil salvo.")};
document.getElementById("profilePhoto").onchange=e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>1500000)return alert("Escolha uma imagem de até 1,5 MB.");const r=new FileReader();r.onload=()=>{data.profile.photo=r.result;save();renderAll();toast("Foto adicionada.")};r.readAsDataURL(f)};
document.getElementById("removePhoto").onclick=()=>{data.profile.photo="";save();renderAll()};
function placeholder(){return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" rx="34" fill="#c6b8af"/><circle cx="80" cy="61" r="28" fill="#9d6b66"/><path d="M35 143c4-31 22-46 45-46s41 15 45 46" fill="#9d6b66"/></svg>`)}
function renderProfile(){
  Object.entries(pf).forEach(([k,id])=>document.getElementById(id).value=data.profile[k]||"");
  const p=data.profile.photo||placeholder();
  document.getElementById("profileAvatar").src=p;
  document.getElementById("topAvatar").src=p;
  document.getElementById("topName").textContent=data.profile.name||"Seu perfil";
  const meta=document.getElementById("topProfileMeta");
  if(meta)meta.textContent=[data.profile.role,data.profile.area].filter(Boolean).join(" • ")||"Ver meu perfil";
}
const topProfileChip=document.getElementById("topProfileChip");
if(topProfileChip)topProfileChip.onclick=()=>go("perfil");

// CURRÍCULO: FORMAÇÃO / EXPERIÊNCIA
document.getElementById("addEducation").onclick=()=>educationModal();
document.getElementById("addExperience").onclick=()=>experienceModal();
function educationModal(i=null){const x=i===null?{}:data.education[i];openModal(i===null?"Adicionar formação":"Editar formação",`<div class="field"><label>Curso / formação</label><input id="mCourse" value="${esc(x.course||"")}"></div><div class="field"><label>Instituição</label><input id="mInstitution" value="${esc(x.institution||"")}"></div><div class="field"><label>Tipo</label><input id="mType" value="${esc(x.type||"")}"></div><div class="field"><label>Período</label><input id="mPeriod" value="${esc(x.period||"")}"></div>`,()=>{const o={course:val("mCourse"),institution:val("mInstitution"),type:val("mType"),period:val("mPeriod")};if(!o.course)return alert("Informe a formação.");if(i===null)data.education.push(o);else data.education[i]=o;save();closeModal();renderAll();toast("Formação salva.")})}
function experienceModal(i=null){const x=i===null?{}:data.experience[i];openModal(i===null?"Adicionar experiência":"Editar experiência",`<div class="field"><label>Cargo</label><input id="mRole" value="${esc(x.role||"")}"></div><div class="field"><label>Empresa</label><input id="mCompany" value="${esc(x.company||"")}"></div><div class="field"><label>Período</label><input id="mPeriod" value="${esc(x.period||"")}"></div><div class="field"><label>Descrição</label><textarea id="mDescription">${esc(x.description||"")}</textarea></div>`,()=>{const o={role:val("mRole"),company:val("mCompany"),period:val("mPeriod"),description:val("mDescription")};if(!o.role)return alert("Informe o cargo.");if(i===null)data.experience.push(o);else data.experience[i]=o;save();closeModal();renderAll();toast("Experiência salva.")})}
function renderSimple(listId,emptyId,arr,title,sub,type){const box=document.getElementById(listId);box.innerHTML="";arr.forEach((x,i)=>{const el=document.createElement("div");el.className="stack-item";el.innerHTML=`<h4>${esc(title(x))}</h4><p>${esc(sub(x))}</p><div class="item-actions"><button data-edit="${type}" data-i="${i}">Editar</button><button class="danger" data-del="${type}" data-i="${i}">Excluir</button></div>`;box.appendChild(el)});document.getElementById(emptyId).classList.toggle("hidden",arr.length>0)}
document.getElementById("page-curriculo").addEventListener("click",e=>{const a=e.target.closest("[data-edit]"),d=e.target.closest("[data-del]");if(a)(a.dataset.edit==="education"?educationModal:experienceModal)(+a.dataset.i);if(d&&confirm("Excluir este item?")){(d.dataset.del==="education"?data.education:data.experience).splice(+d.dataset.i,1);save();renderAll()}});

// JORNADA
document.getElementById("addJourney").onclick=()=>journeyModal();
function journeyModal(i=null,preset=null){const x=preset||(i===null?{}:data.journey[i]);openModal(i===null?"Adicionar etapa":"Editar etapa",`<div class="field"><label>Etapa</label><input id="mTitle" value="${esc(x.title||"")}"></div><div class="field"><label>Descrição</label><textarea id="mDescription">${esc(x.description||"")}</textarea></div><div class="field"><label>Status</label><select id="mStatus"><option>Não iniciado</option><option>Em andamento</option><option>Concluído</option></select></div>`,()=>{const o={title:val("mTitle"),description:val("mDescription"),status:document.getElementById("mStatus").value};if(!o.title)return alert("Informe a etapa.");if(i===null)data.journey.push(o);else data.journey[i]=o;save();closeModal();renderAll();toast("Etapa salva.")});if(x.status)document.getElementById("mStatus").value=x.status}
function renderJourney(){const box=document.getElementById("journeyList");box.innerHTML="";data.journey.forEach((x,i)=>{const el=document.createElement("div");el.className="stack-item";el.innerHTML=`<h4>${i+1}. ${esc(x.title)}</h4><p>${esc(x.description||"")}</p><p>${esc(x.status)}</p><div class="item-actions"><button data-jedit="${i}">Editar</button><button class="danger" data-jdel="${i}">Excluir</button></div>`;box.appendChild(el)});document.getElementById("journeyEmpty").classList.toggle("hidden",data.journey.length>0)}
document.getElementById("journeyList").onclick=e=>{const a=e.target.closest("[data-jedit]"),d=e.target.closest("[data-jdel]");if(a)journeyModal(+a.dataset.jedit);if(d&&confirm("Excluir esta etapa?")){data.journey.splice(+d.dataset.jdel,1);save();renderAll()}};

// COMPETÊNCIAS
document.getElementById("addSkill").onclick=()=>skillModal();
function skillModal(i=null){const x=i===null?{}:data.skills[i];openModal(i===null?"Adicionar competência":"Editar competência",`<div class="field"><label>Competência</label><input id="mSkill" value="${esc(x.name||"")}"></div><div class="field"><label>Nível de domínio (0 a 100)</label><input id="mLevel" type="number" min="0" max="100" value="${x.level??0}"></div>`,()=>{const o={name:val("mSkill"),level:clamp(val("mLevel"))};if(!o.name)return alert("Informe a competência.");if(i===null)data.skills.push(o);else data.skills[i]=o;save();closeModal();renderAll();toast("Competência salva.")})}
function renderSkills(){const gs={strong:[],developing:[],next:[]};data.skills.forEach((x,i)=>gs[x.level>=70?"strong":x.level>0?"developing":"next"].push({...x,i}));[["strong","strongSkills","strongEmpty"],["developing","developingSkills","developingEmpty"],["next","nextSkills","nextEmpty"]].forEach(([g,l,e])=>{const box=document.getElementById(l);box.innerHTML="";gs[g].forEach(x=>{const el=document.createElement("div");el.className="skill-item";el.innerHTML=`<div class="skill-top"><strong>${esc(x.name)}</strong><span>${x.level}%</span></div><div class="track"><div class="fill" style="width:${x.level}%"></div></div><div class="item-actions"><button data-sedit="${x.i}">Editar</button><button class="danger" data-sdel="${x.i}">Excluir</button></div>`;box.appendChild(el)});document.getElementById(e).classList.toggle("hidden",gs[g].length>0)})}
document.getElementById("page-competencias").onclick=e=>{const a=e.target.closest("[data-sedit]"),d=e.target.closest("[data-sdel]");if(a)skillModal(+a.dataset.sedit);if(d&&confirm("Excluir esta competência?")){data.skills.splice(+d.dataset.sdel,1);save();renderAll()}};

// CURSOS
document.getElementById("addCourse").onclick=()=>courseModal();
function skillOptions(selected=""){return `<option value="">Sem competência relacionada</option>`+data.skills.map(s=>`<option ${s.name===selected?"selected":""}>${esc(s.name)}</option>`).join("")}
function courseModal(i=null){const x=i===null?{}:data.courses[i];openModal(i===null?"Adicionar curso":"Editar curso",`<div class="field"><label>Nome do curso</label><input id="mName" value="${esc(x.name||"")}"></div><div class="field"><label>Plataforma / instituição</label><input id="mPlatform" value="${esc(x.platform||"")}"></div><div class="field"><label>Link</label><input id="mLink" value="${esc(x.link||"")}"></div><div class="field"><label>Status</label><select id="mStatus"><option>Quero fazer</option><option>Em andamento</option><option>Concluído</option><option>Pausado</option></select></div><div class="field"><label>Competência relacionada</label><select id="mSkill">${skillOptions(x.skill||"")}</select></div><div class="field"><label>Progresso (%)</label><input id="mProgress" type="number" min="0" max="100" value="${x.progress??0}"></div>`,()=>{const o={name:val("mName"),platform:val("mPlatform"),link:val("mLink"),status:document.getElementById("mStatus").value,skill:document.getElementById("mSkill").value,progress:clamp(val("mProgress"))};if(!o.name)return alert("Informe o curso.");if(o.status==="Concluído")o.progress=100;if(o.status==="Quero fazer")o.progress=0;if(i===null)data.courses.push(o);else data.courses[i]=o;save();closeModal();renderAll();toast("Curso salvo.")});if(x.status)document.getElementById("mStatus").value=x.status}
function renderCourses(){const arr=data.courses.map((x,i)=>({...x,i})).filter(x=>currentCourseFilter==="Todos"||x.status===currentCourseFilter),box=document.getElementById("courseList");box.innerHTML="";arr.forEach(x=>{const el=document.createElement("article");el.className="course-card";el.innerHTML=`<h3>${esc(x.name)}</h3><p>${esc(x.platform||"Plataforma não informada")}</p><p>${esc(x.status)}</p>${x.skill?`<p>Competência: ${esc(x.skill)}</p>`:""}${["Em andamento","Concluído"].includes(x.status)?`<div class="progress"><span>${x.progress}% concluído</span><div class="track"><div class="fill" style="width:${x.progress}%"></div></div></div>`:""}<div class="course-actions"><button class="open-btn" data-copen="${x.i}">Abrir</button><button class="edit-btn" data-cedit="${x.i}">Editar</button><button class="delete-btn" data-cdel="${x.i}">Excluir</button></div>`;box.appendChild(el)});document.getElementById("courseEmpty").classList.toggle("hidden",arr.length>0);box.classList.toggle("hidden",arr.length===0)}
document.querySelectorAll(".course-filter").forEach(b=>b.onclick=()=>{document.querySelectorAll(".course-filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentCourseFilter=b.dataset.filter;renderCourses()});
document.getElementById("courseList").onclick=e=>{const o=e.target.closest("[data-copen]"),a=e.target.closest("[data-cedit]"),d=e.target.closest("[data-cdel]");if(o){const x=data.courses[+o.dataset.copen];if(!x.link)return alert("Este curso não possui link.");window.open(normalUrl(x.link),"_blank","noopener,noreferrer")}if(a)courseModal(+a.dataset.cedit);if(d&&confirm("Excluir este curso?")){data.courses.splice(+d.dataset.cdel,1);save();renderAll()}};

// CURRÍCULO AUTOMÁTICO
function renderResume(){renderSimple("educationList","educationEmpty",data.education,x=>`${x.course}${x.institution?" — "+x.institution:""}`,x=>`${x.type||""}${x.period?" • "+x.period:""}`,"education");renderSimple("experienceList","experienceEmpty",data.experience,x=>`${x.role}${x.company?" — "+x.company:""}`,x=>`${x.period||""}${x.description?" • "+x.description:""}`,"experience");const p=data.profile,skills=data.skills.filter(s=>s.level>0).map(s=>s.name).join(" • ");document.getElementById("resumePreview").innerHTML=`<h2>${esc(p.name||"Seu nome")}</h2><p>${esc([p.role,p.area,p.location].filter(Boolean).join(" • ")||"Preencha seu perfil.")}</p>${p.about?`<h3>Resumo profissional</h3><p>${esc(p.about)}</p>`:""}${data.education.length?`<h3>Formação</h3><ul>${data.education.map(x=>`<li>${esc(x.course)}${x.institution?" — "+esc(x.institution):""}${x.period?" • "+esc(x.period):""}</li>`).join("")}</ul>`:""}${data.experience.length?`<h3>Experiência</h3><ul>${data.experience.map(x=>`<li><strong>${esc(x.role)}</strong>${x.company?" — "+esc(x.company):""}${x.description?"<br>"+esc(x.description):""}</li>`).join("")}</ul>`:""}${skills?`<h3>Competências</h3><p>${esc(skills)}</p>`:""}${data.courses.length?`<h3>Cursos</h3><ul>${data.courses.map(x=>`<li>${esc(x.name)}${x.platform?" — "+esc(x.platform):""}</li>`).join("")}</ul>`:""}`}
function mergeExtractedResume(x){
  if(!x)return;
  const p=x.profile||{};
  ["name","about","area","role"].forEach(k=>{if(p[k]&&!data.profile[k])data.profile[k]=p[k]});
  (x.education||[]).forEach(item=>{
    if(item.course&&!data.education.some(e=>(e.course||"").toLowerCase()===(item.course||"").toLowerCase()))data.education.push(item);
  });
  (x.experience||[]).forEach(item=>{
    if(item.role&&!data.experience.some(e=>(e.role||"").toLowerCase()===(item.role||"").toLowerCase()&&(e.company||"").toLowerCase()===(item.company||"").toLowerCase()))data.experience.push(item);
  });
  (x.skills||[]).forEach(item=>{
    if(item.name&&!data.skills.some(e=>(e.name||"").toLowerCase()===(item.name||"").toLowerCase()))data.skills.push({name:item.name,level:item.level||40});
  });
  (x.courses||[]).forEach(item=>{
    if(item.name&&!data.courses.some(e=>(e.name||"").toLowerCase()===(item.name||"").toLowerCase()))data.courses.push(item);
  });
}
function fileToBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(",")[1]||"");r.onerror=reject;r.readAsDataURL(file)})}
document.getElementById("resumeFile").onchange=async e=>{
  const f=e.target.files?.[0];if(!f)return;
  const status=document.getElementById("resumeImportStatus");
  status.textContent="Lendo e analisando o currículo...";
  try{
    const b64=await fileToBase64(f);
    const r=await fetch("/api/resume/upload",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({filename:f.name,content_base64:b64})});
    const j=await r.json();
    if(!r.ok)throw new Error(j.error||"Não foi possível ler o currículo.");
    document.getElementById("resumeImport").value=j.text||"";
    mergeExtractedResume(j.extracted);
    save();renderAll();
    status.textContent=`Currículo analisado: ${(j.extracted?.education||[]).length} formação(ões), ${(j.extracted?.experience||[]).length} experiência(s) e ${(j.extracted?.skills||[]).length} competência(s) detectadas. Revise os dados.`;
    toast("Currículo importado.");
  }catch(err){status.textContent=err.message||"Não foi possível analisar o arquivo."}
};
document.getElementById("analyzeResume").onclick=async()=>{
  const t=val("resumeImport");if(!t)return alert("Cole o texto do currículo ou escolha um arquivo.");
  const status=document.getElementById("resumeImportStatus");status.textContent="Analisando...";
  try{
    const r=await fetch("/api/resume/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:t})});
    const j=await r.json();if(!r.ok)throw new Error(j.error||"Não foi possível analisar.");
    mergeExtractedResume(j.extracted);save();renderAll();
    status.textContent=`Análise concluída: ${(j.extracted?.education||[]).length} formação(ões), ${(j.extracted?.experience||[]).length} experiência(s) e ${(j.extracted?.skills||[]).length} competência(s) detectadas.`;
    toast("Currículo analisado.");
  }catch(err){status.textContent=err.message}
};
document.getElementById("downloadResume").onclick=()=>{const p=data.profile;let t=`${p.name||"CURRÍCULO"}\n${[p.role,p.area,p.location].filter(Boolean).join(" | ")}\n\n`;if(p.about)t+=`RESUMO\n${p.about}\n\n`;if(data.education.length)t+=`FORMAÇÃO\n${data.education.map(x=>`- ${x.course}${x.institution?" — "+x.institution:""}`).join("\n")}\n\n`;if(data.experience.length)t+=`EXPERIÊNCIA\n${data.experience.map(x=>`- ${x.role}${x.company?" — "+x.company:""}\n  ${x.description||""}`).join("\n")}\n\n`;if(data.skills.length)t+=`COMPETÊNCIAS\n${data.skills.filter(s=>s.level>0).map(s=>s.name).join(", ")}\n\n`;if(data.courses.length)t+=`CURSOS\n${data.courses.map(x=>`- ${x.name}${x.platform?" — "+x.platform:""}`).join("\n")}`;const b=new Blob([t],{type:"text/plain;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="curriculo-NORNA.txt";a.click();URL.revokeObjectURL(a.href)};

// VAGAS AO VIVO + COMPATIBILIDADE
document.getElementById("findJobs").onclick=async()=>{
  if(!data.profile.area&&!data.profile.role&&!data.skills.length&&!val("jobKeyword"))return alert("Preencha seu objetivo profissional, competências ou uma palavra-chave.");
  const mode=val("jobMode")||data.profile.mode,days=val("jobRecency"),keyword=val("jobKeyword"),min=+val("jobMinMatch");
  const query=[data.profile.role,data.profile.area,keyword].filter(Boolean).join(" ");
  const note=document.getElementById("jobSearchNote");note.textContent="Buscando vagas nas fontes conectadas...";
  try{
    const params=new URLSearchParams({query,keyword,role:data.profile.role||"",area:data.profile.area||"",mode:mode||"",days:days||"7"});
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
function renderDashboard(){document.getElementById("statSkills").textContent=data.skills.length;document.getElementById("statCourses").textContent=data.courses.length;document.getElementById("statJobs").textContent=data.savedJobs.length;document.getElementById("statLearning").textContent=data.savedLearning.length;const p=data.profile;document.getElementById("dashGoal").textContent=p.role||p.area||"Ainda não definido";document.getElementById("dashGoalText").textContent=p.area?`Área: ${p.area}${p.mode?" • "+p.mode:""}`:"Complete seu perfil para começar.";let next="Complete seu perfil",txt="Depois disso, adicione suas competências.";if(p.area||p.role){next="Adicione suas competências";txt="Cadastre o que você sabe e o que quer desenvolver."}if(data.skills.length){next="Organize sua jornada";txt="Adicione cursos e etapas."}if(data.courses.length||data.journey.length){next="Procure oportunidades";txt="A NORNA já pode comparar seu perfil com vagas e formações."}document.getElementById("dashNext").textContent=next;document.getElementById("dashNextText").textContent=txt;const lines=[];if(p.area)lines.push(["Área desejada",p.area]);if(data.skills.length)lines.push(["Competências",data.skills.length]);if(data.education.length)lines.push(["Formações no currículo",data.education.length]);if(data.experience.length)lines.push(["Experiências",data.experience.length]);document.getElementById("dashboardSummary").innerHTML=lines.length?`<div class="stack">${lines.map(x=>`<div class="stack-item"><p>${esc(x[0])}</p><h4>${esc(x[1])}</h4></div>`).join("")}</div>`:"Ainda não há dados suficientes.";const jobs=data.savedJobs.map(x=>({...x,...matchInfo(`${x.title} ${x.description||""}`)})).sort((a,b)=>b.score-a.score);document.getElementById("bestJob").textContent=jobs[0]?`${jobs[0].title} — ${jobs[0].score}%`:"Nenhuma ainda";const ls=data.savedLearning.map(x=>({...x,score:matchInfo(`${x.program} ${x.topics||""}`).score})).sort((a,b)=>b.score-a.score);document.getElementById("bestLearning").textContent=ls[0]?`${ls[0].program} — ${ls[0].score}%`:"Nenhuma ainda"}

function renderAll(){renderProfile();renderJourney();renderSkills();renderCourses();renderResume();renderJobs();renderLearning();renderDashboard();setJobTab();setLearningTab()}
bootstrap();