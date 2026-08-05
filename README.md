# AI Dev Workspace

프로젝트별 문서와 Git 상태를 읽어 ChatGPT 분석 프롬프트를 만들고, 그 결과를 Codex에 붙여넣어 수정하는 복붙형 관리툴입니다.

## 목적

- 관리툴 소스와 실제 프로젝트 소스를 분리합니다.
- 선택한 한 프로젝트의 `.md` 문서와 수정 요청만 조합합니다.
- ChatGPT가 만든 Codex 실행 프롬프트를 복사해 Codex에서 적용하는 흐름을 지원합니다.
- OpenAI API 자동 호출은 기본 전제에 포함하지 않습니다.

## 구성

```text
platform/       관리툴 소스
projects/       관리 대상 프로젝트, Git 커밋 제외
templates/      프롬프트 템플릿
workspace-data/ 실행 로그와 로컬 데이터, Git 커밋 제외
scripts/        내부 운영 스크립트
```

## 관리툴 실행

```powershell
cd platform
npm install
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-management-server.ps1
```

접속 주소:

```text
http://127.0.0.1:3000/
```

## 프로젝트 추가

- 폴더 업로드: 선택한 폴더의 내용을 `projects/프로젝트명` 아래로 복사합니다.
- GitHub clone/pull: 처음이면 `projects/프로젝트명` 아래로 clone하고, 이미 있으면 같은 폴더에서 pull합니다.
- 화면에서는 복사된 폴더명을 수동 등록하지 않습니다. 직접 복사한 경우에도 관리 대상은 `projects/` 바로 아래 폴더입니다.

각 프로젝트는 자기 Git 저장소를 따로 가질 수 있습니다. 관리툴 저장소에는 실제 프로젝트 소스를 커밋하지 않습니다.

## 환경 설정

루트 `.env` 파일에는 필요한 값만 넣습니다. `.env`는 Git에 올라가지 않습니다.

```env
WORKSPACE_ROOT=
PROJECTS_ROOT=
DATABASE_URL=
GITHUB_TOKEN=
```

`GITHUB_TOKEN`은 GitHub 비밀번호가 아니라 Personal Access Token입니다.

필요 권한:

- Fine-grained token: 대상 저장소 `Contents: Read and write`
- Classic token: `repo`

## 소스 관리

관리툴 소스만 커밋하고 push합니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\push-management-source.ps1
```

제외 대상:

- `projects/`
- `.env`
- `workspace-data/`
- `node_modules/`
- `.next/`
- 로그와 빌드 결과물

## DB 설정

DB 기능이 필요한 경우에만 `DATABASE_URL`을 설정합니다.

```text
mysql://사용자:비밀번호@호스트:포트/DB명
```

Prisma 명령:

```powershell
cd platform
npm run prisma:generate
npm run prisma:migrate
```

## 검증

```powershell
cd platform
npm run typecheck
npm run lint
```

## 인코딩

모든 소스와 문서는 UTF-8로 저장합니다.

```text
.editorconfig
.gitattributes
```
