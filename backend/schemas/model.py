from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class ModelResponse(BaseModel):
    """Schema for model response"""
    id: int
    name: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "GPT-4",
                "description": "OpenAI's GPT-4 model",
                "created_at": "2023-01-01T00:00:00",
                "updated_at": "2023-01-01T00:00:00"
            }
        }
