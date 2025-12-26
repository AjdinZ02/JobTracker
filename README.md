# 📋 Job Tracker

Web aplikacija za praćenje prijava na poslove. .NET 9 backend + React TypeScript frontend.

> ⚠️ **Napomena**: Aplikacija je hostovana na besplatnom planu. Nakon 15 minuta neaktivnosti, server se gasi i prvi sljedeći zahtjev može trajati 10-30 sekundi dok se server ne pokrene ponovo.

## ✨ Karakteristike

- 🔐 JWT autentifikacija
- 📝 CRUD operacije za prijave
- 📊 Statistika i vizuelizacija
- 🔍 Pretraga i filtriranje
- 📌 Timeline napomene
- 🎨 Neon futuristički UI

## 🛠️ Tech Stack

**Backend:** ASP.NET Core 9, EF Core, PostgreSQL (prod) / SQLite (dev), JWT  
**Frontend:** React 18, TypeScript, Vite, React Router

### Backend
```bash
cd src/Api
dotnet ef database update
dotnet run
# API: http://localhost:5000
```

### Frontend
```bash
cd web
npm install
npm run dev
# App: http://localhost:5173
```

## 🔌 API Endpoints

**Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`  
**Jobs:** `GET/POST/PUT/DELETE /api/job-applications`, `GET /api/job-applications/stats`

Filteri: `status`, `search`, `from`, `to`

## 🌐 Deployment

**Backend:** Render (Docker)  
**Frontend:** Vercel  
**Database:** Render PostgreSQL

## 📝 Environment Varijable

### Frontend (.env)
```bash
# Development
VITE_API_URL=https://job-tracker-six-delta.vercel.app/

# Production - zamijeni sa svojim Render URL-om
VITE_API_URL=https://jobtracker-api-6nh2.onrender.com
```

---

## 📄 Licenca

# 📋 Job Tracker

Web application for tracking job applications. .NET 9 backend + React TypeScript frontend.

> ⚠️ **Note**: The application is hosted on a free tier plan. After 15 minutes of inactivity, the server goes to sleep and the first subsequent request may take 10-30 seconds while the server starts up again.

## ✨ Features

- 🔐 JWT authentication
- 📝 CRUD operations for applications
- 📊 Statistics and visualization
- 🔍 Search and filtering
- 📌 Timeline notes
- 🎨 Futuristic neon UI

## 🛠️ Tech Stack

**Backend:** ASP.NET Core 9, EF Core, PostgreSQL (prod) / SQLite (dev), JWT  
**Frontend:** React 18, TypeScript, Vite, React Router

## 🚀 Quick Start

### Backend
```bash
cd src/Api
dotnet ef database update
dotnet run
# API: http://localhost:5000
```

### Frontend
```bash
cd web
npm install
npm run dev
# App: http://localhost:5173
```

## 🔌 API Endpoints

**Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`  
**Jobs:** `GET/POST/PUT/DELETE /api/job-applications`, `GET /api/job-applications/stats`

Filters: `status`, `search`, `from`, `to`

## 🌐 Deployment

**Backend:** Render (Docker)  
**Frontend:** Vercel  
**Database:** Render PostgreSQL

## 📝 Environment Variables

### Frontend (.env)
```bash
# Development
VITE_API_URL=https://job-tracker-six-delta.vercel.app/

# Production - replace with your Render URL
VITE_API_URL=https://jobtracker-api-6nh2.onrender.com
```



## 📄 License

