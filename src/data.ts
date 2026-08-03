import type { Phase, ProcessStep, Project } from "./types";

export const phases: Phase[] = [
  { name: "수주 전", color: "#4f8cff", three: 0x4f8cff },
  { name: "수주 후", color: "#00b894", three: 0x00b894 },
  { name: "설계·제작", color: "#d99135", three: 0xd99135 },
  { name: "설치", color: "#8e72ff", three: 0x8e72ff },
  { name: "테스트", color: "#ff6464", three: 0xff6464 },
  { name: "양산", color: "#45c782", three: 0x45c782 }
];

export const steps: ProcessStep[] = [
  { id: 1, phase: "수주 전", task: "프로젝트 검토 의뢰 접수", owner: "영업부 → 엔지니어링팀", docs: "검토 의뢰, 고객 요구 일정", check: "고객 요구 일정과 희망 공사 일정을 먼저 확인", caution: "일정이 촉박하면 즉시 상급자에게 일정 리스크 공유" },
  { id: 2, phase: "수주 전", task: "사양서/레이아웃 수령 및 기준 확인", owner: "엔지니어링팀", docs: "글로비스 사양서, 레이아웃", check: "고객 제공안인지 자체 설계 범위인지 구분", caution: "기준 사양이 없으면 설계 범위와 책임이 커짐" },
  { id: 3, phase: "수주 전", task: "협력업체 선정 검토", owner: "엔지니어링팀", docs: "후보 업체, 공사 가능 일정", check: "턴키 업체와 개별 업체 분리 발주를 비교", caution: "가격보다 일정, 역량, 현장 대응력을 같이 확인" },
  { id: 4, phase: "수주 전", task: "협력업체에 사양서·레이아웃 송부", owner: "엔지니어링팀 → 협력업체", docs: "송부 자료, 질의사항", check: "견적 요청 시 공사 가능 일정도 함께 요청", caution: "요청 범위가 모호하면 누락 견적 발생" },
  { id: 5, phase: "수주 전", task: "협력업체 견적서 수신 및 사양 검토", owner: "엔지니어링팀", docs: "견적서, 사양 상세", check: "사양 누락, 스코프 누락, 과소 견적을 집중 확인", caution: "구매팀 판단이 어려우므로 엔지니어링팀이 직접 검토" },
  { id: 6, phase: "수주 전", task: "원가집계표 작성", owner: "엔지니어링팀", docs: "원가집계표, 보증보험 산출 시트", check: "맨데이, 안전관리비, 보증보험, 마진 구조 반영", caution: "재료비 5%, 일반관리비 10%, 기업이윤 5% 구조 확인" },
  { id: 7, phase: "수주 전", task: "영업부 견적서 작성 및 고객 제출", owner: "영업부 + 엔지니어링팀", docs: "알티올 견적서", check: "영업 최종 견적서를 공동 검토", caution: "누락 사례가 많으므로 제출 전 공동 검토 필수" },
  { id: 8, phase: "수주 후", task: "발주서·계약서 수령 확인", owner: "사업지원팀 + 엔지니어링팀", docs: "발주서, 계약서", check: "수령 여부 확인", caution: "미수령 상태 선진행은 상급자 보고 후 판단" },
  { id: 9, phase: "수주 후", task: "외주업체 발주·계약 요청", owner: "엔지니어링팀 → 사업지원팀", docs: "발주 요청서, 계약 요청서", check: "범위와 금액 명확화", caution: "공식 발송 기준과 승인 흐름 확인" },
  { id: 10, phase: "수주 후", task: "킥오프 미팅", owner: "엔지니어링팀, 이행팀, 외주업체", docs: "회의록, 역할분담, 일정표", check: "사양, 레이아웃, 스코프, 일정, 책임자 확정", caution: "참석자별 책임을 명확히 남김" },
  { id: 11, phase: "수주 후", task: "장납기품 검토 및 선제 발주", owner: "엔지니어링팀", docs: "장납기품 목록, 발주 일정", check: "납기 1개월 이상 품목 별도 관리", caution: "사급품과 장납기품을 분리 추적" },
  { id: 12, phase: "수주 후", task: "PM/이행팀 자료 이관", owner: "엔지니어링팀 → 이행팀", docs: "레이아웃, 원가집계표, 견적", check: "이행팀 발주 집행 기준 자료 확인", caution: "이관 자료 누락 시 현장 단계에서 일정 지연" },
  { id: 13, phase: "설계·제작", task: "승인도 검토", owner: "협력업체 + 엔지니어링팀 + 고객사", docs: "모듈별 2D 승인도", check: "상세 어셈블리 도면 검토 후 고객 승인 요청", caution: "승인 전 제작은 원칙적으로 불가" },
  { id: 14, phase: "설계·제작", task: "상세설계 및 제작 진행", owner: "협력업체, 엔지니어링팀", docs: "상세도, 제작 일정", check: "승인 완료 후 제작 진행", caution: "레이아웃 변경 이력 최신본 관리 필수" },
  { id: 15, phase: "설계·제작", task: "제작 검수", owner: "PM/이행팀 + 엔지니어링팀", docs: "검수성적서, 검수보고서", check: "제작 현장 방문 및 진행 상황 확인", caution: "검수 기준과 보완 항목을 분리" },
  { id: 16, phase: "설치", task: "현장 반입 및 PM 인계", owner: "이행팀, 현장 PM, 안전관리자", docs: "반입 일정, 안전관리 계획", check: "반입 시점부터 PM 중심 운영", caution: "안전관리자 상주 여부 확인" },
  { id: 17, phase: "설치", task: "설치·전장·제어·WCS 진행", owner: "외주업체, PLC, WCS 담당", docs: "설치 기록, 프로그램 버전", check: "기구 설치 → 전기 설치 → PLC → WCS 순서 확인", caution: "인터페이스 기준 공유 필요" },
  { id: 18, phase: "테스트", task: "단동/연동/WCS 통합 테스트", owner: "엔지니어링팀, 이행팀, 외주업체", docs: "테스트 결과, 이슈 목록", check: "단동 → 연동 → WCS 통합 순서 준수", caution: "이슈는 원인, 담당, 기한으로 관리" },
  { id: 19, phase: "테스트", task: "FAT 진행 및 고객 승인", owner: "고객사 + 엔지니어링팀 + 이행팀", docs: "FAT 결과, 고객 승인", check: "고객사 기준 완료 승인 획득", caution: "미승인 항목은 양산 전 반드시 관리" },
  { id: 20, phase: "양산", task: "양산 대기 및 초기 안정화", owner: "현장 PM, 엔지니어링팀 지원", docs: "에러 대응 내역, 디버깅 기록", check: "FAT 후 약 30일 실자재 운영 중 문제 대응", caution: "반복 에러는 개선안과 재발방지로 정리" }
];

export const checklist = [
  ["수주 전", "고객 요구 일정과 희망 공사 일정 확인", "일정 촉박 시 상급자 보고"],
  ["수주 전", "사양서/레이아웃 기준과 설계 범위 구분", "기준 사양 유무 표시"],
  ["수주 후", "킥오프에서 역할, 일정, 스코프 확정", "회의록 공유"],
  ["수주 후", "장납기품과 사급품 목록 작성", "발주 상태 업데이트"],
  ["설계·제작", "승인도 검토 및 고객 승인 요청", "승인 전 제작 금지"],
  ["설치", "현장 반입, 안전관리자, PM 인계 확인", "비상연락망 공유"],
  ["테스트", "단동, 연동, WCS 통합, FAT 순서 테스트", "테스트 결과표 작성"],
  ["양산", "초기 안정화 30일 에러 대응 기록", "재발방지안 포함"]
] as const;

export const mailTemplates = [
  ["협력업체 견적 요청", "[견적요청] {프로젝트명} 사양서/레이아웃 검토 및 견적 요청", "안녕하세요.\n\n{프로젝트명} 관련 사양서 및 레이아웃 검토 후 견적 회신 요청드립니다.\n\n확인 요청사항\n1. 견적 범위 및 제외 범위\n2. 공사 가능 일정\n3. 장납기품 여부\n4. 추가 확인 필요 사양\n\n감사합니다."],
  ["킥오프 미팅 안내", "[킥오프] {프로젝트명} 킥오프 미팅 안내", "안녕하세요.\n\n{프로젝트명} 킥오프 미팅을 진행하고자 합니다.\n\n주요 안건\n1. 사양 및 레이아웃 확인\n2. 담당 범위와 스코프 확정\n3. 일정 및 장납기품 확인\n\n감사합니다."],
  ["FAT 일정/결과 공유", "[FAT] {프로젝트명} FAT 일정 및 확인 요청", "안녕하세요.\n\n{프로젝트명} FAT 진행 관련 일정 및 확인사항 공유드립니다.\n\n진행 순서\n1. 단동 Test\n2. 연동 Test\n3. WCS 통합 Test\n4. FAT 고객 승인\n\n감사합니다."]
] as const;

export const defaultProjects: Project[] = [
  { id: "tm-auto", name: "TM적입 자동화", client: "국내 물류센터", owner: "엔지니어링팀", step: 10, due: "2026-08-07", status: "주의", priority: "높음", vendor: "PM/이행팀 협의", issue: "킥오프 자료와 협력업체 일정 취합 필요", nextAction: "킥오프 회의록에 역할, 일정, 스코프를 확정하고 장납기품 목록을 분리 관리합니다.", checks: {}, memoDraft: "", history: [{ date: "2026-07-30", step: 10, state: "진행", note: "킥오프 참석자와 역할 분담 확정 중" }] },
  { id: "globis-layout", name: "글로비스 레이아웃 검토", client: "글로비스", owner: "주니어 담당", step: 5, due: "2026-08-12", status: "정상", priority: "보통", vendor: "협력업체 후보", issue: "견적 범위와 공사 가능 일정 확인 중", nextAction: "협력업체 견적서의 사양 누락과 스코프 누락 여부를 표로 비교합니다.", checks: {}, memoDraft: "", history: [{ date: "2026-07-30", step: 5, state: "진행", note: "견적서 사양 검토 진행 중" }] },
  { id: "fat-ready", name: "FAT 준비 샘플", client: "테스트 라인", owner: "PM", step: 18, due: "2026-08-18", status: "위험", priority: "긴급", vendor: "PLC/WCS", issue: "WCS 통합 테스트 미해결 항목 존재", nextAction: "이슈별 원인, 담당자, 조치 기한을 고정하고 FAT 전 재검증 일정을 캘린더에 올립니다.", checks: {}, memoDraft: "", history: [{ date: "2026-07-30", step: 18, state: "진행", note: "WCS 통합 테스트 이슈 추적 중" }] }
];
