# TaskFlow — FastAPI Todo App

> **Learning Focus:** This project is a hands-on study of building a **production-grade REST API** using **FastAPI** (Python), exploring routing, authentication, ORM, and a full SPA frontend — following best practices a Flask/FastAPI developer should know.

---

## 📸 Preview

| Login / Register | Dashboard | Add Task |
|---|---|---|
| Dark split-panel auth page with animated particles | Stats cards, priority todo list, search & filters | Modal with P1–P5 priority picker & toggle |

---

## 🏗️ Architecture Overview

```
┌───────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                          │
│              static/index.html + styles.css + app.js          │
│         Vanilla JS SPA  ←→  Fetch API (JWT in headers)        │
└─────────────────────────┬─────────────────────────────────────┘
                          │ HTTP/JSON  (same-origin)
                          ▼
┌───────────────────────────────────────────────────────────────┐
│                  FastAPI Application (main.py)                 │
│                                                               │
│  ┌─────────────┐  ┌───────────────────────────────────────┐  │
│  │  Middleware  │  │              Routers                  │  │
│  │─────────────│  │───────────────────────────────────────│  │
│  │ CORS        │  │  /auth   → auth.py   (JWT auth)       │  │
│  │ StaticFiles │  │  /       → todos.py  (CRUD todos)     │  │
│  └─────────────┘  │  /users  → users.py  (profile/pw)     │  │
│                   │  /admin  → admin.py  (admin ops)      │  │
│                   └───────────────────────────────────────┘  │
│                                ↕  SQLAlchemy ORM              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │            database.py  (SessionLocal, engine)           │  │
│  └──────────────────────────┬──────────────────────────────┘  │
└─────────────────────────────┼─────────────────────────────────┘
                              ▼
              ┌───────────────────────────┐
              │     SQLite  (todos.db)    │
              │   Tables: users · todos  │
              └───────────────────────────┘
```

---

## 🔐 Authentication Flow (JWT / OAuth2)

```
User submits login form
        │
        ▼
POST /auth/token  (OAuth2PasswordRequestForm)
        │
        ├─ authenticate_user()
        │       └─ bcrypt.verify(password, hashed_password)
        │
        ├─ create_access_token()
        │       └─ jwt.encode({ sub, id, role, exp }, SECRET_KEY, HS256)
        │
        └─ Returns: { access_token, token_type: "bearer" }

Every protected request:
        │
        ▼
Authorization: Bearer <JWT>
        │
        ▼
get_current_user()  [Depends injected by FastAPI]
        │
        ├─ jwt.decode(token, SECRET_KEY, algorithms=[HS256])
        ├─ Extract: username, user_id, user_role
        └─ Raises HTTP 401 if invalid / expired
```

---

## 📁 Project Structure

```
Flask Todo App/
│
├── main.py              # App entry point — CORS, static mount, router wiring
├── database.py          # SQLAlchemy engine, SessionLocal, Base
├── models.py            # ORM models: Users, Todos
├── __init__.py
│
├── routers/             # Feature-sliced API modules
│   ├── auth.py          # Register, login → JWT token
│   ├── todos.py         # CRUD for authenticated user's todos
│   ├── users.py         # Get profile, change password
│   └── admin.py         # Admin-only: view/delete all todos
│
├── static/              # Frontend SPA (served by FastAPI)
│   ├── index.html       # Full app markup (auth + dashboard)
│   ├── styles.css       # Dark glassmorphism design system
│   └── app.js           # SPA logic, JWT management, API calls
│
├── todos.db             # SQLite database (auto-created on startup)
├── .gitignore
├── Practice/            # Scratch / learning experiments (git-ignored)
└── venv/                # Virtual environment (git-ignored)
```

---

## 🛠️ Tech Stack

### Backend
| Layer | Technology | Purpose |
|---|---|---|
| Framework | **FastAPI** | High-performance async REST API |
| ORM | **SQLAlchemy** | Database models & session management |
| Database | **SQLite** | Lightweight file-based SQL database |
| Auth | **python-jose** (JWT) | Stateless token-based authentication |
| Hashing | **passlib + bcrypt** | Secure password storage |
| Validation | **Pydantic v2** | Request/response schema validation |
| Server | **Uvicorn** | ASGI server (with `--reload` for dev) |

### Frontend
| Layer | Technology | Purpose |
|---|---|---|
| Markup | **HTML5** | Semantic single-page structure |
| Styles | **Vanilla CSS** | Glassmorphism dark theme, animations |
| Logic | **Vanilla JS (ES6+)** | SPA routing, fetch API, JWT storage |
| Fonts | **Google Fonts (Inter)** | Modern typography |

---

## 🔌 API Reference

### Auth — `/auth`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/auth/` | ❌ | List all users |
| `POST` | `/auth/` | ❌ | Register a new user |
| `POST` | `/auth/token` | ❌ | Login → returns JWT token |

### Todos — `/`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ✅ | Get all todos for current user |
| `GET` | `/todo/{id}` | ✅ | Get a specific todo |
| `POST` | `/todo` | ✅ | Create a new todo |
| `PUT` | `/todo/{id}` | ✅ | Update a todo |
| `DELETE` | `/todo/{id}` | ✅ | Delete a todo |

### Users — `/users`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/users/` | ✅ | Get current user's profile |
| `PUT` | `/users/user/password_change` | ✅ | Change password |

### Admin — `/admin`
| Method | Endpoint | Auth | Role |
|---|---|---|---|
| `GET` | `/admin/todo` | ✅ | `admin` only — list all todos |
| `DELETE` | `/admin/todo/{id}` | ✅ | `admin` only — delete any todo |

---

## ⚙️ Setup & Run

### 1. Clone & create virtual environment
```bash
git clone <repo-url>
cd "Flask Todo App"
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
```

### 2. Install dependencies
```bash
pip install fastapi uvicorn sqlalchemy passlib python-jose python-multipart bcrypt
```

### 3. Run the development server
```bash
uvicorn main:app --reload
```

### 4. Open the app
```
http://127.0.0.1:8000/static/index.html
```

### 5. Explore the interactive API docs
```
http://127.0.0.1:8000/docs        ← Swagger UI
http://127.0.0.1:8000/redoc       ← ReDoc
```

---

## 🚀 Production Hardening Checklist

These are the gaps between this **learning project** and a true production backend:

### 🔑 Security
- [ ] Move `SECRET_KEY` to environment variable (`.env` + `python-dotenv`)
- [ ] Use **PostgreSQL** instead of SQLite (use `DATABASE_URL` env var)
- [ ] Set strict CORS origins (replace `allow_origins=["*"]`)
- [ ] Add `ACCESS_TOKEN_EXPIRE_MINUTES` as configurable env var
- [ ] Add **rate limiting** on `/auth/token` (e.g. `slowapi`)
- [ ] Add **HTTPS** via reverse proxy (nginx / Caddy)

### 🏗️ Architecture
- [ ] Extract `get_db()` to a shared `dependencies.py` (currently duplicated in each router)
- [ ] Add a `config.py` with Pydantic `BaseSettings` for all env vars
- [ ] Add **Alembic** for database migrations instead of `create_all()`
- [ ] Add **refresh tokens** alongside access tokens

### 📦 Deployment
- [ ] Add `requirements.txt` (`pip freeze > requirements.txt`)
- [ ] Add `Dockerfile` + `docker-compose.yml`
- [ ] Configure **Gunicorn** + **Uvicorn workers** for production
- [ ] Add structured logging (replace `print` with `logging`)
- [ ] Add `/health` endpoint for load balancer health checks

### 🧪 Testing
- [ ] Add `pytest` + `httpx` integration tests for all endpoints
- [ ] Use an in-memory SQLite DB for test isolation

---

## 📚 Key Concepts Practiced

| Concept | Where |
|---|---|
| **Dependency Injection** | `Depends(get_db)`, `Depends(get_current_user)` in every router |
| **OAuth2 Password Flow** | `OAuth2PasswordRequestForm` in `/auth/token` |
| **JWT encoding/decoding** | `create_access_token()` + `get_current_user()` in `auth.py` |
| **Pydantic validation** | `TodoRequest`, `CreateUserRequest`, `Password_Change` models |
| **SQLAlchemy ORM** | `Users`, `Todos` models with FK relationship |
| **Role-based access** | `admin` role check in `admin.py` |
| **Router prefix & tags** | `APIRouter(prefix='/auth', tags=['auth'])` |
| **Static file serving** | `StaticFiles` mount + SPA frontend |
| **CORS middleware** | `CORSMiddleware` for browser-safe API calls |

---

## 👤 Author

Learning project — FastAPI / Backend development practice.
