import React from 'react';
import { Menu, LogOut, Calendar, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from './Toast';

const Navbar = ({ onToggleSidebar, pageTitle, pageSubtitle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleLogout = () => {
    logout();
    addToast('Logged out successfully.', 'info');
    navigate('/login');
  };

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu size={24} />
        </button>
        <div className="nav-title-group">
          <h1>{pageTitle || 'Portal'}</h1>
          {pageSubtitle && <p>{pageSubtitle}</p>}
        </div>
      </div>

      <div className="top-actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          <Calendar size={15} style={{ color: 'var(--primary)' }} />
          <span>{todayStr}</span>
        </div>

        <span className={`badge-role ${user?.role || 'admin'}`}>
          {user?.role === 'admin' ? 'Admin Access' : 'Student'}
        </span>

        <button
          className="btn btn-secondary btn-sm"
          onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
