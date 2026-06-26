export const ALLOWED_KNOWLEDGE_EXTENSIONS = new Set([
  ".pdf",
  ".txt",
  ".md",
  ".markdown",
  ".docx"
]);

export const TEXT_EXTENSIONS = new Set([".txt", ".md", ".markdown"]);

export const BINARY_DOCUMENT_EXTENSIONS = new Set([".pdf", ".docx"]);

export const ALLOWED_FILE_TYPE_MIME_BY_EXTENSION: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip"
  ]
};