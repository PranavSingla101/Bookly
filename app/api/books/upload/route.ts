import { NextResponse } from "next/server";
import { requireUserProfile } from "@/lib/auth/requireUserProfile";
import { mapDbBookToBookDto } from "@/lib/books/dto";
import {
  contentTypeForEpubAsset,
  unzipEpubBuffer,
} from "@/lib/epub/unzipEpubServer";
import { removeStorageFolderPrefix } from "@/lib/supabase/storageTree";
import { parseMultipart } from "@/lib/http/parseMultipart";

const BOOKS_BUCKET = "books";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { supabase, profileId } = await requireUserProfile();

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

    const titleRaw = parsed.fields["title"];
    const authorRaw = parsed.fields["author"];
    const coverDataRaw = parsed.fields["coverData"];
    const title =
      typeof titleRaw === "string" && titleRaw.trim()
        ? titleRaw.trim()
        : fileEntry.filename || "Untitled";
    const author =
      typeof authorRaw === "string" && authorRaw.trim() ? authorRaw.trim() : null;
    const coverData =
      typeof coverDataRaw === "string" && coverDataRaw.trim() ? coverDataRaw.trim() : null;

    const legacyStoragePath = `${profileId}/${crypto.randomUUID()}.epub`;

    const { data: inserted, error: insertError } = await supabase
      .from("books")
      .insert({
        profile_id: profileId,
        title,
        author,
        cover_data: coverData,
        storage_path: legacyStoragePath,
        file_name: fileEntry.filename,
        file_size: fileEntry.buffer.byteLength,
        mime_type: fileEntry.mimetype || "application/epub+zip",
      })
      .select("id,title,author,cover_data,created_at,updated_at")
      .single();

    if (insertError || !inserted) {
      const body: { error: string; detail?: string } = { error: "Failed to create book record" };
      if (process.env.NODE_ENV === "development" && insertError?.message) {
        body.detail = insertError.message;
      }
      return NextResponse.json(body, { status: 500 });
    }

    const bookId = inserted.id as string;
    const extractedPrefix = `${profileId}/${bookId}`;

    let unzipped;
    try {
      unzipped = unzipEpubBuffer(fileEntry.buffer);
    } catch (err) {
      await supabase.from("books").delete().eq("id", bookId);
      const message = err instanceof Error ? err.message : "Failed to read EPUB";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const packageOpfStoragePath = `${extractedPrefix}/${unzipped.packageOpfRelativePath}`;

    try {
      for (const [relativePath, buf] of unzipped.files) {
        const objectPath = `${extractedPrefix}/${relativePath}`;
        const { error: upErr } = await supabase.storage
          .from(BOOKS_BUCKET)
          .upload(objectPath, buf, {
            contentType: contentTypeForEpubAsset(relativePath),
            upsert: true,
          });
        if (upErr) {
          throw new Error(upErr.message);
        }
      }
    } catch (err) {
      await removeStorageFolderPrefix(supabase, BOOKS_BUCKET, extractedPrefix);
      await supabase.from("books").delete().eq("id", bookId);
      const message = err instanceof Error ? err.message : "Failed to upload extracted EPUB";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const { error: updateError } = await supabase
      .from("books")
      .update({
        storage_path: packageOpfStoragePath,
        extracted_storage_prefix: extractedPrefix,
        package_opf_storage_path: packageOpfStoragePath,
      })
      .eq("id", bookId);

    if (updateError) {
      await removeStorageFolderPrefix(supabase, BOOKS_BUCKET, extractedPrefix);
      await supabase.from("books").delete().eq("id", bookId);
      const body: { error: string; detail?: string } = { error: "Failed to finalize book record" };
      if (process.env.NODE_ENV === "development") {
        body.detail = updateError.message;
      }
      return NextResponse.json(body, { status: 500 });
    }

    return NextResponse.json(
      {
        book: mapDbBookToBookDto({
          ...inserted,
          package_opf_storage_path: packageOpfStoragePath,
        }),
      },
      { status: 201 }
    );
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
