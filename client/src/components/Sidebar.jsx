import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  History,
  FileText,
  LogOut,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleLogout = () => {
    logout();
    addToast('Logged out successfully.', 'info');
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-icon">
          <GraduationCap size={24} />
        </div>
        <div className="brand-info">
          <h2>CampusPulse</h2>
          <span>{isAdmin ? 'Admin Console' : 'Student Portal'}</span>
        </div>
      </div>

      <nav className="sidebar-menu">
        <span className="menu-section-label">Main Menu</span>

        {isAdmin ? (
          <>
            <NavLink
              to="/admin/dashboard"
              className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <LayoutDashboard size={19} />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/admin/students"
              className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <Users size={19} />
              <span>Manage Students</span>
            </NavLink>

            <NavLink
              to="/admin/mark-attendance"
              className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <CheckSquare size={19} />
              <span>Mark Attendance</span>
            </NavLink>

            <NavLink
              to="/admin/attendance-history"
              className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <History size={19} />
              <span>Attendance Records</span>
            </NavLink>

            <NavLink
              to="/admin/assignments"
              className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <FileText size={19} />
              <span>Assignments</span>
            </NavLink>
          </>
        ) : (
          <>
            <NavLink
              to="/student/dashboard"
              className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <LayoutDashboard size={19} />
              <span>My Dashboard</span>
            </NavLink>

            <NavLink
              to="/student/attendance"
              className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <History size={19} />
              <span>Attendance History</span>
            </NavLink>

            <NavLink
              to="/student/assignments"
              className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <FileText size={19} />
              <span>My Assignments</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-snippet">
          <div className="user-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-details">
            <div className="user-name" title={user?.name}>{user?.name}</div>
            <div className="user-role">{isAdmin ? 'Administrator' : `Roll: ${user?.rollNumber || ''}`}</div>
          </div>
          <button
            className="btn-outline btn-sm"
            onClick={handleLogout}
            title="Log Out"
            style={{ padding: '0.4rem', border: 'none', color: '#ef4444' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
