# AI Dev Workspace

AI Dev Workspace is a local management tool for project-specific Codex work.

The core workflow is manual copy and paste:

1. Register or import a project into the managed project folder.
2. Select one project in the management UI.
3. The tool reads only that project's Markdown files and Git state.
4. The user writes the requested change.
5. The tool generates a ChatGPT analysis prompt.
6. The user pastes the prompt into ChatGPT.
7. ChatGPT returns a focused Codex execution prompt.
8. The user pastes that prompt into Codex and commits the project changes.
9. Repeat from the next Git change set.

The tool does not call the OpenAI API and does not automate the ChatGPT website.

## Repository Scope

This repository is for the management tool itself.

Managed projects under `projects/` are runtime inputs and should not be committed into this repository. Each managed project should have its own Git repository.

## Directory Layout

```text
AI-DEV-WORKSPACE/
  platform/              Next.js management tool source
  projects/              Managed project folders, ignored by this repo
  templates/             Prompt and document templates
  workspace-data/        Local runtime data, logs, and generated metadata
  .env.example           Environment variable template
  AGENTS.md              Agent and safety rules
  README.md              This document
```

## Requirements

- Windows PowerShell
- Node.js 24.x or compatible current Node.js
- npm
- Git
- MySQL, only when DB-backed features are used

## Environment Setup

Copy `.env.example` to `.env` at the workspace root or provide the same variables through the shell.

```powershell
cd C:\Users\Administrator\Documents\Codex\2026-07-15\files-mentioned-by-the-user-txt\work\AI-DEV-WORKSPACE
Copy-Item .env.example .env
```

Key variables:

```text
WORKSPACE_ROOT=absolute path to AI-DEV-WORKSPACE
PROJECTS_ROOT=absolute path to AI-DEV-WORKSPACE\projects
DATABASE_URL=mysql://user:password@127.0.0.1:3306/database_name
CODEX_PROVIDER=mock
CODEX_CLI_ENABLED=false
```

`DATABASE_URL` can be empty while running UI-only or file-scanning features. Prisma-backed screens require a valid MySQL connection.

## Install

```powershell
cd C:\Users\Administrator\Documents\Codex\2026-07-15\files-mentioned-by-the-user-txt\work\AI-DEV-WORKSPACE\platform
npm install
```

## Start The Management Tool Server

In this workspace, "start the server" means start the management tool server unless explicitly stated otherwise.

Use the provided launcher:

```powershell
cd C:\Users\Administrator\Documents\Codex\2026-07-15\files-mentioned-by-the-user-txt\work\AI-DEV-WORKSPACE\platform
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-management-server.ps1
```

Open:

```text
http://127.0.0.1:3000/
```

The launcher uses `node server.js` instead of `npm run dev`. This avoids local Windows shell issues where `next dev`, `next build`, or `Start-Process` can fail with `spawn EPERM` or duplicated `Path/PATH` environment variables.

## Development Commands

```powershell
cd platform
npm run typecheck
npm run lint
npm test
npm run test:coverage
```

Known local limitation:

- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm test` may fail in this Codex desktop shell with `spawn EPERM` before tests start.
- `npm run test:coverage` requires `@vitest/coverage-v8`; installing it requires npm registry access.

## Management Tool Source Control

Source control for this management tool is an internal operator workflow, not a UI feature.

When the user asks Codex to push the management tool source, run:

```powershell
cd C:\Users\Administrator\Documents\Codex\2026-07-15\files-mentioned-by-the-user-txt\work\AI-DEV-WORKSPACE
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\push-management-source.ps1
```

The script manages only the management tool repository. It does not commit or push managed projects under `projects/`.

GitHub push target:

```text
https://github.com/byeonghyeon2/tokenTool.git
```

Token setup:

```text
GITHUB_TOKEN=github_pat_xxxxxxxxxxxxxxxxx
```

Put the token in the root `.env` file. Do not put it in `.env.example`, Markdown files, or committed source.

Required token permission:

- Fine-grained token: `Contents: Read and write` for `byeonghyeon2/tokenTool`
- Classic token: `repo`

The push script intentionally:

- reads the token without printing it
- clears `HTTP_PROXY`, `HTTPS_PROXY`, and `ALL_PROXY`
- sets `http.sslBackend=openssl` for this repository
- commits pending management-tool changes with `Update management tool source`
- pushes the current branch to `origin`
- excludes `.env`, `projects/*`, `workspace-data`, `node_modules`, `.next`, and logs
- keeps managed projects separate from management-tool source control

## Encoding Policy

All source files and Markdown documents must be UTF-8.

Repository-level files enforce this:

```text
.editorconfig
.gitattributes
```

Do not save Korean UI text with legacy encodings such as CP949/EUC-KR. If Korean text appears broken, rewrite the affected file as UTF-8 and verify with typecheck, lint, and diagnostics before committing.

## Database Setup

The Prisma schema is in `platform/prisma/schema.prisma`.

The configured provider is MySQL.

Example `DATABASE_URL`:

```text
mysql://ai_dev_user:password@127.0.0.1:3306/ai_dev_workspace
```

Initialize Prisma after setting `DATABASE_URL`:

```powershell
cd platform
npm run prisma:generate
npm run prisma:migrate
```

Main tables:

- `Project`: registered project metadata and detected commands
- `ChangeRequest`: requested user changes
- `ProjectAnalysis`: selected-project analysis result
- `GeneratedChatGptPrompt`: prompt copied to ChatGPT
- `CodexPrompt`: prompt copied back into Codex
- `CodexRun`: execution history
- `CodexLog`: command and run logs
- `FileChange`: Git/file change summaries
- `ValidationResult`: lint, typecheck, test, build results
- `WorkspaceSetting`: workspace configuration
- `DatabaseSetting`: DB connection metadata without raw secret storage

## Project Registration

The management tool supports three project-add flows.

1. Manual folder placement

Place a project folder directly under `PROJECTS_ROOT`, then register or rescan it from the UI.

```text
AI-DEV-WORKSPACE/
  projects/
    my-project/
      README.md
      .git/
      ...
```

2. Folder upload

Use the UI project-add button. The browser file picker copies the selected directory, including child files, into `PROJECTS_ROOT/project-name`.

3. GitHub import

Enter a GitHub repository URL in the UI. The tool clones it into `PROJECTS_ROOT/project-name`.

If the folder already exists and contains `.git`, the tool updates it with:

```powershell
git pull --ff-only
```

## Project Recognition

A direct child folder of `PROJECTS_ROOT` is treated as a project candidate when it contains at least one marker:

```text
.git
README.md
package.json
requirements.txt
pyproject.toml
pom.xml
build.gradle
build.gradle.kts
go.mod
Cargo.toml
composer.json
```

## Managed Project Server Execution

Managed project servers are separate from the management tool server.

The UI should derive run candidates from the selected project's Markdown/config files. Examples:

- FastAPI: `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`
- Next.js: `npm run dev -- --hostname 127.0.0.1 --port 3000`
- Vite: `npm run dev -- --host 127.0.0.1 --port 5173`
- Spring Boot: `./gradlew bootRun` or `mvn spring-boot:run`

Only the selected project's command may be run. The tool must not start every project server at once.

## Safety Rules

- Do not read Markdown from sibling projects.
- Do not generate one prompt from multiple projects.
- Do not modify managed project source from the management-tool session.
- Do not commit `projects/`, `.env`, `.next/`, `node_modules/`, or logs.
- Treat ChatGPT as a manual copy/paste step.
- Keep OpenAI API usage out of this tool unless the product concept changes explicitly.
