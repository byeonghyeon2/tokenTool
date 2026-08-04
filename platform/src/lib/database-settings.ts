import { z } from "zod";

export const databaseConnectionSchema = z.object({
  host: z.string().trim().min(1, "호스트를 입력하세요."),
  port: z.coerce.number().int().min(1).max(65535).default(3306),
  databaseName: z.string().trim().min(1, "데이터베이스명을 입력하세요."),
  username: z.string().trim().min(1, "사용자명을 입력하세요."),
  password: z.string(),
  sslEnabled: z.boolean().default(false),
  additionalOptions: z.string().trim().optional().default("")
});

export type DatabaseConnectionInput = z.infer<typeof databaseConnectionSchema>;

export function buildDatabaseUrl(input: DatabaseConnectionInput) {
  const user = encodeURIComponent(input.username);
  const password = encodeURIComponent(input.password);
  const host = input.host.trim();
  const databaseName = encodeURIComponent(input.databaseName);
  const params = new URLSearchParams();

  if (input.sslEnabled) {
    params.set("sslaccept", "strict");
  }

  for (const [key, value] of parseAdditionalOptions(input.additionalOptions)) {
    params.set(key, value);
  }

  const query = params.toString();
  return `mysql://${user}:${password}@${host}:${input.port}/${databaseName}${query ? `?${query}` : ""}`;
}

export function maskDatabaseUrl(databaseUrl: string) {
  return databaseUrl.replace(/:\/\/([^:]+):([^@]*)@/, "://$1:********@");
}

export function parseAdditionalOptions(options: string) {
  if (!options.trim()) {
    return [];
  }

  const searchParams = new URLSearchParams(options.startsWith("?") ? options.slice(1) : options);
  return Array.from(searchParams.entries()).filter(([key]) => key.trim().length > 0);
}

export function sanitizeDatabaseError(error: unknown) {
  if (!(error instanceof Error)) {
    return "알 수 없는 MySQL 연결 오류가 발생했습니다.";
  }

  return error.message.replace(/mysql:\/\/[^ ]+/gi, "[masked-database-url]");
}
