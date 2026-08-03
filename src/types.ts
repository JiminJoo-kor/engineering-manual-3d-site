export type PhaseName = "수주 전" | "수주 후" | "설계·제작" | "설치" | "테스트" | "양산";
export type ProjectStatus = "정상" | "주의" | "위험";
export type ProjectPriority = "보통" | "높음" | "긴급";
export type ViewKey = "home" | "projects" | "calendar" | "manual" | "documents" | "mail" | "sources";

export interface Phase {
  name: PhaseName;
  color: string;
  three: number;
}

export interface ProcessStep {
  id: number;
  phase: PhaseName;
  task: string;
  owner: string;
  docs: string;
  check: string;
  caution: string;
}

export interface ProjectLog {
  date: string;
  step: number;
  state: string;
  note: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  owner: string;
  step: number;
  due: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  vendor: string;
  issue: string;
  nextAction: string;
  checks: Record<string, boolean>;
  memoDraft: string;
  history: ProjectLog[];
}

export interface SavedState {
  projects: Project[];
  checks: Record<string, boolean>;
}
