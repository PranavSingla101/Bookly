// Extracts normalized upload metadata from a user-provided EPUB file.

export interface UploadedEpubMetadata {
  title: string;
  author?: string;
  coverData?: string;
}

export async function buildBookFromEpubUpload(file: File): Promise<UploadedEpubMetadata> {
  const bareName = file.name.replace(/\.[^/.]+$/, "").trim();
  const title = bareName || "Untitled";
  const parts = bareName
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    title,
    author: parts.length > 1 ? parts.slice(1).join(" - ") : undefined,
  };
}

