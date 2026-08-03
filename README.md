# 엔지니어링 팀 3D 프로젝트 오퍼레이션

이 버전은 기존 단일 `index.html` 정적 사이트를 `React + TypeScript + Three.js + Vite` 구조로 전환한 버전입니다.

## 구조

- `src/App.tsx`: 프로젝트 관리, 캘린더, 매뉴얼, Gmail, AI Agent 화면
- `src/ThreeStage.tsx`: Three.js 3D 프로세스 모델
- `src/data.ts`: 20단계 업무 프로세스, 기본 프로젝트, Gmail 템플릿
- `src/types.ts`: 프로젝트/단계/상태 타입
- `src/styles.css`: 3D 운영 콘솔 디자인

## 주요 기능

- 프로젝트가 계속 추가되어도 내부 스크롤 리스트로 관리
- 프로젝트별 진행 단계, 상태, 우선순위 변경
- 프로젝트별 진행여부 체크
- 진행 메모 작성 및 이력 저장
- Gmail 작성창 준비
- GPT/Gemini 질문 패널
- Three.js 기반 3D 단계 모델

## 실행

```bash
pnpm install
pnpm run dev
```

## 빌드

```bash
pnpm run build
```

Vercel에서는 `package.json` 기준으로 Vite 앱을 자동 빌드합니다.
