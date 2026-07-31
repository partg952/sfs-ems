# 📊 Attendance Reports & Statutory Compliance Module

## Overview
The **Attendance Reports & Statutory Compliance Module** is an enterprise reporting suite designed for manpower and facility staffing operations. It provides automated generation of legal muster rolls, client/product deployment analytics, diversity tracking, and export capabilities.

---

## 🎯 Key Features & Capabilities

### 1. Form II Statutory Muster Roll
* **Legal Compliance**: Complies with Indian statutory labor department requirements (Factories Act & Minimum Wages Rules Form II).
* **Granular Tracking**: Daily tracking for all 28–31 days of the month (`P` for Present, `A` for Absent, `L` for Approved Leave, `WO` for Weekly Off).
* **Summary Metrics**: Real-time aggregation of total payable days, overtime hours, and total deployed hours per personnel.

### 2. Ethnic Workforce Diversity Distribution
* **Zone & Demographic Analytics**: Tracks ethnic and demographic distribution across client deployments and regional sites.
* **Operational Balanced Deployment**: Helps operations managers maintain balanced workforce distributions across critical posts.

### 3. Product-Wise Guard Deployment Rosters
* **Product Classification**: Groups frontline workforce by role types:
  * Armed Security Personnel
  * Static Security Guards
  * Housekeeping & Sanitation Attendants
  * Technical & Maintenance Staff
* **Client Site Mapping**: Filters by client, contract code, and site location.

### 4. Product-Shift Cross Tabulation
* **Shift Matrix**: Breaks down attendance across **Morning**, **Evening**, and **Night** shifts.
* **Circadian & Fatigue Tracking**: Flags continuous night shift rotations to prevent operational fatigue.

### 5. High-Performance Multi-Format Exports
* **Excel Workbook Generation (`exceljs`)**:
  * Formatted headers, alternating row colors, auto-fitted columns, and formula-calculated totals.
  * Multi-sheet workbooks for multi-site enterprise clients.
* **Official PDF Rosters (`pdfkit`)**:
  * Printable landscape A4 format with official Shreeji Facility Services branding, seal, and signature blocks.

---

## 🏗️ Architecture & Component Hierarchy

### Backend Architecture
```
backend/src/
├── routes/
│   └── attendanceReports.js           # REST API endpoints & query validation
└── services/
    ├── attendanceReportEngine.js      # Core calculation & aggregation engine
    ├── musterRollService.js           # Form II muster roll transformer
    ├── ethnicReportService.js         # Demographic distribution calculator
    ├── productReportService.js        # Product deployment aggregator
    ├── productShiftReportService.js   # Shift-level cross-matrix processor
    ├── attendanceExcelExport.js       # ExcelJS workbook generator
    └── attendancePdfExport.js         # PDFKit printable document generator
```

### Frontend Architecture
```
frontend/src/
├── api/
│   └── attendanceReports.js           # Axios API client & blob download handlers
├── components/
│   ├── Breadcrumbs.jsx                # Dynamic navigation breadcrumbs
│   ├── Topbar.jsx                     # Topbar with quick actions & user status
│   └── Skeleton.jsx                   # Loading skeletons for async tables
└── pages/attendance-reports/
    ├── AttendanceReportsPage.jsx      # Central hub & navigation cards
    ├── MusterRollReport.jsx           # Form II interactive data grid
    ├── EthnicAttendanceReport.jsx     # Ethnic diversity dashboard
    ├── ProductAttendanceReport.jsx    # Product assignment summary
    ├── ProductShiftAttendanceReport.jsx # Shift-level deployment matrix
    └── DownloadsPage.jsx              # Batch download manager
```

---

## 👥 Author
* **Parth Singh** ([@pskuntal1248](https://github.com/pskuntal1248)) — `ps.kuntal2005@gmail.com`
