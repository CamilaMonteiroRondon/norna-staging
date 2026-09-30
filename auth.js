const overlay=document.getElementById("authOverlay");
const forms={
  login:document.getElementById("loginForm"),
  register:document.getElementById("registerForm"),
  forgot:document.getElementById("forgotForm"),
  reset:document.getElementById("resetForm")
};
const msg=document.getElementById("authMessage");

function showMessage(text,html=false){
  if(!msg)return;
  msg.classList.remove("hidden");
  if(html)msg.innerHTML=text;else msg.textContent=text;
}
function clearMessage(){
  if(!msg)return;
  msg.classList.add("hidden");
  msg.textContent="";
}
function showAuth(mode){
  clearMessage();
  Object.entries(forms).forEach(([k,f])=>{if(f)f.classList.toggle("hidden",k!==mode)});
  overlay?.classList.add("open");
}

document.querySelectorAll("[data-auth]").forEach(b=>b.addEventListener("click",()=>showAuth(b.dataset.auth)));
const closeAuth=document.getElementById("closeAuth");
if(closeAuth)closeAuth.onclick=()=>overlay?.classList.remove("open");
if(overlay)overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.classList.remove("open")});
const forgotLink=document.getElementById("forgotLink");
if(forgotLink)forgotLink.onclick=()=>showAuth("forgot");

const FILE_MODE=location.protocol==="file:";
const SERVER_URL="http://127.0.0.1:8000";

function fileModeWarning(){
  return `
    <strong>O cadastro precisa do backend da NORNA.</strong><br>
    Esta página foi aberta diretamente como arquivo do Windows.<br><br>
    Feche esta aba e abra <strong>ABRIR_NORNA.bat</strong> na pasta do projeto.
    Depois use o endereço <strong>http://127.0.0.1:8000</strong>.
  `;
}

async function api(path,options={}){
  if(FILE_MODE){
    return {r:null,body:{error:fileModeWarning(),html:true}};
  }
  try{
    const r=await fetch(path,{headers:{"Content-Type":"application/json",...(options.headers||{})},...options});
    let body={};
    try{body=await r.json()}catch{}
    return {r,body};
  }catch(error){
    return {r:null,body:{error:"Não foi possível conectar ao backend da NORNA. Abra o projeto usando ABRIR_NORNA.bat e tente novamente."}};
  }
}

function showApiError(body,fallback){
  const text=body?.error||fallback;
  showMessage(text,Boolean(body?.html));
}

const loginForm=document.getElementById("loginForm");
if(loginForm)loginForm.addEventListener("submit",async e=>{
  e.preventDefault();clearMessage();
  const {r,body}=await api("/api/login",{method:"POST",body:JSON.stringify({email:document.getElementById("loginEmail").value.trim(),password:document.getElementById("loginPassword").value})});
  if(r?.ok){location.href="/app.html";return}
  showApiError(body,"Não foi possível entrar.");
});

const registerForm=document.getElementById("registerForm");
if(registerForm)registerForm.addEventListener("submit",async e=>{
  e.preventDefault();clearMessage();
  const p=document.getElementById("registerPassword").value;
  const p2=document.getElementById("registerPassword2").value;
  if(p!==p2)return showMessage("As senhas não coincidem.");
  const {r,body}=await api("/api/register",{method:"POST",body:JSON.stringify({email:document.getElementById("registerEmail").value.trim(),password:p})});
  if(!r?.ok)return showApiError(body,"Não foi possível criar a conta.");
    if(body.dev_auto_verified){
    document.getElementById("loginEmail").value=document.getElementById("registerEmail").value.trim();
    showMessage("Conta criada e confirmada. Agora clique em “Fazer login” abaixo para entrar.");
    return;
  }
  let text="Conta criada. Confira seu e-mail para confirmar o cadastro.";
  if(body.dev_verify_url)text+=`<br><br><a href="${body.dev_verify_url}" style="color:#8b5e61;font-weight:700">Modo local: confirmar e-mail agora →</a>`;
  showMessage(text,true);
});

const forgotForm=document.getElementById("forgotForm");
if(forgotForm)forgotForm.addEventListener("submit",async e=>{
  e.preventDefault();clearMessage();
  const {r,body}=await api("/api/forgot",{method:"POST",body:JSON.stringify({email:document.getElementById("forgotEmail").value.trim()})});
  if(!r)return showApiError(body,"Não foi possível acessar a recuperação.");
  let text=body.message||"Se essa conta existir, enviaremos a recuperação.";
  if(body.dev_reset_url)text+=`<br><br><a href="${body.dev_reset_url}" style="color:#8b5e61;font-weight:700">Modo local: redefinir senha agora →</a>`;
  showMessage(text,true);
});

const resetForm=document.getElementById("resetForm");
if(resetForm)resetForm.addEventListener("submit",async e=>{
  e.preventDefault();clearMessage();
  const p=document.getElementById("resetPassword").value;
  const p2=document.getElementById("resetPassword2").value;
  if(p!==p2)return showMessage("As senhas não coincidem.");
  const token=new URLSearchParams(location.search).get("reset");
  const {r,body}=await api("/api/reset",{method:"POST",body:JSON.stringify({token,password:p})});
  if(!r?.ok)return showApiError(body,"Não foi possível redefinir.");
  showMessage("Senha alterada. Agora você pode entrar.");
  setTimeout(()=>showAuth("login"),1200);
});

// Query states / already logged
(async()=>{
  const qs=new URLSearchParams(location.search);
  if(qs.get("verified")==="1"){
    showAuth("login");showMessage("E-mail confirmado. Agora você já pode entrar.");
  }else if(qs.get("verified")==="0"){
    showAuth("login");showMessage("Esse link de confirmação não é válido ou já foi utilizado.");
  }else if(qs.get("reset")){
    showAuth("reset");
  }else if(qs.get("mode")==="register"){
    showAuth("register");
  }else{
    showAuth("login");
  }

  if(FILE_MODE){
    showMessage(fileModeWarning(),true);
    return;
  }

  try{
    const r=await fetch("/api/me");
    if(r.ok){
      const continueBtn=document.querySelector('[data-auth="login"].nav-link');
      if(continueBtn){continueBtn.textContent="Continuar";continueBtn.onclick=()=>location.href="/app.html"}
    }
  }catch{}
})();
