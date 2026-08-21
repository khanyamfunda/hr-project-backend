# ModernTech Solutions HR Management System (Proof of Concept)

A comprehensive, web-based HR Management Single Page Application designed to replace manual workflows, streamline employee records, and eliminate administrative bottlenecks for ModernTech Solutions.



## Project Overview
Built by 
Nhlakanipho Luthuli , Khanya Mafunda , Phelisa Fani and Lukho Aphiwe Bija
This application serves as a Front-End Proof of Concept built using Vue.js. The project directly addresses four critical operational pain points by replacing disconnected Excel files, scattered Word documents, leave request stored in chaotic email chains, payroll relying on
complex,interconnected spreadsheets.

### Project Targets & Solved Pain Points

1. **Scattered Employee Data (Pain Point 1):** Replaces isolated Excel spreadsheets with a centralized, reactive Employee Directory that maps profiles, roles, and compensation arrays in a single view.
2. **Messy Leave Management (Pain Point 2):** Eradicates ad-hoc email threads and shared calendar double-bookings through a structured Leave Portal featuring submission fields and an interactive administrative approval queue.
3. **Complex Spreadsheet Payroll (Pain Point 3):** Replaces brittle, interconnected math formulas with automated client-side calculation utilities that dynamically track hours worked and leave deductions.
4. **Unstructured Reviews (Pain Point 4):** Standardizes performance evaluations by moving away from scattered Word files on shared network drives to a digital evaluation engine using a 1-to-5 rating system.

---

## Role-Based Architecture & Features

The application implements front-end conditional rendering logic to isolate two distinct corporate workflows:

### 1. Unified Authentication Gateway
* **Dual-Portal Entry:** Features side-by-side card credentials for HR Admins and regular employees.
* **Grading Accessibility:** Includes pre-filled mock credentials directly on the screen for instant assessment.

### 2. HR Administrator Suite
* **Main Dashboard:** Highlights company-wide KPIs (Headcounts, Leave Requests, Total ZAR Payroll, Average Performance Rating) alongside client-side departmental attendance visualizations.
* **Employee Directory Panel:** Features a responsive layout for row editing alongside defensive form validation banners to ensure strict input data integrity.
* **Leave Approval Queue:** Uses color-coded status badges (*Approved*, *Pending*, *Denied*) with inline state toggles to manage time-off requests.
* **Attendance Ledger:** Tracks active clock records and geographical parameters (e.g., "On Site" vs. "Remote").
* **Payroll Automated Engine:** Automatically runs calculation functions using localized South African Rand (`R`) metrics and supports dynamic printable payslip toggles.
* **Performance Review Portal:** Enforces structured appraisals with scrollable context boxes for auditing feedback trends over time.

### 3. Employee Self-Service Dashboard
* **Data Isolation:** Automatically filters the central state arrays to load *only* the authenticated employee's profile records (e.g., Sibongile Nkosi).
* **Time-Tracking Console:** Features an interactive **Clock In / Clock Out** toggle panel to simulate real-time shift generation logs.
* **Personal Ledger Transparencies:** Provides immediate visibility into personal leave request tallies and historical payroll summaries.

---

## Technical Stack & Framework Implementations

* **Framework:** Vue.js (Utilizing the Composition API for optimal structure and reactivity).
* **Styling & Layout:** Utility-first CSS framework (Tailwind CSS) to guarantee responsive typography grids.
* **State Management:** Reactive local state arrays simulating full-stack client-server interaction without page reloads.
* **Input Validation:** In-app custom validation alerts monitoring required form boundaries.

---

## Local Development Installation Guide

To review the project source files locally, ensure you have [Node.js](https://nodejs.org) installed, extract the bundle folder, and execute the following commands in your terminal:

```bash
# 1. Navigate to the extracted repository root
cd Hr-Project-final-repo

# 2. Install all required package dependencies 
npm install

# 3. Boot the hot-reloading front-end local development server
npm run dev
```

Once running, your terminal will provide a local web path (typically `http://localhost:5173/`). Copy and paste this link into your web browser to explore the functional interface.

---

## Evaluation Package Contents

This submission bundle contains the following required media resources and assets:
* `/src` - Core Vue components, styling files, and local application logic.
* `/src/components` - Individual structural UI components (Tables, Inputs, KPI blocks).
* `/src/data` - Robust JSON datasets holding realistic mock employee, leave, and review profiles.
* `/public` - Static system assets, custom logo structures, and interface styling anchors.
* `README.md` - Technical setup documentation and structural overview.

## HR Login Password

* Username : hr_admin
* Password : MT2026!
## Employee Login Password
* Username : Sibongile Nkosi
* Email : sibongile.nkosi@moderntech.com
  

 
