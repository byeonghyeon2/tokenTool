import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const sensitivePatterns = [
  /\.env($|\.)/i,
  /\.pem$/i,
  /\.key$/i,
  /id_rsa$/i,
  /id_ed25519$/i,
  /credentials/i,
  /secrets/i
];

const dangerousCommands = [
  "git reset --hard",
  "git clean -fd",
  "git push --force",
  "rm -rf",
  "rmdir /s",
  "del /s",
  "format",
  "shutdown",
  "prisma migrate reset"
];

export function isSensitivePath(filePath: string) {
  return sensitivePatterns.some((pattern) => pattern.test(filePath));
}

export function requiresExplicitConfirmation(command: string) {
  const normalized = command.trim().toLowerCase();
  return dangerousCommands.some((dangerous) => normalized.includes(dangerous));
}

export function maskSecret(value: string) {
  if (!value) {
    return "";
  }

  return `${value.slice(0, 2)}${"*".repeat(Math.max(6, value.length - 2))}`;
}
