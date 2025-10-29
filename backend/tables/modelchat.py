"""
ModelChat Table Definition
--------------------------
Contains both SQLAlchemy model and Pydantic schemas in one file.
"""

from datetime import datetime
from typing import Optional, Union, Any
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field, validator
import json
from config.database import Base
from utils.time_utils import get_ist_now


# ============================================================================
# SQLAlchemy Model (Database Table)
# ============================================================================

class ModelChat(Base):
    """Database table for AI model chat interactions"""
    __tablename__ = "modelchat"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    display_name = Column(String(255), nullable=True)
    code_name = Column(String(255), nullable=False)
    ai_model_id = Column(Integer, ForeignKey("ai_models.id"), nullable=False, index=True)
    model_input_prompt = Column(Text, nullable=True)
    model_output_prompt = Column(Text, nullable=True)
    last_update_time = Column(DateTime, default=get_ist_now, onupdate=get_ist_now)
    
    # Relationship to AIModel
    ai_model = relationship("AIModel", back_populates="modelchats")


# ============================================================================
# Pydantic Schemas (API Request/Response)
# ============================================================================

class ModelChatCreate(BaseModel):
    """Schema for creating a new model chat"""
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    code_name: str = Field(..., min_length=1, max_length=255)
    ai_model_id: int = Field(..., gt=0)
    model_input_prompt: Optional[str] = Field(None)
    model_output_prompt: Optional[Union[str, dict, Any]] = Field(None)
    
    @validator('model_output_prompt', pre=True)
    def convert_output_prompt_to_string(cls, v):
        """Convert dict/object to JSON string for storage"""
        if v is None:
            return None
        if isinstance(v, str):
            return v
        # Convert dict, list, or other objects to JSON string
        try:
            return json.dumps(v, ensure_ascii=False)
        except (TypeError, ValueError) as e:
            # If conversion fails, convert to string representation
            return str(v)


class ModelChatCreateSimple(BaseModel):
    """Simplified schema for creating a new model chat with auto-filled fields"""
    code_name: str = Field(..., min_length=1, max_length=255)
    model_input_prompt: Optional[str] = Field(None)
    model_output_prompt: Optional[Union[str, dict, Any]] = Field(None)
    
    @validator('model_output_prompt', pre=True)
    def convert_output_prompt_to_string(cls, v):
        """Convert dict/object to JSON string for storage"""
        if v is None:
            return None
        if isinstance(v, str):
            return v
        # Convert dict, list, or other objects to JSON string
        try:
            return json.dumps(v, ensure_ascii=False)
        except (TypeError, ValueError) as e:
            # If conversion fails, convert to string representation
            return str(v)


class ModelChatUpdate(BaseModel):
    """Schema for updating a model chat"""
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    code_name: Optional[str] = Field(None, min_length=1, max_length=255)
    ai_model_id: Optional[int] = Field(None, gt=0)
    model_input_prompt: Optional[str] = Field(None)
    model_output_prompt: Optional[str] = Field(None)


class ModelChatResponse(BaseModel):
    """Schema for model chat response"""
    id: int
    display_name: Optional[str] = None
    code_name: str
    ai_model_id: int
    model_input_prompt: Optional[str] = None
    model_output_prompt: Optional[str] = None
    last_update_time: datetime

    class Config:
        from_attributes = True