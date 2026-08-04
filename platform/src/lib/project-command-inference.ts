export type ProjectCommandHints = {
  runCommand: string;
  testCommand: string;
  buildCommand: string;
  lintCommand: string;
  typecheckCommand: string;
  commandCandidates: {
    run: string[];
    test: string[];
    build: string[];
    lint: string[];
    typecheck: string[];
  };
};

export function inferProjectCommands(markers: string[]): ProjectCommandHints {
  const candidates: ProjectCommandHints["commandCandidates"] = {
    run: [],
    test: [],
    build: [],
    lint: [],
    typecheck: []
  };

  if (markers.includes("package.json")) {
    candidates.run.push("npm run dev", "npm start");
    candidates.test.push("npm test");
    candidates.build.push("npm run build");
    candidates.lint.push("npm run lint");
    candidates.typecheck.push("npm run typecheck", "npx tsc --noEmit");
  }

  if (markers.includes("pom.xml")) {
    candidates.run.push("mvn spring-boot:run");
    candidates.test.push("mvn test");
    candidates.build.push("mvn package");
  }

  if (markers.includes("build.gradle") || markers.includes("build.gradle.kts")) {
    candidates.run.push("gradle bootRun", "./gradlew bootRun");
    candidates.test.push("gradle test", "./gradlew test");
    candidates.build.push("gradle build", "./gradlew build");
  }

  if (markers.includes("requirements.txt")) {
    candidates.run.push("python main.py", "python app.py");
    candidates.test.push("pytest");
    candidates.lint.push("ruff check .", "flake8");
    candidates.typecheck.push("mypy .");
  }

  if (markers.includes("pyproject.toml")) {
    candidates.run.push("python -m app", "python main.py");
    candidates.test.push("pytest");
    candidates.build.push("python -m build");
    candidates.lint.push("ruff check .");
    candidates.typecheck.push("mypy .");
  }

  if (markers.includes("go.mod")) {
    candidates.run.push("go run .");
    candidates.test.push("go test ./...");
    candidates.build.push("go build ./...");
    candidates.lint.push("golangci-lint run");
  }

  if (markers.includes("Cargo.toml")) {
    candidates.run.push("cargo run");
    candidates.test.push("cargo test");
    candidates.build.push("cargo build");
    candidates.lint.push("cargo clippy");
  }

  if (markers.includes("composer.json")) {
    candidates.run.push("php -S localhost:8000 -t public");
    candidates.test.push("composer test", "vendor/bin/phpunit");
    candidates.lint.push("composer lint");
  }

  return {
    runCommand: candidates.run[0] ?? "",
    testCommand: candidates.test[0] ?? "",
    buildCommand: candidates.build[0] ?? "",
    lintCommand: candidates.lint[0] ?? "",
    typecheckCommand: candidates.typecheck[0] ?? "",
    commandCandidates: candidates
  };
}
