# AI Dev Workspace

로컬 프로젝트별 Codex 작업을 관리하는 도구입니다.

## 목적

- 프로젝트별 문서와 Git 상태를 분리해서 읽습니다.
- 사용자의 수정 요청과 프로젝트 `.md` 내용을 조합해 ChatGPT용 분석 프롬프트를 만듭니다.
- ChatGPT가 만든 Codex 실행 프롬프트를 복사해 Codex에서 적용하는 흐름을 지원합니다.
- OpenAI API나 ChatGPT 웹 자동 조작은 사용하지 않습니다.

## 구성

```text
platform/       관리툴 소스
projects/       관리 대상 프로젝트, Git 커밋 제외
templates/      프롬프트 템플릿
workspace-data/ 실행 로그와 로컬 데이터, Git 커밋 제외
scripts/        내부 운영 스크립트
```

## 실행

```powershell
cd platform
npm install
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-management-server.ps1
```

접속:

```text
http://127.0.0.1:3000/
```

## 환경 설정

루트 `.env` 파일에 필요한 값만 넣습니다. `.env`는 Git에 올라가지 않습니다.

```env
WORKSPACE_ROOT=
PROJECTS_ROOT=
DATABASE_URL=
GITHUB_TOKEN=
```

`GITHUB_TOKEN`은 GitHub 비밀번호가 아니라 Personal Access Token입니다.

필요 권한:

- Fine-grained token: 해당 저장소 `Contents: Read and write`
- Classic token: `repo`

## 소스 관리

소스 관리는 화면에 노출하지 않습니다. Codex가 내부 스크립트로 처리합니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\push-management-source.ps1
```

규칙:

- 관리툴 소스만 커밋하고 push합니다.
- `projects/`, `.env`, `workspace-data/`, `node_modules/`, `.next/`, 로그 파일은 제외합니다.
- 토큰 값은 출력하지 않습니다.

## DB 설정

DB 기능을 쓰는 경우에만 `DATABASE_URL`을 설정합니다.

```text
mysql://사용자:비밀번호@호스트:포트/DB명
```

Prisma 명령:

```powershell
cd platform
npm run prisma:generate
npm run prisma:migrate
```

## 프로젝트 추가

- `projects/` 아래에 직접 복사
- 관리툴의 프로젝트 추가 기능으로 폴더 업로드
- GitHub 저장소 URL로 clone 또는 pull

각 프로젝트는 자기 Git 저장소를 따로 가집니다. 관리툴 저장소에는 실제 프로젝트 소스를 넣지 않습니다.

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

한글이 깨지면 해당 파일을 UTF-8로 다시 저장한 뒤 typecheck와 lint를 통과시킵니다.
