# Blackrose AI Arena - Backend

FastAPI backend application with PostgreSQL integration.

## Project Structure

```
backend/
├── main.py                 # FastAPI application entry point
├── config/                 # Configuration files
│   ├── __init__.py
│   └── database.py        # PostgreSQL async connection setup
├── models/                 # SQLAlchemy ORM models (database tables)
│   ├── __init__.py
│   ├── user.py            # User model
│   └── model.py           # AI Model model
├── schemas/               # Pydantic schemas (request/response validation)
│   ├── __init__.py
│   ├── user.py            # User schemas
│   └── model.py           # Model schemas
├── routers/               # API route handlers
│   ├── __init__.py
│   ├── router.py          # Main router
│   └── routes/            # Sub-routes
│       ├── models.py      # AI Models endpoints
│       └── websocket.py   # WebSocket endpoints
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
├── .gitignore           # Git ignore rules
├── MIGRATION_NOTES.md   # MongoDB to PostgreSQL migration guide
└── README.md            # This file
```

## Setup

1. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Linux/Mac
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**
   
   **IMPORTANT: Before sharing or deploying this project, ensure all sensitive data is properly configured!**
   
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

   Required environment variables in `.env`:
   ```env
   # Database Configuration
   DATABASE_URL=postgresql+asyncpg://username:password@localhost:5432/database_name
   
   # API Documentation Credentials (change these!)
   DOCS_USERNAME=admin
   DOCS_PASSWORD=your_secure_password
   
   # Zerodha API Credentials
   ZERODHA_API_KEY=your_api_key
   ZERODHA_SECRET=your_secret_key
   ZERODHA_TOTP_KEY=your_totp_key
   ZERODHA_USER_ID=your_user_id
   ZERODHA_PASSWORD=your_password
   
   # N8N Webhook Configuration
   N8N_WEBHOOK_URL=https://n8n.blackrose.cloud/webhook/alpha-arena
   N8N_USERNAME=your_n8n_username
   N8N_PASSWORD=your_n8n_password
   N8N_AUTH_TOKEN=your_base64_encoded_auth_token
   
   # Delta Exchange API Credentials
   DELTA_API_KEY=your_delta_api_key
   DELTA_API_SECRET=your_delta_api_secret
   DELTA_API_BASE_URL=https://api.india.delta.exchange
   ```

4. **Set up N8N Workflow:**
   
   If you're using N8N for webhook automation, import the workflow:
   - Open your N8N instance
   - Go to Workflows
   - Click "Import from File" or "Import from URL"
   - Select the `n8n.json` file from this project
   - Configure the webhook credentials in your N8N instance
   - Update the `N8N_WEBHOOK_URL` in your `.env` file to match your N8N webhook endpoint

5. **Run the application:**
   ```bash
   python main.py
   ```
   Or with uvicorn directly:
   ```bash
   uvicorn main:app --reload
   ```

## Security Notes

⚠️ **IMPORTANT**: This project contains sensitive credentials that must be protected:

1. **Never commit the `.env` file** - It's already in `.gitignore`
2. **Use `.env.example`** as a template for required variables
3. **Change default credentials** before deploying to production
4. **Keep your Zerodha, Delta Exchange, and N8N credentials secure**
5. **Use strong passwords** for database and API documentation access

All sensitive data (API keys, passwords, tokens) are now stored in the `.env` file and loaded via environment variables. Make sure to:
- Copy `.env.example` to `.env`
- Fill in your actual credentials
- Never share or commit your `.env` file

## API Documentation

Once running, visit (requires authentication):
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

Credentials are loaded from environment variables (`DOCS_USERNAME` and `DOCS_PASSWORD` in `.env`).

## N8N Workflow Integration

This project includes a pre-configured N8N workflow (`n8n.json`) for webhook automation and integration.

### Setting up the N8N Workflow:

1. **Import the workflow:**
   - Open your N8N instance (e.g., https://n8n.blackrose.cloud)
   - Navigate to **Workflows** in the sidebar
   - Click **Add Workflow** → **Import from File**
   - Select the `n8n.json` file from this project root
   - The workflow will be imported with all nodes and connections

2. **Configure credentials:**
   - Update any credential nodes in the imported workflow
   - Ensure webhook authentication matches your `.env` configuration
   - Test the webhook endpoint to verify connectivity

3. **Update environment variables:**
   - Set `N8N_WEBHOOK_URL` in your `.env` to match the imported workflow's webhook URL
   - Configure `N8N_USERNAME`, `N8N_PASSWORD`, and `N8N_AUTH_TOKEN` as needed

## PostgreSQL Setup

Make sure PostgreSQL is installed and running. The application will automatically create tables on startup.

For production, use Alembic for database migrations:
```bash
alembic init alembic
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

## Key Concepts

- **models/**: Define database table structure using SQLAlchemy ORM
- **schemas/**: Define API request/response validation schemas with Pydantic
- **routers/**: Organize endpoints by feature/domain
- **config/**: Database and application configuration with async support

## Database Migration

This project has been migrated from MongoDB to PostgreSQL. See `MIGRATION_NOTES.md` for detailed information about:
- Changes made during migration
- How to use async database sessions in routes
- CRUD operation examples with SQLAlchemy
- Key differences between MongoDB and PostgreSQL approaches

## Example Usage

### Using Database Sessions in Routes

```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from config.database import get_db_session
from sqlalchemy import select
from models.user import User

@router.get("/users")
async def get_users(db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(select(User))
    users = result.scalars().all()
    return users
```

Check the `routers/routes/models.py` for a complete example with PostgreSQL.

