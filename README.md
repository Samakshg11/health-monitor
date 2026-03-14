# 🏥 VitalWatch — Real-Time Health Monitoring App

A full-stack MERN application for tracking and monitoring personal health vitals in real-time.

## 🚀 Features

- **📊 Real-time Dashboard** — Live health metrics with trend charts
- **❤️ Health Metrics** — Heart Rate, Blood Pressure, SpO₂, Temperature, Steps
- **🔔 Smart Alerts** — Auto-generated warnings/critical alerts based on medical thresholds
- **⚡ Live Updates** — Socket.IO real-time communication
- **📈 Reports** — 7/14/30-day aggregated statistics with charts
- **📋 History** — Full reading history with delete & pagination
- **🔐 Auth** — JWT-based login/register with protected routes
- **👤 Profile** — Personal health info + BMI calculator
- **⌚ Terra Integration Ready** — Backend scaffolding for Terra widget sessions, provider connections, and Terra webhook ingestion

## 🛠 Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, React Router 6, Recharts, Socket.IO Client |
| **Backend** | Node.js, Express.js, Socket.IO |
| **Database** | MongoDB + Mongoose |
| **Auth** | JWT + bcryptjs |
| **Styling** | Custom CSS (dark medical aesthetic) |

## 📦 Project Structure

```
vitalwatch/
├── backend/
│   ├── models/
│   │   ├── User.js          # User schema with password hashing
│   │   ├── HealthReading.js # Health metrics with auto-status detection
│   │   └── Alert.js         # Alert model
│   ├── routes/
│   │   ├── auth.js          # Register, Login, Profile
│   │   ├── health.js        # CRUD for readings + stats
│   │   └── alerts.js        # Alert management
│   ├── middleware/
│   │   └── auth.js          # JWT protection middleware
│   ├── .env.example
│   └── server.js            # Express + Socket.IO server
│
└── frontend/
    └── src/
        ├── context/
        │   ├── AuthContext.js    # Auth state management
        │   └── SocketContext.js  # Real-time socket connection
        ├── pages/
        │   ├── Dashboard.js  # Main overview + charts
        │   ├── LogReading.js # Submit new vitals form
        │   ├── History.js    # Paginated reading history
        │   ├── Reports.js    # Stats + area/bar charts
        │   ├── Alerts.js     # Alert management
        │   ├── Profile.js    # User info + BMI
        │   ├── Login.js
        │   └── Register.js
        ├── components/
        │   └── Layout.js     # Sidebar navigation
        ├── utils/
        │   └── api.js        # Axios API helpers
        └── App.js            # Routes + providers
```

## ⚙️ Setup & Installation

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Clone / Extract the project

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set your MONGO_URI and JWT_SECRET
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

### 4. Open the App
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🔧 Environment Variables (backend/.env)

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/healthmonitor
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
TERRA_DEV_ID=your_terra_dev_id
TERRA_API_KEY=your_terra_api_key
TERRA_WEBHOOK_SECRET=your_terra_webhook_secret
TERRA_SUCCESS_REDIRECT_URL=http://localhost:3000/wearable
TERRA_FAILURE_REDIRECT_URL=http://localhost:3000/wearable
```

For MongoDB Atlas:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/healthmonitor
```

## 🏥 Health Thresholds (Auto-detection)

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| Heart Rate | 60–100 BPM | 50–59 / 101–120 | <50 / >120 |
| Systolic BP | <120 | 120–139 | ≥140 |
| Diastolic BP | <80 | 80–89 | ≥90 |
| SpO₂ | ≥95% | 90–94% | <90% |
| Temperature | 36.1–37.2°C | 36.0 / 37.3–38°C | <35.5 / >39°C |

## 📡 API Endpoints

### Auth
```
POST   /api/auth/register    Create account
POST   /api/auth/login       Login
GET    /api/auth/me          Get current user
PUT    /api/auth/profile     Update profile
```

### Health
```
POST   /api/health/reading      Submit new reading
GET    /api/health/readings     Get history (pagination)
GET    /api/health/latest       Get most recent reading
GET    /api/health/stats        Get aggregated stats (?days=7)
DELETE /api/health/reading/:id  Delete a reading
```

### Terra
```
POST   /api/terra/widget-session  Create Terra widget session
GET    /api/terra/connections     Get stored Terra provider connections
POST   /api/terra/webhook         Receive Terra auth/data webhooks
```

### Alerts
```
GET    /api/alerts           Get all alerts
PUT    /api/alerts/:id/read  Mark single as read
PUT    /api/alerts/read-all  Mark all as read
DELETE /api/alerts/:id       Delete alert
```

## ⚡ Real-Time Features (Socket.IO)

When a user submits a reading, the backend:
1. Saves the reading to MongoDB
2. Runs health threshold checks
3. Creates alert documents if thresholds exceeded
4. Emits `new_reading` event to the user's socket room
5. Emits `new_alert` events for each generated alert

Frontend listens on the user's private room and updates the dashboard live.

## 🎨 Design System

- **Theme**: Dark medical aesthetic
- **Colors**: Deep navy bg, crimson red accents, teal for SpO₂
- **Typography**: Syne (headings) + DM Mono (body)
- **Status colors**: Green = normal, Yellow = warning, Red = critical (pulsing animation)

## 🔮 Future Enhancements

- PDF health report export
- Email/SMS alerts
- Doctor sharing portal
- IoT device integration (Arduino / Raspberry Pi)
- Mobile app (React Native)
- Medication tracking
- Blood glucose monitoring
