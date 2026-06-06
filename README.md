# PIMS 2.0 — Hospital Management Ecosystem

PIMS 2.0 is a cinematic, high-fidelity hospital operations platform built as a modular monolith. It has evolved from a pharmacy information system into a comprehensive hospital-wide engine covering clinical workflows, patient portals, and inventory management.

## 🌟 PIMS 2.0 Visual Identity
We have recently overhauled the entire authentication and landing experience to meet a "Cinematic" standard:
- **Cinematic Landing Page**: A premium, dark-mode-first public portal with scroll-reveal animations and glassmorphism.
- **Dual-Column Auth Pipeline**: All login and recovery pages (Patient, Staff, Forgot Password, Reset Password) now feature a high-fidelity split-screen layout with clinical hero imagery.
- **Zero-Scroll Experience**: Authentication pages are strictly constrained to the viewport for a focused, boutique application feel.

---

## 📑 Project Hierarchy
- **[Frontend/README.md](/abs/path/c:/Users/samim_40uxmfb/Desktop/pims%202.0/pims/Frontend/README.md)** — React 18, Vite, Redux Toolkit, and the PIMS Clinical Design System.
- **[Backend/README.md](/abs/path/c:/Users/samim_40uxmfb/Desktop/pims%202.0/pims/Backend/README.md)** — Node.js, Express, MongoDB (Session-based), and Automated Data Bootstrapping.

---

## 🏗️ Architecture Overview

### 1. Monorepo Layout
```text
pims/
├── Backend/        # Express API, MongoDB Models, Background Jobs
├── Frontend/       # React SPA, Cinematic UI, Redux Store
└── package.json    # Monorepo configuration
```

### 2. Authentication Model (Session-Based)
PIMS 2.0 uses **Stateful Sessions**, not JWT tokens.
- **Server**: `express-session` with `connect-mongo` for persistent storage.
- **Client**: Axios with `withCredentials: true` ensures the `httpOnly` cookie is passed automatically.
- **Security**: CSRF origin checks and rate-limiting are enforced on all mutating endpoints.

---

## 🚀 Getting Started

### 1. Installation
Run at the root, then in both subdirectories:
```bash
npm install
cd Backend && npm install
cd ../Frontend && npm install
```

### 2. Environment Setup
Create `.env` files in both directories (see their respective READMEs for templates). 
- **Critical**: Ensure `CLIENT_URL` in Backend matches the Frontend's dev port (usually `5173` or `5174`).

### 3. Launch
Start the backend first, then the frontend:
```bash
# Terminal 1
cd Backend && npm run dev

# Terminal 2
cd Frontend && npm run dev
```

---

## 🛠️ Main Product Areas
- **Clinical**: Registration, admissions, bed management, and real-time vitals.
- **Patient Portal**: High-fidelity personal records, prescriptions, and secure recovery flows.
- **Pharmacy**: Inventory deduction, stock alerts, and WHO ATC drug classification.
- **Governance**: Admin dashboards, revenue reports, and immutable audit logs.

---

## 🛡️ Security Posture
- **RBAC**: Strict Role-Based Access Control enforced at the Backend Service layer.
- **Audit**: All sensitive mutations (Inventory, Billing, User changes) are logged to an immutable audit store.
- **Privacy**: Patient data linkage is handled via secure `patientId` references; passwords are never exposed or transmitted in plaintext.

---

*PIMS 2.0 — Precision Care. Modern Network.*
