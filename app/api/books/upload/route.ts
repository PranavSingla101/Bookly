import { NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/auth/requireUserProfile";
import { COVERS_BUCKET, EPUBS_BUCKET } from "@/lib/api/books/constants";
import { mapDbBookToBookDto } from "@/lib/books/dto";
import { ensureBookStorageBuckets } from "@/lib/supabase/ensureBookBuckets";
import { isPkZipMagic } from "@/lib/epub/epubZipMagic";
import { parseMultipart } from "@/lib/http/parseMultipart";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Multipart clients often send octet-stream or application/zip for EPUBs */
const ALLOWED_EPUB_MIME_TYPES = new Set([
  "",
  "application/epub+zip",
  "application/octet-stream",
  "application/zip",
  "application/x-zip-compressed",
]);

export const runtime = "nodejs";
export const maxDuration = 120;

function coverExtFromUpload(filename: string, mimetype: string): "webp" | "jpg" {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpg";
  if (lower.endsWith(".webp")) return "webp";
  const m = mimetype.split(";")[0]?.trim().toLowerCase() ?? "";
  if (m === "image/jpeg") return "jpg";
  return "webp";
}

function coverContentType(ext: "webp" | "jpg"): string {
  return ext === "jpg" ? "image/jpeg" : "image/webp";
}

async function removeStorageObject(
  supabase: SupabaseClient,
  bucket: string,
  objectPath: string | null
): Promise<void> {
  if (!objectPath) return;
  await supabase.storage.from(bucket).remove([objectPath]);
}

export async function POST(request: Request) {
  let coverStoragePath: string | null = null;
  let epubStoragePath: string | null = null;

  try {
    const { supabase, profileId } = await requireUserProfile();
    await ensureBookStorageBuckets(supabase);

    let parsed;
    try {
      parsed = await parseMultipart(request);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to parse upload";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const fileEntry = parsed.files.find((f) => f.fieldname === "file");
    if (!fileEntry) {
      return NextResponse.json({ error: "Missing uploaded file" }, { status: 400 });
    }

    if (!fileEntry.filename.toLowerCase().endsWith(".epub")) {
      return NextResponse.json({ error: "File must be an .epub" }, { status: 400 });
    }

    const declaredMime = (fileEntry.mimetype || "").split(";")[0]?.trim().toLowerCase() ?? "";
    if (!ALLOWED_EPUB_MIME_TYPES.has(declaredMime)) {
      return NextResponse.json(
        {
          error: "Invalid file type for EPUB upload",
          detail:
            process.env.NODE_ENV === "development"
              ? `Got: ${fileEntry.mimetype || "(empty)"}`
              : undefined,
        },
        { status: 400 }
      );
    }

    if (!isPkZipMagic(fileEntry.buffer)) {
      return NextResponse.json(
        { error: "File is not a valid EPUB (ZIP) archive" },
        { status: 400 }
      );
    }

    const titleRaw = parsed.fields["title"];
    const authorRaw = parsed.fields["author"];
    const title =
      typeof titleRaw === "string" && titleRaw.trim()
        ? titleRaw.trim()
        : fileEntry.filename || "Untitled";
    const author =
      typeof authorRaw === "string" && authorRaw.trim() ? authorRaw.trim() : null;

    const bookId = crypto.randomUUID();
    epubStoragePath = `${profileId}/${bookId}.epub`;

    const coverEntry = parsed.files.find((f) => f.fieldname === "cover");
    if (coverEntry && coverEntry.buffer.byteLength > 0) {
      const ext = coverExtFromUpload(coverEntry.filename, coverEntry.mimetype);
      coverStoragePath = `${profileId}/${bookId}.${ext}`;
      const { error: coverErr } = await supabase.storage
        .from(COVERS_BUCKET)
        .upload(coverStoragePath, coverEntry.buffer, {
          contentType:
            coverEntry.mimetype?.split(";")[0]?.trim() || coverContentType(ext),
          upsert: false,
        });
      if (coverErr) {
        coverStoragePath = null;
        return NextResponse.json(
          { error: "Failed to upload cover image", detail: coverErr.message },
          { status: 500 }
        );
      }
    } else {
      coverStoragePath = null;
    }

    const { error: epubErr } = await supabase.storage
      .from(EPUBS_BUCKET)
      .upload(epubStoragePath, fileEntry.buffer, {
        contentType: "application/epub+zip",
        upsert: false,
      });

    if (epubErr) {
      await removeStorageObject(supabase, COVERS_BUCKET, coverStoragePath);
      epubStoragePath = null;
      return NextResponse.json(
        { error: "Failed to upload EPUB file", detail: epubErr.message },
        { status: 500 }
      );
    }

    const { data: inserted, error: insertError } = await supabase
      .from("books")
      .insert({
        id: bookId,
        profile_id: profileId,
        title,
        author,
        cover_data: null,
        epub_storage_path: epubStoragePath,
        cover_storage_path: coverStoragePath,
        storage_path: null,
        extracted_storage_prefix: null,
        package_opf_storage_path: null,
        file_name: fileEntry.filename,
        file_size: fileEntry.buffer.byteLength,
        mime_type: fileEntry.mimetype || "application/epub+zip",
      })
      .select(
        "id,title,author,cover_data,created_at,updated_at,epub_storage_path,cover_storage_path"
      )
      .single();

    if (insertError || !inserted) {
      await removeStorageObject(supabase, EPUBS_BUCKET, epubStoragePath);
      await removeStorageObject(supabase, COVERS_BUCKET, coverStoragePath);
      epubStoragePath = null;
      coverStoragePath = null;
      const body: { error: string; detail?: string } = { error: "Failed to create book record" };
      if (process.env.NODE_ENV === "development" && insertError?.message) {
        body.detail = insertError.message;
      }
      return NextResponse.json(body, { status: 500 });
    }

    return NextResponse.json({ book: mapDbBookToBookDto(inserted) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: { error: string; detail?: string } = { error: "Unexpected server error" };
    if (process.env.NODE_ENV === "development" && error instanceof Error) {
      body.detail = error.message;
    }
    return NextResponse.json(body, { status: 500 });
  }
}
