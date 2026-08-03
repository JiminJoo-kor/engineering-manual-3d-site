import { useEffect, useMemo, useState } from "react";
import { checklist, defaultProjects, mailTemplates, phases, steps } from "./data";
import type { Project, ProjectPriority, ProjectStatus, SavedState, ViewKey } from "./types";
import ThreeStage from "./ThreeStage";

const stateKey = "engineering3dProjectManualReactV1";
const views: Array<{ key: ViewKey; label: string; hint: string }> = [
  { key: "home", label: "Home", hint: "3D 시작" },
  { key: "projects", label: "프로젝트", hint: "목록·진행·메모" },
  { key: "calendar", label: "캘린더", hint: "마감·FAT" },
  { key: "manual", label: "매뉴얼", hint: "20단계" },
  { key: "documents", label: "문서 흐름", hint: "산출물" },
  { key: "mail", label: "Gmail", hint: "메일 준비" },
  { key: "sources", label: "원본 확인", hint: "반영 기준" }
];

const phaseOf = (stepId: number) => steps.find((step) => step.id === Number(stepId))?.phase ?? "수주 전";
const phaseMeta = (stepId: number) => phases.find((phase) => phase.name === phaseOf(stepId)) ?? phases[0];
const progressOf = (project: Project) => Math.round(((project.step - 1) / (steps.length - 1)) * 100);
const todayIso = () => new Date().toISOString().slice(0, 10);

function statusColor(status: ProjectStatus) {
  return status === "위험" ? "#ff6464" : status === "주의" ? "#d99135" : "#45c782";
}

function priorityColor(priority: ProjectPriority) {
  return priority === "긴급" ? "#ff6464" : priority === "높음" ? "#d99135" : "#4f8cff";
}

function readState(): SavedState {
  try {
    const parsed = JSON.parse(localStorage.getItem(stateKey) || "");
    if (parsed?.projects) return parsed;
  } catch {
    // ignore old storage
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
  if (days === null || Number.isNaN(days)) return "마감 미정";
  if (days < 0) return `D+${Math.abs(days)}`;
  if (days === 0) return "D-Day";
  return `D-${days}`;
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

  useEffect(() => localStorage.setItem(stateKey, JSON.stringify(state)), [state]);
  useEffect(() => history.replaceState(null, "", `#${view}`), [view]);

  const selectedProject = state.projects.find((project) => project.id === selectedProjectId) ?? state.projects[0];
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

  const projectCheckItems = (project: Project) => {
    const step = steps[project.step - 1] ?? steps[0];
    const phaseRows = checklist.filter((row) => row[0] === step.phase).slice(0, 3);
    return [
      ["scope", "범위·스코프 확인", `${step.task} 기준 누락 범위 확인`],
      ["owner", "담당자·협력업체 확인", project.vendor || "협력업체/PM 미정"],
      ["schedule", "일정·마감 리스크 확인", project.due ? `${project.due} 기준 일정 확인` : "마감일 미정"],
      ...phaseRows.map((row, index) => [`phase-${index}`, row[1], row[2]])
    ];
  };

  const addProject = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    if (!name) return;
    const project: Project = {
      id: String(Date.now()),
      name,
      client: String(form.get("client") || ""),
      owner: String(form.get("owner") || ""),
      step: Number(form.get("step") || 1),
      due: String(form.get("due") || ""),
      status: String(form.get("status") || "정상") as ProjectStatus,
      priority: String(form.get("priority") || "보통") as ProjectPriority,
      vendor: String(form.get("vendor") || ""),
      issue: String(form.get("issue") || ""),
      nextAction: "신규 등록 프로젝트입니다. 현재 단계 기준으로 담당자, 일정, 산출물을 먼저 확정하세요.",
      checks: {},
      memoDraft: "",
      history: [{ date: todayIso(), step: Number(form.get("step") || 1), state: "진행", note: "프로젝트 등록 후 관리 시작" }]
    };
    setState((current) => ({ ...current, projects: [project, ...current.projects] }));
    setSelectedProjectId(project.id);
    event.currentTarget.reset();
  };

  const template = mailTemplates[mailTemplate];
  const applyProjectName = (value: string) => value.split("{프로젝트명}").join(selectedProject?.name || "프로젝트");
  const mailSubject = selectedProject ? applyProjectName(template[1]) : template[1];
  const mailBody = selectedProject ? `${applyProjectName(template[2])}\n\n---\n현재 단계: ${selectedProject.step}. ${steps[selectedProject.step - 1].task}\n현재 이슈: ${selectedProject.issue || "등록된 이슈 없음"}\n다음 액션: ${selectedProject.nextAction}` : template[2];

  const openGmail = () => {
    const params = new URLSearchParams({ view: "cm", fs: "1", to: mailTo, cc: mailCc, su: mailSubject, body: mailBody });
    window.open(`https://mail.google.com/mail/?${params.toString()}`, "_blank", "noopener");
  };

  return (
    <main className={`app ${view === "home" ? "home-mode" : "work-mode"}`}>
      <header className="topbar">
        <div className="brand"><span>3D</span><div><b>Engineering Operation</b><small>React + TypeScript + Three.js</small></div></div>
        <nav>{views.map((item) => <button key={item.key} className={view === item.key ? "active" : ""} onClick={() => setView(item.key)}>{item.label}</button>)}</nav>
        <button className="primary" onClick={() => setView("projects")}>프로젝트 관리</button>
      </header>

      {view === "home" && <section className="hero">
        <ThreeStage selectedStep={selectedStep} onSelectStep={(step) => { setSelectedStep(step); setView("manual"); }} />
        <div className="hero-copy">
          <p>3D PROCESS CONSOLE</p>
          <h1>프로젝트를 입체적으로 보고, 단계별 실행을 바로 기록합니다.</h1>
          <span>프로젝트 목록, 진행 체크, 메모 이력, 캘린더, Gmail 준비까지 하나의 운영 화면으로 정리했습니다.</span>
          <div className="hero-stats"><b>{state.projects.length}</b><b>{state.projects.filter((p) => p.status !== "정상").length}</b><b>{Math.round(state.projects.reduce((sum, p) => sum + progressOf(p), 0) / state.projects.length)}%</b></div>
        </div>
      </section>}

      {view !== "home" && <div className="shell">
        <aside className="side-menu">{views.map((item) => <button key={item.key} className={view === item.key ? "active" : ""} onClick={() => setView(item.key)}><b>{item.label}</b><small>{item.hint}</small></button>)}</aside>
        <section className="content">
          {view === "projects" && selectedProject && <div className="projects-grid">
            <div className="panel list-panel">
              <div className="panel-head"><h2>Project List</h2><span>계속 추가되어도 내부 스크롤로 관리</span></div>
              <div className="filters"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="프로젝트명, 고객사, 담당자 검색" />{(["전체", "정상", "주의", "위험"] as const).map((status) => <button key={status} className={statusFilter === status ? "active" : ""} onClick={() => setStatusFilter(status)}>{status}</button>)}</div>
              <div className="project-list">{filteredProjects.map((project) => <button key={project.id} className={`project-card ${selectedProject.id === project.id ? "active" : ""}`} onClick={() => { setSelectedProjectId(project.id); setSelectedStep(project.step); }} style={{ "--accent": phaseMeta(project.step).color } as React.CSSProperties}><b>{project.name}</b><span>{project.client || "고객사 미정"} · {project.owner || "담당 미정"}</span><em>{project.issue || "등록된 이슈 없음"}</em><i>{project.step}/20 · {dueText(project.due)} · {project.status}</i><div className="bar"><span style={{ width: `${progressOf(project)}%` }} /></div></button>)}</div>
            </div>
            <div className="panel detail-panel">
              <div className="detail-title"><div><p>Selected Project</p><h2>{selectedProject.name}</h2></div><span style={{ background: statusColor(selectedProject.status) }}>{selectedProject.status}</span></div>
              <div className="chips"><span style={{ background: phaseMeta(selectedProject.step).color }}>{phaseOf(selectedProject.step)}</span><span style={{ background: priorityColor(selectedProject.priority) }}>{selectedProject.priority}</span><span>{dueText(selectedProject.due)}</span></div>
              <div className="metrics"><div><small>고객사</small><b>{selectedProject.client || "미정"}</b></div><div><small>담당자</small><b>{selectedProject.owner || "미정"}</b></div><div><small>협력/PM</small><b>{selectedProject.vendor || "미정"}</b></div><div><small>진행률</small><b>{progressOf(selectedProject)}%</b></div></div>
              <div className="controls"><select value={selectedProject.step} onChange={(e) => updateProject(selectedProject.id, (p) => ({ ...p, step: Number(e.target.value), history: [...p.history, { date: todayIso(), step: Number(e.target.value), state: "진행", note: `${e.target.value}. ${steps[Number(e.target.value) - 1].task} 단계로 변경` }] }))}>{steps.map((step) => <option key={step.id} value={step.id}>{step.id}. {step.task}</option>)}</select><select value={selectedProject.status} onChange={(e) => updateProject(selectedProject.id, (p) => ({ ...p, status: e.target.value as ProjectStatus }))}><option>정상</option><option>주의</option><option>위험</option></select><select value={selectedProject.priority} onChange={(e) => updateProject(selectedProject.id, (p) => ({ ...p, priority: e.target.value as ProjectPriority }))}><option>보통</option><option>높음</option><option>긴급</option></select></div>
              <div className="next-action"><b>{selectedProject.step}. {steps[selectedProject.step - 1].task}</b><br />{selectedProject.nextAction}</div>
              <div className="check-list">{projectCheckItems(selectedProject).map(([key, title, detail]) => <label key={key} className={selectedProject.checks[key] ? "done" : ""}><input type="checkbox" checked={Boolean(selectedProject.checks[key])} onChange={(e) => updateProject(selectedProject.id, (p) => ({ ...p, checks: { ...p.checks, [key]: e.target.checked } }))} /><span><b>{title}</b><small>{detail}</small></span></label>)}</div>
              <textarea value={selectedProject.memoDraft} onChange={(e) => updateProject(selectedProject.id, (p) => ({ ...p, memoDraft: e.target.value }))} placeholder="오늘 확인한 내용, 변경사항, 담당자 피드백을 적어주세요." />
              <div className="actions"><button onClick={() => updateProject(selectedProject.id, (p) => p.memoDraft.trim() ? { ...p, memoDraft: "", history: [...p.history, { date: todayIso(), step: p.step, state: "메모", note: p.memoDraft.trim() }] } : p)}>메모를 이력에 추가</button><button onClick={() => { setMailTemplate(selectedProject.step >= 18 ? 2 : selectedProject.step >= 10 ? 1 : 0); setView("mail"); }}>이 단계 Gmail 준비</button></div>
              <div className="timeline">{selectedProject.history.slice(-6).reverse().map((item, index) => <div key={`${item.date}-${index}`}><b>{item.date} · {item.state}</b><span>{item.note}</span></div>)}</div>
            </div>
            <form className="panel add-form" onSubmit={addProject}><h3>프로젝트 추가</h3><input name="name" placeholder="프로젝트명" /><input name="client" placeholder="고객사/현장" /><input name="owner" placeholder="담당자" /><select name="step">{steps.map((step) => <option key={step.id} value={step.id}>{step.id}. {step.task}</option>)}</select><input name="due" type="date" /><select name="status"><option>정상</option><option>주의</option><option>위험</option></select><select name="priority"><option>보통</option><option>높음</option><option>긴급</option></select><input name="vendor" placeholder="협력업체/PM" /><input name="issue" placeholder="현재 이슈" /><button className="primary">추가</button></form>
          </div>}

          {view === "calendar" && <div className="panel"><h2>마일스톤 캘린더</h2><div className="calendar-list">{state.projects.map((project) => <div key={project.id}><b>{project.due || "일정 미정"}</b><span>{project.name}</span><small>{project.step}. {steps[project.step - 1].task}</small></div>)}</div></div>}
          {view === "manual" && <div className="manual-grid"><div className="panel step-list">{steps.map((step) => <button key={step.id} className={selectedStep === step.id ? "active" : ""} onClick={() => setSelectedStep(step.id)}>{step.id}. {step.task}<small>{step.phase}</small></button>)}</div><div className="panel"><h2>{selectedStep}. {steps[selectedStep - 1].task}</h2><div className="metrics"><div><small>담당</small><b>{steps[selectedStep - 1].owner}</b></div><div><small>자료</small><b>{steps[selectedStep - 1].docs}</b></div></div><p>{steps[selectedStep - 1].check}</p><p>{steps[selectedStep - 1].caution}</p></div></div>}
          {view === "documents" && <div className="panel doc-grid"><h2>문서 흐름</h2>{["검토 의뢰", "사양서/레이아웃", "협력업체 견적서", "원가집계표", "발주서/계약서", "킥오프 회의록", "승인도", "테스트 결과표"].map((doc, index) => <div key={doc}><b>DOC {String(index + 1).padStart(2, "0")}</b><span>{doc}</span><small>작성 위치와 전달 대상을 단계별로 확인합니다.</small></div>)}</div>}
          {view === "mail" && <div className="panel mail-grid"><div><h2>Gmail 작성 플로우</h2>{mailTemplates.map((tpl, index) => <button key={tpl[0]} className={mailTemplate === index ? "active" : ""} onClick={() => setMailTemplate(index)}>{tpl[0]}</button>)}</div><div><input value={mailTo} onChange={(e) => setMailTo(e.target.value)} placeholder="받는 사람" /><input value={mailCc} onChange={(e) => setMailCc(e.target.value)} placeholder="참조" /><input value={mailSubject} readOnly /><textarea value={mailBody} readOnly /><button className="primary" onClick={openGmail}>Gmail 작성창 열기</button></div></div>}
          {view === "sources" && <div className="panel"><h2>원본 반영 확인</h2><p>Notion 업무 흐름, 엑셀 업무 프로세스, 프로젝트 관리 요구사항을 React/TypeScript 구조에 반영했습니다.</p></div>}
        </section>
        <aside className="agent-panel"><h3>AI Agent</h3><button onClick={() => window.open("https://chatgpt.com/", "_blank")}>GPT 열기</button><button onClick={() => window.open("https://gemini.google.com/app", "_blank")}>Gemini 열기</button><textarea readOnly value={selectedProject ? `${selectedProject.name}\n현재 단계: ${selectedProject.step}. ${steps[selectedProject.step - 1].task}\n이슈: ${selectedProject.issue}\n다음 액션과 리스크를 정리해줘.` : "프로젝트를 선택하면 질문 초안이 준비됩니다."} /></aside>
      </div>}
    </main>
  );
}

