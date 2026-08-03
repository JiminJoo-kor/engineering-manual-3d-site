import { useEffect, useMemo, useState } from "react";
import { checklist, defaultProjects, mailTemplates, phases, steps } from "./data";
import type { Project, ProjectPriority, ProjectStatus, SavedState, ViewKey } from "./types";
import ThreeStage from "./ThreeStage";

const stateKey = "engineering3dProjectManualReactV2";
const views: Array<{ key: ViewKey; label: string; hint: string }> = [
  { key: "home", label: "Home", hint: "3D 愿?? },
  { key: "projects", label: "?꾨줈?앺듃", hint: "紐⑸줉/吏꾪뻾" },
  { key: "calendar", label: "罹섎┛??, hint: "留덉씪?ㅽ넠" },
  { key: "manual", label: "留ㅻ돱??, hint: "20?④퀎" },
  { key: "documents", label: "臾몄꽌 ?먮쫫", hint: "?곗텧臾? },
  { key: "mail", label: "Gmail", hint: "?묒꽦 以鍮? },
  { key: "sources", label: "?먮낯 ?뺤씤", hint: "諛섏쁺 湲곗?" }
];

const statusOrder: Array<ProjectStatus | "?꾩껜"> = ["?꾩껜", "?뺤긽", "二쇱쓽", "?꾪뿕"];
const priorityOrder: ProjectPriority[] = ["蹂댄넻", "?믪쓬", "湲닿툒"];
type AiProvider = "openai" | "gemini";
interface AgentMessage { role: "user" | "assistant"; content: string; provider?: AiProvider }

const phaseOf = (stepId: number) => steps.find((step) => step.id === Number(stepId))?.phase ?? "?섏＜ ??;
const phaseMeta = (stepId: number) => phases.find((phase) => phase.name === phaseOf(stepId)) ?? phases[0];
const progressOf = (project: Project) => Math.max(0, Math.min(100, Math.round(((project.step - 1) / (steps.length - 1)) * 100)));
const todayIso = () => new Date().toISOString().slice(0, 10);

function statusColor(status: ProjectStatus) {
  return status === "?꾪뿕" ? "#ff4d6d" : status === "二쇱쓽" ? "#ffb84d" : "#38d996";
}

function priorityColor(priority: ProjectPriority) {
  return priority === "湲닿툒" ? "#ff4d6d" : priority === "?믪쓬" ? "#ffb84d" : "#5b8cff";
}

function readState(): SavedState {
  try {
    const current = JSON.parse(localStorage.getItem(stateKey) || "");
    if (current?.projects?.length) return current;
    const legacy = JSON.parse(localStorage.getItem("engineering3dProjectManualReactV1") || "");
    if (legacy?.projects?.length) return legacy;
  } catch {
    // keep bundled sample data
  }
  return { projects: defaultProjects, checks: {} };
}

function daysUntil(due: string) {
  if (!due) return null;
  const base = new Date();
  const today = new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime();
  const target = new Date(`${due}T00:00:00`).getTime();
  return Math.ceil((target - today) / 86400000);
}

function dueText(due: string) {
  const days = daysUntil(due);
  if (days === null || Number.isNaN(days)) return "?쇱젙 誘몄젙";
  if (days < 0) return `D+${Math.abs(days)}`;
  if (days === 0) return "D-Day";
  return `D-${days}`;
}

function stepAt(id: number) {
  return steps[id - 1] ?? steps[0];
}

export default function App() {
  const [state, setState] = useState<SavedState>(() => readState());
  const [view, setView] = useState<ViewKey>(() => (location.hash.replace("#", "") as ViewKey) || "projects");
  const [selectedProjectId, setSelectedProjectId] = useState(state.projects[0]?.id ?? "");
  const [selectedStep, setSelectedStep] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "?꾩껜">("?꾩껜");
  const [query, setQuery] = useState("");
  const [mailTemplate, setMailTemplate] = useState(0);
  const [mailTo, setMailTo] = useState("");
  const [mailCc, setMailCc] = useState("");
  const [aiProvider, setAiProvider] = useState<AiProvider>("openai");
  const [agentInput, setAgentInput] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([{ role: "assistant", content: "?꾨줈?앺듃瑜??좏깮?섍퀬 吏덈Ц?섎㈃ ?꾩옱 ?④퀎, ?댁뒋, ?ㅼ쓬 ?≪뀡???④퍡 遺꾩꽍?⑸땲??", provider: "openai" }]);

  useEffect(() => localStorage.setItem(stateKey, JSON.stringify(state)), [state]);
  useEffect(() => history.replaceState(null, "", `#${view}`), [view]);

  const selectedProject = state.projects.find((project) => project.id === selectedProjectId) ?? state.projects[0];
  const activeStep = selectedProject ? stepAt(selectedProject.step) : stepAt(selectedStep);
  const riskCount = state.projects.filter((project) => project.status !== "?뺤긽").length;
  const averageProgress = state.projects.length ? Math.round(state.projects.reduce((sum, project) => sum + progressOf(project), 0) / state.projects.length) : 0;

  const filteredProjects = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return state.projects.filter((project) => {
      const haystack = [project.name, project.client, project.owner, project.vendor, project.issue, project.status, project.priority].join(" ").toLowerCase();
      return (statusFilter === "?꾩껜" || project.status === statusFilter) && (!needle || haystack.includes(needle));
    });
  }, [query, state.projects, statusFilter]);

  const updateProject = (id: string, updater: (project: Project) => Project) => {
    setState((current) => ({ ...current, projects: current.projects.map((project) => (project.id === id ? updater(project) : project)) }));
  };

  const projectCheckItems = (project: Project): Array<[string, string, string]> => {
    const step = stepAt(project.step);
    const phaseRows = checklist.filter((row) => row[0] === step.phase).slice(0, 3);
    return [
      ["scope", "踰붿쐞? ?ㅼ퐫??, `${step.task} 湲곗? ?꾨씫 踰붿쐞 ?뺤씤`],
      ["owner", "?대떦?먯? ?묐젰?낆껜", project.vendor || "?묐젰?낆껜/PM 誘몄젙"],
      ["schedule", "?쇱젙怨?留덇컧 由ъ뒪??, project.due ? `${project.due} 湲곗? ?쇱젙 ?뺤씤` : "留덇컧??誘몄젙"],
      ...phaseRows.map((row, index) => [`phase-${index}`, row[1], row[2]] as [string, string, string])
    ];
  };

  const addProject = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    if (!name) return;
    const step = Number(form.get("step") || 1);
    const project: Project = {
      id: String(Date.now()),
      name,
      client: String(form.get("client") || ""),
      owner: String(form.get("owner") || ""),
      step,
      due: String(form.get("due") || ""),
      status: String(form.get("status") || "?뺤긽") as ProjectStatus,
      priority: String(form.get("priority") || "蹂댄넻") as ProjectPriority,
      vendor: String(form.get("vendor") || ""),
      issue: String(form.get("issue") || ""),
      nextAction: "?꾩옱 ?④퀎 湲곗??쇰줈 ?대떦?? ?쇱젙, ?곗텧臾쇱쓣 癒쇱? ?뺤젙?섏꽭??",
      checks: {},
      memoDraft: "",
      history: [{ date: todayIso(), step, state: "?깅줉", note: "?꾨줈?앺듃 ?깅줉 ??愿由??쒖옉" }]
    };
    setState((current) => ({ ...current, projects: [project, ...current.projects] }));
    setSelectedProjectId(project.id);
    event.currentTarget.reset();
  };

  const template = mailTemplates[mailTemplate] ?? mailTemplates[0];
  const applyProjectName = (value: string) => value.split("{?꾨줈?앺듃紐?").join(selectedProject?.name || "?꾨줈?앺듃");
  const mailSubject = selectedProject ? applyProjectName(template[1]) : template[1];
  const mailBody = selectedProject ? `${applyProjectName(template[2])}\n\n---\n?꾩옱 ?④퀎: ${selectedProject.step}. ${stepAt(selectedProject.step).task}\n?꾩옱 ?댁뒋: ${selectedProject.issue || "?깅줉???댁뒋 ?놁쓬"}\n?ㅼ쓬 ?≪뀡: ${selectedProject.nextAction}` : template[2];

  const openGmail = () => {
    const params = new URLSearchParams({ view: "cm", fs: "1", to: mailTo, cc: mailCc, su: mailSubject, body: mailBody });
    window.open(`https://mail.google.com/mail/?${params.toString()}`, "_blank", "noopener");
  };

  const projectContext = () => selectedProject ? [
    `?꾨줈?앺듃紐? ${selectedProject.name}`,
    `怨좉컼?? ${selectedProject.client || "誘몄젙"}`,
    `?대떦?? ${selectedProject.owner || "誘몄젙"}`,
    `?꾩옱 ?④퀎: ${selectedProject.step}. ${stepAt(selectedProject.step).task}`,
    `吏꾪뻾瑜? ${progressOf(selectedProject)}%`,
    `?곹깭: ${selectedProject.status}`,
    `?곗꽑?쒖쐞: ${selectedProject.priority}`,
    `留덇컧: ${selectedProject.due || "誘몄젙"}`,
    `?꾩옱 ?댁뒋: ${selectedProject.issue || "?놁쓬"}`,
    `?ㅼ쓬 ?≪뀡: ${selectedProject.nextAction}`
  ].join("\n") : "?좏깮???꾨줈?앺듃 ?놁쓬";

  const sendAgentPrompt = async (preset?: string) => {
    const question = (preset ?? agentInput).trim();
    if (!question || agentLoading) return;
    const provider = aiProvider;
    setAgentMessages((current) => [...current, { role: "user", content: question, provider }]);
    setAgentInput("");
    setAgentLoading(true);
    try {
      const response = await fetch(`/api/${provider}-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context: projectContext() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "AI ?묐떟??媛?몄삤吏 紐삵뻽?듬땲??");
      setAgentMessages((current) => [...current, { role: "assistant", content: data.answer || "?묐떟 ?댁슜??鍮꾩뼱 ?덉뒿?덈떎.", provider }]);
    } catch (error) {
      setAgentMessages((current) => [...current, { role: "assistant", content: error instanceof Error ? error.message : "AI ?곌껐 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.", provider }]);
    } finally {
      setAgentLoading(false);
    }
  };

  const quickAgentPrompts = ["?꾩옱 ?꾨줈?앺듃 由ъ뒪??遺꾩꽍", "?ㅼ쓬 ?≪뀡 5媛??뺣━", "?묐젰?낆껜 硫붿씪 珥덉븞", "FAT ??泥댄겕由ъ뒪??, "?뚯쓽 蹂닿퀬???붿빟"];


  return (
    <main className="app">
      <header className="topbar">
        <button className="home-button" onClick={() => setView("home")} aria-label="Home">??/button>
        <div className="brand"><span>3D</span><div><b>Engineering Command</b><small>Project operation cockpit</small></div></div>
        <nav>{views.map((item) => <button key={item.key} className={view === item.key ? "active" : ""} onClick={() => setView(item.key)}>{item.label}</button>)}</nav>
      </header>

      <section className="stage-band">
        <ThreeStage selectedStep={selectedProject?.step ?? selectedStep} onSelectStep={(step) => { setSelectedStep(step); setView("manual"); }} />
        <div className="stage-copy">
          <p>LIVE OPERATION MODEL</p>
          <h1>?꾨줈?앺듃 ?먮쫫??3D 紐⑤뜽泥섎읆 蹂닿퀬, ?ㅽ뻾 湲곕줉源뚯? ??踰덉뿉 愿由ы빀?덈떎.</h1>
          <div className="stat-row">
            <span><b>{state.projects.length}</b><small>Projects</small></span>
            <span><b>{riskCount}</b><small>Risk Watch</small></span>
            <span><b>{averageProgress}%</b><small>Avg Progress</small></span>
          </div>
        </div>
      </section>

      <div className="workbench">
        <aside className="side-rail">
          {views.map((item) => <button key={item.key} className={view === item.key ? "active" : ""} onClick={() => setView(item.key)}><b>{item.label}</b><small>{item.hint}</small></button>)}
        </aside>

        <section className="content-deck">
          {view === "home" && <div className="dashboard-grid">
            <div className="glass-panel wide"><h2>?댁쁺 ?꾪솴</h2><div className="orbit-metrics"><span>吏꾪뻾 {state.projects.length}</span><span>二쇱쓽/?꾪뿕 {riskCount}</span><span>?됯퇏 {averageProgress}%</span></div></div>
            {state.projects.slice(0, 4).map((project) => <button key={project.id} className="signal-card" onClick={() => { setSelectedProjectId(project.id); setView("projects"); }}><b>{project.name}</b><small>{project.client || "怨좉컼??誘몄젙"}</small><i style={{ background: statusColor(project.status) }}>{project.status}</i><div className="bar"><span style={{ width: `${progressOf(project)}%`, background: phaseMeta(project.step).color }} /></div></button>)}
          </div>}

          {view === "projects" && selectedProject && <div className="projects-grid">
            <div className="glass-panel list-panel">
              <div className="panel-head"><div><h2>Project List</h2><p>?곹깭蹂?寃?됯낵 ?대? ?ㅽ겕濡?/p></div><span>{filteredProjects.length}/{state.projects.length}</span></div>
              <div className="filters"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="?꾨줈?앺듃紐? 怨좉컼?? ?대떦??寃?? />{statusOrder.map((status) => <button key={status} className={statusFilter === status ? "active" : ""} onClick={() => setStatusFilter(status)}>{status}</button>)}</div>
              <div className="project-list">{filteredProjects.map((project) => <button key={project.id} className={`project-card ${selectedProject.id === project.id ? "active" : ""}`} onClick={() => { setSelectedProjectId(project.id); setSelectedStep(project.step); }} style={{ "--accent": phaseMeta(project.step).color } as React.CSSProperties}><span className="project-top"><b>{project.name}</b><i>{dueText(project.due)}</i></span><small>{project.client || "怨좉컼??誘몄젙"} 쨌 {project.owner || "?대떦 誘몄젙"}</small><em>{project.issue || "?깅줉???댁뒋 ?놁쓬"}</em><div className="project-meta"><span>{project.step}/20</span><span>{project.priority}</span><span>{project.status}</span></div><div className="bar"><span style={{ width: `${progressOf(project)}%` }} /></div></button>)}</div>
            </div>

            <div className="glass-panel detail-panel">
              <div className="detail-title"><div><p>Selected Project</p><h2>{selectedProject.name}</h2></div><span style={{ background: statusColor(selectedProject.status) }}>{selectedProject.status}</span></div>
              <div className="chips"><span style={{ background: phaseMeta(selectedProject.step).color }}>{phaseOf(selectedProject.step)}</span><span style={{ background: priorityColor(selectedProject.priority) }}>{selectedProject.priority}</span><span>{dueText(selectedProject.due)}</span></div>
              <div className="metrics"><div><small>怨좉컼??/small><b>{selectedProject.client || "誘몄젙"}</b></div><div><small>?대떦??/small><b>{selectedProject.owner || "誘몄젙"}</b></div><div><small>?묐젰/PM</small><b>{selectedProject.vendor || "誘몄젙"}</b></div><div><small>吏꾪뻾瑜?/small><b>{progressOf(selectedProject)}%</b></div></div>
              <div className="controls"><select value={selectedProject.step} onChange={(event) => updateProject(selectedProject.id, (project) => ({ ...project, step: Number(event.target.value), history: [...project.history, { date: todayIso(), step: Number(event.target.value), state: "?④퀎 蹂寃?, note: `${event.target.value}. ${stepAt(Number(event.target.value)).task}` }] }))}>{steps.map((step) => <option key={step.id} value={step.id}>{step.id}. {step.task}</option>)}</select><select value={selectedProject.status} onChange={(event) => updateProject(selectedProject.id, (project) => ({ ...project, status: event.target.value as ProjectStatus }))}><option>?뺤긽</option><option>二쇱쓽</option><option>?꾪뿕</option></select><select value={selectedProject.priority} onChange={(event) => updateProject(selectedProject.id, (project) => ({ ...project, priority: event.target.value as ProjectPriority }))}>{priorityOrder.map((priority) => <option key={priority}>{priority}</option>)}</select></div>
              <div className="next-action"><b>{selectedProject.step}. {activeStep.task}</b><span>{selectedProject.nextAction}</span></div>
              <div className="check-list">{projectCheckItems(selectedProject).map(([key, title, detail]) => <label key={key} className={selectedProject.checks[key] ? "done" : ""}><input type="checkbox" checked={Boolean(selectedProject.checks[key])} onChange={(event) => updateProject(selectedProject.id, (project) => ({ ...project, checks: { ...project.checks, [key]: event.target.checked } }))} /><span><b>{title}</b><small>{detail}</small></span></label>)}</div>
              <textarea value={selectedProject.memoDraft} onChange={(event) => updateProject(selectedProject.id, (project) => ({ ...project, memoDraft: event.target.value }))} placeholder="?ㅻ뒛 ?뺤씤???댁슜, 蹂寃쎌궗?? ?대떦???쇰뱶諛? />
              <div className="actions"><button onClick={() => updateProject(selectedProject.id, (project) => project.memoDraft.trim() ? { ...project, memoDraft: "", history: [...project.history, { date: todayIso(), step: project.step, state: "硫붾え", note: project.memoDraft.trim() }] } : project)}>硫붾え ???/button><button onClick={() => { setMailTemplate(selectedProject.step >= 18 ? 2 : selectedProject.step >= 10 ? 1 : 0); setView("mail"); }}>Gmail 以鍮?/button></div>
              <div className="timeline">{selectedProject.history.slice(-7).reverse().map((item, index) => <div key={`${item.date}-${index}`}><b>{item.date} 쨌 {item.state}</b><span>{item.note}</span></div>)}</div>
            </div>

            <form className="glass-panel add-form" onSubmit={addProject}><h3>?꾨줈?앺듃 異붽?</h3><input name="name" placeholder="?꾨줈?앺듃紐? /><input name="client" placeholder="怨좉컼???꾩옣" /><input name="owner" placeholder="?대떦?? /><select name="step">{steps.map((step) => <option key={step.id} value={step.id}>{step.id}. {step.task}</option>)}</select><input name="due" type="date" /><select name="status"><option>?뺤긽</option><option>二쇱쓽</option><option>?꾪뿕</option></select><select name="priority"><option>蹂댄넻</option><option>?믪쓬</option><option>湲닿툒</option></select><input name="vendor" placeholder="?묐젰?낆껜/PM" /><input name="issue" placeholder="?꾩옱 ?댁뒋" /><button>異붽?</button></form>
          </div>}

          {view === "calendar" && <div className="glass-panel"><h2>留덉씪?ㅽ넠 罹섎┛??/h2><div className="calendar-board">{state.projects.map((project) => <button key={project.id} onClick={() => { setSelectedProjectId(project.id); setView("projects"); }}><b>{project.due || "?쇱젙 誘몄젙"}</b><span>{project.name}</span><small>{project.step}. {stepAt(project.step).task}</small><i style={{ background: statusColor(project.status) }}>{project.status}</i></button>)}</div></div>}
          {view === "manual" && <div className="manual-grid"><div className="glass-panel step-list">{steps.map((step) => <button key={step.id} className={selectedStep === step.id ? "active" : ""} onClick={() => setSelectedStep(step.id)}>{step.id}. {step.task}<small>{step.phase}</small></button>)}</div><div className="glass-panel"><h2>{selectedStep}. {stepAt(selectedStep).task}</h2><div className="metrics"><div><small>?대떦</small><b>{stepAt(selectedStep).owner}</b></div><div><small>?먮즺</small><b>{stepAt(selectedStep).docs}</b></div></div><p>{stepAt(selectedStep).check}</p><p>{stepAt(selectedStep).caution}</p></div></div>}
          {view === "documents" && <div className="glass-panel doc-grid"><h2>臾몄꽌 ?먮쫫</h2>{["寃???섎ː", "?ъ뼇???덉씠?꾩썐", "?묐젰?낆껜 寃ъ쟻??, "?먭?吏묎퀎??, "諛쒖＜??怨꾩빟??, "?μ삤???뚯쓽濡?, "?뱀씤??, "?뚯뒪??寃곌낵??].map((doc, index) => <div key={doc}><b>DOC {String(index + 1).padStart(2, "0")}</b><span>{doc}</span><small>{steps[Math.min(index * 2, steps.length - 1)].phase}</small></div>)}</div>}
          {view === "mail" && <div className="glass-panel mail-grid"><div><h2>Gmail Flow</h2>{mailTemplates.map((tpl, index) => <button key={tpl[0]} className={mailTemplate === index ? "active" : ""} onClick={() => setMailTemplate(index)}>{tpl[0]}</button>)}</div><div><input value={mailTo} onChange={(event) => setMailTo(event.target.value)} placeholder="諛쏅뒗 ?щ엺" /><input value={mailCc} onChange={(event) => setMailCc(event.target.value)} placeholder="李몄“" /><input value={mailSubject} readOnly /><textarea value={mailBody} readOnly /><button onClick={openGmail}>Gmail ?묒꽦李??닿린</button></div></div>}
          {view === "sources" && <div className="glass-panel"><h2>?먮낯 諛섏쁺 ?뺤씤</h2><p>Notion ?낅Т ?먮쫫, ?묒? ?낅Т ?꾨줈?몄뒪, ?꾨줈?앺듃 愿由??붽뎄?ы빆???꾨줈?앺듃 愿???붾㈃怨??④퀎蹂?泥댄겕 ?먮쫫??諛섏쁺?덉뒿?덈떎.</p></div>}
        </section>

        <aside className="agent-panel agent-chat-panel chat-window">
          <div className="chat-window-header">
            <div><h3>AI Agent Group</h3><small>선택 프로젝트 맥락을 포함해 바로 대화</small></div>
            <span>{aiProvider === "openai" ? "OpenAI" : "Gemini"}</span>
          </div>
          <div className="agent-provider segmented-control" role="tablist" aria-label="AI provider">
            <button className={aiProvider === "openai" ? "active" : ""} onClick={() => setAiProvider("openai")}>OpenAI</button>
            <button className={aiProvider === "gemini" ? "active" : ""} onClick={() => setAiProvider("gemini")}>Gemini</button>
          </div>
          <div className="chat-context-card"><b>{selectedProject?.name || "프로젝트 미선택"}</b><small>{selectedProject ? `${selectedProject.step}. ${stepAt(selectedProject.step).task}` : "프로젝트를 선택하면 맥락이 연결됩니다."}</small></div>
          <div className="quick-prompts chat-chips">{quickAgentPrompts.map((prompt) => <button key={prompt} onClick={() => sendAgentPrompt(prompt)} disabled={agentLoading}>{prompt}</button>)}</div>
          <div className="agent-chat-log chat-body" aria-live="polite">{agentMessages.map((message, index) => <div key={`${message.role}-${index}`} className={`agent-message bubble ${message.role}`}><b>{message.role === "user" ? "You" : message.provider === "gemini" ? "Gemini" : "OpenAI"}</b><p>{message.content}</p></div>)}{agentLoading && <div className="agent-message bubble assistant"><b>{aiProvider === "openai" ? "OpenAI" : "Gemini"}</b><p>분석 중입니다...</p></div>}</div>
          <div className="agent-input-row chat-composer"><textarea value={agentInput} onChange={(event) => setAgentInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) sendAgentPrompt(); }} placeholder="질문을 입력하세요. Ctrl+Enter로 전송" /><button onClick={() => sendAgentPrompt()} disabled={agentLoading || !agentInput.trim()}>전송</button></div>
        </aside>
      </div>
    </main>
  );
}
