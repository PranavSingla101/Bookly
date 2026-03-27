/**
 * This route serves Foliate.js static assets from the submodule located in the
 * packages directory. It keeps runtime URLs under `/foliate-js/*` while the
 * submodule source remains outside `public`.
 */
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { isAbsolute, join, normalize, relative, resolve } from "node:path";

export const runtime = "nodejs";

const FOLIATE_ROOT = join(process.cwd(), "packages", "foliate-js");

function getContentType(pathname: string): string {
  const lower = pathname.toLowerCase();
  if (lower.endsWith(".html")) return "text/html; charset=utf-8";
  if (lower.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (lower.endsWith(".mjs")) return "application/javascript; charset=utf-8";
  if (lower.endsWith(".css")) return "text/css; charset=utf-8";
  if (lower.endsWith(".json")) return "application/json; charset=utf-8";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".ttf")) return "font/ttf";
  if (lower.endsWith(".woff")) return "font/woff";
  if (lower.endsWith(".woff2")) return "font/woff2";
  if (lower.endsWith(".pfb")) return "application/x-font-type1";
  if (lower.endsWith(".bcmap")) return "application/octet-stream";
  return "application/octet-stream";
}

export async function GET(
  _request: Request,
  props: RouteContext<"/foliate-js/[...assetPath]">
) {
  const { assetPath } = await props.params;
  if (!assetPath || assetPath.length === 0) {
    return NextResponse.json({ error: "Asset path is required" }, { status: 400 });
  }

  const relativePath = normalize(assetPath.join("/"));
  if (isAbsolute(relativePath)) {
    return NextResponse.json({ error: "Invalid asset path" }, { status: 400 });
  }
  const absolutePath = resolve(FOLIATE_ROOT, relativePath);
  const relFromRoot = relative(FOLIATE_ROOT, absolutePath);
  if (relFromRoot.startsWith("..") || isAbsolute(relFromRoot)) {
    return NextResponse.json({ error: "Invalid asset path" }, { status: 400 });
  }

  try {
    const content = await readFile(absolutePath);
    return new NextResponse(content, {
      headers: {
        "content-type": getContentType(relativePath),
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
}
