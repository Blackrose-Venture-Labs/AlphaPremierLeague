"""
Positions Table Definition
--------------------------
Contains both SQLAlchemy model and Pydantic schemas in one file.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field
from config.database import Base
from utils.time_utils import get_ist_now


# ============================================================================
# SQLAlchemy Model (Database Table)
# ============================================================================

class Position(Base):
    """Database table for AI model positions"""
    __tablename__ = "positions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    asset = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=True)
    percentage = Column(Float, nullable=False)
    value = Column(Float, nullable=False)
    pnl = Column(Float, nullable=True)
    quantity = Column(Float, nullable=True)
    last_price = Column(Float, nullable=True)
    code_name = Column(String(255), nullable=False)
    ai_model_id = Column(Integer, ForeignKey("ai_models.id"), nullable=False, index=True)
    last_updated = Column(DateTime, default=get_ist_now, onupdate=get_ist_now)
    
    # Relationship to AIModel
    ai_model = relationship("AIModel", back_populates="positions")


# ============================================================================
# Pydantic Schemas (API Request/Response)
# ============================================================================

class PositionCreate(BaseModel):
    """Schema for creating a new position"""
    asset: str = Field(..., min_length=1, max_length=255)
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    percentage: float = Field(..., ge=0, le=100)
    value: float = Field(..., ge=0)
    pnl: Optional[float] = Field(None)
    quantity: Optional[float] = Field(None, ge=0)
    last_price: Optional[float] = Field(None, ge=0)
    code_name: str = Field(..., min_length=1, max_length=255)
    ai_model_id: int = Field(..., gt=0)


class PositionUpdate(BaseModel):
    """Schema for updating a position"""
    asset: Optional[str] = Field(None, min_length=1, max_length=255)
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    percentage: Optional[float] = Field(None)
    value: Optional[float] = Field(None, ge=0)
    pnl: Optional[float] = Field(None)
    quantity: Optional[float] = Field(None)
    last_price: Optional[float] = Field(None, ge=0)
    code_name: Optional[str] = Field(None, min_length=1, max_length=255)
    ai_model_id: Optional[int] = Field(None, gt=0)


class PositionCreateSimple(BaseModel):
    """Schema for creating a new position with only code_name (auto-fills display_name and ai_model_id)"""
    asset: str = Field(..., min_length=1, max_length=255)
    percentage: float = Field(...)
    value: float = Field(..., ge=0)
    pnl: Optional[float] = Field(None)
    quantity: Optional[float] = Field(None)
    last_price: Optional[float] = Field(None, ge=0)
    code_name: str = Field(..., min_length=1, max_length=255)


class PositionResponse(BaseModel):
    """Schema for position response"""
    id: int
    asset: str
    display_name: Optional[str] = None
    percentage: float
    value: float
    pnl: Optional[float] = None
    quantity: Optional[float] = None
    last_price: Optional[float] = None
    code_name: str
    ai_model_id: int
    last_updated: datetime

    class Config:
        from_attributes = True


class PositionBulkUpdateItem(BaseModel):
    """Schema for a single position in bulk update"""
    id: int = Field(..., gt=0)
    asset: Optional[str] = Field(None, min_length=1, max_length=255)
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    percentage: Optional[float] = Field(None)
    value: Optional[float] = Field(None)
    pnl: Optional[float] = Field(None)
    quantity: Optional[float] = Field(None)
    last_price: Optional[float] = Field(None, ge=0)
    code_name: Optional[str] = Field(None, min_length=1, max_length=255)
    ai_model_id: Optional[int] = Field(None, gt=0)


class PositionBulkUpdate(BaseModel):
    """Schema for bulk updating positions"""
    positions: list[PositionBulkUpdateItem] = Field(..., min_length=1)


class PositionBulkUpdateResponse(BaseModel):
    """Schema for bulk update response"""
    success_count: int
    failed_count: int
    updated_positions: list[PositionResponse]
    errors: list[dict]