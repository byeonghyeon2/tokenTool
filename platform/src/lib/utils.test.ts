import { describe, expect, it } from "vitest";

import { buildDatabaseUrl, maskDatabaseUrl, parseAdditionalOptions } from "./database-settings";
import { extractSearchTerms } from "./change-analysis";
import { canRunCodexCli, normalizeProvider, summarizePrompt } from "./codex-runner";
import { parseCodexArgs } from "./codex-cli-executor";
import { getCodexCommandConfig } from "./codex-cli-executor";
import { inferProjectCommands } from "./project-command-inference";
import { buildRunPlan, formatDisplayedRunScript } from "./project-server-runner";
import { buildMockPatch, parseGitStatus } from "./git-diff";
import { buildMigrationPathEnv, sanitizeCommandOutput } from "./migration-runner";
import { buildChatGptPrompt, isPathInsideOrEqual } from "./prompt-workflow";
import { inferStackFromMarkers, isPathInside } from "./project-scanner";
import { parseCodexArgsJson, validateWorkspaceSetting } from "./workspace-settings";
import { isSensitivePath, maskSecret, requiresExplicitConfirmation } from "./utils";

describe("security helpers", () => {
  it("detects sensitive file paths", () => {
    expect(isSensitivePath("project/.env")).toBe(true);
    expect(isSensitivePath("project/src/page.tsx")).toBe(false);
  });

  it("flags dangerous commands", () => {
    expect(requiresExplicitConfirmation("git reset --hard HEAD")).toBe(true);
    expect(requiresExplicitConfirmation("npm run build")).toBe(false);
  });

  it("masks secrets without revealing the full value", () => {
    expect(maskSecret("password123")).toBe("pa*********");
  });
});

describe("migration runner helpers", () => {
  it("masks database url and password in command output", () => {
    const output = "failed mysql://user:secret@localhost:3306/app with secret";
    expect(sanitizeCommandOutput(output, ["mysql://user:secret@localhost:3306/app", "secret"])).toBe(
      "failed ******** with ********"
    );
  });

  it("prepends nodejs path on Windows-style path strings", () => {
    const nextPath = buildMigrationPathEnv("C:\\Windows");
    expect(nextPath.includes("C:\\Program Files\\nodejs")).toBe(true);
  });
});

describe("project scanner helpers", () => {
  it("detects paths inside the projects root", () => {
    expect(isPathInside("C:\\workspace\\projects", "C:\\workspace\\projects\\sample")).toBe(true);
    expect(isPathInside("C:\\workspace\\projects", "C:\\workspace\\other")).toBe(false);
  });

  it("infers stack from project marker files", () => {
    expect(inferStackFromMarkers(["package.json", "pyproject.toml"])).toBe("Node.js / TypeScript/JavaScript / Python");
  });

  it("supports common Java and Python project markers", () => {
    expect(inferStackFromMarkers(["pom.xml"])).toBe("Java");
    expect(inferStackFromMarkers(["requirements.txt"])).toBe("Python");
  });
});

describe("project command inference helpers", () => {
  it("infers Node.js command candidates", () => {
    const commands = inferProjectCommands(["package.json"]);
    expect(commands.runCommand).toBe("npm run dev");
    expect(commands.testCommand).toBe("npm test");
    expect(commands.buildCommand).toBe("npm run build");
  });

  it("infers Java and Python command candidates", () => {
    expect(inferProjectCommands(["pom.xml"]).testCommand).toBe("mvn test");
    expect(inferProjectCommands(["pyproject.toml"]).lintCommand).toBe("ruff check .");
  });
});

describe("project server runner helpers", () => {
  it("builds a plain project server run plan", async () => {
    const plan = await buildRunPlan("C:\\workspace\\projects\\sample", "npm run dev");

    expect(plan.displayCommand).toBe("npm run dev");
    expect(plan.script).toContain("npm run dev");
  });

  it("normalizes uvicorn commands with host and port", async () => {
    const plan = await buildRunPlan("C:\\workspace\\projects\\sample", "uvicorn app.main:app");

    expect(plan.displayCommand).toBe("python -m uvicorn app.main:app --host 127.0.0.1 --port 8000");
  });

  it("formats the displayed server script with the project folder first", () => {
    const script = formatDisplayedRunScript("C:\\workspace\\projects\\sample", "$ErrorActionPreference = 'Stop'\nnpm run dev");

    expect(script).toContain("Set-Location -LiteralPath 'C:\\workspace\\projects\\sample'");
    expect(script).toContain("npm run dev");
  });
});

describe("change analysis helpers", () => {
  it("extracts unique search terms from a change request", () => {
    expect(extractSearchTerms("매도 화면에 매수 아이디어를 읽기 전용으로 표시해줘 매도")).toContain("매도");
    expect(extractSearchTerms("API route /settings/database")).toContain("/settings/database");
  });
});

describe("prompt workflow helpers", () => {
  it("allows the runs root itself when checking prompt file paths", () => {
    expect(isPathInsideOrEqual("C:\\workspace\\runs", "C:\\workspace\\runs")).toBe(true);
    expect(isPathInsideOrEqual("C:\\workspace\\runs", "C:\\workspace\\runs\\prompt.md")).toBe(true);
    expect(isPathInsideOrEqual("C:\\workspace\\runs", "C:\\workspace\\other\\prompt.md")).toBe(false);
  });

  it("builds a ChatGPT prompt from analysis data", () => {
    const prompt = buildChatGptPrompt({
      projectName: "sample-app",
      projectPath: "C:\\workspace\\projects\\sample-app",
      request: "README를 수정해줘",
      confirmedFindings: ["README.md를 찾았습니다."],
      relatedAreas: ["README.md"],
      confirmedFiles: [{ path: "README.md", reason: "키워드 일치", matchedTerms: ["README"] }],
      candidateFiles: [],
      skippedSensitiveFiles: [],
      currentBehavior: "읽기 전용",
      risks: [],
      unknowns: [],
      savedPath: "C:\\workspace\\runs\\analysis.json",
      createdAt: "2026-07-16T00:00:00.000Z"
    });

    expect(prompt).toContain("ChatGPT Plus 변경 분석 요청");
    expect(prompt).toContain("README.md");
    expect(prompt).toContain("최종 Codex 프롬프트");
  });
});

describe("codex runner helpers", () => {
  it("normalizes unsupported providers to mock", () => {
    expect(normalizeProvider(undefined)).toBe("mock");
    expect(normalizeProvider("codex-cli")).toBe("codex-cli");
    expect(normalizeProvider("other")).toBe("mock");
  });

  it("summarizes long prompts", () => {
    expect(summarizePrompt("hello\nworld")).toBe("hello world");
    expect(summarizePrompt("a".repeat(200))).toHaveLength(160);
  });

  it("requires the explicit codex-cli confirmation phrase by convention", () => {
    expect("RUN_CODEX_CLI").toMatch(/^RUN_CODEX_CLI$/);
  });

  it("keeps codex-cli disabled without environment opt-in", () => {
    expect(canRunCodexCli(undefined)).toBe(false);
    expect(canRunCodexCli("RUN_CODEX_CLI")).toBe(false);
  });
});

describe("codex cli executor helpers", () => {
  it("parses JSON encoded codex args", () => {
    expect(parseCodexArgs('["exec","--sandbox","workspace-write"]')).toEqual(["exec", "--sandbox", "workspace-write"]);
  });

  it("falls back to shell-like splitting for simple arg strings", () => {
    expect(parseCodexArgs("exec --help")).toEqual(["exec", "--help"]);
  });

  it("provides a default codex command config", () => {
    const config = getCodexCommandConfig();
    expect(config.command).toBeTruthy();
    expect(config.timeoutMs).toBeGreaterThan(0);
  });
});

describe("run history helpers", () => {
  it("keeps run history paths under workspace-data runs by contract", () => {
    expect(isPathInsideOrEqual("C:\\workspace\\workspace-data\\runs", "C:\\workspace\\workspace-data\\runs\\codex-run-1.json")).toBe(
      true
    );
  });
});

describe("git diff helpers", () => {
  it("builds a mock patch for result displays", () => {
    expect(buildMockPatch("src/example.ts")).toContain("diff --git a/src/example.ts b/src/example.ts");
  });

  it("parses git status lines into file changes", () => {
    const changes = parseGitStatus(" M src/app.ts\n?? src/new.ts", "");

    expect(changes).toEqual([
      {
        filePath: "src/app.ts",
        changeType: "modified",
        additions: 0,
        deletions: 0,
        patch: ""
      },
      {
        filePath: "src/new.ts",
        changeType: "created",
        additions: 0,
        deletions: 0,
        patch: ""
      }
    ]);
  });
});

describe("workspace settings helpers", () => {
  it("validates codex args json as a string array", () => {
    expect(parseCodexArgsJson('["exec"]')).toEqual(["exec"]);
  });

  it("keeps projects root inside workspace root", () => {
    expect(() =>
      validateWorkspaceSetting({
        workspaceRoot: "C:\\workspace",
        projectsRoot: "C:\\outside",
        codexCommand: "codex",
        codexArgsJson: "[]",
        codexCliEnabled: false,
        codexTimeoutMs: 600000
      })
    ).toThrow("PROJECTS_ROOT");
  });
});

describe("database settings helpers", () => {
  it("builds an encoded MySQL connection url", () => {
    const url = buildDatabaseUrl({
      host: "localhost",
      port: 3306,
      databaseName: "ai dev",
      username: "dev user",
      password: "p@ss word",
      sslEnabled: true,
      additionalOptions: "timezone=Z"
    });

    expect(url).toBe("mysql://dev%20user:p%40ss%20word@localhost:3306/ai%20dev?sslaccept=strict&timezone=Z");
  });

  it("masks database passwords", () => {
    expect(maskDatabaseUrl("mysql://user:secret@localhost:3306/app")).toBe("mysql://user:********@localhost:3306/app");
  });

  it("parses additional connection options", () => {
    expect(parseAdditionalOptions("?timezone=Z&connectionLimit=5")).toEqual([
      ["timezone", "Z"],
      ["connectionLimit", "5"]
    ]);
  });

  it("escapes backticks in database names for display SQL", () => {
    const databaseName = "ai`dev";
    expect(databaseName.replaceAll("`", "``")).toBe("ai``dev");
  });
});
