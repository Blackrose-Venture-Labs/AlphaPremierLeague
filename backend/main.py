from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi
import secrets
import os
from dotenv import load_dotenv
from routers import router
from config.database import Database

# Load environment variables
load_dotenv()

# Import all tables to ensure they're registered with Base
import tables  # This imports all models

# HTTP Basic Auth for documentation
security = HTTPBasic()

# Documentation credentials (loaded from environment variables)
DOCS_USERNAME = os.getenv("DOCS_USERNAME")
DOCS_PASSWORD = os.getenv("DOCS_PASSWORD")

if not DOCS_USERNAME or not DOCS_PASSWORD:
    raise ValueError(
        "DOCS_USERNAME and DOCS_PASSWORD environment variables are not set. "
        "Please set them in your .env file for API documentation authentication."
    )

def verify_docs_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    """Verify credentials for accessing API documentation"""
    correct_username = secrets.compare_digest(credentials.username, DOCS_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, DOCS_PASSWORD)
    
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

app = FastAPI(
    title="Blackrose AI Arena API",
    description="Backend API for Blackrose AI Arena",
    version="1.0.0",
    docs_url=None,  # Disable default docs
    redoc_url=None,  # Disable default redoc
    openapi_url=None  # Disable default openapi.json
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include main router with all sub-routes
app.include_router(router.router)



# Startup and shutdown events
@app.on_event("startup")
async def startup_db_client():
    """Connect to PostgreSQL on startup"""
    await Database.connect_db()
    # Create tables on startup (comment out if using Alembic)
    # await Database.create_tables()

@app.on_event("shutdown")
async def shutdown_db_client():
    """Close PostgreSQL connection on shutdown"""
    await Database.close_db()

# Protected documentation endpoints
@app.get("/openapi.json", include_in_schema=False)
async def get_open_api_endpoint(username: str = Depends(verify_docs_credentials)):
    return get_openapi(title=app.title, version=app.version, routes=app.routes)

@app.get("/docs", include_in_schema=False)
async def get_documentation(username: str = Depends(verify_docs_credentials)):
    return get_swagger_ui_html(openapi_url="/openapi.json", title=app.title + " - Docs")

@app.get("/redoc", include_in_schema=False)
async def get_redoc(username: str = Depends(verify_docs_credentials)):
    return get_redoc_html(openapi_url="/openapi.json", title=app.title + " - ReDoc")

@app.get("/")
async def root():
    return {"message": "Welcome to Blackrose AI Arena API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
