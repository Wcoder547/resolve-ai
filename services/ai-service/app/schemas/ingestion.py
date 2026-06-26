from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, model_validator


class IngestRequest(BaseModel):
    source_id: str = Field(..., alias="sourceId")
    document_id: str = Field(..., alias="documentId")
    organization_id: str = Field(..., alias="organizationId")
    file_path: Optional[str] = Field(default=None, alias="filePath")
    file_url: Optional[str] = Field(default=None, alias="fileUrl")
    mime_type: Optional[str] = Field(default=None, alias="mimeType")
    metadata: Dict[str, Any] = {}

    @model_validator(mode="after")
    def validate_file_input(self):
        if not self.file_path and not self.file_url:
            raise ValueError("Either filePath or fileUrl is required.")

        return self

    model_config = {
        "populate_by_name": True
    }


class DocumentChunk(BaseModel):
    chunk_index: int = Field(..., alias="chunkIndex")
    chunk_text: str = Field(..., alias="chunkText")
    token_count: int = Field(..., alias="tokenCount")
    metadata: Dict[str, Any] = {}

    model_config = {
        "populate_by_name": True
    }


class IngestData(BaseModel):
    source_id: str = Field(..., alias="sourceId")
    document_id: str = Field(..., alias="documentId")
    organization_id: str = Field(..., alias="organizationId")
    text_length: int = Field(..., alias="textLength")
    chunks_count: int = Field(..., alias="chunksCount")
    chunks: List[DocumentChunk]

    model_config = {
        "populate_by_name": True
    }


class IngestResponse(BaseModel):
    success: bool
    message: str
    data: IngestData