import { getSql } from "@/lib/db";

export async function writeIntegrationLog(input: {
  sourceSlug: string;
  operation: string;
  applicationId?: number | null;
  externalId?: string | null;
  result: string;
  httpCode?: number | null;
  message?: string | null;
  attempts?: number;
}) {
  const sql = await getSql();
  const safe = (input.message ?? "").replace(/(Bearer\s+)[^\s]+/gi, "$1[redacted]").slice(0, 500);
  await sql`
    insert into integration_logs (source_slug, operation, application_id, external_id, result, http_code, message, attempts)
    values (
      ${input.sourceSlug},
      ${input.operation},
      ${input.applicationId ?? null},
      ${input.externalId ?? null},
      ${input.result},
      ${input.httpCode ?? null},
      ${safe},
      ${input.attempts ?? 1}
    )
  `;
}
