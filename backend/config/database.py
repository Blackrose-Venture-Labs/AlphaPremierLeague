from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

# PostgreSQL connection settings
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL environment variable is not set. "
        "Please set it in your .env file. "
        "Example: postgresql+asyncpg://username:password@localhost:5432/database_name"
    )

# Create base class for declarative models
Base = declarative_base()

class Database:
    """Async PostgreSQL Database Connection Manager"""
    engine = None
    async_session_maker = None
    
    @classmethod
    async def connect_db(cls):
        """Connect to PostgreSQL"""
        cls.engine = create_async_engine(
            DATABASE_URL,
            echo=False,  # Set to False in production
            future=True,
            pool_pre_ping=True,
            pool_size=100,
            max_overflow=200
        )
        
        cls.async_session_maker = async_sessionmaker(
            cls.engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False
        )
        
        try:
            # Test connection
            async with cls.engine.begin() as conn:
                await conn.run_sync(lambda _: None)
            print("Successfully connected to PostgreSQL!")
        except Exception as e:
            print(f"Error connecting to PostgreSQL: {e}")
            raise
    
    @classmethod
    async def close_db(cls):
        """Close PostgreSQL connection"""
        if cls.engine:
            await cls.engine.dispose()
            print("PostgreSQL connection closed")
    
    @classmethod
    async def create_tables(cls):
        """Create all tables in the database"""
        async with cls.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Database tables created successfully")
    
    @classmethod
    async def get_session(cls) -> AsyncSession:
        """Get an async database session"""
        async with cls.async_session_maker() as session:
            try:
                yield session
            finally:
                await session.close()

# Dependency to get database session
async def get_db_session() -> AsyncSession:
    """Dependency for getting database session in FastAPI routes"""
    async for session in Database.get_session():
        yield session
