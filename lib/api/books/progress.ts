/**
 * This module parses and validates reading progress update payloads, enforcing
 * required CFI and bounded numeric progress while safely handling timestamps
 * from clients for conflict-aware sync behavior.
 */
import { MAX_PROGRESS, MIN_PROGRESS } from "@/lib/api/books/constants";

interface ProgressPatchBody {
  cfi?: unknown;
  progress?: unknown;
  updatedAt?: unknown;
}

interface ParseProgressInputSuccess {
  ok: true;
  data: {
    cfi: string;
    progress: number | null;
    clientUpdatedAt: Date | null;
  };
}

interface ParseProgressInputFailure {
  ok: false;
  error: string;
}

export type ParseProgressInputResult = ParseProgressInputSuccess | ParseProgressInputFailure;

function parseProgressBody(body: ProgressPatchBody): ParseProgressInputResult {
  const cfi = typeof body.cfi === "string" ? body.cfi.trim() : "";
  if (!cfi) {
    return { ok: false, error: "Missing cfi" };
  }

  const progress =
    typeof body.progress === "number" && Number.isFinite(body.progress)
      ? Math.min(MAX_PROGRESS, Math.max(MIN_PROGRESS, body.progress))
      : null;

  const clientUpdatedAt =
    typeof body.updatedAt === "string" && body.updatedAt.trim() ? new Date(body.updatedAt) : null;
  if (clientUpdatedAt && Number.isNaN(clientUpdatedAt.getTime())) {
    return { ok: false, error: "Invalid updatedAt timestamp" };
  }

  return {
    ok: true,
    data: {
      cfi,
      progress,
      clientUpdatedAt,
    },
  };
}

/** Parses a progress PATCH body without reading `Request` (use when the body was already consumed). */
export function parseProgressJsonBody(body: unknown): ParseProgressInputResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON body" };
  }
  return parseProgressBody(body as ProgressPatchBody);
}

export async function parseProgressInput(request: Request): Promise<ParseProgressInputResult> {
  let body: ProgressPatchBody;
  try {
    body = (await request.json()) as ProgressPatchBody;
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }
  return parseProgressBody(body);
}
