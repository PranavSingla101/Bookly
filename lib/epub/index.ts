// Public entry point for EPUB helpers used by the app.
export { extractEpubLocal } from "./books/extractEpubLocal";
export type { EpubUploadMetadata } from "@/types/epub";
export { assertValidEpubFileForUpload, EpubValidationError, EPUB_MIME } from "./validateEpubFile";
export { compressCoverForUpload } from "./cover/compressCoverImage";
export { isPkZipMagic } from "./epubZipMagic";
