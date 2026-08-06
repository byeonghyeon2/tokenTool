# 프로젝트 분리 규칙

관리툴은 여러 프로젝트를 읽을 수 있지만, 모든 작업은 사용자가 선택한 한 프로젝트 안에서만 수행합니다.

## 기준 폴더

- `PROJECTS_ROOT`가 관리 대상 프로젝트의 유일한 루트입니다.
- 기본 구조에서는 `projects/`가 `PROJECTS_ROOT`입니다.
- `PROJECTS_ROOT` 바로 아래의 각 폴더를 하나의 프로젝트 후보로 봅니다.
- `.git`, `README.md`, `package.json`, `requirements.txt`, `pom.xml`, `pyproject.toml` 같은 감지 파일이 있을 때 프로젝트로 인식합니다.

## 추가 규칙

- 폴더 업로드는 선택한 폴더의 내용을 `PROJECTS_ROOT/프로젝트명` 아래로 저장합니다.
- GitHub clone은 `PROJECTS_ROOT/프로젝트명` 아래로 저장합니다.
- GitHub pull은 이미 존재하는 같은 프로젝트 폴더에서만 실행합니다.
- 화면에서는 복사된 폴더명 수동 등록 기능을 제공하지 않습니다.

## 경계 규칙

- 다른 프로젝트의 Markdown 파일을 섞어 읽지 않습니다.
- ChatGPT 프롬프트는 선택한 한 프로젝트의 문서와 요청으로만 만듭니다.
- `../` 같은 경로로 `PROJECTS_ROOT` 밖에 접근하지 않습니다.
- 관리툴 메타데이터는 선택한 프로젝트 또는 `workspace-data` 밖에 쓰지 않습니다.
- 실제 프로젝트 소스 수정은 별도 프로젝트 수정 세션에서만 진행합니다.
- 프로젝트 서버 실행은 선택한 프로젝트 폴더에서만 실행합니다.
- 화면에 표시된 서버 실행 후보 외의 임의 명령은 실행하지 않습니다.

## 무시 폴더

```text
.git
node_modules
.next
dist
build
coverage
.venv
.turbo
.cache
```

## 검증 기준

- 경계 helper는 `PROJECTS_ROOT` 밖 경로를 거부해야 합니다.
- Markdown 수집은 선택한 프로젝트 밖 문서를 포함하면 안 됩니다.
- GitHub URL은 `https://github.com/owner/repository` 형식만 허용합니다.
- typecheck와 lint를 통과해야 합니다.
