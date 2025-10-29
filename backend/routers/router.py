from fastapi import APIRouter
from routers.routes import models, websocket

# Main router that includes all sub-routes
router = APIRouter(prefix="/api/v1")

# Include all sub-routers
router.include_router(models.router)
router.include_router(websocket.router)

@router.get("/health")
async def api_health():
    """API health check"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "api": "v1"
    }
