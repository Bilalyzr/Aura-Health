# Aura Health — Women's Health Management Platform

Aura Health is a full-stack web application designed for women's health monitoring, combining cycle and symptom tracking with AI-driven daily routines. Built on the MVP stack specified in the Product Requirements Document: **React (Vite), Node.js, Express, and MongoDB**.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **MongoDB** (Ensure your local MongoDB instance is running on `mongodb://127.0.0.1:27017`)

### 2. Seeding the Database
To reset the database and seed it with preconfigured test accounts representing each of the 13 PRD personas (complete with sample tracking history, thread logs, and shared consents):
```bash
npm run seed
```

### 3. Running the Server (Express Backend)
The server runs on port `5000` and serves the API endpoints.
```bash
npm run server
```

### 4. Running the Client (React Frontend)
The frontend launches the Vite development server on port `5173`.
```bash
npm run client
```

---

## 👥 Pre-seeded Test Accounts

All seeded accounts share the password: `Password123!`

| Persona Role | Name | Email | Initial Seeded State / Configured Views |
| :--- | :--- | :--- | :--- |
| **Patient (PCOS)** | Ananya Sharma | `pcos@aura.com` | Day 10 of current cycle; 1 active historic cycle; 7 days of mood, hydration, and back pain logs. Shares data with partner Rohan and Doctor Meera. |
| **Patient (Endometriosis)** | Priya Patel | `endo@aura.com` | Primary user with endometriosis tags. Posted a forum thread regarding flare-ups. |
| **Patient (PMDD)** | Kriti Sen | `pmdd@aura.com` | PMDD profile with mood fluctuation logs. |
| **Partner** | Rohan Sharma | `partner@aura.com` | Linked partner to Ananya. Dashboard displays Ananya's cycle phase, mood summary, and daily partner support tips. |
| **Guardian** | Sunita Sharma | `guardian@aura.com` | Linked parent profile for minor alerts. Dashboard displays safety flags. |
| **Doctor (Gynecologist)** | Dr. Meera Rao | `doctor@aura.com` | Professional profile. Select Ananya to view her symptom logs and pain charts. |
| **Administrator** | Aura Admin | `admin@aura.com` | Systems administrator account. Features users directory (with suspension capabilities) and moderation flag queues. |

---

## 📂 Project Structure

```
Aura Health/
├── package.json          # Root scripts for starting servers
├── README.md             # This instructions file
├── Aura_Health_PRD.docx  # Original Product Requirements Document
├── client/               # React Frontend (Vite)
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── App.jsx       # Main Client Application (Routing, View Managers, APIs)
│       ├── App.css       # Scoped layout rules
│       ├── index.css     # CSS variable definitions & visual theme tokens
│       └── main.jsx      # Vite entrypoint
└── server/               # Express Backend API
    ├── .env              # Server environment keys (DB URI, JWT secrets)
    ├── package.json
    └── src/
        ├── index.js      # App controller routers & routes mapping
        ├── seed.js       # Database seeder utility
        ├── config/db.js  # Mongoose database setup
        ├── middleware/   # Authentication, role restriction
        ├── ai/           # AI personalized recommendation rule engine
        └── models/       # Mongoose schemas (User, Cycle, Log, Routine, Thread, Consent, AuditLog)
```

---

## 🛡️ Privacy and statutory Compliance (India DPDP Act)
1. **Granular Consent**: Data-sharing is field-specific and explicitly granted by the patient. Sharing can be instantly revoked from the `Sharing & Settings` tab.
2. **Soft Deletion**: Account deletion or suspensions sets a soft-delete grace period parameter (`deletedAt`) before database purging occurs.
3. **Audit Trails**: Security actions (login, consent grant/revocations, moderation bans) are recorded to the append-only `AuditLog` collection.
