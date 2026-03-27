/**
 * This module validates and normalizes annotation create/patch request bodies
 * for API routes. It returns typed success/failure results so handlers can keep
 * endpoint logic focused on database operations.
 */
interface AnnotationBody {
  cfiRange?: unknown;
  type?: unknown;
  payload?: unknown;
}

interface AnnotationPatchBody {
  cfiRange?: unknown;
  type?: unknown;
  payload?: unknown;
}

interface ParseAnnotationCreateSuccess {
  ok: true;
  data: {
    cfiRange: string;
    annotationType: string;
    payload: Record<string, unknown>;
  };
}

interface ParseAnnotationPatchSuccess {
  ok: true;
  data: {
    cfi_range?: string;
    annotation_type?: string;
    payload?: object;
    updated_at: string;
  };
}

interface ParseAnnotationFailure {
  ok: false;
  error: string;
}

export type ParseAnnotationCreateResult = ParseAnnotationCreateSuccess | ParseAnnotationFailure;
export type ParseAnnotationPatchResult = ParseAnnotationPatchSuccess | ParseAnnotationFailure;

export async function parseAnnotationCreateInput(
  request: Request
): Promise<ParseAnnotationCreateResult> {
  let body: AnnotationBody;
  try {
    body = (await request.json()) as AnnotationBody;
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }

  const cfiRange = typeof body.cfiRange === "string" ? body.cfiRange.trim() : "";
  const annotationType = typeof body.type === "string" ? body.type.trim() : "";
  if (!cfiRange || !annotationType) {
    return { ok: false, error: "Missing cfiRange or type" };
  }

  const payload =
    body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
      ? (body.payload as Record<string, unknown>)
      : {};

  return {
    ok: true,
    data: { cfiRange, annotationType, payload },
  };
}

export async function parseAnnotationPatchInput(
  request: Request
): Promise<ParseAnnotationPatchResult> {
  let body: AnnotationPatchBody;
  try {
    body = (await request.json()) as AnnotationPatchBody;
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }

  const update: {
    cfi_range?: string;
    annotation_type?: string;
    payload?: object;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.cfiRange === "string" && body.cfiRange.trim()) {
    update.cfi_range = body.cfiRange.trim();
  }
  if (typeof body.type === "string" && body.type.trim()) {
    update.annotation_type = body.type.trim();
  }
  if (body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)) {
    update.payload = body.payload as object;
  }

  return { ok: true, data: update };
}
