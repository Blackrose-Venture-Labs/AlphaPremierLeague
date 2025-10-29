"""
AI Model Table Definition
-------------------------
Contains both SQLAlchemy model and Pydantic schemas in one file.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Text, DateTime, Float
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field
from config.database import Base


# ============================================================================
# SQLAlchemy Model (Database Table)
# ============================================================================

class AIModel(Base):
    """Database table for AI models"""
    __tablename__ = "ai_models"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code_name = Column(String(255), nullable=False, unique=True, index=True)
    display_name = Column(String(255), nullable=False)
    provider = Column(String(255), nullable=False)
    color = Column(String(50), nullable=True)
    icon = Column(String(255), nullable=True)
    
    # Trading performance fields
    account_value = Column(Float, nullable=True)
    return_pct = Column(Float, nullable=True)  # Using return_pct to avoid Python keyword conflict
    pnl = Column(Float, nullable=True)
    trading_cost = Column(Float, nullable=True)
    winrate = Column(Float, nullable=True)
    biggest_win = Column(Float, nullable=True)
    biggest_loss = Column(Float, nullable=True)
    sharpe = Column(Float, nullable=True)
    trades = Column(Integer, nullable=True)
    rank = Column(Integer, nullable=True)
    
    # Relationship to positions
    positions = relationship("Position", back_populates="ai_model")
    
    # Relationship to model chats
    modelchats = relationship("ModelChat", back_populates="ai_model")
    
    # Relationship to trades
    trade_records = relationship("Trade", back_populates="ai_model")
    
    # Relationship to model data
    model_data = relationship("ModelData", back_populates="ai_model")


# ============================================================================
# Pydantic Schemas (API Request/Response)
# ============================================================================

class AIModelCreate(BaseModel):
    """Schema for creating a new AI model"""
    code_name: str = Field(..., min_length=1, max_length=255)
    display_name: str = Field(..., min_length=1, max_length=255)
    provider: str = Field(..., min_length=1, max_length=255)
    color: Optional[str] = Field(None, max_length=50)
    icon: Optional[str] = Field(None, max_length=255)
    
    # Trading performance fields
    account_value: Optional[float] = Field(None, ge=0)
    return_pct: Optional[float] = Field(None)
    pnl: Optional[float] = Field(None)
    trading_cost: Optional[float] = Field(None, ge=0)
    winrate: Optional[float] = Field(None, ge=0, le=1)
    biggest_win: Optional[float] = Field(None)
    biggest_loss: Optional[float] = Field(None)
    sharpe: Optional[float] = Field(None)
    trades: Optional[int] = Field(None, ge=0)
    rank: Optional[int] = Field(None, ge=1)


class AIModelUpdate(BaseModel):
    """Schema for updating an AI model"""
    code_name: Optional[str] = Field(None, min_length=1, max_length=255)
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    provider: Optional[str] = Field(None, min_length=1, max_length=255)
    color: Optional[str] = Field(None, max_length=50)
    icon: Optional[str] = Field(None, max_length=255)
    
    # Trading performance fields
    account_value: Optional[float] = Field(None, ge=0)
    return_pct: Optional[float] = Field(None)
    pnl: Optional[float] = Field(None)
    trading_cost: Optional[float] = Field(None, ge=0)
    winrate: Optional[float] = Field(None, ge=0, le=1)
    biggest_win: Optional[float] = Field(None)
    biggest_loss: Optional[float] = Field(None)
    sharpe: Optional[float] = Field(None)
    trades: Optional[int] = Field(None, ge=0)
    rank: Optional[int] = Field(None, ge=1)


class AIModelResponse(BaseModel):
    """Schema for AI model response"""
    id: int
    code_name: str
    display_name: str
    provider: str
    color: Optional[str] = None
    icon: Optional[str] = None
    
    # Trading performance fields
    account_value: Optional[float] = None
    return_pct: Optional[float] = None
    pnl: Optional[float] = None
    trading_cost: Optional[float] = None
    winrate: Optional[float] = None
    biggest_win: Optional[float] = None
    biggest_loss: Optional[float] = None
    sharpe: Optional[float] = None
    trades: Optional[int] = None
    rank: Optional[int] = None

    class Config:
        from_attributes = True
