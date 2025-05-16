# 💬 Real-Time Chat App (React + Node.js + Socket.IO)

A modern real-time chat application built using **React**, **Node.js**, **Express**, **Socket.IO**, and **MongoDB**. Users can log in, send private messages, and experience real-time chat updates.

## 🚀 Features

- 🔐 User authentication (JWT-based or simple for demo)
- 📡 Real-time messaging with Socket.IO
- 💌 Private 1-to-1 messaging (not broadcast)
- 💾 Messages stored in MongoDB
- ⚛️ React functional components with hooks
- 🧩 Scalable backend architecture

## 📸 Screenshots

> *(Add UI screenshots or a demo video link here)*

## 🛠️ Tech Stack

### Frontend
- React (Vite or CRA)
- Socket.IO Client
- Axios

### Backend
- Node.js
- Express
- Socket.IO
- MongoDB + Mongoose

---

## 📂 Project Structure

```bash
chat-app/
├── client/             # React frontend
│   ├── public/
│   └── src/
│       ├── components/
│       ├── pages/
│       └── App.js
├── server/             # Node.js backend
│   ├── models/
│   │   └── Message.js
│   └── index.js
├── .gitignore
├── README.md
└── package.json
