# AI Dev Workspace Agent Rules

This workspace hosts a local MVP for managing project-aware Codex work.

## Boundaries

- Only inspect or modify projects under `PROJECTS_ROOT`.
- Do not use the OpenAI API.
- Do not automate or control the ChatGPT website.
- Treat ChatGPT as a manual copy/paste step.
- Do not infer database credentials.
- Do not run destructive commands without explicit user confirmation.
- Keep analysis read-only until the user runs the Codex execution step.

## Sensitive Files

Do not display, log, or summarize secrets from:

- `.env`
- `.env.*`
- `*.pem`
- `*.key`
- `id_rsa`
- `id_ed25519`
- `credentials*`
- `secrets*`

## Dangerous Commands

Commands such as `git reset --hard`, `git clean -fd`, `git push --force`, `rm -rf`, `rmdir /s`, `del /s`, and `prisma migrate reset` require explicit confirmation.
