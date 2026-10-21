# CampusPulse — Student Attendance Management Portal

A full-stack, responsive, and secure **Student Attendance Management System** built with **React (Vite)**, **Node.js (Express)**, and a persistent, atomic **local JSON database (`server/data.json`)**.

No external database (like MongoDB, MySQL, SQLite, or Firebase) is required. All records persist across backend server restarts.

---

## 🌟 Key Features

### 🔐 1. Authentication & Role Separation
- **Role-based Authentication**: Separate portals for **Admins** and **Students**.
- **Secure Password Hashing**: Uses `bcryptjs` with salt rounds — passwords are never stored in plain text.
- **JWT Protection**: Secure HTTP Bearer tokens with role authorization middleware (`verifyToken`, `requireAdmin`, `requireStudent`).
- **Student Login**: Students log in securely using their registered college Gmail address and assigned password.
- **Initial Admin Setup**: Documented CLI script to seed or reset the administrator account.

### 📊 2. Admin Portal
- **Real-Time Dashboard**:
  - Live counts for total students, today's present, today's absent, and today's attendance percentage.
  - Interactive attendance progress visualizer.
  - Recent activity feed showing attendance logs.
  - Quick action buttons to jump directly to operational tasks.
- **Student Management**:
  - Full registration form: Name, Roll Number, Gmail, Branch, Class/Year, Section, and Initial Password.
  - Client and server-side validation with duplicate roll number and email checks.
  - Real-time search by name, roll number, or Gmail address.
  - Multi-attribute filtering (Branch, Year, Section).
  - Deletion with cascading cleanup of associated attendance records and confirmation dialog.
- **Batch Attendance Marking**:
  - Class filtering by Branch, Class/Year, Section, and Date picker (YYYY-MM-DD).
  - Lists only students belonging to the chosen batch.
  - Instant toggle between **Present** and **Absent** with visual status pills.
  - Fast batch actions: **"Mark All Present"** and **"Mark All Absent"**.
  - **Upsert Logic**: Automatically prevents duplicate records for the same student on the same date. If attendance is submitted again, it updates the existing record.
  - Reopens previously saved records in edit mode seamlessly.
- **Attendance Records & CSV Reports**:
  - Filter history by Date, Branch, Class/Year, Section, and Status (Present/Absent).
  - Search by student name or roll number.
  - Real-time aggregate metrics: Total Records, Present Count, Absent Count, Attendance Rate.
  - Formula: $\text{Attendance \%} = \left(\frac{\text{Present Days}}{\text{Recorded Days}}\right) \times 100$.
  - **Export to CSV**: Instant one-click download of filtered attendance records for spreadsheets.
- **Coursework & Assignment Management**:
  - Upload assignments with Title, Description, Branch, Class/Year, Section, Due Date, and file attachment.
  - Supports **PDF**, **PNG**, **JPG**, and **JPEG** formats with file validation and 15MB size limit.
  - Unique sanitized filenames saved in `server/uploads/` and metadata stored in `data.json`.
  - Upload progress bar indicator.
  - Deletion removes both metadata and physical file from server storage.

### 🎓 3. Student Portal
- **Personalized Dashboard**:
  - Student identity banner (Name, Roll Number, Branch, Class, Section).
  - **Accurate Today's Status**: Shows `"Attendance not marked yet"` when attendance hasn't been taken today (does not prematurely flag absent).
  - Overall attendance percentage with exam eligibility indicator (75% threshold).
  - Recent attendance timeline.
  - Active assignments matching the student's branch, class, and section.
- **Attendance History**:
  - Full personal attendance audit trail with date, status badges, and timestamp.
  - Private: Students can only view their own attendance records.
- **Coursework Downloads**:
  - View assignments specifically assigned to the student's class and branch.
  - Secure authenticated download directly through backend endpoint.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, React Router v6, Axios, Lucide React Icons |
| **Styling** | Vanilla CSS Design System (Glassmorphism, Google Fonts: Inter & Outfit, CSS Variables, Responsive Layout) |
| **Backend** | Node.js, Express.js (ES Modules), Multer (File uploads), CORS |
| **Authentication**| JSON Web Tokens (`jsonwebtoken`), `bcryptjs` password hashing |
| **Data Storage** | Local JSON (`server/data.json`) via `fs/promises` with a serialized Promise write-queue |

---

## 📁 Project Directory Structure

```text
student attendance system/
├── client/                               # Frontend React + Vite application
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── Modal.jsx                 # Confirmation modal dialog
│   │   │   ├── Navbar.jsx                # Top app navigation bar
│   │   │   ├── ProtectedRoute.jsx        # Role-based route guard
│   │   │   ├── Sidebar.jsx               # Navigation drawer
│   │   │   └── Toast.jsx                 # Toast notification system
│   │   ├── context/
│   │   │   └── AuthContext.jsx           # JWT session state & persistence
│   │   ├── pages/
│   │   │   ├── AdminDashboard.jsx        # Admin metrics & recent logs
│   │   │   ├── Assignments.jsx           # Coursework uploads & downloads
│   │   │   ├── AttendanceHistory.jsx     # Reports, filters & CSV export
│   │   │   ├── Login.jsx                 # Tabbed login for Admin & Student
│   │   │   ├── ManageStudents.jsx        # Student CRUD & roster
│   │   │   ├── MarkAttendance.jsx        # Batch attendance marking
│   │   │   └── StudentDashboard.jsx      # Student dashboard & stats
│   │   ├── services/
│   │   │   └── api.js                    # Axios instance & API endpoints
│   │   ├── App.jsx                       # Application router & layout
│   │   ├── index.css                     # Comprehensive design system
│   │   └── main.jsx                      # React entrypoint
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/                               # Backend Node.js + Express API
│   ├── middleware/
│   │   ├── authMiddleware.js             # Token verification & role guards
│   │   └── uploadMiddleware.js           # Multer file upload configuration
│   ├── routes/
│   │   ├── assignmentRoutes.js           # Assignment upload, list, download, delete
│   │   ├── attendanceRoutes.js           # Batch marking, stats, student history
│   │   ├── authRoutes.js                 # Login & current user profile
│   │   └── studentRoutes.js              # Student registration, listing, deletion
│   ├── uploads/                          # Local directory for assignment files
│   ├── utils/
│   │   ├── initAdmin.js                  # CLI admin creation / password reset script
│   │   └── jsonStorage.js                # Atomic serialized JSON file engine
│   ├── data.json                         # Primary application storage file
│   ├── server.js                         # Express server entrypoint
│   ├── package.json
│   ├── .env
│   └── .env.example
├── .gitignore
├── package.json                          # Monorepo scripts
└── README.md
```

---

## 🚀 Windows Setup and Execution Instructions

### Prerequisites
- **Node.js** (v18.0.0 or higher recommended). Check with:
  ```powershell
  node -v
  npm -v
  ```

---

### Step 1: Install Dependencies

From the workspace root directory, install dependencies for both the backend and frontend:

#### Backend:
```powershell
cd server
npm install
cd ..
```

#### Frontend:
```powershell
cd client
npm install
cd ..
```

*(Alternatively, you can run `npm run install:all` from the root directory).*

---

### Step 2: Initialize the First Admin Account

The system includes a secure utility to initialize or update the administrator account.

Run the following command from the workspace root:

```powershell
npm run init:admin
```

This creates the initial admin in `server/data.json` with the following default credentials:
- **Email:** `admin@college.edu`
- **Password:** `Admin@123`

> **Custom Credentials**: You can also initialize a custom admin by passing arguments:
> ```powershell
> node server/utils/initAdmin.js "your-email@college.edu" "Your Name" "YourSecurePassword"
> ```

---

### Step 3: Run the Application

Open two separate terminal windows on Windows:

#### Terminal 1 — Start the Backend Server:
```powershell
cd server
npm start
```
*The server will run on `http://localhost:5000` and automatically verify `server/data.json`.*

#### Terminal 2 — Start the Frontend Dev Server:
```powershell
cd client
npm run dev
```
*The Vite development server will open on `http://localhost:5173`.*

---

## 🔑 Login & Demo Walkthrough

1. Open your browser and navigate to **`http://localhost:5173`**.
2. **Administrator Login**:
   - Switch to the **Admin** tab.
   - Email: `admin@college.edu`
   - Password: `Admin@123`
   - Click **Sign In**.
3. **Register Students**:
   - Go to **Manage Students** from the sidebar.
   - Click **Register New Student**.
   - Fill in student details (e.g. Roll Number: `CS2026-001`, Gmail: `rahul.sharma@gmail.com`, Password: `Student@123`, Branch: `Computer Science`, Class: `1st Year`, Section: `A`).
   - Click **Save Student Record**.
4. **Mark Attendance**:
   - Go to **Mark Attendance**.
   - Select Branch: `Computer Science`, Year: `1st Year`, Section: `A`, Date: Today.
   - Click **Mark All Present** or toggle individual students.
   - Click **Save Batch Attendance**.
5. **Upload an Assignment**:
   - Go to **Assignments** and click **Upload Assignment**.
   - Provide title, select Computer Science / 1st Year / Sec A, attach a PDF/Image, set due date, and click **Publish Assignment**.
6. **Log In as Student**:
   - Click **Logout** from the top right.
   - On the login screen, select **Student** tab.
   - Email: `rahul.sharma@gmail.com`
   - Password: `Student@123`
   - Observe the student dashboard: live today's attendance status, 100% attendance rate, attendance timeline, and the published assignment ready for download!

---

## 🛡️ Security & Storage Details

- **Atomic Writes**: `server/utils/jsonStorage.js` uses a chained Promise queue (`writeQueue`) to serialize file system write operations. This prevents data corruption from simultaneous requests.
- **Data Persistence**: All records (admins, students, attendance, assignments) are stored in `server/data.json`. The data persists across server restarts.
- **Role Verification**: Students cannot query `/api/students` or upload/delete assignments; requests are rejected with `403 Forbidden`.
- **File Downloads**: Protected download endpoint checks that students belong to the class assigned to the coursework before allowing the file download.

---

## 📜 License
Educational Project. Developed for College Student Attendance Management Portals.
