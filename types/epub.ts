export interface EpubUploadMetadata {
  title: string;
  author?: string;
  /** Raw cover image from the EPUB package, before compression for storage. */
  coverBlob: Blob | null;
}
