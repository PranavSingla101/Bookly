/**
 * Client-only: resizes and encodes a cover image for efficient storage (WebP preferred).
 * Import only from client components or code that never runs on the server.
 */
const MAX_WIDTH = 480;

export interface CompressedCover {
  blob: Blob;
  /** Filename extension without dot */
  ext: "webp" | "jpg";
  mime: "image/webp" | "image/jpeg";
}

export async function compressCoverForUpload(source: Blob): Promise<CompressedCover> {
  const bitmap = await createImageBitmap(source);
  try {
    let w = bitmap.width;
    let h = bitmap.height;
    if (w > MAX_WIDTH) {
      h = Math.round((h * MAX_WIDTH) / w);
      w = MAX_WIDTH;
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context is not available");
    }
    ctx.drawImage(bitmap, 0, 0, w, h);

    const webp = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", 0.82)
    );
    if (webp && webp.size > 0) {
      return { blob: webp, ext: "webp", mime: "image/webp" };
    }

    const jpeg = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.88)
    );
    if (!jpeg || jpeg.size === 0) {
      throw new Error("Failed to encode cover image");
    }
    return { blob: jpeg, ext: "jpg", mime: "image/jpeg" };
  } finally {
    bitmap.close();
  }
}
