export type KnowledgeSourceStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export type KnowledgeSourceType =
  | "FILE"
  | "URL"
  | "GITHUB"
  | "MARKDOWN"
  | "TEXT";

export type KnowledgeSource = {
  id: string;
  name: string;
  type: KnowledgeSourceType;
  status: KnowledgeSourceStatus;
  url?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  documentsCount?: number;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeDocument = {
  id: string;
  title: string;
  contentHash?: string | null;
  chunksCount: number;
  createdAt: string;
};

export type KnowledgeSourceDetail = KnowledgeSource & {
  filePath?: string | null;
  metadata?: Record<string, unknown> | null;
  documents: KnowledgeDocument[];
};

export type UploadKnowledgeResponse = {
  success: boolean;
  message: string;
  data: {
    source: {
      id: string;
      name: string;
      type: KnowledgeSourceType;
      status: KnowledgeSourceStatus;
      mimeType?: string | null;
      sizeBytes?: number | null;
      createdAt: string;
    };
    document: {
      id: string;
      title: string;
      contentHash?: string | null;
    };
  };
};

export type ListKnowledgeSourcesResponse = {
  success: boolean;
  data: {
    sources: KnowledgeSource[];
  };
};

export type GetKnowledgeSourceResponse = {
  success: boolean;
  data: {
    source: KnowledgeSourceDetail;
  };
};

export type IngestKnowledgeSourceResponse = {
  success: boolean;
  message: string;
  data: {
    sourceId: string;
    documentId: string;
    status: KnowledgeSourceStatus;
    chunksCount: number;
    textLength: number;
  };
};

export type DeleteKnowledgeSourceResponse = {
  success: boolean;
  message: string;
};


export type SearchKnowledgeResponse = {
  success: boolean;
  message: string;
  data: {
    query: string;
    totalResults: number;
    chunks: {
      id: string;
      documentId: string;
      chunkIndex: number;
      chunkText: string;
      tokenCount?: number | null;
      score: number;
      metadata?: Record<string, unknown> | null;
      source: {
        id: string;
        name: string;
        type: string;
      };
      document: {
        id: string;
        title: string;
      };
      createdAt: string;
    }[];
    context: string;
  };
};


