"""
ModelData Table Definition
--------------------------
Contains both SQLAlchemy model and Pydantic schemas in one file.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field
from config.database import Base
from utils.time_utils import get_ist_now


# ============================================================================
# SQLAlchemy Model (Database Table)
# ============================================================================

class ModelData(Base):
    """Database table for model performance data"""
    __tablename__ = "modeldata"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ai_model_id = Column(Integer, ForeignKey("ai_models.id"), nullable=False, index=True)
    code_name = Column(String(255), nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    account_value = Column(Float, nullable=True)
    return_value = Column(Float, nullable=True)  # Using return_value to avoid Python keyword conflict
    total_pnl = Column(Float, nullable=True)
    fees = Column(Float, nullable=True)
    trades = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=get_ist_now, nullable=False)
    updated_at = Column(DateTime, default=get_ist_now, onupdate=get_ist_now, nullable=False)
    
    # Relationship to AIModel
    ai_model = relationship("AIModel", back_populates="model_data")


# ============================================================================
# Pydantic Schemas (API Request/Response)
# ============================================================================

class ModelDataCreate(BaseModel):
    """Schema for creating new model data"""
    ai_model_id: int = Field(..., gt=0)
    code_name: str = Field(..., min_length=1, max_length=255)
    display_name: str = Field(..., min_length=1, max_length=255)
    account_value: Optional[float] = Field(None, ge=0)
    return_value: Optional[float] = Field(None)
    total_pnl: Optional[float] = Field(None)
    fees: Optional[float] = Field(None, ge=0)
    trades: Optional[int] = Field(None, ge=0)


class ModelDataUpdate(BaseModel):
    """Schema for updating model data"""
    ai_model_id: Optional[int] = Field(None, gt=0)
    code_name: Optional[str] = Field(None, min_length=1, max_length=255)
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    account_value: Optional[float] = Field(None, ge=0)
    return_value: Optional[float] = Field(None)
    total_pnl: Optional[float] = Field(None)
    fees: Optional[float] = Field(None, ge=0)
    trades: Optional[int] = Field(None, ge=0)


class ModelDataCreateSimple(BaseModel):
    """Schema for creating model data with chat_name lookup"""
    chat_name: str = Field(..., min_length=1, max_length=255, description="Chat name to match with AI model's code_name")
    account_value: Optional[float] = Field(None, ge=0)
    return_value: Optional[float] = Field(None)
    total_pnl: Optional[float] = Field(None)
    fees: Optional[float] = Field(None, ge=0)
    trades: Optional[int] = Field(None, ge=0)


class ModelDataResponse(BaseModel):
    """Schema for model data response"""
    id: int
    ai_model_id: int
    code_name: str
    display_name: str
    account_value: Optional[float] = None
    return_value: Optional[float] = None
    total_pnl: Optional[float] = None
    fees: Optional[float] = None
    trades: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True