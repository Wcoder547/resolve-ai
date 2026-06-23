from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class IngestDocumentRequest(BaseModel):
    source_id: str = Field(..., alias="sourceId")
    document_id: str = Field(..., alias="documentId")
    organization_id: str = Field(..., alias="organizationId")
    file_path: str = Field(..., alias="filePath")
    mime_type: Optional[str] = Field(default=None, alias="mimeType")
    metadata: Optional[Dict[str, Any]] = None

    model_config = {
        "populate_by_name": True
    }


class DocumentChunkResponse(BaseModel):
    chunk_index: int = Field(..., alias="chunkIndex")
    chunk_text: str = Field(..., alias="chunkText")
    token_count: int = Field(..., alias="tokenCount")
    metadata: Dict[str, Any]

    model_config = {
        "populate_by_name": True
    }


class IngestDocumentData(BaseModel):
    source_id: str = Field(..., alias="sourceId")
    document_id: str = Field(..., alias="documentId")
    organization_id: str = Field(..., alias="organizationId")
    text_length: int = Field(..., alias="textLength")
    chunks_count: int = Field(..., alias="chunksCount")
    chunks: List[DocumentChunkResponse]

    model_config = {
        "populate_by_name": True
    }


class IngestDocumentResponse(BaseModel):
    success: bool
    message: str
    data: IngestDocumentData