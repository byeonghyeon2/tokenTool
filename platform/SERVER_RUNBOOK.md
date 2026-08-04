# Server Runbook

This document separates the management tool server from managed project servers.

## Server Types

| Type | Purpose | Default port |
| --- | --- | --- |
| Management tool server | Shows the project list, prompt generator, import controls, and project actions | `3000` |
| Managed project server | Runs one selected user project | Project-specific |

When the user says "start the server" in this workspace, start the management tool server unless they explicitly name a managed project.

## Start Management Tool

Use this command:

```powershell
cd C:\Users\Administrator\Documents\Codex\2026-07-15\files-mentioned-by-the-user-txt\work\AI-DEV-WORKSPACE\platform
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-management-server.ps1
```

Open:

```text
http://127.0.0.1:3000/
```

Health checks:

```powershell
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:3000/
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:3000/api/projects
```

Expected result:

```text
200
200
```

## Why The Launcher Exists

The local Codex desktop shell can fail when invoking `next dev`, `next build`, `npm.cmd`, or PowerShell `Start-Process`.

Observed failures:

```text
Error: spawn EPERM
Item has already been added. Key in dictionary: 'Path' Key being added: 'PATH'
```

The launcher avoids those paths by using a small `server.js` file and a hidden Windows Script Host process.

Execution chain:

```text
scripts/start-management-server.ps1
  -> scripts/start-management-server.vbs
    -> cmd.exe
      -> node.exe server.js
```

Logs:

```text
platform/workspace-data/logs/management-server.out.log
platform/workspace-data/logs/management-server.err.log
```

## Stop Management Tool

Find the process:

```powershell
netstat -ano | findstr ":3000"
```

Stop by PID:

```powershell
taskkill /PID <PID> /F
```

## Push Management Tool Source

Source control is handled internally by Codex/operator scripts, not by an in-app screen.

Use:

```powershell
cd C:\Users\Administrator\Documents\Codex\2026-07-15\files-mentioned-by-the-user-txt\work\AI-DEV-WORKSPACE
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\push-management-source.ps1
```

The script pushes only the management tool repository to:

```text
https://github.com/byeonghyeon2/tokenTool.git
```

Before pushing, create a root `.env` file:

```text
AI-DEV-WORKSPACE/.env
```

Add:

```text
GITHUB_TOKEN=github_pat_xxxxxxxxxxxxxxxxx
```

Required GitHub token permissions:

- Fine-grained token: `Contents: Read and write` for `byeonghyeon2/tokenTool`
- Classic token: `repo`

The push flow clears local proxy variables and uses OpenSSL for Git HTTPS calls. This avoids the observed `127.0.0.1:9` proxy issue and Windows `schannel` credential failure.

The script never includes `projects/*`, `.env`, `workspace-data`, `node_modules`, or `.next` in source control.

## Managed Project Server Rules

Managed project server execution is separate.

The UI must show up to five run candidates for the selected project. Candidates should be derived in this order:

1. Project Markdown files such as `README.md`, `RUNBOOK.md`, or setup docs
2. Package or framework config such as `package.json`, `pyproject.toml`, `requirements.txt`, `pom.xml`, or `build.gradle`
3. Common framework defaults

Examples:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
npm run dev -- --hostname 127.0.0.1 --port 3000
npm run dev -- --host 127.0.0.1 --port 5173
mvn spring-boot:run
.\gradlew bootRun
```

Only the selected candidate for the selected project may be executed.

## Port Defaults

| Stack | Common port |
| --- | --- |
| Management tool | `3000` |
| Next.js | `3000` |
| Vite | `5173` |
| FastAPI/Uvicorn | `8000` |
| Flask | `5000` |
| Django | `8000` |
| Spring Boot | `8080` |

If a port is already in use, the UI should show the conflict and let the user choose another candidate or port.
