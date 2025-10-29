"""
Trades Table Definition
-----------------------
Contains both SQLAlchemy model and Pydantic schemas in one file.
"""

from datetime import datetime
from typing import Optional
from enum import Enum
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field
from config.database import Base
from utils.time_utils import get_ist_now


# ============================================================================
# Enums
# ============================================================================

class SideEnum(str, Enum):
    """Trading side enumeration"""
    BUY = "BUY"
    SELL = "SELL"


# ============================================================================
# SQLAlchemy Model (Database Table)
# ============================================================================

class Trade(Base):
    """Database table for AI model trades"""
    __tablename__ = "trades"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    display_name = Column(String(255), nullable=True)
    code_name = Column(String(255), nullable=False)
    ai_model_id = Column(Integer, ForeignKey("ai_models.id"), nullable=False, index=True)
    asset = Column(String(255), nullable=False)
    side = Column(SQLEnum(SideEnum), nullable=False)
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    notional_value = Column(Float, nullable=False)
    last_update_time = Column(DateTime, default=get_ist_now, onupdate=get_ist_now)
    
    # Relationship to AIModel
    ai_model = relationship("AIModel", back_populates="trade_records")


# ============================================================================
# Pydantic Schemas (API Request/Response)
# ============================================================================

class TradeCreate(BaseModel):
    """Schema for creating a new trade"""
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    code_name: str = Field(..., min_length=1, max_length=255)
    ai_model_id: int = Field(..., gt=0)
    asset: str = Field(..., min_length=1, max_length=255)
    side: SideEnum = Field(...)
    quantity: float = Field(..., gt=0)
    price: float = Field(..., gt=0)
    notional_value: float = Field(..., gt=0)


class TradeCreateSimple(BaseModel):
    """Simplified schema for creating a new trade with auto-filled fields"""
    code_name: str = Field(..., min_length=1, max_length=255)
    asset: str = Field(..., min_length=1, max_length=255)
    side: SideEnum = Field(...)
    quantity: float = Field(..., gt=0)
    price: Optional[float] = Field(None, gt=0)  # Optional - will be fetched from Redis if not provided
    notional_value: Optional[float] = Field(None, gt=0)  # Optional - will be calculated from LTP and quantity


class TradeUpdate(BaseModel):
    """Schema for updating a trade"""
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    code_name: Optional[str] = Field(None, min_length=1, max_length=255)
    ai_model_id: Optional[int] = Field(None, gt=0)
    asset: Optional[str] = Field(None, min_length=1, max_length=255)
    side: Optional[SideEnum] = Field(None)
    quantity: Optional[float] = Field(None, gt=0)
    price: Optional[float] = Field(None, gt=0)
    notional_value: Optional[float] = Field(None, gt=0)


class TradeResponse(BaseModel):
    """Schema for trade response"""
    id: int
    display_name: Optional[str] = None
    code_name: str
    ai_model_id: int
    asset: str
    side: SideEnum
    quantity: float
    price: float
    notional_value: float
    last_update_time: datetime

    class Config:
        from_attributes = True