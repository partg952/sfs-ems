# 🏢 Shreeji Facility Services – Integrated Employee Management System (SFS-EMS) with Applied AI

An enterprise-grade, full-stack Employee Management System (EMS) custom-built for **Shreeji Facility Services (SFS)**—a manpower staffing and facility management enterprise deployed across commercial hubs, ports, and industrial complexes.

Built with **Node.js (Express)**, **React 18 (Vite + Tailwind CSS)**, and **PostgreSQL 16**, featuring an integrated **Applied AI Workforce Intelligence & Predictive Risk Engine**.

---

## 📌 Table of Contents
1. [Project Overview & Problem Statement](#-1-project-overview--problem-statement)
2. [System Architecture](#-2-system-architecture)
3. [Technology Stack](#-3-technology-stack)
4. [Complete Feature List](#-4-complete-feature-list)
5. [Applied AI Workforce Intelligence Suite](#-5-applied-ai-workforce-intelligence-suite)
6. [Role-Based Access Control (RBAC) Matrix](#-6-role-based-access-control-rbac-matrix)
7. [Database Schema & Data Models](#-7-database-schema--data-models)
8. [API Endpoints Reference](#-8-api-endpoints-reference)
9. [How to Run / Start the Demo](#-9-how-to-run--start-the-demo)
10. [Default Login Credentials](#-10-default-login-credentials)
11. [College Viva / Presentation Walkthrough Script](#-11-college-viva--presentation-walkthrough-script)

---

## 🎯 1. Project Overview & Problem Statement

### The Domain: Facility Management & Manpower Outsourcing
* **Shreeji Facility Services (SFS)** deploys hundreds of frontline personnel—including armed security guards, housekeeping attendants, maintenance technicians, and site supervisors—across client premises (e.g., *Adani Hazira Port*, *Surat Diamond Bourse*, *Reliance Retail*).
* **The Core Operational Challenge**:
  * **High Attrition Rate**: The facility staffing industry suffers from a **30% to 50% annual worker turnover**.
  * **Shift Fatigue & Burnout**: Continuous 12-hour shifts and excessive overtime cause physical fatigue, sleeping on duty, and safety violations.
  * **Debt Traps**: Unregulated advance loan recoveries deplete take-home pay, causing workers to flee without notice.
  * **Contract Penalties**: Client contracts impose severe financial penalties if security posts are left unmanned due to unannounced absenteeism.

### The Solution: SFS-EMS
* **Full-Stack Automation**: Digitizes employee records, multi-site deployments, statutory payroll (ESIC, EPF), financial advances, fines, uniform issuance, and accommodation.
* **Proactive Applied AI**: Embeds predictive machine learning and NLP triaging to forecast turnover risk, detect operational fatigue anomalies, and auto-triage worker grievances before abandonment occurs.

---

## 🏗️ 2. System Architecture

The application is architected as a decoupled, 3-tier client-server system with an integrated AI inference engine:

```
+---------------------------------------------------------------------------------------------------+
|                                  PRESENTATION LAYER (Client)                                      |
|   • React 18 Single Page Application (SPA) bundled with Vite                                      |
|   • Responsive modern UI styled with Tailwind CSS & Lucide Icons                                  |
|   • Axios HTTP Client with JWT interceptors & React Router v6 guarded routing                     |
+-------------------------------------------------+-------------------------------------------------+
                                                  | REST API (JSON) + Bearer JWT
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                APPLICATION & API LAYER (Backend)                                  |
|   • Node.js (v20+ / v22) runtime with Express.js REST Framework                                   |
|   • Stateless JWT Authentication (`jsonwebtoken`) & Bcrypt password hashing                       |
|   • 6-Tier Role-Based Access Control (RBAC) middleware guards                                     |
|   • Multi-part photo & document uploads via Multer                                                |
|   • Applied AI Analytics Engine (Predictive Attrition, XAI, Heuristics, NLP Triage)               |
+-------------------------------------------------+-------------------------------------------------+
                                                  | Connection Pooling (`pg.Pool`)
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                   DATA PERSISTENCE LAYER                                          |
|   • PostgreSQL 16 Relational Database Engine                                                      |
|   • Fully normalized ACID schema with referential integrity (`ON DELETE CASCADE`)                 |
|   • Idempotent auto-migration and demo dataset seeder on server startup                           |
+---------------------------------------------------------------------------------------------------+
```

### Architectural Highlights (In Pointers):
* **Stateless Authentication**: Client stores JWT token in `localStorage`; all subsequent requests carry an `Authorization: Bearer <token>` header verified by backend middleware.
* **Separation of Concerns**: Clean modular architecture (`routes/`, `services/`, `middleware/`, `db/`).
* **Connection Pooling**: Uses `pg.Pool` to reuse database connections, achieving sub-millisecond query latencies.
* **Statutory Compliance Calculations**: Exact mathematical enforcement of Indian labor laws (ESIC 0.75%, EPF 12%, overtime rates).

---

## 💻 3. Technology Stack

### Frontend:
* **Framework**: React 18 (Hooks, Context API)
* **Build Tool**: Vite 5
* **Styling**: Tailwind CSS 3
* **Routing**: React Router DOM v6
* **Icons**: Lucide React
* **Notifications**: React Hot Toast
* **HTTP Client**: Axios

### Backend:
* **Runtime**: Node.js (ES Modules, Node v20+ / v22)
* **Web Framework**: Express.js 4
* **Database Driver**: `pg` (node-postgres connection pool)
* **Authentication**: JSON Web Tokens (`jsonwebtoken`)
* **Encryption**: `bcryptjs` (salt rounds: 10)
* **File Uploads**: `multer`
* **Environment Config**: `dotenv`

### Database & DevOps:
* **Database**: PostgreSQL 16 Alpine
* **Containerization**: Podman / Docker & Docker Compose
* **Automation**: Bash launch scripts (`./start-demo.sh`)

---

## 📋 4. Complete Feature List

### 1. 🧠 AI Workforce Intelligence Suite
* **Predictive Attrition & Burnout Radar**: Computes a continuous 0%–100% turnover probability score for every active employee.
* **Explainable AI (XAI) Attribution**: Breaks down exact factor percentages driving risk (e.g., overtime hours, debt percentage, muster drops).
* **Prescriptive Action Playbooks**: Auto-generates customized HR retention recommendations (e.g., shift caps, loan restructuring).
* **Interactive "What-If" Simulator (Viva Sandbox)**: Real-time slider sandbox to simulate hypothetical workforce scenarios live.
* **Fatigue & Operational Anomaly Detector**: Scans muster rolls and payroll logs for statutory fatigue violations ($>40$h OT), attendance drops, and debt traps.
* **NLP Grievance Triaging**: Evaluates complaint text, infers sentiment, rates urgency (1–10), and auto-drafts HR responses.
* **Executive Briefing Synthesis**: Generates real-time natural language summaries of company-wide workforce health.

### 2. 👤 Employee Hub
* **Central Employee Directory**: Unique employee codes (`SFS-XXXX`), designations, wage rates, and site deployment tracking.
* **Employee Lifecycle Tracking**: Status transitions (`ACTIVE`, `LEFT`, `REJOINED`) with complete audit trails in `status_history`.
* **Employment History**: Automatically logs changes to site assignment, designation, daily wage, and monthly wage in `employment_history`.
* **Statutory Records**: Captures ESIC numbers, EPF numbers, mobile numbers, and addresses.
* **Photo Upload**: Multi-part image upload saved to `/uploads` and previewed on profiles.

### 3. 💰 Payroll & Attendance Automation
* **Monthly Attendance Input**: Batch-entry of attended working days against monthly muster limits (26 days).
* **Automated Gross Pay Calculation**: `Gross = (Daily Wage × Attendance Days) + Overtime Pay`.
* **Statutory ESIC Deduction**: 0.75% auto-deducted only if total monthly gross is $\le ₹21,000$.
* **Statutory EPF Deduction**: 12% auto-deducted based on statutory basic ceiling.
* **Advance & Fine Deduction**: Automatically deducts active advance loans and monthly fines from net pay.
* **Room Rent Deduction**: Integrates accommodation rent directly into monthly deductions.
* **Net Salary Calculation**: `Net Salary = Total Gross - All Deductions` (floored at zero).
* **Dynamic Salary Slips**: One-click printable HTML salary slips with official SFS branding.

### 4. 📒 Financial Ledger & Advances
* **Advance Loan Management**: Issues advance loans with transaction tracking (`ADV-XXXX`) and recovery flags.
* **Disciplinary Fine Tracking**: Records punitive fines with specific infractions and site locations (`FIN-XXXX`).
* **Consolidated Ledger**: Unified financial transaction history combining advances, fines, and salary payouts.

### 5. 🏠 Assets & Accommodation
* **Room Allotment**: Allots staff quarters with room numbers and monthly rent rates; handles room vacation workflows.
* **Uniform Issuance**: Tracks shirt size, pant size, safety shoe size, allotment date, and return status.

### 6. 🏢 Client & Site Management
* **Client Portfolio**: Tracks client corporate details, billing rates, and contract durations (start and end dates).
* **Site Deployment Mapping**: Maps client properties (terminals, vaults, retail stores) with designated site supervisor contacts.

### 7. ⏰ Shifts & Overtime Management
* **Shift Roster Definition**: Configures shift timings (Morning, Evening, Night) with `is_night_shift` circadian tracking.
* **Employee Shift Assignment**: Allocates workers to specific shift rotations with effective dates.
* **Overtime Tracking**: Records monthly overtime hours and hourly rates, feeding directly into the payroll engine.

### 8. 🌴 Leave Management
* **Leave Quotas**: Configures annual paid/unpaid leave quotas per leave type (Casual, Sick, Earned).
* **Leave Balances**: Tracks allocated, used, and remaining leave balances per employee per calendar year.
* **Approval Workflow**: Supervisors/HR review leave applications and approve or reject them with audit remarks.

### 9. ⚖️ Grievances & Disciplinary Redressal
* **Incident Logging**: Records client complaints, employee grievances, and disciplinary infractions.
* **Lifecycle Redressal**: Tracks status from `OPEN` $\rightarrow$ `IN_REVIEW` $\rightarrow$ `RESOLVED` $\rightarrow$ `CLOSED`.
* **Redressal Actions**: Records official action taken, handling officer, and resolution timestamp.

### 10. 🙋 Employee Self-Service Portal (Guard Login)
* **Isolated Self-Service**: Blue-collar workers log in using their personal credentials (`suresh / suresh123`).
* **Personal Payslip Viewer**: View historical salary slips and download monthly payslips.
* **Attendance History**: View past months' attended days.
* **Self Leave Application**: Apply for leave directly from a mobile device or kiosk.
* **Grievance Submission**: Submit workplace or safety grievances directly to management.

### 11. 📊 Advanced Attendance Reporting & Statutory Compliance Suite
* **Central Attendance Reports Hub**: Unified analytics hub categorizing statutory muster rolls, diversity rosters, and shift allocations.
* **Form II Statutory Muster Roll**: Legal compliance muster roll generation detailing daily attendance codes (P, A, L, WO), working days, and overtime.
* **Ethnic Workforce Distribution**: Demographic attendance breakdowns tracking deployment diversity across operational zones.
* **Product & Client Deployment Reports**: Product-wise (Guards, Armed Security, Housekeeping) attendance rosters mapped to client contracts.
* **Product-Shift Cross Tabulation**: Deep shift-level (Morning, Evening, Night) operational deployment and attendance rosters.
* **High-Performance Multi-Format Exports**: Server-side styled Excel (`.xlsx`) generation with formulas via `exceljs` and official vector PDF (`.pdf`) rosters via `pdfkit`.
* **Batch Downloads Manager**: Dedicated interface for managing generated rosters and batch downloads.

---

## 🧠 5. Applied AI Workforce Intelligence Suite

### 1. The Multi-Factor Attrition Risk Algorithm
The Turnover Risk Index $S(E) \in [0, 100]$ is calculated as a 5-factor feature-weighted ensemble:

$$S(E) = \min\left(100, \max\left(0, \sum_{i=1}^{5} w_i \cdot f_i(E)\right)\right)$$

* **Weight 1: Attendance Consistency ($w_1 = 0.28$)**:
  * Evaluates attendance percentage $A = (\text{Attendance Days} / \text{Working Days}) \times 100$.
  * If $A \ge 90\% \rightarrow f_1 = 5.0$
  * If $75\% \le A < 90\% \rightarrow f_1 = (90 - A) \times 2.5$
  * If $50\% \le A < 75\% \rightarrow f_1 = 37.5 + (75 - A) \times 1.8$
  * If $A < 50\% \rightarrow f_1 = 95.0$
* **Weight 2: Overtime Fatigue Load ($w_2 = 0.24$)**:
  * Evaluates physical burnout against a 45-hour monthly threshold:
  * $f_2 = \min\left(100, \frac{\text{OT Hours}}{45.0} \times 100\right)$
* **Weight 3: Financial Debt Burden ($w_3 = 0.22$)**:
  * Compares unrecovered advances and fines to monthly wage $D = \frac{\text{Advances}}{\text{Monthly Wage}}$:
  * $f_3 = \min\left(100, \frac{D}{0.35} \times 100\right)$
* **Weight 4: Grievance & Disciplinary Friction ($w_4 = 0.16$)**:
  * Penalizes active workplace disputes:
  * $f_4 = \min(100, \text{Open Grievances} \times 40)$
* **Weight 5: Tenure Instability ($w_5 = 0.10$)**:
  * New recruits ($<3$ months) have high baseline flight probability:
  * $f_5 = 75$ (if $<3$ months), $45$ ($3–6$ months), $15$ ($>6$ months).

### 2. Risk Classification Boundaries
* **`CRITICAL` ($\ge 75\%$)**: Imminent desertion risk; requires urgent shift rotation, overtime freeze, and loan restructuring.
* **`HIGH` ($55\% - 74\%$)**: High burnout; cap overtime at 15h, resolve pending grievances.
* **`MODERATE` ($35\% - 54\%$)**: Watchlist; review night shift distribution.
* **`LOW` ($< 35\%$)**: Healthy engagement; candidate for site squad supervisor.

### 3. NLP Grievance Triaging Model
* **Keyword Lexical Parser**: Scans complaint texts against specialized dictionaries for safety hazards, wage disputes, harassment, and housing concerns.
* **Urgency Scoring (1 to 10)**: Assigns priority based on severity tokens (e.g., *danger, broken, injury, police, illegal*).
* **Sentiment Detection**: Classifies emotion into `DISTRESSED`, `FRUSTRATED`, `ESCALATED`, or `NEUTRAL`.
* **Prescriptive Action & Draft Response**: Auto-drafts an empathetic response for the HR Manager to send to the worker.

---

## 🔐 6. Role-Based Access Control (RBAC) Matrix

| Module / Endpoint | SUPER_ADMIN | HR_MANAGER | HR_STAFF | ACCOUNTS | VIEWER | EMPLOYEE |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **AI Workforce Insights** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ❌ |
| **Employee Roster & CRUD** | ✅ Full | ✅ Full | ✅ Full | 👁 Read | 👁 Read | ❌ |
| **Payroll Processing** | ✅ Full | ✅ Full | 👁 Read | 👁 Read | ❌ | ❌ |
| **Attendance Entry** | ✅ Full | ✅ Full | ✅ Full | ❌ | ❌ | ❌ |
| **Financial Ledger / Advances** | ✅ Full | ✅ Full | ✅ Full | ❌ | ❌ | ❌ |
| **Assets & Rooms** | ✅ Full | ✅ Full | ✅ Full | ❌ | ❌ | ❌ |
| **Clients & Sites** | ✅ Full | ✅ Full | ✅ Full | 👁 Read | 👁 Read | ❌ |
| **Leave Management** | ✅ Full | ✅ Full | ✅ Full | ❌ | ❌ | ❌ |
| **Grievance Redressal** | ✅ Full | ✅ Full | ✅ Full | ❌ | ❌ | ❌ |
| **Shifts & Overtime** | ✅ Full | ✅ Full | ✅ Full | 👁 Read | ❌ | ❌ |
| **User Administration** | ✅ Full | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Self-Service Portal** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Own data |

---

## 🗄️ 7. Database Schema & Data Models

The PostgreSQL relational schema consists of 19 interconnected tables:

* `app_users`: User authentication credentials, hashed passwords, roles, and employee linkage.
* `clients`: Corporate client contracts, billing rates, and contact details.
* `sites`: Client premises and deployment locations with supervisor contacts.
* `employees`: Master workforce records, codes, wages, dates, statutory IDs, and photos.
* `status_history`: Audit trail of employment status changes (`ACTIVE`, `LEFT`, `REJOINED`).
* `employment_history`: Audit trail of wage, designation, and site reassignments.
* `shifts`: Shift definitions (name, start time, end time, night shift flag).
* `shift_assignments`: Worker assignments to shift rosters.
* `overtime_records`: Monthly overtime hours, hourly rates, and total amounts.
* `advances`: Employee advance loans, amounts, dates, and recovery flags.
* `fines`: Disciplinary fine deductions with reasons and site locations.
* `rooms`: Staff accommodation room allotments and monthly rent amounts.
* `uniforms`: Issued uniform sizes and return records.
* `payroll_records`: Monthly finalized payroll records with itemized statutory deductions.
* `leave_types`: Leave policies and annual quotas.
* `leave_balances`: Yearly remaining and used leave balances per worker.
* `leave_requests`: Leave applications and approval workflow.
* `grievances`: Incident reports, complaint descriptions, and resolution statuses.
* `salary_slip_templates`: Admin-editable HTML template for salary slips.

---

## 🌐 8. API Endpoints Reference

### Authentication
* `POST /api/auth/login` – Authenticate user and issue JWT token.
* `GET  /api/auth/me` – Retrieve profile and role of authenticated user.

### Employees
* `GET   /api/employees` – List and search employees (`?query=&status=`).
* `GET   /api/employees/:id` – Fetch employee profile by ID.
* `GET   /api/employees/code/:code` – Fetch employee profile by code.
* `POST  /api/employees` – Create a new employee record.
* `PUT   /api/employees/:id` – Update an existing employee profile.
* `POST  /api/employees/:id/photo` – Upload employee photo.
* `PATCH /api/employees/:id/status` – Change status (`ACTIVE`, `LEFT`, `REJOINED`).
* `GET   /api/employees/:id/status-history` – Fetch status audit trail.
* `GET   /api/employees/:id/employment-history` – Fetch promotion/transfer history.
* `GET   /api/employees/:id/transactions` – Fetch unified transaction history.

### AI Workforce Intelligence
* `GET  /api/ai/workforce-insights` – Complete workforce risk analysis, anomalies, and site health.
* `POST /api/ai/simulate` – Real-time what-if scenario simulation.
* `GET  /api/ai/grievances/:id` – NLP sentiment and urgency analysis for a grievance.

### Payroll & Attendance
* `GET  /api/payroll` – Fetch monthly payroll records (`?month=&year=`).
* `POST /api/payroll/attendance` – Batch-record monthly attendance days.
* `POST /api/payroll/process` – Execute monthly statutory gross/net calculation.
* `GET  /api/payroll/slip` – Fetch JSON salary slip data.
* `GET  /api/payroll/slip/html` – Render printable HTML salary slip.

### Financial Ledger
* `GET   /api/ledger/transactions` – Unified transaction ledger.
* `POST  /api/ledger/advances` – Issue advance loan.
* `GET   /api/ledger/advances` – List all advance records.
* `PATCH /api/ledger/advances/:id/recover` – Mark advance loan as recovered.
* `POST  /api/ledger/fines` – Issue disciplinary fine.
* `GET   /api/ledger/fines` – List all fines.

### Assets & Accommodation
* `POST  /api/assets/rooms` – Allot room to staff.
* `GET   /api/assets/rooms` – List active room allotments.
* `PATCH /api/assets/rooms/employee/:id/vacate` – Vacate staff room.
* `PATCH /api/assets/uniforms/employee/:id` – Allot uniform.
* `GET   /api/assets/uniforms` – List uniform allotments.
* `PATCH /api/assets/uniforms/employee/:id/return` – Return uniform.

### Clients & Sites
* `GET   /api/clients` – List all corporate clients.
* `POST  /api/clients` – Create new client contract.
* `GET   /api/clients/:id/sites` – List sites belonging to a client.
* `GET   /api/sites` – List all deployment sites.
* `POST  /api/clients/:id/sites` – Create deployment site under client.
* `PUT   /api/sites/:id` – Update site details.

### Shifts & Overtime
* `GET  /api/shifts` – List shift definitions.
* `POST /api/shifts` – Define new shift.
* `POST /api/shifts/assign` – Assign employee to shift.
* `GET  /api/overtime` – List monthly overtime logs (`?month=&year=`).
* `POST /api/overtime` – Record overtime hours and rate.

### Leave & Grievances
* `GET   /api/leave/types` – List leave types and quotas.
* `GET   /api/leave/requests` – List leave applications.
* `PATCH /api/leave/requests/:id/approve` – Approve leave request.
* `PATCH /api/leave/requests/:id/reject` – Reject leave request.
* `GET   /api/grievances` – List grievances and client complaints.
* `POST  /api/grievances` – File new grievance.
* `PATCH /api/grievances/:id/status` – Update grievance status and action taken.

### Self-Service (Guards)
* `GET  /api/self/profile` – View own profile.
* `GET  /api/self/payslips` – View own payslips.
* `GET  /api/self/attendance` – View own attendance.
* `POST /api/self/leave/requests` – Apply for leave.
* `POST /api/self/grievances` – Submit grievance.

### Attendance Reports & Statutory Exports
* `GET  /api/attendance-reports/muster-roll` – Form II statutory muster roll dataset with daily status codes.
* `GET  /api/attendance-reports/ethnic` – Workforce ethnic diversity attendance distribution.
* `GET  /api/attendance-reports/product` – Product-wise guard deployment and attendance breakdown.
* `GET  /api/attendance-reports/product-shift` – Shift-level product deployment and attendance cross-matrix.
* `GET  /api/attendance-reports/export/excel` – Download multi-tab styled Excel attendance workbook (`.xlsx`).
* `GET  /api/attendance-reports/export/pdf` – Download official printable monthly attendance PDF roster (`.pdf`).

---

## 🚀 9. How to Run / Start the Demo

### Quick Start (Recommended)
From the project root directory:
```bash
./start-demo.sh
```

This single command will:
1. Verify and launch the PostgreSQL container on port `5432`
2. Start the Node.js Express backend on `http://localhost:8080`
3. Launch the React Vite frontend on `http://localhost:5173`

*(Press `Ctrl+C` in the terminal to cleanly terminate all processes).*

---

### Manual Launch

#### 1. Start PostgreSQL
```bash
podman run -d \
  --name ems_postgres \
  -e POSTGRES_DB=ems_db \
  -e POSTGRES_USER=ems_user \
  -e POSTGRES_PASSWORD=ems_password \
  -p 5432:5432 \
  postgres:16-alpine
```

#### 2. Start Backend (Node.js)
```bash
cd backend
npm install
node src/server.js
# Runs on http://localhost:8080
```

#### 3. Start Frontend (React)
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## 🔑 10. Default Login Credentials

| Role | Username | Password | Purpose to Show |
|---|---|---|---|
| **Super Admin** | `admin` | `admin123` | Unrestricted access, AI Insights, User Admin |
| **HR Manager** | `hr_manager` | `hr123` | Full HR operations, AI Risk Interventions, Payroll |
| **HR Staff** | `hr_staff` | `staff123` | Daily attendance input, Advances, Fines, Uniforms |
| **Accounts** | `accounts` | `acc123` | Read-only ledger audit & payroll verification |
| **Viewer** | `viewer` | `view123` | Read-only auditor profile inspection |
| **Guard (Self-Service)** | `suresh` | `suresh123` | Blue-collar portal (Suresh Bhai Varma, Armed Guard) |

---

## 🎓 11. College Viva / Presentation Walkthrough Script

Follow this 5-minute presentation sequence to showcase the system effectively:

1. **Sign In as Admin (`admin / admin123`)**:
   * Show the **Dashboard**: Highlight active client sites (*Adani Hazira Port*, *Surat Diamond Bourse*), total active personnel, and monthly wage bill.
2. **Click "AI Insights" in the Left Sidebar**:
   * **Executive Operations Briefing**: Show the automated natural language briefing summarizing company-wide turnover risk and fatigue hotspots.
   * **Tab 1 (Predictive Attrition Risk)**: Click on **Suresh Bhai Varma** or **Paresh D. Parmar**. Show the **Explainable AI (XAI) Factor Breakdown** demonstrating how 48.5h of overtime and advance debt contribute mathematically to their risk score.
3. **Open Tab 2 (Interactive AI Simulator)**:
   * **Interactive Demo**: Ask your examiner for hypothetical staffing parameters.
   * Drag the **Overtime slider** to 55h, lower **Attendance** to 16 days, and increase **Advance** to ₹7,000.
   * Show how the predicted risk score turns **CRITICAL ($>90\%$)** in real-time ($<5$ ms) and outputs an automated prescriptive retention playbook.
4. **Open Tab 3 (Operational Anomalies)**:
   * Point out the heuristic flags for statutory overtime violations ($>40$h limit) and attendance-overtime mismatches.
5. **Open Tab 5 (NLP Grievance Triaging)**:
   * Show how the AI evaluated a guard's complaint about *"broken perimeter lights"* into `WORKPLACE_SAFETY`, assigned an urgency score of 5/10, and auto-drafted a response.
6. **Log Out & Log In as Guard (`suresh / suresh123`)**:
   * Demonstrate the **Self-Service Portal**: Point out how the RBAC model isolates the guard so they only see their personal payslips, leave balances, and grievances.
