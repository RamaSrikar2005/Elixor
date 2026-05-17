# ⚡ Elixor OS — Personal AI Operating System

A full-stack, production-grade personal productivity OS with AI coaching, habit tracking, finance intelligence, and real-time features.

---

## Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | React 18 · Vite · Tailwind CSS      |
| State       | Zustand                             |
| Animation   | Framer Motion                       |
| Charts      | Recharts                            |
| Routing     | React Router v6                     |
| Backend     | Node.js · Express.js · ES Modules   |
| Database    | MongoDB · Mongoose                  |
| Auth        | JWT (access + refresh) · bcrypt     |
| Realtime    | Socket.IO                           |
| AI          | OpenAI GPT-4o (streaming)          |
| Deployment  | Vercel · Render · Docker            |

---

## Quick Start

### Option 1 — Automated setup

```bash
git clone https://github.com/yourname/elixor-os
cd elixor-os
bash scripts/setup.sh
```

### Option 2 — Manual

**1. Install dependencies**
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

**2. Configure environment**
```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

Edit `backend/.env`:
```env
MONGO_URI=mongodb://localhost:27017/elixor_os
JWT_SECRET=<at_least_32_random_chars>
JWT_REFRESH_SECRET=<another_32_random_chars>
OPENAI_API_KEY=sk-your-key-here
CLIENT_URL=http://localhost:3000
```

**3. MongoDB Setup**

*Local:*
```bash
# macOS
brew install mongodb-community && brew services start mongodb-community

# Ubuntu
sudo systemctl start mongod

# Docker
docker run -d -p 27017:27017 mongo:7
```

*Atlas:* Replace `MONGO_URI` with your Atlas connection string.

**4. Seed demo data**
```bash
cd backend && npm run seed
# Creates: arjun@elixor.dev / password123
```

**5. Start servers**
```bash
# Terminal 1 — Backend (port 5000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend && npm run dev
```

Open: **http://localhost:3000**

---

## Docker (full stack)

```bash
# Build and start everything
docker-compose up --build

# Open: http://localhost
```

Services started:
- `mongo`    — MongoDB on port 27017
- `backend`  — Express API on port 5000
- `frontend` — Nginx + React on port 80

---

## Project Structure

```
elixor-os/
├── backend/
│   ├── src/
│   │   ├── config/         # DB connection
│   │   ├── controllers/    # Thin request handlers
│   │   ├── routes/         # Express routers
│   │   ├── models/         # Mongoose schemas
│   │   ├── middleware/      # Auth, errors, rate limiting
│   │   ├── services/       # Business logic
│   │   ├── validations/    # Joi schemas
│   │   ├── sockets/        # Socket.IO handlers
│   │   ├── utils/          # Logger, tokens, constants
│   │   ├── ai/             # OpenAI client
│   │   ├── database/       # Seed script
│   │   └── server.js       # Entry point
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/     # AppLayout (sidebar + topbar)
│   │   │   ├── ui/         # TaskList, StatCard, NBABar…
│   │   │   └── charts/     # MiniChart, SpendDonut
│   │   ├── pages/          # AuthPage, DashboardPage…
│   │   ├── store/          # Zustand stores
│   │   ├── services/       # api.js, socket.js
│   │   ├── hooks/          # useSocket
│   │   └── App.jsx         # Router + auth guard
│   └── package.json
│
├── docker/                 # Dockerfiles + nginx config
├── .github/workflows/      # CI/CD pipeline
├── scripts/setup.sh
├── docker-compose.yml
└── .env.example
```

---

## API Reference

All protected routes require: `Authorization: Bearer <token>`

### Auth
| Method | Endpoint           | Description     |
|--------|--------------------|-----------------|
| POST   | /api/auth/register | Register        |
| POST   | /api/auth/login    | Login           |
| POST   | /api/auth/logout   | Logout          |
| POST   | /api/auth/refresh  | Refresh token   |
| GET    | /api/auth/me       | Current user    |

### Tasks
| Method | Endpoint        | Description  |
|--------|-----------------|--------------|
| GET    | /api/tasks      | List tasks   |
| POST   | /api/tasks      | Create task  |
| PUT    | /api/tasks/:id  | Update task  |
| DELETE | /api/tasks/:id  | Delete task  |

### Habits
| Method | Endpoint                | Description    |
|--------|-------------------------|----------------|
| GET    | /api/habits             | List habits    |
| POST   | /api/habits             | Create habit   |
| POST   | /api/habits/:id/track   | Track check-in |

### Finance
| Method | Endpoint                  | Description         |
|--------|---------------------------|---------------------|
| GET    | /api/finance              | Transactions        |
| POST   | /api/finance              | Add transaction     |
| GET    | /api/finance/analytics    | Monthly analytics   |

### AI
| Method | Endpoint              | Description          |
|--------|-----------------------|----------------------|
| POST   | /api/ai/chat          | Chat (JSON)          |
| POST   | /api/ai/chat/stream   | Chat (SSE stream)    |
| GET    | /api/ai/history       | Chat history         |
| DELETE | /api/ai/history       | Clear history        |

### Focus
| Method | Endpoint            | Description      |
|--------|---------------------|------------------|
| POST   | /api/focus/start    | Start session    |
| POST   | /api/focus/:id/end  | End session      |
| GET    | /api/focus/stats    | Statistics       |

### Analytics
| Method | Endpoint                   | Description       |
|--------|----------------------------|-------------------|
| GET    | /api/analytics/dashboard   | Full dashboard    |

---

## Deployment

### Frontend → Vercel
```bash
cd frontend
npm run build
# Deploy dist/ to Vercel
# Set VITE_API_URL and VITE_SOCKET_URL in Vercel env vars
```

### Backend → Render/Railway
1. Connect GitHub repo
2. Set root directory: `backend`
3. Build command: `npm install`
4. Start command: `node src/server.js`
5. Add all environment variables from `.env.example`

### Generate secure secrets
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Socket.IO Events

**Client → Server**
- `focus:start` — Begin focus session
- `focus:tick`  — Timer tick (every 10s)
- `focus:end`   — End session
- `focus:pause` — Pause session

**Server → Client**
- `notification`      — Push notification
- `dashboard:update`  — Reload dashboard data
- `focus:started`     — Synced to all tabs
- `focus:ended`       — Session ended

---

## XP & Leveling

| Action           | XP |
|------------------|----|
| Complete task    | +50 |
| Habit check-in   | +20 |
| Focus session    | +30 per 25min |
| Daily streak     | +10 |

15 levels defined in `backend/src/utils/constants.js`.
