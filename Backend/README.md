# ⚙️ PIMS Backend — Stateful REST Engine

> The Node.js + Express.js core for PIMS 2.0. Handles clinical logic, immutable auditing, session-based security, and automated medical record bootstrapping.

---

## 🔐 Stateful Authentication
PIMS 2.0 utilizes **Server-Side Sessions** instead of legacy JWT tokens for enhanced security and simplified state management.
- **Store**: Sessions are persisted in MongoDB via `connect-mongo`.
- **Security**: HttpOnly cookies are used for session transport; all mutating requests undergo CSRF origin validation.
- **Roles**: RBAC (Role-Based Access Control) is strictly enforced at the service layer.

---

## 🧪 Automated Bootstrapping (Developer Experience)
To prevent internal server errors during development, the backend features a **Smart Bootstrap** system:
- **Linkage**: If `BOOTSTRAP_DEMO_USERS=true`, the system automatically links the `patient@pims.com` demo user to a valid `Patient` record (PAT-DEMO-001).
- **Stability**: This ensures that the Patient Dashboard and clinical summaries load correctly even on a fresh database.

---

## 🏗️ Project Structure
```text
Backend/
├── src/
│   ├── app.js               # Session config, CORS, and Route Mounting
│   ├── server.js            # Entry point, DB connection, and Job Initiation
│   ├── services/            # Core logic (Auth, Report, Patient, Audit)
│   ├── models/              # Mongoose Schemas (User, Patient, Inventory, Audit)
│   └── middlewares/         # Session-auth and Role-guard logic
└── .env                     # Critical configuration (Session secret, Client ports)
```

---

## 🚀 Environment Variables
Create a `.env` file with the following keys:
```env
PORT=5174
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/pims
SESSION_SECRET=your_secure_secret_here
CLIENT_URL=http://localhost:5173,http://localhost:5174
BOOTSTRAP_DEMO_USERS=true
```

---

## 📊 Core Service Domains

| Service | Responsibility |
|---|---|
| **Auth** | Session lifecycle, Password hashing, and Demo user linkage. |
| **Patient** | Medical records, clinical history, and portal account generation. |
| **Report** | Aggregated clinical summaries and financial analytics. |
| **Audit** | Immutable logging of all system-wide mutations. |
| **Inventory** | Stock deduction, threshold alerts, and batch tracking. |

---

## 🛠️ Maintenance Scripts
- `npm run dev`: Starts the server with hot-reloading.
- `npm run seed:users`: Populates the database with default staff roles.
- `npm run cleanup:inventory`: Audits the database for malformed inventory records.

---

*PIMS Backend v2.0.0 — Stateful Clinical Engine*
