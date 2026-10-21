import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ManageStudents from './pages/ManageStudents';
import MarkAttendance from './pages/MarkAttendance';
import AttendanceHistory from './pages/AttendanceHistory';
import Assignments from './pages/Assignments';
import StudentDashboard from './pages/StudentDashboard';

// Layout wrapper for authenticated dashboard views
const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Determine page title based on current route
  const getHeaderInfo = (pathname) => {
    switch (pathname) {
      case '/admin/dashboard':
        return { title: 'Admin Overview', subtitle: 'Attendance & Class Statistics' };
      case '/admin/students':
        return { title: 'Manage Students', subtitle: 'Enrollment Directory & Roster' };
      case '/admin/mark-attendance':
        return { title: 'Mark Attendance', subtitle: 'Batch Attendance Registration' };
      case '/admin/attendance-history':
        return { title: 'Attendance Records', subtitle: 'Audit Log & CSV Reports' };
      case '/admin/assignments':
        return { title: 'Course Assignments', subtitle: 'Publish & Manage Coursework' };
      case '/student/dashboard':
        return { title: 'Student Dashboard', subtitle: 'Academic Performance & Today\'s Status' };
      case '/student/attendance':
        return { title: 'My Attendance History', subtitle: 'Personal Attendance Log' };
      case '/student/assignments':
        return { title: 'Class Assignments', subtitle: 'Pending & Completed Coursework' };
      default:
        return { title: 'CampusPulse Portal', subtitle: 'Student Attendance System' };
    }
  };

  const { title, subtitle } = getHeaderInfo(location.pathname);

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-main">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          pageTitle={title}
          pageSubtitle={subtitle}
        />
        <Outlet />
      </div>
    </div>
  );
};

// Root index redirect based on user role
const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
        <p>Loading CampusPulse...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return user.role === 'admin'
    ? <Navigate to="/admin/dashboard" replace />
    : <Navigate to="/student/dashboard" replace />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />

            {/* Root Redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Admin Protected Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="students" element={<ManageStudents />} />
              <Route path="mark-attendance" element={<MarkAttendance />} />
              <Route path="attendance-history" element={<AttendanceHistory />} />
              <Route path="assignments" element={<Assignments />} />
            </Route>

            {/* Student Protected Routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRole="student">
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/student/dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="attendance" element={<AttendanceHistory />} />
              <Route path="assignments" element={<Assignments />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
