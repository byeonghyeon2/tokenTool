import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { describe, expect, it } from "vitest";

import { collectMarkdownFiles } from "./markdown-prompt";
import {
  assertPathBelongsToProject,
  assertProjectPath,
  sanitizeProjectFolderName,
  shouldIgnoreProjectDirectory,
  toProjectRelativePath
} from "./project-boundary";
import { normalizeGithubUrl } from "./project-importer";

describe("project boundary helpers", () => {
  it("allows only project folders under PROJECTS_ROOT", () => {
    expect(assertProjectPath("C:\\workspace\\projects", "C:\\workspace\\projects\\sample")).toBe(
      path.resolve("C:\\workspace\\projects\\sample")
    );
    expect(() => assertProjectPath("C:\\workspace\\projects", "C:\\workspace\\outside")).toThrow("PROJECTS_ROOT");
  });

  it("rejects sibling project file access", () => {
    expect(assertPathBelongsToProject("C:\\workspace\\projects\\a", "C:\\workspace\\projects\\a\\README.md")).toBe(
      path.resolve("C:\\workspace\\projects\\a\\README.md")
    );
    expect(() => assertPathBelongsToProject("C:\\workspace\\projects\\a", "C:\\workspace\\projects\\b\\README.md")).toThrow(
      "boundary"
    );
  });

  it("creates relative paths from the selected project root", () => {
    expect(toProjectRelativePath("C:\\workspace\\projects\\a", "C:\\workspace\\projects\\a\\docs\\guide.md")).toBe(
      "docs/guide.md"
    );
  });

  it("ignores generated and dependency directories", () => {
    expect(shouldIgnoreProjectDirectory(".git")).toBe(true);
    expect(shouldIgnoreProjectDirectory("node_modules")).toBe(true);
    expect(shouldIgnoreProjectDirectory("src")).toBe(false);
  });

  it("sanitizes import folder names", () => {
    expect(sanitizeProjectFolderName("my repo!!")).toBe("my-repo");
    expect(() => sanitizeProjectFolderName("!!!")).toThrow("empty");
  });

  it("normalizes supported GitHub URLs", () => {
    expect(normalizeGithubUrl("https://github.com/openai/codex")).toBe("https://github.com/openai/codex.git");
    expect(normalizeGithubUrl("https://github.com/openai/codex.git")).toBe("https://github.com/openai/codex.git");
    expect(() => normalizeGithubUrl("https://example.com/openai/codex")).toThrow("GitHub URL");
  });
});

describe("markdown project isolation", () => {
  it("collects Markdown only from the selected project", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-dev-workspace-"));
    const projectA = path.join(root, "projects", "a");
    const projectB = path.join(root, "projects", "b");

    try {
      await mkdir(path.join(projectA, "docs"), { recursive: true });
      await mkdir(projectB, { recursive: true });
      await writeFile(path.join(projectA, "README.md"), "# A\n\nselected project", "utf8");
      await writeFile(path.join(projectA, "docs", "guide.md"), "# Guide\n\ninside", "utf8");
      await writeFile(path.join(projectB, "README.md"), "# B\n\nsibling project", "utf8");

      const files = await collectMarkdownFiles(projectA);

      expect(files.map((file) => file.relativePath)).toEqual(["README.md", "docs/guide.md"]);
      expect(files.map((file) => file.content).join("\n")).not.toContain("sibling project");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
