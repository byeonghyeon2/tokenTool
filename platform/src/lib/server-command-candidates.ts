export function getServerCommandCandidates(project: {
  runCommand: string;
  commandCandidates: { run: string[] };
  stack: string;
}) {
  return uniqueCommands([
    ...project.commandCandidates.run,
    ...inferExtraServerCommands(project.stack),
    project.runCommand
  ]).slice(0, 5);
}

function inferExtraServerCommands(stack: string) {
  const lower = stack.toLowerCase();
  const commands: string[] = [];

  if (lower.includes("node")) {
    commands.push("npm run dev -- --host 127.0.0.1", "npm run dev -- --host 0.0.0.0", "npm start");
  }

  if (lower.includes("python")) {
    commands.push("python -m uvicorn app.main:app --host 127.0.0.1 --port 8000", "uvicorn app.main:app --reload", "python main.py", "python app.py");
  }

  if (lower.includes("java")) {
    commands.push("mvn spring-boot:run", "./gradlew bootRun", "gradle bootRun");
  }

  return commands;
}

function uniqueCommands(commands: string[]) {
  return Array.from(new Set(commands.map((item) => item.trim()).filter(Boolean)));
}
