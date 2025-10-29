"""
Simplified Table Definitions
----------------------------
All models and schemas are defined in one place for simplicity.
Each table file contains both SQLAlchemy models and Pydantic schemas.
"""

from config.database import Base
from .ai_model import AIModel
from .positions import Position
from .modelchat import ModelChat
from .trades import Trade
from .modeldata import ModelData
from .user import User

# Export all models for easy imports
__all__ = ["Base", "AIModel", "Position", "ModelChat", "Trade", "ModelData", "User"]

# Auto-discovery of all models for table creation
MODELS = [AIModel, Position, ModelChat, Trade, ModelData, User]
