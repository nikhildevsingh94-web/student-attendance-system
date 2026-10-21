import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ShieldCheck, Mail, Lock, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const Login = () => {
  const [role, setRole] = useState('student'); // 'student' or 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  // If already logged in, redirect to correct portal
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login(email.trim(), password, role);
      addToast(`Welcome back, ${loggedUser.name}!`, 'success');

      if (loggedUser.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Please check credentials.';
      setErrorMessage(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    setErrorMessage('');
    // Helpful auto-fill hints if admin selected
    if (selectedRole === 'admin' && !email) {
      setEmail('admin@college.edu');
      setPassword('Admin@123');
    } else if (selectedRole === 'student' && email === 'admin@college.edu') {
      setEmail('');
      setPassword('');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Dynamic Background Glows */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '20%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '15%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: '460px', position: 'relative', zIndex: 10 }}>
        {/* Brand Emblem */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            color: '#ffffff',
            boxShadow: '0 8px 30px rgba(99, 102, 241, 0.45)',
            marginBottom: '1rem'
          }}>
            <GraduationCap size={36} />
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.35rem' }}>
            CampusPulse Portal
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Student Attendance & Academic Management System
          </p>
        </div>

        {/* Card */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          {/* Role Selector Tabs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'rgba(15, 23, 42, 0.8)',
            padding: '0.35rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.75rem',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              onClick={() => handleRoleChange('student')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.65rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem',
                transition: 'var(--transition-smooth)',
                background: role === 'student' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                color: role === 'student' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              <UserCheck size={17} />
              <span>Student</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.65rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem',
                transition: 'var(--transition-smooth)',
                background: role === 'admin' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                color: role === 'admin' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              <ShieldCheck size={17} />
              <span>Admin</span>
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div style={{
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">
                <Mail size={15} style={{ color: 'var(--primary)' }} />
                <span>{role === 'student' ? 'Registered Gmail Address' : 'Admin Email'}</span>
              </label>
              <input
                type="email"
                className="form-input"
                placeholder={role === 'student' ? 'e.g. rahul.sharma@gmail.com' : 'admin@college.edu'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock size={15} style={{ color: 'var(--primary)' }} />
                <span>Password</span>
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.8rem' }}
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In as {role === 'admin' ? 'Admin' : 'Student'}</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {/* Credentials helper hint */}
          <div style={{
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            textAlign: 'center'
          }}>
            {role === 'admin' ? (
              <p>
                Default Admin Login: <strong style={{ color: '#ffffff' }}>admin@college.edu</strong> / <strong style={{ color: '#ffffff' }}>Admin@123</strong>
              </p>
            ) : (
              <p>
                Students: Use the Gmail and password registered by your college administrator.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
