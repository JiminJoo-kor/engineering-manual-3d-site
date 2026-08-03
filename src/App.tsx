import { useEffect, useMemo, useState } from "react";
import { checklist, defaultProjects, mailTemplates, phases, steps } from "./data";
import type { Project, ProjectPriority, ProjectStatus, SavedState, ViewKey } from "./types";
import ThreeStage from "./ThreeStage";

const stateKey = "engineering3dProjectManualReactV2";
const views: Array<{ key: ViewKey; label: string; hint: string }> = [
  { key: "home", label: "Home", hint: "3D 관제" },
  { key: "projects", label: "프로젝트", hint: "목록/진행" },
  { key: "calendar", label: "캘린더", hint: "마일스톤" },
  { key: "manual", label: "매뉴얼", hint: "20단계" },
  { key: "documents", label: "문서 흐름", hint: "산출물" },
  { key: "mail", label: "Gmail", hint: "작성 준비" },
  { key: "sources", label: "원본 확인", hint: "반영 기준" }
];

const statusOrder: Array<ProjectStatus | "전체"> = ["전체", "정상", "주의", "위험"];
const priorityOrder: ProjectPriority[] = ["보통", "높음", "긴급"];
type AiProvider = "openai" | "gemini";
interface AgentMessage { role: "user" | "assistant"; content: string; provider?: AiProvider }

const phaseOf = (stepId: number) => steps.find((step) => step.id === Number(stepId))?.phase ?? "수주 전";
const phaseMeta = (stepId: number) => phases.find((phase) => phase.name === phaseOf(stepId)) ?? phases[0];
const progressOf = (project: Project) => Math.max(0, Math.min(100, Math.round(((project.step - 1) / (steps.length - 1)) * 100)));
const todayIso = () => new Date().toISOString().slice(0, 10);

function statusColor(status: ProjectStatus) {
  return status === "위험" ? "#ff4d6d" : status === "주의" ? "#ffb84d" : "#38d996";
}

function priorityColor(priority: ProjectPriority) {
  return priority === "긴급" ? "#ff4d6d" : priority === "높음" ? "#ffb84d" : "#5b8cff";
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
  if (days === null || Number.isNaN(days)) return "일정 미정";
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
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "전체">("전체");
  const [query, setQuery] = useState("");
  const [mailTemplate, setMailTemplate] = useState(0);
  const [mailTo, setMailTo] = useState("");
  const [mailCc, setMailCc] = useState("");
  const [aiProvider, setAiProvider] = useState<AiProvider>("openai");
  const [agentInput, setAgentInput] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([{ role: "assistant", content: "프로젝트를 선택하고 질문하면 현재 단계, 이슈, 다음 액션을 함께 분석합니다.", provider: "openai" }]);

  const [personalOpenAiKey, setPersonalOpenAiKey] = useState("");
  const [personalGeminiKey, setPersonalGeminiKey] = useState("");
  const activePersonalKey = aiProvider === "openai" ? personalOpenAiKey.trim() : personalGeminiKey.trim();
  useEffect(() => localStorage.setItem(stateKey, JSON.stringify(state)), [state]);
  useEffect(() => history.replaceState(null, "", `#${view}`), [view]);

  const selectedProject = state.projects.find((project) => project.id === selectedProjectId) ?? state.projects[0];
  const activeStep = selectedProject ? stepAt(selectedProject.step) : stepAt(selectedStep);
  const riskCount = state.projects.filter((project) => project.status !== "정상").length;
  const averageProgress = state.projects.length ? Math.round(state.projects.reduce((sum, project) => sum + progressOf(project), 0) / state.projects.length) : 0;

  const filteredProjects = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return state.projects.filter((project) => {
      const haystack = [project.name, project.client, project.owner, project.vendor, project.issue, project.status, project.priority].join(" ").toLowerCase();
      return (statusFilter === "전체" || project.status === statusFilter) && (!needle || haystack.includes(needle));
    });
  }, [query, state.projects, statusFilter]);

  const updateProject = (id: string, updater: (project: Project) => Project) => {
    setState((current) => ({ ...current, projects: current.projects.map((project) => (project.id === id ? updater(project) : project)) }));
  };

  const projectCheckItems = (project: Project): Array<[string, string, string]> => {
    const step = stepAt(project.step);
    const phaseRows = checklist.filter((row) => row[0] === step.phase).slice(0, 3);
    return [
      ["scope", "범위와 스코프", `${step.task} 기준 누락 범위 확인`],
      ["owner", "담당자와 협력업체", project.vendor || "협력업체/PM 미정"],
      ["schedule", "일정과 마감 리스크", project.due ? `${project.due} 기준 일정 확인` : "마감일 미정"],
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
      status: String(form.get("status") || "정상") as ProjectStatus,
      priority: String(form.get("priority") || "보통") as ProjectPriority,
      vendor: String(form.get("vendor") || ""),
      issue: String(form.get("issue") || ""),
      nextAction: "현재 단계 기준으로 담당자, 일정, 산출물을 먼저 확정하세요.",
      checks: {},
      memoDraft: "",
      history: [{ date: todayIso(), step, state: "등록", note: "프로젝트 등록 후 관리 시작" }]
    };
    setState((current) => ({ ...current, projects: [project, ...current.projects] }));
    setSelectedProjectId(project.id);
    event.currentTarget.reset();
  };

  const template = mailTemplates[mailTemplate] ?? mailTemplates[0];
  const applyProjectName = (value: string) => value.split("{프로젝트명}").join(selectedProject?.name || "프로젝트");
  const mailSubject = selectedProject ? applyProjectName(template[1]) : template[1];
  const mailBody = selectedProject ? `${applyProjectName(template[2])}\n\n---\n현재 단계: ${selectedProject.step}. ${stepAt(selectedProject.step).task}\n현재 이슈: ${selectedProject.issue || "등록된 이슈 없음"}\n다음 액션: ${selectedProject.nextAction}` : template[2];

  const openGmail = () => {
    const params = new URLSearchParams({ view: "cm", fs: "1", to: mailTo, cc: mailCc, su: mailSubject, body: mailBody });
    window.open(`https://mail.google.com/mail/?${params.toString()}`, "_blank", "noopener");
  };

  const projectContext = () => selectedProject ? [
    `프로젝트명: ${selectedProject.name}`,
    `고객사: ${selectedProject.client || "미정"}`,
    `담당자: ${selectedProject.owner || "미정"}`,
    `현재 단계: ${selectedProject.step}. ${stepAt(selectedProject.step).task}`,
    `진행률: ${progressOf(selectedProject)}%`,
    `상태: ${selectedProject.status}`,
    `우선순위: ${selectedProject.priority}`,
    `마감: ${selectedProject.due || "미정"}`,
    `현재 이슈: ${selectedProject.issue || "없음"}`,
    `다음 액션: ${selectedProject.nextAction}`
  ].join("\n") : "선택된 프로젝트 없음";

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
        body: JSON.stringify({ question, context: projectContext(), apiKey: activePersonalKey || undefined })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "AI 응답을 가져오지 못했습니다.");
      setAgentMessages((current) => [...current, { role: "assistant", content: data.answer || "응답 내용이 비어 있습니다.", provider }]);
    } catch (error) {
      setAgentMessages((current) => [...current, { role: "assistant", content: error instanceof Error ? error.message : "AI 연결 중 오류가 발생했습니다.", provider }]);
    } finally {
      setAgentLoading(false);
    }
  };

  const quickAgentPrompts = ["현재 프로젝트 리스크 분석", "다음 액션 5개 정리", "협력업체 메일 초안", "FAT 전 체크리스트", "회의 보고용 요약"];


  return (
    <main className="app">
      <header className="topbar">
        <button className="home-button" onClick={() => setView("home")} aria-label="Home">⌂</button>
        <div className="brand"><span>3D</span><div><b>Engineering Command</b><small>Project operation cockpit</small></div></div>
        <nav>{views.map((item) => <button key={item.key} className={view === item.key ? "active" : ""} onClick={() => setView(item.key)}>{item.label}</button>)}</nav>
      </header>

      <section className="stage-band">
        <ThreeStage selectedStep={selectedProject?.step ?? selectedStep} onSelectStep={(step) => { setSelectedStep(step); setView("manual"); }} />
        <div className="stage-copy">
          <p>LIVE OPERATION MODEL</p>
          <h1>프로젝트 흐름을 3D 모델처럼 보고, 실행 기록까지 한 번에 관리합니다.</h1>
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
            <div className="glass-panel wide"><h2>운영 현황</h2><div className="orbit-metrics"><span>진행 {state.projects.length}</span><span>주의/위험 {riskCount}</span><span>평균 {averageProgress}%</span></div></div>
            {state.projects.slice(0, 4).map((project) => <button key={project.id} className="signal-card" onClick={() => { setSelectedProjectId(project.id); setView("projects"); }}><b>{project.name}</b><small>{project.client || "고객사 미정"}</small><i style={{ background: statusColor(project.status) }}>{project.status}</i><div className="bar"><span style={{ width: `${progressOf(project)}%`, background: phaseMeta(project.step).color }} /></div></button>)}
          </div>}

          {view === "projects" && selectedProject && <div className="projects-grid">
            <div className="glass-panel list-panel">
              <div className="panel-head"><div><h2>Project List</h2><p>상태별 검색과 내부 스크롤</p></div><span>{filteredProjects.length}/{state.projects.length}</span></div>
              <div className="filters"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="프로젝트명, 고객사, 담당자 검색" />{statusOrder.map((status) => <button key={status} className={statusFilter === status ? "active" : ""} onClick={() => setStatusFilter(status)}>{status}</button>)}</div>
              <div className="project-list">{filteredProjects.map((project) => <button key={project.id} className={`project-card ${selectedProject.id === project.id ? "active" : ""}`} onClick={() => { setSelectedProjectId(project.id); setSelectedStep(project.step); }} style={{ "--accent": phaseMeta(project.step).color } as React.CSSProperties}><span className="project-top"><b>{project.name}</b><i>{dueText(project.due)}</i></span><small>{project.client || "고객사 미정"} · {project.owner || "담당 미정"}</small><em>{project.issue || "등록된 이슈 없음"}</em><div className="project-meta"><span>{project.step}/20</span><span>{project.priority}</span><span>{project.status}</span></div><div className="bar"><span style={{ width: `${progressOf(project)}%` }} /></div></button>)}</div>
            </div>

            <div className="glass-panel detail-panel">
              <div className="detail-title"><div><p>Selected Project</p><h2>{selectedProject.name}</h2></div><span style={{ background: statusColor(selectedProject.status) }}>{selectedProject.status}</span></div>
              <div className="chips"><span style={{ background: phaseMeta(selectedProject.step).color }}>{phaseOf(selectedProject.step)}</span><span style={{ background: priorityColor(selectedProject.priority) }}>{selectedProject.priority}</span><span>{dueText(selectedProject.due)}</span></div>
              <div className="metrics"><div><small>고객사</small><b>{selectedProject.client || "미정"}</b></div><div><small>담당자</small><b>{selectedProject.owner || "미정"}</b></div><div><small>협력/PM</small><b>{selectedProject.vendor || "미정"}</b></div><div><small>진행률</small><b>{progressOf(selectedProject)}%</b></div></div>
              <div className="controls"><select value={selectedProject.step} onChange={(event) => updateProject(selectedProject.id, (project) => ({ ...project, step: Number(event.target.value), history: [...project.history, { date: todayIso(), step: Number(event.target.value), state: "단계 변경", note: `${event.target.value}. ${stepAt(Number(event.target.value)).task}` }] }))}>{steps.map((step) => <option key={step.id} value={step.id}>{step.id}. {step.task}</option>)}</select><select value={selectedProject.status} onChange={(event) => updateProject(selectedProject.id, (project) => ({ ...project, status: event.target.value as ProjectStatus }))}><option>정상</option><option>주의</option><option>위험</option></select><select value={selectedProject.priority} onChange={(event) => updateProject(selectedProject.id, (project) => ({ ...project, priority: event.target.value as ProjectPriority }))}>{priorityOrder.map((priority) => <option key={priority}>{priority}</option>)}</select></div>
              <div className="next-action"><b>{selectedProject.step}. {activeStep.task}</b><span>{selectedProject.nextAction}</span></div>
              <div className="check-list">{projectCheckItems(selectedProject).map(([key, title, detail]) => <label key={key} className={selectedProject.checks[key] ? "done" : ""}><input type="checkbox" checked={Boolean(selectedProject.checks[key])} onChange={(event) => updateProject(selectedProject.id, (project) => ({ ...project, checks: { ...project.checks, [key]: event.target.checked } }))} /><span><b>{title}</b><small>{detail}</small></span></label>)}</div>
              <textarea value={selectedProject.memoDraft} onChange={(event) => updateProject(selectedProject.id, (project) => ({ ...project, memoDraft: event.target.value }))} placeholder="오늘 확인한 내용, 변경사항, 담당자 피드백" />
              <div className="actions"><button onClick={() => updateProject(selectedProject.id, (project) => project.memoDraft.trim() ? { ...project, memoDraft: "", history: [...project.history, { date: todayIso(), step: project.step, state: "메모", note: project.memoDraft.trim() }] } : project)}>메모 저장</button><button onClick={() => { setMailTemplate(selectedProject.step >= 18 ? 2 : selectedProject.step >= 10 ? 1 : 0); setView("mail"); }}>Gmail 준비</button></div>
              <div className="timeline">{selectedProject.history.slice(-7).reverse().map((item, index) => <div key={`${item.date}-${index}`}><b>{item.date} · {item.state}</b><span>{item.note}</span></div>)}</div>
            </div>

            <form className="glass-panel add-form" onSubmit={addProject}><h3>프로젝트 추가</h3><input name="name" placeholder="프로젝트명" /><input name="client" placeholder="고객사/현장" /><input name="owner" placeholder="담당자" /><select name="step">{steps.map((step) => <option key={step.id} value={step.id}>{step.id}. {step.task}</option>)}</select><input name="due" type="date" /><select name="status"><option>정상</option><option>주의</option><option>위험</option></select><select name="priority"><option>보통</option><option>높음</option><option>긴급</option></select><input name="vendor" placeholder="협력업체/PM" /><input name="issue" placeholder="현재 이슈" /><button>추가</button></form>
          </div>}

          {view === "calendar" && <div className="glass-panel"><h2>마일스톤 캘린더</h2><div className="calendar-board">{state.projects.map((project) => <button key={project.id} onClick={() => { setSelectedProjectId(project.id); setView("projects"); }}><b>{project.due || "일정 미정"}</b><span>{project.name}</span><small>{project.step}. {stepAt(project.step).task}</small><i style={{ background: statusColor(project.status) }}>{project.status}</i></button>)}</div></div>}
          {view === "manual" && <div className="manual-grid"><div className="glass-panel step-list">{steps.map((step) => <button key={step.id} className={selectedStep === step.id ? "active" : ""} onClick={() => setSelectedStep(step.id)}>{step.id}. {step.task}<small>{step.phase}</small></button>)}</div><div className="glass-panel"><h2>{selectedStep}. {stepAt(selectedStep).task}</h2><div className="metrics"><div><small>담당</small><b>{stepAt(selectedStep).owner}</b></div><div><small>자료</small><b>{stepAt(selectedStep).docs}</b></div></div><p>{stepAt(selectedStep).check}</p><p>{stepAt(selectedStep).caution}</p></div></div>}
          {view === "documents" && <div className="glass-panel doc-grid"><h2>문서 흐름</h2>{["검토 의뢰", "사양서/레이아웃", "협력업체 견적서", "원가집계표", "발주서/계약서", "킥오프 회의록", "승인도", "테스트 결과표"].map((doc, index) => <div key={doc}><b>DOC {String(index + 1).padStart(2, "0")}</b><span>{doc}</span><small>{steps[Math.min(index * 2, steps.length - 1)].phase}</small></div>)}</div>}
          {view === "mail" && <div className="glass-panel mail-grid"><div><h2>Gmail Flow</h2>{mailTemplates.map((tpl, index) => <button key={tpl[0]} className={mailTemplate === index ? "active" : ""} onClick={() => setMailTemplate(index)}>{tpl[0]}</button>)}</div><div><input value={mailTo} onChange={(event) => setMailTo(event.target.value)} placeholder="받는 사람" /><input value={mailCc} onChange={(event) => setMailCc(event.target.value)} placeholder="참조" /><input value={mailSubject} readOnly /><textarea value={mailBody} readOnly /><button onClick={openGmail}>Gmail 작성창 열기</button></div></div>}
          {view === "sources" && <div className="glass-panel"><h2>원본 반영 확인</h2><p>Notion 업무 흐름, 엑셀 업무 프로세스, 프로젝트 관리 요구사항을 프로젝트 관제 화면과 단계별 체크 흐름에 반영했습니다.</p></div>}
        </section>

        <aside className="agent-panel agent-chat-panel chat-window">
          <div className="chat-window-header">
            <div>
              <h3>AI Agent Group</h3>
              <small>선택 프로젝트 맥락을 포함해 바로 대화</small>
            </div>
            <span>{aiProvider === "openai" ? "OpenAI" : "Gemini"}</span>
          </div>
          <div className="agent-provider segmented-control" role="tablist" aria-label="AI provider">
            <button className={aiProvider === "openai" ? "active" : ""} onClick={() => setAiProvider("openai")}>OpenAI</button>
            <button className={aiProvider === "gemini" ? "active" : ""} onClick={() => setAiProvider("gemini")}>Gemini</button>
          </div>
          <div className="personal-ai-card">
            <div><b>Personal AI Connection</b><small>{activePersonalKey ? "Using your personal API key for this AI." : "No personal key: site default key will be used when available."}</small></div>
            {aiProvider === "openai" ? <input type="password" value={personalOpenAiKey} onChange={(event) => setPersonalOpenAiKey(event.target.value)} placeholder="Enter OpenAI API Key" autoComplete="off" /> : <input type="password" value={personalGeminiKey} onChange={(event) => setPersonalGeminiKey(event.target.value)} placeholder="Enter Gemini API Key" autoComplete="off" />}
            <small className="privacy-note">The key is not saved and is used only in this browser screen.</small>
          </div>
          <div className="chat-context-card">
            <b>{selectedProject?.name || "프로젝트 미선택"}</b>
            <small>{selectedProject ? `${selectedProject.step}. ${stepAt(selectedProject.step).task}` : "프로젝트를 선택하면 맥락이 연결됩니다."}</small>
          </div>
          <div className="quick-prompts chat-chips">
            {quickAgentPrompts.map((prompt) => <button key={prompt} onClick={() => sendAgentPrompt(prompt)} disabled={agentLoading}>{prompt}</button>)}
          </div>
          <div className="agent-chat-log chat-body" aria-live="polite">
            {agentMessages.map((message, index) => <div key={`${message.role}-${index}`} className={`agent-message bubble ${message.role}`}><b>{message.role === "user" ? "You" : message.provider === "gemini" ? "Gemini" : "OpenAI"}</b><p>{message.content}</p></div>)}
            {agentLoading && <div className="agent-message bubble assistant"><b>{aiProvider === "openai" ? "OpenAI" : "Gemini"}</b><p>분석 중입니다...</p></div>}
          </div>
          <div className="agent-input-row chat-composer"><textarea value={agentInput} onChange={(event) => setAgentInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) sendAgentPrompt(); }} placeholder="질문 입력: 현재 프로젝트 리스크, 메일 초안, 다음 액션 등" /><button onClick={() => sendAgentPrompt()} disabled={agentLoading || !agentInput.trim()}>전송</button></div>
        </aside>
      </div>
    </main>
  );
}
