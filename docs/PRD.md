# Product Requirement Document (PRD)
## Real-Time User-Based Chat Application Modernization

---

## 1. Document Overview
- **Project Name**: Real-Time User-Based Chat Application
- **Document Version**: 2.5.0
- **Status**: Implemented & Verified
- **Architecture Stack**:
  - **Database**: MySQL 9.1 (InnoDB, Foreign Keys, B-Tree Indexes, UTF8MB4)
  - **Backend**: Node.js, Express 5, `mysql2/promise` (Connection Pool), Socket.IO 4, JWT, Bcrypt, ES6 Modules (`type: module`)
  - **Frontend**: React 18, Vite 6, React Router DOM v6, Axios, Socket.IO Client, Modern Glassmorphism CSS Design System
- **Unified Tooling**: Root `package.json` with `concurrently` (`npm run dev`)

---

## 2. System Architecture & Database Schema

```
   ┌─────────────────────────────────────────────────────────────┐
   │                     React 18 + Vite SPA                     │
   │  ┌───────────────────────┐       ┌───────────────────────┐  │
   │  │   AuthContext (JWT)   │       │ Socket Room Listener  │  │
   │  └──────────┬────────────┘       └───────────┬───────────┘  │
   │             │                                │              │
   │  ┌──────────▼────────────┐       ┌───────────▼───────────┐  │
   │  │ Modern Two-Column UI  │       │ Real-Time Message Bus │  │
   │  │ (Sidebar + Chat View) │       │ (user:id, typing, ack)│  │
   │  └───────────────────────┘       └───────────────────────┘  │
   └───────────────┬──────────────────────────────┬──────────────┘
                   │ HTTPS (REST API)             │ WSS (Socket.IO)
                   ▼                              ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                  Express 5 + Socket.IO Node                 │
   │  ┌─────────────────────────┐   ┌─────────────────────────┐  │
   │  │  Auth & Users Routes    │   │ Socket Personal Rooms   │  │
   │  │  Messages Route (/conv) │   │ (io.to(`user:${id}`))   │  │
   │  └────────────┬────────────┘   └─────────────┬───────────┘  │
   └───────────────┼──────────────────────────────┼──────────────┘
                   │                              │
                   ▼                              ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                  MySQL 9.1 Relational DB                    │
   │                                                             │
   │  users:                                                     │
   │   - id (INT AUTO_INCREMENT PK)                              │
   │   - username (VARCHAR(50) UNIQUE)                           │
   │   - password (VARCHAR(255))                                 │
   │   - avatar (VARCHAR(255) NULL)                              │
   │   - status_text (VARCHAR(100) DEFAULT 'Hey there! ...')    │
   │   - created_at, updated_at                                  │
   │                                                             │
   │  messages:                                                  │
   │   - id (INT AUTO_INCREMENT PK)                              │
   │   - sender_id (INT FK -> users.id ON DELETE CASCADE)        │
   │   - receiver_id (INT FK -> users.id ON DELETE CASCADE)      │
   │   - message (TEXT)                                          │
   │   - is_read (BOOLEAN DEFAULT FALSE)                         │
   │   - is_deleted (BOOLEAN DEFAULT FALSE)                      │
   │   - created_at (TIMESTAMP)                                  │
   │                                                             │
   │  Indexes:                                                   │
   │   - idx_conversation (sender_id, receiver_id, created_at)   │
   │   - idx_receiver_unread (receiver_id, is_read)              │
   │   - idx_username (username)                                 │
   └─────────────────────────────────────────────────────────────┘
```

---

## 3. Implemented Capabilities by Phase

### Phase 1: Core Engine Stabilization & Database Migration
- [x] **MySQL Database Layer**: Migrated database from MongoDB to MySQL 9.1 using `mysql2/promise` with auto-table creation (`backend/config/db.js`).
- [x] **Relational Schema**: Established strict foreign key constraints between `messages` and `users` with `ON DELETE CASCADE`.
- [x] **High-Performance Conversation Indexing**: Added composite index on `(sender_id, receiver_id, created_at)`.
- [x] **Registration Route Fix**: Resolved 404 error by pointing client requests to `/api/auth/register`.
- [x] **Duplicate Echo Prevention**: Sender optimistically sets temporary message state; server returns an acknowledgment (`ack`) with the persisted row instead of echoing back.
- [x] **Conversation-Scoped Queries**: Messages are fetched strictly between two users (`/api/messages/conversation/:contactId`) rather than returning all messages in the database.
- [x] **Typing Indicator Synchronization**: Two-way debounced typing indicators (`typing` & `stop_typing`) with visual three-dot wave animation.
- [x] **Session Persistence**: Implemented `rememberMe` storage toggle (localStorage vs sessionStorage) and safe decoding with `jwt-decode`.

### Phase 2: Modern UI/UX Overhaul
- [x] **Aesthetic Design System**: Dark slate glassmorphism theme (`#090d16` background, translucent surface cards, indigo/violet gradient `#6366f1` -> `#8b5cf6`).
- [x] **Two-Column Chat Layout**:
  - **Left Sidebar**: Current user profile with avatar and online pulse dot, real-time search filter, scrollable contacts with avatars, live status pulse dots, and unread count badges.
  - **Right Chat Area**: Active contact banner with live presence / typing text, auto-scrolling message stream, date separators, formatted timestamps, read checkmarks (`✓✓`), and sleek input toolbar.
- [x] **Auth Page Transformation**: Modern glassmorphic cards for Login and Register with inline validation, password match verification, and seamless toggle links.
- [x] **Mobile Responsiveness**: Adaptive drawer behavior allowing smooth navigation between contacts and active conversation on mobile screens.

### Phase 3: Advanced Messaging & Interactive Features
- [x] **Web Audio Chime Notifications**: Synthesized double-tone chime for incoming messages (zero external audio files needed) with a 🔔/🔕 toggle in the sidebar.
- [x] **Interactive Emoji Picker**: Quick emoji drawer (😊) allowing one-click insertion of 24 popular reactions and symbols directly into the input.
- [x] **In-Conversation Search**: Dedicated search toolbar within the active thread that highlights matching message bubbles.
- [x] **Message Hover Actions (Copy & Delete)**:
  - Quick-copy message text with visual confirmation (`✓ Copied!`).
  - Real-time message unsend/delete for sender with soft deletion in MySQL (`is_deleted = TRUE`) and immediate reflection across all clients (`message_deleted` socket event).
- [x] **Custom User Status**: Real-time editable user status text (e.g. "⚡ In deep work | ☕ In meeting"), saved to MySQL and broadcasted live to all contacts.

### Phase 4: Repository Hygiene & DX
- [x] **ES6 Modules Migration**: Entire backend converted to standard `"type": "module"` with `import`/`export` and path-resilient `.env` loading.
- [x] **Purge Legacy Files**: Removed all obsolete `*-old.js`, backup copies, and unused empty scripts.
- [x] **Dependency Optimization**: Removed deprecated `react-scripts`, installed `nodemon` for backend live reloading.
- [x] **Root Workflow**: Configured root `package.json` with `concurrently` (`npm run dev` boots both backend and frontend concurrently).
- [x] **Environment Configuration**: Template files `.env.example` created for both backend and frontend.

---

## 4. Verification & Testing Summary
1. **Database Initialization**: Tested and verified table creation in `chatapp` database.
2. **Backend Server Boot**: Verified startup with MySQL pool connection on port 5000.
3. **Frontend Production Build**: Ran `npm run build` with Vite, bundled successfully with zero errors.
4. **End-to-End Suite**: All 10 Phase 1 tests passed (short password rejection, duplicate user rejection, directory listing, profile check, message creation, filtered conversation fetch, unread count check, and read updates).
5. **Full-Stack Execution**: Verified simultaneous launch of backend and frontend via `npm run dev`.
