export type ChatSource = {
  sourceId: string;
  sourceName: string;
  documentId: string;
  documentTitle: string;
  chunkId: string;
  chunkIndex: number;
  score: number;
};

export type RetrievedChunk = {
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
};

export type AskChatResponse = {
  success: boolean;
  message: string;
  data: {
    conversationId: string;
    messageId?: string;
    answer: string;
    sources: ChatSource[];
    retrievedChunks: RetrievedChunk[];
    grounded: boolean;
    model: string | null;
    provider: string | null;
    retrievalQuery?: string;
  };
};

export type ChatMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  sources?: ChatSource[];
  retrievedChunks?: RetrievedChunk[];
  grounded?: boolean;
  provider?: string | null;
  model?: string | null;
  createdAt: string;
};


export type ChatConversationSummary = {
  id: string;
  title: string;
  messagesCount: number;
  lastMessage: {
    id: string;
    role: "USER" | "ASSISTANT" | "SYSTEM";
    content: string;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type ListChatConversationsResponse = {
  success: boolean;
  data: {
    conversations: ChatConversationSummary[];
  };
};

export type GetChatConversationResponse = {
  success: boolean;
  data: {
    conversation: {
      id: string;
      title: string;
      createdAt: string;
      updatedAt: string;
      messages: {
        id: string;
        role: "USER" | "ASSISTANT" | "SYSTEM";
        content: string;
        sources?: ChatSource[] | null;
        metadata?: {
          model?: string;
          provider?: string;
          grounded?: boolean;
          retrievalQuery?: string;
        } | null;
        createdAt: string;
      }[];
    };
  };
};

export type DeleteChatConversationResponse = {
  success: boolean;
  message: string;
};