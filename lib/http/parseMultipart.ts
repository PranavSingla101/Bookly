import Busboy from "busboy";

export interface MultipartFile {
  fieldname: string;
  filename: string;
  mimetype: string;
  buffer: Buffer;
}

export interface ParsedMultipart {
  fields: Record<string, string>;
  files: MultipartFile[];
}

/**
 * Parse a multipart/form-data request using busboy.
 * Avoids the Next.js built-in FormData parser which has a 10 MB body limit
 * and can throw "Failed to parse body as FormData" on large uploads.
 */
export async function parseMultipart(request: Request): Promise<ParsedMultipart> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    throw new Error(`Expected multipart/form-data, got: ${contentType}`);
  }

  const arrayBuffer = await request.arrayBuffer();
  const nodeBuffer = Buffer.from(arrayBuffer);

  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {};
    const files: MultipartFile[] = [];
    const pending: Promise<void>[] = [];

    const bb = Busboy({ headers: { "content-type": contentType } });

    bb.on("file", (fieldname, stream, info) => {
      const chunks: Buffer[] = [];
      const done = new Promise<void>((res) => {
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", () => {
          files.push({
            fieldname,
            filename: info.filename,
            mimetype: info.mimeType,
            buffer: Buffer.concat(chunks),
          });
          res();
        });
      });
      pending.push(done);
    });

    bb.on("field", (name, value) => {
      fields[name] = value;
    });

    bb.on("finish", () => {
      void Promise.all(pending).then(() => resolve({ fields, files }));
    });

    bb.on("error", reject);

    // Write buffer directly then signal EOF — more reliable than piping a Readable.
    bb.write(nodeBuffer);
    bb.end();
  });
}
