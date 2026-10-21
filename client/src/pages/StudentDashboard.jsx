import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  UserCheck,
  UserX,
  FileText,
  Download,
  ArrowRight,
  GraduationCap,
  Layers,
  Sparkles
} from 'lucide-react';
import { attendanceService, assignmentService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const StudentDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [attendanceData, setAttendanceData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [attRes, assignRes] = await Promise.all([
          attendanceService.getStudentAttendance(),
          assignmentService.getAssignments()
        ]);

        if (attRes.success) {
          setAttendanceData(attRes);
        }
        if (assignRes.success) {
          setAssignments(assignRes.assignments);
        }
      } catch (err) {
        console.error('Error loading student dashboard:', err);
        addToast('Failed to load dashboard data.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const handleDownloadAssignment = async (assignment) => {
    setDownloadingId(assignment.id);
    try {
      await assignmentService.downloadAssignment(assignment.id, assignment.originalName);
      addToast(`Downloaded ${assignment.title}`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to download assignment.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const metrics = attendanceData?.metrics || {
    totalRecordedDays: 0,
    presentDays: 0,
    absentDays: 0,
    attendancePercentage: 0
  };

  const todayStatus = attendanceData?.todayStatus || 'not_marked';
  const recentRecords = (attendanceData?.records || []).slice(0, 5);

  return (
    <div className="page-content">
      {/* Student Welcome Banner Card */}
      <div className="glass-card" style={{
        marginBottom: '2rem',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow orb */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          position: 'relative',
          zIndex: 2
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c084fc', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              <Sparkles size={16} />
              <span>STUDENT ACADEMIC PORTAL</span>
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Welcome back, {user?.name}!
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center' }}>
              <span style={{
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '0.25rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: '#ffffff'
              }}>
                Roll No: {user?.rollNumber}
              </span>

              <span style={{
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#a5b4fc',
                padding: '0.25rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: 600
              }}>
                {user?.branch}
              </span>

              <span style={{
                background: 'rgba(6, 182, 212, 0.15)',
                color: '#67e8f9',
                padding: '0.25rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: 600
              }}>
                {user?.classYear} • Section {user?.section}
              </span>
            </div>
          </div>

          {/* Today's Status Badge */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.35rem',
            textAlign: 'center',
            minWidth: '220px'
          }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Today's Attendance Status
            </div>

            {todayStatus === 'present' ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#34d399', fontWeight: 700, fontSize: '1rem' }}>
                <CheckCircle2 size={20} />
                <span>Marked Present</span>
              </div>
            ) : todayStatus === 'absent' ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#f87171', fontWeight: 700, fontSize: '1rem' }}>
                <XCircle size={20} />
                <span>Marked Absent</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#f59e0b', fontWeight: 600, fontSize: '0.9rem' }}>
                <Clock size={18} />
                <span>Attendance not marked yet</span>
              </div>
            )}
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Date: {attendanceData?.todayDate || 'Today'}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper info">
            <Calendar size={26} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Recorded Days</div>
            <div className="stat-value">{metrics.totalRecordedDays}</div>
            <div className="stat-sub">Sessions logged by faculty</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper success">
            <UserCheck size={26} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Present Days</div>
            <div className="stat-value" style={{ color: '#34d399' }}>{metrics.presentDays}</div>
            <div className="stat-sub">Sessions attended</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper danger">
            <UserX size={26} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Absent Days</div>
            <div className="stat-value" style={{ color: '#f87171' }}>{metrics.absentDays}</div>
            <div className="stat-sub">Missed sessions</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper primary">
            <TrendingUp size={26} />
          </div>
          <div className="stat-info" style={{ flex: 1 }}>
            <div className="stat-label">Overall Attendance %</div>
            <div className="stat-value">{metrics.attendancePercentage}%</div>
            <div style={{
              width: '100%',
              height: '6px',
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: '999px',
              marginTop: '0.5rem',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${metrics.attendancePercentage}%`,
                height: '100%',
                background: metrics.attendancePercentage >= 75
                  ? 'linear-gradient(90deg, #10b981, #059669)'
                  : metrics.attendancePercentage >= 60
                  ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                  : 'linear-gradient(90deg, #ef4444, #dc2626)',
                borderRadius: '999px',
                transition: 'width 0.5s ease-in-out'
              }} />
            </div>
            <div style={{ fontSize: '0.72rem', color: metrics.attendancePercentage >= 75 ? '#34d399' : '#f87171', marginTop: '0.35rem' }}>
              {metrics.attendancePercentage >= 75
                ? 'Eligible for final examinations'
                : 'Below minimum attendance requirement (75%)'}
            </div>
          </div>
        </div>
      </div>

      {/* Split Grid: Recent Attendance & Active Assignments */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Recent Attendance */}
        <div className="glass-card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} style={{ color: 'var(--primary)' }} />
              <h3>Recent Attendance History</h3>
            </div>
            <Link to="/student/attendance" className="btn btn-outline btn-sm">
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner" />
              <p>Loading attendance timeline...</p>
            </div>
          ) : recentRecords.length === 0 ? (
            <div className="empty-state">
              <Calendar className="empty-state-icon" />
              <h4>No Sessions Logged Yet</h4>
              <p>Your class attendance history will appear here once marked by the faculty.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Recorded At</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRecords.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.date}</td>
                      <td>
                        <span className={`status-badge ${r.status}`}>
                          <span className={`status-dot ${r.status}`} />
                          {r.status === 'present' ? 'Present' : 'Absent'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {r.markedAt ? new Date(r.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Available Assignments */}
        <div className="glass-card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} style={{ color: 'var(--primary)' }} />
              <h3>Course Assignments ({assignments.length})</h3>
            </div>
            <Link to="/student/assignments" className="btn btn-outline btn-sm">
              <span>All Assignments</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner" />
              <p>Loading assignments...</p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="empty-state">
              <FileText className="empty-state-icon" />
              <h4>No Pending Assignments</h4>
              <p>You have no pending assignments assigned to your class.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {assignments.slice(0, 3).map((assignment) => (
                <div
                  key={assignment.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontWeight: 600,
                      color: '#ffffff',
                      fontSize: '0.92rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {assignment.title}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      <span>Due: <strong style={{ color: '#f59e0b' }}>{assignment.dueDate}</strong></span>
                      <span>•</span>
                      <span>{assignment.branch}</span>
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDownloadAssignment(assignment)}
                    disabled={downloadingId === assignment.id}
                    title="Download assignment"
                  >
                    {downloadingId === assignment.id ? (
                      <div className="spinner" />
                    ) : (
                      <Download size={14} />
                    )}
                    <span>Download</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
