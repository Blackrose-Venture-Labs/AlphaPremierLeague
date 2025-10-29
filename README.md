# Blackrose AI Arena

A full-stack trading platform with AI model management capabilities, featuring real-time data streaming, WebSocket communication, and integration with trading exchanges (Zerodha and Delta Exchange).

## 🚀 Project Overview

Blackrose AI Arena is a comprehensive trading platform that combines:
- **AI Model Management**: Create, manage, and deploy AI trading models
- **Real-time Trading**: Live trading with Zerodha and Delta Exchange
- **WebSocket Communication**: Real-time data streaming for positions, trades, and model data
- **Modern UI**: React-based frontend with Tailwind CSS and Radix UI components
- **Secure API**: FastAPI backend with PostgreSQL database and authentication

## 📁 Project Structure

```
BlackroseAIArena/
├── backend/                 # FastAPI backend application
│   ├── config/             # Database and configuration
│   ├── routers/            # API route handlers
│   ├── schemas/            # Pydantic schemas
│   ├── tables/             # SQLAlchemy ORM models
│   ├── trading/            # Trading logic and exchange integrations
│   ├── utils/              # Utility functions
│   ├── main.py             # FastAPI application entry point
│   ├── requirements.txt    # Python dependencies
│   └── README.md           # Backend documentation
├── frontend/               # React frontend application
│   ├── src/               # Source code
│   ├── public/            # Static assets
│   ├── package.json       # Node.js dependencies
│   └── README.md          # Frontend documentation
├── venv/                  # Python virtual environment
└── README.md              # This file
```

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.9+)
- **Database**: PostgreSQL with AsyncPG
- **ORM**: SQLAlchemy 2.0+
- **Real-time**: WebSockets
- **Authentication**: HTTP Basic Auth
- **Trading APIs**: Zerodha KiteConnect, Delta Exchange

### Frontend
- **Framework**: React 19
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, shadcn/ui
- **Routing**: React Router DOM v7
- **Forms**: React Hook Form with Zod validation
- **Charts**: Chart.js, Recharts
- **Animations**: Framer Motion
- **HTTP Client**: Axios

## 🚦 Quick Start

### Prerequisites
- Python 3.9 or higher
- Node.js 16 or higher
- PostgreSQL 14 or higher
- Git

### 1. Clone the Repository

```bash
git clone <repository-url>
cd BlackroseAIArena
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Linux/Mac
# or
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your actual credentials

# Run the backend
python main.py
```

Backend will be available at: `http://localhost:8000`

API Documentation (requires auth):
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your backend API URL

# Run the frontend
npm start
```

Frontend will be available at: `http://localhost:3000`

## 🔐 Environment Variables

### Backend (.env)

```env
# Database Configuration
DATABASE_URL=postgresql+asyncpg://username:password@localhost:5432/database_name

# API Documentation Credentials
DOCS_USERNAME=admin
DOCS_PASSWORD=your_secure_password

# Zerodha API Credentials
ZERODHA_API_KEY=your_api_key
ZERODHA_SECRET=your_secret_key
ZERODHA_TOTP_KEY=your_totp_key
ZERODHA_USER_ID=your_user_id
ZERODHA_PASSWORD=your_password

# Delta Exchange Credentials
DELTA_API_KEY=your_delta_api_key
DELTA_API_SECRET=your_delta_api_secret

# N8N Webhook Configuration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/endpoint
N8N_USERNAME=your_n8n_username
N8N_PASSWORD=your_n8n_password
N8N_AUTH_TOKEN=your_base64_encoded_auth_token
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
```

## 📚 Features

### AI Model Management
- Create and configure AI trading models
- Real-time model data streaming via WebSocket
- Model performance tracking
- Model-specific chat interface

### Trading Integration
- **Zerodha**: Live market data, order placement, position tracking
- **Delta Exchange**: Cryptocurrency trading support
- Real-time position updates
- Trade history and analytics

### WebSocket Features
- Live position updates
- Real-time trade notifications
- Model data streaming
- Connection state management

### User Interface
- Modern, responsive design
- Dark mode support
- Interactive charts and visualizations
- Real-time data updates
- Form validation with error handling

## 🔒 Security

⚠️ **IMPORTANT SECURITY NOTES**:

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use `.env.example`** as a template for required variables
3. **Change default credentials** before deploying to production
4. **Keep API keys secure** - Never expose them in client-side code
5. **Use strong passwords** for database and API documentation access
6. **Enable CORS properly** - Configure allowed origins for production
7. **Use HTTPS** in production environments

See `backend/SECURITY.md` and `frontend/SECURITY.md` for detailed security guidelines.

## 📖 Documentation

### Backend Documentation
- API Documentation: Available at `/docs` and `/redoc` (requires authentication)
- WebSocket Documentation: See `backend/MODELDATA_WEBSOCKET.md`
- Detailed Setup: See `backend/README.md`

### Frontend Documentation
- Component Documentation: See `frontend/README.md`
- API Integration: Check `frontend/src/` for implementation examples

## 🧪 Development

### Backend Development

```bash
cd backend

# Run with auto-reload
uvicorn main:app --reload

# Run tests (if available)
pytest

# Database migrations with Alembic
alembic init alembic
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

### Frontend Development

```bash
cd frontend

# Run development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Deploy to Firebase
npm run deploy
```

## 🚀 Deployment

### Backend Deployment
1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Deploy using Docker, Heroku, or your preferred platform
5. Configure reverse proxy (Nginx, Apache)
6. Enable HTTPS with SSL certificate

### Frontend Deployment
1. Build production bundle: `npm run build`
2. Deploy to Firebase Hosting: `npm run firebase:deploy`
3. Or deploy to Vercel, Netlify, or any static hosting service
4. Update environment variables for production API URL

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## 📝 License

[Add your license information here]

## 👥 Team

[Add team information here]

## 📧 Contact

[Add contact information here]

## 🐛 Known Issues

- Check GitHub Issues for current bugs and feature requests
- Report new issues with detailed reproduction steps

## 🗺️ Roadmap

- [ ] Add unit and integration tests
- [ ] Implement user authentication and authorization
- [ ] Add more trading strategies
- [ ] Expand AI model capabilities
- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Multi-language support

## 💡 Acknowledgments

- FastAPI for the excellent Python framework
- React and the React community
- Radix UI for accessible components
- All contributors and supporters

---

**Note**: This project is under active development. Features and documentation may change.
