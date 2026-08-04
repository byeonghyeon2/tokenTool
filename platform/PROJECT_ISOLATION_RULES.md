# Project Isolation Rules

This management tool can index many projects, but every operation must be scoped to exactly one selected project.

## Source Of Truth

- `PROJECTS_ROOT` is the only directory where managed projects are discovered.
- Each direct child folder of `PROJECTS_ROOT` is treated as one project candidate.
- A project is recognized only when marker files exist, such as `.git`, `README.md`, `package.json`, `requirements.txt`, `pom.xml`, or `pyproject.toml`.

## Hard Boundaries

- Never read Markdown files from sibling projects.
- Never build a ChatGPT prompt from more than one selected project.
- Never resolve `../` project names into paths outside `PROJECTS_ROOT`.
- Never write management metadata outside the selected project or `workspace-data`.
- Ignore generated or dependency folders during scans:
  - `.git`
  - `node_modules`
  - `.next`
  - `dist`
  - `build`
  - `coverage`
  - `.venv`
  - `.turbo`
  - `.cache`

## Management Tool Rules

- The management tool source lives under `platform`.
- The management tool server is a Next.js app, normally served on `3000`.
- The management tool may clone, register, scan, and summarize projects.
- The management tool must not modify actual project source code unless the user explicitly asks in a separate project-editing session.

## Managed Project Rules

- A managed project may be imported from GitHub or registered manually.
- Manual registration only scans an existing folder under `PROJECTS_ROOT`.
- Folder upload copies the selected directory and child files into `PROJECTS_ROOT/project-name`.
- GitHub import clones into `PROJECTS_ROOT/project-name`.
- If the GitHub target folder already exists and is a Git repository, the tool updates it with `git pull --ff-only`.
- Project server commands are read from the selected project's Markdown/config files.
- Project server execution is separate from the management tool server.

## Prompt Generation Rules

- Prompt generation reads Markdown only from the selected project root.
- Markdown paths in generated prompts must be relative to the selected project root.
- Git status, diff stat, and commit graph must be collected with `git -C selectedProjectPath`.
- If a fact is not proven by the selected project files, mark it as needing confirmation.

## Test Expectations

- Boundary helpers must reject paths outside the selected project.
- Markdown collection must not include sibling project documents.
- GitHub import must sanitize folder names and reject unsupported URL formats.
- Type checking and linting must pass before using the tool.
- Coverage target is 95% for lines, branches, functions, and statements when the coverage provider is available.
