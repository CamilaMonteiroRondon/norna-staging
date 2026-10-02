
import html
import json
import os
import re
import unicodedata
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

def fold(value):
    value = str(value or "")
    return "".join(ch for ch in unicodedata.normalize("NFD", value.lower()) if unicodedata.category(ch) != "Mn")

def strip_html(value):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value or ""))).strip()

def unique(items, key):
    seen, out = set(), []
    for item in items:
        k = fold(key(item)).strip()
        if k and k not in seen:
            seen.add(k)
            out.append(item)
    return out

def section_key(line):
    norm = fold(line).strip(" :-–—")
    aliases = {
        "education": [
            "formacao", "formacao academica", "educacao", "escolaridade", "education",
            "graduacao", "formacao superior"
        ],
        "experience": [
            "experiencia", "experiencia profissional", "historico profissional",
            "professional experience", "work experience"
        ],
        "skills": [
            "competencias", "competencias tecnicas", "habilidades", "habilidades tecnicas",
            "conhecimentos", "tecnologias", "skills", "technical skills", "hard skills"
        ],
        "courses": [
            "cursos", "cursos e certificacoes", "certificacoes", "certificados",
            "courses", "certifications", "formacao em tecnologia", "formacao complementar"
        ],
        "summary": [
            "resumo", "resumo profissional", "perfil profissional", "sobre mim",
            "objetivo profissional", "objetivo"
        ],
        "projects": ["projetos", "projetos pessoais", "projetos academicos", "projects"]
    }
    for key, values in aliases.items():
        if norm in values:
            return key
    return None

def guess_name(lines):
    forbidden = ("curriculo", "curriculum", "resume", "linkedin", "github", "contato", "telefone", "email", "e-mail")
    for line in lines[:12]:
        raw = line.strip(" •|-")
        norm = fold(raw)
        if not raw or "@" in raw or re.search(r"\d{3,}", raw):
            continue
        words = re.findall(r"[A-Za-zÀ-ÿ'-]+", raw)
        if 2 <= len(words) <= 6 and 5 <= len(raw) <= 70 and not any(x in norm for x in forbidden):
            return raw
    return ""

def period(value):
    value = fold(value)
    patterns = [
        r"((?:19|20)\d{2}\s*[-–—/]\s*(?:(?:19|20)\d{2}|atual|presente))",
        r"((?:19|20)\d{2})"
    ]
    for pat in patterns:
        m = re.search(pat, value, re.I)
        if m:
            return m.group(1)
    return ""

def parse_education(lines):
    degree_words = ("graduacao","bacharel","licenciatura","tecnologo","tecnico","pos","especializacao","mba","mestrado","doutorado","curso superior","ciencias","engenharia","analise","administracao","biologia","dados","computacao")
    institution_words = ("universidade","faculdade","college","instituto","centro universitario","escola","puc","unig","faveni","fiap","senac","senai","estacio","anhanguera","unopar","cruz vermelha")
    clean = [x.strip(" •|-") for x in lines if len(x.strip(" •|-")) > 2]
    out, i = [], 0
    while i < len(clean):
        line = clean[i]
        low = fold(line)
        nxt = clean[i + 1] if i + 1 < len(clean) else ""
        nlow = fold(nxt)
        course, institution, used = "", "", 1
        parts = [p.strip() for p in re.split(r"\s+[|—–-]\s+", line) if p.strip()]
        if len(parts) >= 2:
            inst = next((p for p in parts if any(w in fold(p) for w in institution_words)), "")
            if inst:
                institution = inst
                course = next((p for p in parts if p != inst), "")
            else:
                course, institution = parts[0], parts[1]
        elif any(w in low for w in degree_words):
            course = line
            if nxt and any(w in nlow for w in institution_words):
                institution, used = nxt, 2
        elif any(w in low for w in institution_words) and nxt:
            institution, course, used = line, nxt, 2
        if course:
            out.append({
                "course": course[:180],
                "institution": institution[:160],
                "type": "",
                "period": period(line + " " + nxt)[:60]
            })
        i += used
    return unique(out, lambda x: x.get("course","") + " " + x.get("institution",""))[:12]

def parse_experience(lines):
    roles = ("auxiliar","analista","assistente","tecnico","tecnica","cientista","desenvolvedor","desenvolvedora","estagiario","estagiaria","coordenador","coordenadora","atendente","vendedor","vendedora","operador","operadora","supervisor","supervisora","gerente","professor","professora","pesquisador","pesquisadora")
    clean = [x.strip(" •|-") for x in lines if len(x.strip(" •|-")) > 2]
    out, i = [], 0
    while i < len(clean):
        line = clean[i]
        if not any(w in fold(line) for w in roles):
            i += 1
            continue
        role, company, prd = line, "", period(line)
        parts = [p.strip() for p in re.split(r"\s+[|—–]\s+", line) if p.strip()]
        if len(parts) >= 2 and not period(parts[1]):
            role, company = parts[0], parts[1]
        j = i + 1
        desc = []
        if j < len(clean):
            nxt = clean[j]
            if not any(w in fold(nxt) for w in roles):
                if period(nxt):
                    prd = prd or period(nxt)
                    maybe_company = re.sub(r"(?i)\b(?:19|20)\d{2}.*$", "", nxt).strip(" -–—|")
                    if maybe_company and len(maybe_company) <= 100:
                        company = company or maybe_company
                elif len(nxt) <= 100:
                    company = company or nxt
                j += 1
        while j < len(clean) and len(desc) < 3:
            nxt = clean[j]
            if any(w in fold(nxt) for w in roles) or section_key(nxt):
                break
            if not prd and period(nxt):
                prd = period(nxt)
            else:
                desc.append(nxt)
            j += 1
        out.append({"role": role[:150], "company": company[:140], "period": prd[:60], "description": " ".join(desc)[:700]})
        i = max(i + 1, j)
    return unique(out, lambda x: x.get("role","") + " " + x.get("company",""))[:12]

KNOWN_SKILLS = [
    "Python","SQL","MySQL","PostgreSQL","JavaScript","HTML","CSS","Power BI","Excel","Pandas","NumPy",
    "Scikit-learn","Machine Learning","Git","GitHub","FastAPI","Flask","Django","Flutter","Dart","Figma",
    "Tableau","Looker","R","Spark","Docker","Kubernetes","AWS","Azure","Google Cloud","ETL","NLP",
    "Deep Learning","TensorFlow","PyTorch","Jupyter","Oracle","Linux","Data Science","Ciência de Dados",
    "Análise de Dados","Estatística"
]

def contains_term(text, term):
    normalized = fold(text)
    target = fold(term).strip()
    if not target:
        return False
    pattern = r"(?<![a-z0-9])" + re.escape(target) + r"(?![a-z0-9])"
    return re.search(pattern, normalized) is not None

def clean_resume_items(items, fields):
    seen, out = set(), []
    for item in items or []:
        key = "|".join(fold(item.get(field, "")).strip() for field in fields)
        key = re.sub(r"\s+", " ", key)
        if not key.strip("| ") or key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out

def parse_courses(lines):
    out = []
    for raw in lines or []:
        line = raw.strip(" •|-")
        if len(line) < 4 or len(line) > 220:
            continue
        low = fold(line)
        if "http://" in low or "https://" in low or "linkedin" in low or "github" in low:
            continue
        parts = [p.strip() for p in re.split(r"\s+[|—–-]\s+", line) if p.strip()]
        name = parts[0] if parts else line
        platform = parts[1] if len(parts) > 1 else ""
        if fold(name) in ("curso", "cursos", "certificacao", "certificacoes"):
            continue
        out.append({"name": name[:180], "platform": platform[:140], "status": "Concluído", "progress": 100})
    return clean_resume_items(out, ["name", "platform"])[:16]

def analyze_resume(text):
    raw = (text or "").replace("\u2022", "\n• ")
    raw_lines = [re.sub(r"\s+", " ", x).strip() for x in re.split(r"[\r\n]+", raw)]
    lines = [x for x in raw_lines if x]

    sections = {
        "header": [], "education": [], "experience": [], "skills": [],
        "courses": [], "summary": [], "projects": []
    }
    seen_sections = set()
    current = "header"

    for line in lines:
        key = section_key(line)
        if key:
            current = key
            seen_sections.add(key)
            continue
        sections.setdefault(current, []).append(line)

    # Competências: só considera termos inteiros/frases, evitando falsos positivos
    # como a linguagem R aparecer dentro de qualquer palavra.
    skills = []
    for skill in KNOWN_SKILLS:
        if contains_term(text, skill):
            skills.append({"name": skill, "level": 85})
    skills = clean_resume_items(skills, ["name"])

    # Formação: prioriza a seção correta. Cursos/certificações ficam separados.
    education_lines = sections.get("education", [])
    education = parse_education(education_lines) if education_lines else []
    education = clean_resume_items(education, ["course", "institution"])

    courses = parse_courses(sections.get("courses", [])) if sections.get("courses") else []

    # Experiência: evita interpretar objetivo profissional como experiência.
    experience_lines = sections.get("experience", [])
    experience = parse_experience(experience_lines) if experience_lines else []
    experience = clean_resume_items(experience, ["role", "company", "period"])

    # Fallback conservador apenas quando não existem títulos de seção úteis.
    if not education and "education" not in seen_sections:
        likely_education = [
            x for x in lines
            if any(word in fold(x) for word in (
                "universidade", "faculdade", "tecnico", "tecnica", "bacharel",
                "licenciatura", "tecnologo", "graduacao", "pos-graduacao", "mba"
            ))
        ]
        education = clean_resume_items(parse_education(likely_education), ["course", "institution"])

    summary = " ".join(sections.get("summary", [])[:7])[:900]
    if not summary:
        header_clean = []
        for line in sections.get("header", []):
            low = fold(line)
            if "@" in line or "linkedin" in low or "github" in low or re.search(r"\b\d{8,}\b", re.sub(r"\D", "", line)):
                continue
            header_clean.append(line)
        summary = " ".join(header_clean[1:5])[:650]

    low = fold(text)
    area = ""
    if any(x in low for x in ("ciencia de dados", "data science", "analise de dados", "data analytics", "machine learning", "power bi")):
        area = "Ciência de Dados"

    return {
        "profile": {
            "name": guess_name(lines),
            "about": summary,
            "area": area,
            "role": ""
        },
        "education": education,
        "experience": experience,
        "skills": skills,
        "courses": courses
    }

LEARNING_CATALOG = [
    {"institution":"PUC Minas","program":"Ciência de Dados e Big Data","type":"Pós-graduação","mode":"EAD","link":"https://vemprapuc.pucminas.br/ciencia-de-dados-e-big-data-ead-com-videoaulas","rating":"","promo":"Política de descontos disponível na oferta","price_kind":"promocao","topics":"Python, SQL, estatística, visualização de dados, Machine Learning, NLP, Deep Learning, DataOps e MLOps"},
    {"institution":"PUC Minas","program":"Ciência de Dados e Inteligência Artificial","type":"Graduação","mode":"Presencial","link":"https://vemprapuc.pucminas.br/graduacao/ciencia-de-dados","rating":"","promo":"Consulte inscrição e política de desconto","price_kind":"promocao","topics":"Computação, estatística, matemática, banco de dados, mineração de dados, Machine Learning e Big Data"},
    {"institution":"FIAP","program":"Banco de Dados — Data Science, Analytics e IA","type":"Graduação","mode":"EAD","link":"https://www.fiap.com.br/graduacao/tecnologo/banco-de-dados/","rating":"","promo":"Consulte turmas e condições no provedor","price_kind":"pago","topics":"Data Science, Analytics, Data Engineering, Cloud Data Platforms e Inteligência Artificial"},
    {"institution":"Coursera / Google","program":"Google Data Analytics Professional Certificate","type":"Curso","mode":"EAD","link":"https://www.coursera.org/professional-certificates/google-data-analytics","rating":"4.8","promo":"Consulte condições e bolsas","price_kind":"pago","topics":"Análise de dados, limpeza, visualização, planilhas, SQL, Python e Tableau"},
    {"institution":"Coursera / Google","program":"Google Advanced Data Analytics Professional Certificate","type":"Curso","mode":"EAD","link":"https://www.coursera.org/professional-certificates/google-advanced-data-analytics","rating":"","promo":"Consulte condições e bolsas","price_kind":"pago","topics":"Python, estatística, regressão, Machine Learning, análise avançada e comunicação de dados"},
    {"institution":"Coursera / IBM","program":"IBM Data Science Professional Certificate","type":"Curso","mode":"EAD","link":"https://www.coursera.org/professional-certificates/ibm-data-science","rating":"","promo":"Consulte condições e bolsas","price_kind":"pago","topics":"Python, SQL, análise de dados, visualização, Machine Learning, Jupyter e projetos de portfólio"},
    {"institution":"DeepLearning.AI / Stanford Online","program":"Machine Learning Specialization","type":"Curso","mode":"EAD","link":"https://www.coursera.org/specializations/machine-learning-introduction","rating":"4.9","promo":"Consulte condições e bolsas","price_kind":"pago","topics":"Regressão, classificação, redes neurais, árvores de decisão, clustering e sistemas de recomendação"},
    {"institution":"DeepLearning.AI","program":"Deep Learning Specialization","type":"Curso","mode":"EAD","link":"https://www.coursera.org/specializations/deep-learning","rating":"4.8","promo":"Consulte condições e bolsas","price_kind":"pago","topics":"Redes neurais, deep learning, CNNs, sequence models e aplicações de IA"},
    {"institution":"Coursera / Google Cloud","program":"Google Cloud Data Analytics Professional Certificate","type":"Curso","mode":"EAD","link":"https://www.coursera.org/professional-certificates/google-cloud-data-analytics-certificate","rating":"4.4","promo":"Consulte condições e bolsas","price_kind":"pago","topics":"Cloud data analytics, BigQuery, Looker, visualização, governança e pipelines de dados"},
    {"institution":"HarvardX / edX","program":"Data Science Professional Certificate","type":"Curso","mode":"EAD","link":"https://www.edx.org/certificates/professional-certificate/harvardx-data-science","rating":"","promo":"Consulte acesso e certificado","price_kind":"pago","topics":"Probabilidade, inferência, regressão, Machine Learning, visualização e fundamentos de Data Science"}
]

JOB_SYNONYMS = {
    "ciencia de dados":["data science","data scientist"],
    "cientista de dados":["data scientist","data science"],
    "analista de dados":["data analyst","data analytics"],
    "analise de dados":["data analyst","data analytics"],
    "engenharia de dados":["data engineer","data engineering"],
    "inteligencia de negocios":["business intelligence","bi analyst"],
    "aprendizado de maquina":["machine learning","ml engineer"]
}

def search_terms(value):
    norm = fold(value)
    terms = [x for x in re.findall(r"[a-z0-9+#.]+", norm) if len(x) > 2]
    for phrase, extras in JOB_SYNONYMS.items():
        if phrase in norm:
            for extra in extras:
                terms.extend(extra.split())
    return list(dict.fromkeys(terms))

def fetch_json(url):
    req = Request(url, headers={"User-Agent":"NORNA-Portfolio/1.1","Accept":"application/json"})
    with urlopen(req, timeout=18) as response:
        return json.loads(response.read().decode("utf-8"))

def serper_search(query, num=10):
    api_key = os.getenv("SERPER_API_KEY", "").strip()
    if not api_key or not query.strip():
        return []

    payload = json.dumps({
        "q": query.strip(),
        "gl": "br",
        "hl": "pt-br",
        "num": max(1, min(20, int(num or 10)))
    }).encode("utf-8")

    req = Request(
        "https://google.serper.dev/search",
        data=payload,
        method="POST",
        headers={
            "X-API-KEY": api_key,
            "Content-Type": "application/json",
            "User-Agent": "NORNA-Portfolio/1.2"
        }
    )

    with urlopen(req, timeout=20) as response:
        data = json.loads(response.read().decode("utf-8"))

    return data.get("organic", []) or []

def source_name(link):
    try:
        host = urlparse(link or "").netloc.lower().replace("www.", "")
        return host or "web"
    except Exception:
        return "web"

def parse_dt(value):
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z","+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None

def relevance(job, terms):
    if not terms:
        return 1
    text = fold(" ".join([job.get("title",""),job.get("company",""),job.get("location",""),job.get("category",""),job.get("description","")," ".join(job.get("tags",[]) or [])]))
    title = fold(job.get("title",""))
    score = 0
    for term in terms:
        score += 4 if term in title else (1 if term in text else 0)
    return score

def search_jobs(query="", keyword="", role="", area="", mode="", days=7):
    days = max(1, min(60, int(days or 7)))
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    terms = search_terms(" ".join([keyword, role, area, query]))
    jobs, sources = [], []

    try:
        payload = fetch_json("https://remotive.com/api/remote-jobs")
        for item in payload.get("jobs", []):
            pub = parse_dt(item.get("publication_date"))
            if pub and pub < cutoff:
                continue
            jobs.append({"id":"remotive-"+str(item.get("id","")),"title":item.get("title",""),"company":item.get("company_name",""),"location":item.get("candidate_required_location",""),"category":item.get("category",""),"description":strip_html(item.get("description",""))[:6000],"publication_date":item.get("publication_date",""),"url":item.get("url",""),"remote":True,"source":"Remotive","tags":[item.get("category","")]})
        sources.append("Remotive")
    except Exception:
        pass

    try:
        for page in range(1,4):
            payload = fetch_json("https://www.arbeitnow.com/api/job-board-api?page="+str(page))
            rows = payload.get("data", [])
            if not rows:
                break
            for item in rows:
                created = item.get("created_at")
                pub = datetime.fromtimestamp(created, timezone.utc) if isinstance(created,(int,float)) else parse_dt(created)
                if pub and pub < cutoff:
                    continue
                jobs.append({"id":"arbeitnow-"+str(item.get("slug","")),"title":item.get("title",""),"company":item.get("company_name",""),"location":item.get("location",""),"category":", ".join(item.get("tags",[])[:3]),"description":strip_html(item.get("description",""))[:6000],"publication_date":pub.isoformat() if pub else "","url":item.get("url",""),"remote":bool(item.get("remote")),"source":"Arbeitnow","tags":item.get("tags",[])+item.get("job_types",[])})
        sources.append("Arbeitnow")
    except Exception:
        pass

    dedup = {}
    for job in jobs:
        key = fold(job.get("title","")+"|"+job.get("company","")+"|"+job.get("url",""))
        if key and key not in dedup:
            dedup[key] = job
    jobs = list(dedup.values())

    if mode == "Remoto":
        jobs = [j for j in jobs if j.get("remote") is True or "remote" in fold(j.get("location","")+" "+j.get("category",""))]
    elif mode == "Presencial":
        jobs = [j for j in jobs if j.get("remote") is False]
    elif mode == "Híbrido":
        jobs = [j for j in jobs if "hybrid" in fold(j.get("location","")+" "+j.get("category","")+" "+j.get("description",""))]

    ranked = [(relevance(j,terms),j) for j in jobs]
    if terms:
        ranked = [(score,j) for score,j in ranked if score > 0]
    ranked.sort(key=lambda pair: pair[0], reverse=True)
    result = [j for _,j in ranked[:100]]
    return {"jobs":result,"sources":sources,"note":str(len(result))+" vaga(s) encontrada(s) dentro da NORNA"+((" nas fontes "+" + ".join(sources)) if sources else "")+"."}

def search_learning(kind="", mode="", keyword="", price=""):
    terms = search_terms(keyword)
    results = []
    for item in LEARNING_CATALOG:
        if kind and fold(kind) not in fold(item.get("type","")):
            continue
        if mode:
            wanted, got = fold(mode), fold(item.get("mode",""))
            if wanted == "ead":
                if got not in ("ead","online") and "online" not in got:
                    continue
            elif wanted not in got:
                continue
        if price and fold(item.get("price_kind","")) != fold(price):
            continue
        hay = fold(" ".join([item.get("program",""),item.get("institution",""),item.get("topics","")]))
        if terms and not any(term in hay for term in terms):
            continue
        results.append(dict(item))
    return {"items":results,"note":str(len(results))+" opção(ões) encontrada(s) dentro da NORNA. O link só abre o site oficial quando você escolher uma opção."}

# ---- Busca ao vivo opcional -------------------------------------------------
# Estas funções sobrescrevem as versões acima quando o módulo é carregado.
# Se SERPER_API_KEY não existir, a NORNA continua usando as fontes gratuitas.

def search_jobs(query="", keyword="", role="", area="", location="", mode="", days=7):
    days = max(1, min(60, int(days or 7)))
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    terms = search_terms(" ".join([keyword, role, area, query]))
    jobs, sources = [], []

    try:
        payload = fetch_json("https://remotive.com/api/remote-jobs")
        for item in payload.get("jobs", []):
            pub = parse_dt(item.get("publication_date"))
            if pub and pub < cutoff:
                continue
            jobs.append({
                "id": "remotive-" + str(item.get("id", "")),
                "title": item.get("title", ""),
                "company": item.get("company_name", ""),
                "location": item.get("candidate_required_location", ""),
                "category": item.get("category", ""),
                "description": strip_html(item.get("description", ""))[:6000],
                "publication_date": item.get("publication_date", ""),
                "url": item.get("url", ""),
                "remote": True,
                "source": "Remotive",
                "tags": [item.get("category", "")]
            })
        sources.append("Remotive")
    except Exception:
        pass

    try:
        for page in range(1, 4):
            payload = fetch_json("https://www.arbeitnow.com/api/job-board-api?page=" + str(page))
            rows = payload.get("data", [])
            if not rows:
                break
            for item in rows:
                created = item.get("created_at")
                pub = datetime.fromtimestamp(created, timezone.utc) if isinstance(created, (int, float)) else parse_dt(created)
                if pub and pub < cutoff:
                    continue
                jobs.append({
                    "id": "arbeitnow-" + str(item.get("slug", "")),
                    "title": item.get("title", ""),
                    "company": item.get("company_name", ""),
                    "location": item.get("location", ""),
                    "category": ", ".join(item.get("tags", [])[:3]),
                    "description": strip_html(item.get("description", ""))[:6000],
                    "publication_date": pub.isoformat() if pub else "",
                    "url": item.get("url", ""),
                    "remote": bool(item.get("remote")),
                    "source": "Arbeitnow",
                    "tags": item.get("tags", []) + item.get("job_types", [])
                })
        sources.append("Arbeitnow")
    except Exception:
        pass

    live_web = False
    if os.getenv("SERPER_API_KEY", "").strip():
        try:
            base = " ".join([role, area, keyword, query]).strip() or "emprego"
            place = location.strip() or "Brasil"
            mode_text = {"Remoto": "remoto", "Presencial": "presencial", "Híbrido": "híbrido"}.get(mode, "")
            web_query = " ".join(["vaga recente", base, mode_text, place, "emprego"]).strip()
            for item in serper_search(web_query, 15):
                title = (item.get("title") or "").strip()
                link = (item.get("link") or "").strip()
                snippet = (item.get("snippet") or "").strip()
                if not title or not link:
                    continue
                txt = fold(title + " " + snippet)
                jobs.append({
                    "id": "web-" + str(abs(hash(link))),
                    "title": title,
                    "company": "",
                    "location": place,
                    "category": "Resultado web ao vivo",
                    "description": snippet,
                    "publication_date": item.get("date", ""),
                    "url": link,
                    "remote": ("remot" in txt) or mode == "Remoto",
                    "source": source_name(link),
                    "tags": ["web"]
                })
            sources.append("Web ao vivo")
            live_web = True
        except Exception:
            pass

    dedup = {}
    for job in jobs:
        key = fold(job.get("title", "") + "|" + job.get("company", "") + "|" + job.get("url", ""))
        if key and key not in dedup:
            dedup[key] = job
    jobs = list(dedup.values())

    if mode == "Remoto":
        jobs = [j for j in jobs if j.get("remote") is True or "remote" in fold(j.get("location", "") + " " + j.get("description", ""))]
    elif mode == "Presencial":
        jobs = [j for j in jobs if j.get("remote") is False]
    elif mode == "Híbrido":
        jobs = [j for j in jobs if "hybrid" in fold(j.get("description", "")) or "hibrid" in fold(j.get("description", ""))]

    ranked = [(relevance(j, terms), j) for j in jobs]
    if terms:
        ranked = [(score, j) for score, j in ranked if score > 0]
    ranked.sort(key=lambda pair: pair[0], reverse=True)
    result = [j for _, j in ranked[:100]]
    note = str(len(result)) + " vaga(s) encontrada(s). Fontes: " + (" + ".join(sources) if sources else "nenhuma") + "."
    if not live_web:
        note += " Para ampliar para a internet em tempo real, configure SERPER_API_KEY no Render."
    return {"jobs": result, "sources": sources, "live_web": live_web, "note": note}

def search_learning(kind="", mode="", keyword="", price=""):
    terms = search_terms(keyword)
    results = []
    live_web = False

    if os.getenv("SERPER_API_KEY", "").strip():
        try:
            price_text = "gratuito" if price == "gratuito" else ("promoção desconto bolsa" if price == "promocao" else "")
            web_query = " ".join([kind or "curso faculdade formação", keyword, mode, price_text, "Brasil inscrição"]).strip()
            for item in serper_search(web_query, 15):
                title = (item.get("title") or "").strip()
                link = (item.get("link") or "").strip()
                snippet = (item.get("snippet") or "").strip()
                if not title or not link:
                    continue
                results.append({
                    "institution": source_name(link),
                    "program": title,
                    "type": kind or "Formação / Curso",
                    "mode": mode or "Consulte no site",
                    "link": link,
                    "rating": "",
                    "promo": snippet[:220],
                    "price_kind": price or "",
                    "topics": snippet,
                    "source": "Web ao vivo"
                })
            live_web = True
        except Exception:
            pass

    for item in LEARNING_CATALOG:
        if kind and fold(kind) not in fold(item.get("type", "")):
            continue
        if mode:
            wanted, got = fold(mode), fold(item.get("mode", ""))
            if wanted == "ead":
                if got not in ("ead", "online") and "online" not in got:
                    continue
            elif wanted not in got:
                continue
        if price and fold(item.get("price_kind", "")) != fold(price):
            continue
        hay = fold(" ".join([item.get("program", ""), item.get("institution", ""), item.get("topics", "")]))
        if terms and not any(term in hay for term in terms):
            continue
        local_item = dict(item)
        local_item["source"] = "Catálogo NORNA"
        results.append(local_item)

    dedup = {}
    for item in results:
        key = fold(item.get("link", "") or (item.get("program", "") + "|" + item.get("institution", "")))
        if key and key not in dedup:
            dedup[key] = item
    results = list(dedup.values())[:40]

    note = str(len(results)) + " opção(ões) encontrada(s) dentro da NORNA."
    if live_web:
        note += " A pesquisa web foi consultada agora."
    else:
        note += " Para pesquisar a internet em tempo real, configure SERPER_API_KEY no Render."
    return {"items": results, "live_web": live_web, "note": note}
