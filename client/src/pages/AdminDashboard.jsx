import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  UserPlus,
  CheckSquare,
  History,
  FileUp,
  RefreshCw,
  Clock,
  ArrowRight,
  FileSpreadsheet
} from 'lucide-react';
import { attendanceService } from '../services/api';
import { useToast } from '../components/Toast';
import BulkImportModal from '../components/BulkImportModal';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    totalTodayMarked: 0,
    todayPercentage: 0,
    todayDate: ''
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const { addToast } = useToast();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const data = await attendanceService.getOverviewStats();
      if (data.success) {
        setStats(data.stats);
        setRecentActivity(data.recentActivity || []);
      }
    } catch (err) {
      console.error('Error loading dashboard overview:', err);
      addToast('Failed to refresh dashboard stats.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="page-content">
      {/* Top Welcome & Actions Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Admin Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Real-time analytics and management dashboard for today's sessions
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowBulkModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FileSpreadsheet size={15} style={{ color: 'var(--info)' }} />
            <span>Bulk Add Students</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchDashboardData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={15} className={loading ? 'spinner' : ''} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="stats-grid">
        {/* Total Students */}
        <div className="stat-card">
          <div className="stat-icon-wrapper primary">
            <Users size={26} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Enrolled Students</div>
            <div className="stat-value">{stats.totalStudents}</div>
            <div className="stat-sub">Across all branches & sections</div>
          </div>
        </div>

        {/* Present Today */}
        <div className="stat-card">
          <div className="stat-icon-wrapper success">
            <UserCheck size={26} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Present Today</div>
            <div className="stat-value" style={{ color: '#34d399' }}>{stats.presentToday}</div>
            <div className="stat-sub">{stats.totalTodayMarked} total marked today</div>
          </div>
        </div>

        {/* Absent Today */}
        <div className="stat-card">
          <div className="stat-icon-wrapper danger">
            <UserX size={26} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Absent Today</div>
            <div className="stat-value" style={{ color: '#f87171' }}>{stats.absentToday}</div>
            <div className="stat-sub">{stats.totalTodayMarked > 0 ? `${stats.totalTodayMarked - stats.presentToday} unexcused / absent` : 'No records yet'}</div>
          </div>
        </div>

        {/* Today's Attendance % */}
        <div className="stat-card">
          <div className="stat-icon-wrapper info">
            <TrendingUp size={26} />
          </div>
          <div className="stat-info" style={{ flex: 1 }}>
            <div className="stat-label">Today's Attendance Rate</div>
            <div className="stat-value">{stats.todayPercentage}%</div>
            {/* Visual Progress Bar */}
            <div style={{
              width: '100%',
              height: '6px',
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: '999px',
              marginTop: '0.5rem',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${stats.todayPercentage}%`,
                height: '100%',
                background: stats.todayPercentage >= 75
                  ? 'linear-gradient(90deg, #10b981, #059669)'
                  : stats.todayPercentage >= 50
                  ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                  : 'linear-gradient(90deg, #ef4444, #dc2626)',
                borderRadius: '999px',
                transition: 'width 0.5s ease-in-out'
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#ffffff' }}>
          Quick Operational Actions
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          <Link to="/admin/students" className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '1rem' }}>
            <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
              <UserPlus size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Add New Student</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Register enrollments</div>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '1rem', textAlign: 'left', background: 'var(--surface-card)' }}
          >
            <div style={{ background: 'var(--info-bg)', color: 'var(--info)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#f8fafc' }}>Bulk Add Students</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Excel / CSV Import</div>
            </div>
          </button>

          <Link to="/admin/mark-attendance" className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '1rem' }}>
            <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
              <CheckSquare size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Mark Attendance</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily batch attendance</div>
            </div>
          </Link>

          <Link to="/admin/attendance-history" className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '1rem' }}>
            <div style={{ background: 'var(--info-bg)', color: 'var(--info)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
              <History size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>View Reports</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filter & export CSV</div>
            </div>
          </Link>

          <Link to="/admin/assignments" className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '1rem' }}>
            <div style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
              <FileUp size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Upload Assignment</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Publish course material</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Attendance Activity Feed */}
      <div className="glass-card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} style={{ color: 'var(--primary)' }} />
            <h3>Recent Attendance Submissions</h3>
          </div>
          <Link to="/admin/attendance-history" className="btn btn-outline btn-sm">
            <span>View All Records</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading activity logs...</p>
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="empty-state">
            <Clock className="empty-state-icon" />
            <h4>No Attendance Records Yet</h4>
            <p>Once you mark attendance for a class, recent activity entries will appear here in real time.</p>
            <Link to="/admin/mark-attendance" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              <CheckSquare size={16} />
              <span>Mark Today's Attendance</span>
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Class / Branch</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Marked At</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span style={{ fontWeight: 600, fontFamily: 'monospace', color: '#ffffff' }}>
                        {item.rollNumber}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{item.studentName}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {item.branch} - {item.classYear} ({item.section})
                      </span>
                    </td>
                    <td>{item.date}</td>
                    <td>
                      <span className={`status-badge ${item.status}`}>
                        <span className={`status-dot ${item.status}`} />
                        {item.status === 'present' ? 'Present' : 'Absent'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {item.markedAt ? new Date(item.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSuccess={fetchDashboardData}
      />
    </div>
  );
};

export default AdminDashboard;
