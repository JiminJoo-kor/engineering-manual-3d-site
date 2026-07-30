# 엔지니어링 팀 업무 프로세스 3D 매뉴얼

Vercel에 그대로 배포 가능한 정적 사이트입니다.

## 배포 방법

1. Vercel에서 `outputs/engineering-manual-3d-site` 폴더를 프로젝트로 연결합니다.
2. Framework Preset은 `Other` 또는 Static으로 둡니다.
3. Build Command는 비워두거나 `npm run build`를 사용합니다.
4. Output Directory는 비워둡니다.

사이트는 Three.js CDN을 사용합니다. CDN 로드가 실패하면 CSS 3D 백업 화면이 표시됩니다.
