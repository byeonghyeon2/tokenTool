# 서버 실행 요약

## 관리툴 서버

```powershell
cd platform
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-management-server.ps1
```

재시작:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-management-server.ps1 -Restart
```

접속:

```text
http://127.0.0.1:3000/
```

확인:

```powershell
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:3000/
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:3000/api/projects
```

정상 응답은 둘 다 `200`입니다.

## 실제 프로젝트 서버

관리툴 서버와 실제 프로젝트 서버는 별도입니다.

- 관리툴 서버: 이 도구 자체를 실행합니다.
- 실제 프로젝트 서버: 선택한 프로젝트의 `.md` 또는 설정 파일에서 실행 후보를 읽어 실행합니다.
- 한 번에 모든 프로젝트 서버를 띄우지 않습니다.
- 현재 안정화 단계에서는 프로젝트 서버를 자동 실행하지 않습니다.
- 프로젝트 요약 화면에는 선택 프로젝트 기준 실행 후보와 수동 실행 스크립트만 표시합니다.

기본 포트 예시:

| 종류 | 포트 |
| --- | --- |
| 관리툴 | `3000` |
| Next.js | `3000` |
| Vite | `5173` |
| FastAPI | `8000` |
| Flask | `5000` |
| Spring Boot | `8080` |

## 관리툴 소스 push

루트 `.env`에 `GITHUB_TOKEN`을 넣은 뒤 실행합니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\push-management-source.ps1
```

규칙:

- 관리툴 소스만 push합니다.
- 실제 프로젝트 소스는 push하지 않습니다.
- `.env`, 로그, 빌드 결과물, 의존성 폴더는 제외합니다.
- 토큰 값은 출력하지 않습니다.
