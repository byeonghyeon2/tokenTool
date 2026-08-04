# 서버 실행 요약

## 관리툴 서버

```powershell
cd platform
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-management-server.ps1
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

정상 응답:

```text
200
200
```

## 관리툴 소스 push

루트 `.env`에 `GITHUB_TOKEN`을 넣은 뒤 실행합니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\push-management-source.ps1
```

규칙:

- 관리툴 소스만 push합니다.
- 실제 프로젝트 소스는 push하지 않습니다.
- `.env`, 로그, 빌드 산출물, 의존성 폴더는 제외합니다.
- 토큰 값은 출력하지 않습니다.

## 실제 프로젝트 서버

관리툴 서버와 실제 프로젝트 서버는 별도입니다.

프로젝트 서버 실행 명령은 선택한 프로젝트의 문서와 설정 파일에서 후보를 찾습니다. 한 번에 여러 프로젝트 서버를 실행하지 않습니다.

대표 포트:

| 종류 | 포트 |
| --- | --- |
| 관리툴 | `3000` |
| Next.js | `3000` |
| Vite | `5173` |
| FastAPI | `8000` |
| Flask | `5000` |
| Spring Boot | `8080` |
