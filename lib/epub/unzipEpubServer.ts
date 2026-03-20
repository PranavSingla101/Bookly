import AdmZip from "adm-zip";

export interface UnzippedEpub {
  /** Relative paths inside the EPUB (ZIP), using forward slashes */
  files: Map<string, Buffer>;
  /** Path to package.opf relative to EPUB root (e.g. OEBPS/content.opf) */
  packageOpfRelativePath: string;
}

const IBOOKS_DISPLAY_OPTIONS_PATH = "META-INF/com.apple.ibooks.display-options.xml";
const IBOOKS_DISPLAY_OPTIONS_FALLBACK = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>specified-fonts</key>
    <true/>
  </dict>
</plist>`;

function normalizeZipPath(entryName: string): string | null {
  const normalized = entryName.replace(/\\/g, "/").replace(/^\//, "").trim();
  if (!normalized || normalized.endsWith("/")) {
    return null;
  }
  return normalized;
}

function parsePackageOpfPathFromContainerXml(xml: string): string | null {
  const match =
    xml.match(/full-path\s*=\s*"([^"]+)"/i) ?? xml.match(/full-path\s*=\s*'([^']+)'/i);
  if (!match?.[1]) {
    return null;
  }
  return match[1].replace(/\\/g, "/").replace(/^\//, "");
}

export function contentTypeForEpubAsset(relativePath: string): string {
  const lower = relativePath.toLowerCase();
  if (lower.endsWith(".xhtml") || lower.endsWith(".html") || lower.endsWith(".htm")) {
    return "application/xhtml+xml";
  }
  if (lower.endsWith(".css")) return "text/css; charset=utf-8";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".woff2")) return "font/woff2";
  if (lower.endsWith(".woff")) return "font/woff";
  if (lower.endsWith(".ttf")) return "font/ttf";
  if (lower.endsWith(".otf")) return "font/otf";
  if (lower.endsWith(".opf")) return "application/oebps-package+xml";
  if (lower.endsWith(".ncx")) return "application/x-dtbncx+xml";
  if (lower.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (lower.endsWith(".xml")) return "application/xml";
  return "application/octet-stream";
}

/**
 * Unzip an EPUB buffer and resolve the path to package.opf via META-INF/container.xml.
 */
export function unzipEpubBuffer(buffer: Buffer): UnzippedEpub {
  const zip = new AdmZip(buffer);
  const files = new Map<string, Buffer>();

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) {
      continue;
    }
    const path = normalizeZipPath(entry.entryName);
    if (!path) {
      continue;
    }
    files.set(path, entry.getData());
  }

  const container = files.get("META-INF/container.xml");
  if (!container) {
    throw new Error("Invalid EPUB: missing META-INF/container.xml");
  }

  const packageOpfRelativePath = parsePackageOpfPathFromContainerXml(container.toString("utf-8"));
  if (!packageOpfRelativePath) {
    throw new Error("Invalid EPUB: could not parse package path from container.xml");
  }

  if (!files.has(packageOpfRelativePath)) {
    throw new Error(`Invalid EPUB: package file missing in archive (${packageOpfRelativePath})`);
  }

  // Some readers try fetching this iBooks-specific metadata file even when absent.
  // Provide a tiny default file to avoid noisy hard failures from missing assets.
  if (!files.has(IBOOKS_DISPLAY_OPTIONS_PATH)) {
    files.set(IBOOKS_DISPLAY_OPTIONS_PATH, Buffer.from(IBOOKS_DISPLAY_OPTIONS_FALLBACK, "utf-8"));
  }

  return { files, packageOpfRelativePath };
}
