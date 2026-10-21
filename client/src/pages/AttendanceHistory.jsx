import React, { useState, useEffect } from 'react';
import {
  History,
  Download,
  Search,
  Filter,
  Calendar,
  UserCheck,
  UserX,
  TrendingUp,
  GraduationCap,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { attendanceService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const BRANCH_OPTIONS = ['Computer Science', 'Information Technology', 'Electronics & Comm', 'Mechanical', 'Civil', 'Electrical'];
const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const SECTION_OPTIONS = ['A', 'B', 'C', 'D'];

const AttendanceHistory = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { addToast } = useToast();

  // Admin States
  const [records, setRecords] = useState([]);
  const [metrics, setMetrics] = useState({
    totalRecords: 0,
    presentCount: 0,
    absentCount: 0,
    attendancePercentage: 0
  });

  // Admin Filter States
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('all');
  const [classYear, setClassYear] = useState('all');
  const [section, setSection] = useState('all');
  const [status, setStatus] = useState('all');
  const [date, setDate] = useState('');

  // Student States
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch admin records
  const fetchAdminRecords = async () => {
    setLoading(true);
    try {
      const res = await attendanceService.getRecords({
        search,
        branch,
        classYear,
        section,
        status,
        date
      });
      if (res.success) {
        setRecords(res.records);
        setMetrics(res.metrics);
      }
    } catch (err) {
      console.error('Error fetching attendance records:', err);
      addToast('Failed to load attendance records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch student records
  const fetchStudentRecord = async () => {
    setLoading(true);
    try {
      const res = await attendanceService.getStudentAttendance();
      if (res.success) {
        setStudentData(res);
      }
    } catch (err) {
      console.error('Error fetching student attendance:', err);
      addToast('Failed to load your attendance history.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminRecords();
    } else {
      fetchStudentRecord();
    }
  }, [isAdmin, branch, classYear, section, status, date]);

  const handleAdminSearch = (e) => {
    e.preventDefault();
    fetchAdminRecords();
  };

  // Export Filtered Records to CSV
  const exportToCSV = () => {
    if (records.length === 0) {
      addToast('No records to export.', 'error');
      return;
    }

    const headers = ['Roll Number', 'Student Name', 'Gmail', 'Branch', 'Class/Year', 'Section', 'Date', 'Status', 'Marked At'];
    const rows = records.map((r) => [
      `"${r.rollNumber}"`,
      `"${r.studentName}"`,
      `"${r.email}"`,
      `"${r.branch}"`,
      `"${r.classYear}"`,
      `"${r.section}"`,
      `"${r.date}"`,
      `"${r.status.toUpperCase()}"`,
      `"${r.markedAt ? new Date(r.markedAt).toLocaleString() : ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filename = `attendance_report_${date || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();

    addToast(`Exported ${records.length} records to CSV.`, 'success');
  };

  // STUDENT VIEW
  if (!isAdmin) {
    const studentMetrics = studentData?.metrics || {
      totalRecordedDays: 0,
      presentDays: 0,
      absentDays: 0,
      attendancePercentage: 0
    };
    const studentRecords = studentData?.records || [];

    return (
      <div className="page-content">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>My Attendance History</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Complete audit log of all attendance sessions recorded for your profile
          </p>
        </div>

        {/* Student Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper info">
              <Calendar size={26} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Total Recorded Days</div>
              <div className="stat-value">{studentMetrics.totalRecordedDays}</div>
              <div className="stat-sub">Sessions marked</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper success">
              <UserCheck size={26} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Present Days</div>
              <div className="stat-value" style={{ color: '#34d399' }}>{studentMetrics.presentDays}</div>
              <div className="stat-sub">Days in attendance</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper danger">
              <UserX size={26} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Absent Days</div>
              <div className="stat-value" style={{ color: '#f87171' }}>{studentMetrics.absentDays}</div>
              <div className="stat-sub">Unexcused absences</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper primary">
              <TrendingUp size={26} />
            </div>
            <div className="stat-info" style={{ flex: 1 }}>
              <div className="stat-label">Cumulative Attendance</div>
              <div className="stat-value">{studentMetrics.attendancePercentage}%</div>
              <div style={{
                width: '100%',
                height: '6px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: '999px',
                marginTop: '0.5rem',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${studentMetrics.attendancePercentage}%`,
                  height: '100%',
                  background: studentMetrics.attendancePercentage >= 75
                    ? '#10b981'
                    : studentMetrics.attendancePercentage >= 60
                    ? '#f59e0b'
                    : '#ef4444'
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Records Table */}
        <div className="glass-card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={18} style={{ color: 'var(--primary)' }} />
              <h3>Individual Session History ({studentRecords.length})</h3>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner" />
              <p>Loading your attendance timeline...</p>
            </div>
          ) : studentRecords.length === 0 ? (
            <div className="empty-state">
              <History className="empty-state-icon" />
              <h4>No Attendance Recorded Yet</h4>
              <p>Your professors have not recorded attendance for your profile yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Attendance Status</th>
                    <th>Recorded Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRecords.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.date}</td>
                      <td>
                        <span className={`status-badge ${r.status}`}>
                          <span className={`status-dot ${r.status}`} />
                          {r.status === 'present' ? 'Present' : 'Absent'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {r.markedAt ? new Date(r.markedAt).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ADMIN VIEW
  return (
    <div className="page-content">
      {/* Top Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Attendance Records & Reports</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Filter, inspect, and export comprehensive institutional attendance metrics
          </p>
        </div>

        <button
          className="btn btn-success"
          onClick={exportToCSV}
          disabled={records.length === 0}
        >
          <FileSpreadsheet size={16} />
          <span>Export Filtered to CSV</span>
        </button>
      </div>

      {/* Aggregate Metrics Bar */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper info">
            <History size={26} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Filtered Records</div>
            <div className="stat-value">{metrics.totalRecords}</div>
            <div className="stat-sub">Matching queries</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper success">
            <UserCheck size={26} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Present</div>
            <div className="stat-value" style={{ color: '#34d399' }}>{metrics.presentCount}</div>
            <div className="stat-sub">Attendees</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper danger">
            <UserX size={26} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Absent</div>
            <div className="stat-value" style={{ color: '#f87171' }}>{metrics.absentCount}</div>
            <div className="stat-sub">Absences</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper primary">
            <TrendingUp size={26} />
          </div>
          <div className="stat-info" style={{ flex: 1 }}>
            <div className="stat-label">Filtered Attendance Rate</div>
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
                background: '#6366f1'
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Filter Bar */}
      <div className="filter-bar">
        <form onSubmit={handleAdminSearch} className="filter-input-search" style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search by student name or roll no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.4rem' }}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">
            Search
          </button>
        </form>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
          <select
            className="form-select"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.8rem' }}
          >
            <option value="all">All Branches</option>
            {BRANCH_OPTIONS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            className="form-select"
            value={classYear}
            onChange={(e) => setClassYear(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.8rem' }}
          >
            <option value="all">All Years</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            className="form-select"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.8rem' }}
          >
            <option value="all">All Sections</option>
            {SECTION_OPTIONS.map((s) => (
              <option key={s} value={s}>Section {s}</option>
            ))}
          </select>

          <select
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.8rem' }}
          >
            <option value="all">All Statuses</option>
            <option value="present">Present Only</option>
            <option value="absent">Absent Only</option>
          </select>

          <input
            type="date"
            className="form-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.8rem' }}
            title="Filter by Specific Date"
          />

          {(branch !== 'all' || classYear !== 'all' || section !== 'all' || status !== 'all' || date || search) && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                setSearch('');
                setBranch('all');
                setClassYear('all');
                setSection('all');
                setStatus('all');
                setDate('');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Records Table */}
      <div className="glass-card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={18} style={{ color: 'var(--primary)' }} />
            <h3>Attendance Log ({records.length})</h3>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Filtering records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <History className="empty-state-icon" />
            <h4>No Records Found</h4>
            <p>No attendance entries matched the selected filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Branch & Year</th>
                  <th>Section</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Recorded At</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#ffffff' }}>
                        {r.rollNumber}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{r.studentName}</span>
                    </td>
                    <td>
                      {r.branch} - {r.classYear}
                    </td>
                    <td>Sec {r.section}</td>
                    <td>{r.date}</td>
                    <td>
                      <span className={`status-badge ${r.status}`}>
                        <span className={`status-dot ${r.status}`} />
                        {r.status === 'present' ? 'Present' : 'Absent'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {r.markedAt ? new Date(r.markedAt).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceHistory;
