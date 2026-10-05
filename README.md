# 💬 Real-Time User-Based Chat App (MySQL + React + Node.js + Socket.IO)

A modern, production-grade real-time messaging application built with **React 18 (Vite 6)**, **Node.js (Express 5)**, **Socket.IO 4**, and **MySQL 9.1**.

---

## ✨ Features

- 🔐 **Secure Authentication**: JWT-based authentication with bcrypt password hashing and persistent `rememberMe` session control.
- 🗄️ **MySQL Relational Database**: Foreign key integrity, automated schema migration, and compound B-tree indexing for ultra-fast conversation loading.
- 📡 **Socket.IO Room Architecture**: User-specific personal rooms (`user:${id}`) supporting multiple simultaneous tabs and devices with automatic reconnection.
- 💌 **Isolated 1-on-1 Conversations**: Filtered conversation threads with read receipts (`✓✓`) and unread count badges.
- ✍️ **Synchronized Typing Indicators**: Real-time debounced typing alerts with animated pulsing wave bubbles.
- 🎨 **Modern Dark Glassmorphism UI**: Beautiful two-column layout with contact search, live presence indicators, custom scrollbars, and full mobile responsiveness.
- ⚡ **1-Command Development Workflow**: Powered by `concurrently` to spin up both backend and frontend together.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + Vite 6
- **Routing**: React Router DOM v6
- **Styling**: Modern Vanilla CSS Design System (Glassmorphism, Dark Theme, Google Fonts Outfit & Plus Jakarta Sans)
- **Networking**: Axios & Socket.IO Client

### Backend
- **Runtime**: Node.js + Express 5
- **Database**: MySQL 9.1 via `mysql2/promise` connection pooling
- **Real-Time**: Socket.IO 4
- **Security**: JWT (`jsonwebtoken`) & `bcryptjs`

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **MySQL 8.0+ or 9.x** (e.g. via WampServer / XAMPP / local service)

### 2. Configure Environment Variables

**Backend (`backend/.env`):**
```env
PORT=5000
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRATION=30d
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=chatapp
CORS_ORIGIN=http://localhost:5173
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Install Dependencies
```bash
npm run install:all
```

### 4. Run Both Backend & Frontend in 1 Command
```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)
- **Health Check**: [http://localhost:5000/api/ping](http://localhost:5000/api/ping)

---

## 📂 Project Structure

```
chat-app-user-based/
├── backend/
│   ├── config/
│   │   └── db.js            # MySQL connection pool & automatic table initialization
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   ├── models/
│   │   ├── User.js          # User queries, bcrypt hashing, and token generation
│   │   └── Message.js       # Conversation queries, read receipts, and unread counters
│   ├── routes/
│   │   ├── auth.js          # POST /api/auth/register & POST /api/auth/login
│   │   ├── messages.js      # GET /api/messages/conversation/:id & PUT /read/:id
│   │   └── users.js         # GET /api/users & GET /api/users/me
│   ├── server.js            # Express server & Socket.io room management
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── assets/styles/   # Modern CSS design system (Chat.css & Login.css)
│   │   ├── components/      # ProtectedRoute component
│   │   ├── context/         # AuthContext with jwt-decode & rememberMe
│   │   ├── pages/           # Chat.jsx, Login.jsx, Register.jsx
│   │   ├── utils/           # api.js (Axios) & auth.js (Token helpers)
│   │   └── App.jsx          # Route configuration
│   └── package.json
├── docs/
│   └── PRD.md               # Complete Product Requirement Document
├── package.json             # Root runner scripts (concurrently)
└── README.md
```
