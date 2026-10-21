import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Users,
  Calendar,
  Layers,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Save,
  AlertCircle,
  Info
} from 'lucide-react';
import { attendanceService } from '../services/api';
import { useToast } from '../components/Toast';

const BRANCH_OPTIONS = ['Computer Science', 'Information Technology', 'Electronics & Comm', 'Mechanical', 'Civil', 'Electrical'];
const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const SECTION_OPTIONS = ['A', 'B', 'C', 'D'];

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const MarkAttendance = () => {
  const [selectedBranch, setSelectedBranch] = useState('Computer Science');
  const [selectedYear, setSelectedYear] = useState('1st Year');
  const [selectedSection, setSelectedSection] = useState('A');
  const [attendanceDate, setAttendanceDate] = useState(getTodayString());

  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // { [studentId]: 'present' | 'absent' }
  const [isAlreadyMarked, setIsAlreadyMarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { addToast } = useToast();

  const loadBatchStudents = async () => {
    setLoading(true);
    try {
      const res = await attendanceService.getBatchStudents({
        branch: selectedBranch,
        classYear: selectedYear,
        section: selectedSection,
        date: attendanceDate
      });

      if (res.success) {
        setStudents(res.students);
        setIsAlreadyMarked(res.isAlreadyMarked);

        // Prepopulate attendanceMap: if previously marked, keep status; otherwise default to present or unassigned
        const initialMap = {};
        res.students.forEach((s) => {
          initialMap[s.id] = s.attendanceStatus || 'present';
        });
        setAttendanceMap(initialMap);
      }
    } catch (err) {
      console.error('Error loading batch:', err);
      addToast('Failed to load students for selected batch.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatchStudents();
  }, [selectedBranch, selectedYear, selectedSection, attendanceDate]);

  const handleStatusChange = (studentId, status) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status
    }));
  };

  const markAll = (status) => {
    const updated = {};
    students.forEach((s) => {
      updated[s.id] = status;
    });
    setAttendanceMap(updated);
    addToast(`Marked all students as ${status}.`, 'info');
  };

  const handleSaveAttendance = async () => {
    if (students.length === 0) {
      addToast('No students to mark in this batch.', 'error');
      return;
    }

    const records = students.map((s) => ({
      studentId: s.id,
      status: attendanceMap[s.id] || 'present'
    }));

    setSaving(true);
    try {
      const res = await attendanceService.markAttendance({
        branch: selectedBranch,
        classYear: selectedYear,
        section: selectedSection,
        date: attendanceDate,
        records
      });

      if (res.success) {
        addToast(res.message, 'success');
        setIsAlreadyMarked(true);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save attendance.';
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Live Counts
  const totalCount = students.length;
  const presentCount = students.filter((s) => attendanceMap[s.id] === 'present').length;
  const absentCount = students.filter((s) => attendanceMap[s.id] === 'absent').length;

  return (
    <div className="page-content">
      {/* Top Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Mark Daily Attendance</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Select academic class, section, and date to record or update attendance
        </p>
      </div>

      {/* Class & Date Selector Card */}
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} style={{ color: 'var(--primary)' }} />
            <h3>Class & Session Parameters</h3>
          </div>
          {isAlreadyMarked && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.75rem',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: 600,
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              <Info size={14} />
              <span>Previously Saved Record (Editing Mode)</span>
            </span>
          )}
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">
              <GraduationCap size={14} /> Academic Branch
            </label>
            <select
              className="form-select"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              {BRANCH_OPTIONS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              <Layers size={14} /> Class / Year
            </label>
            <select
              className="form-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              <Users size={14} /> Section
            </label>
            <select
              className="form-select"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
            >
              {SECTION_OPTIONS.map((s) => (
                <option key={s} value={s}>Section {s}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              <Calendar size={14} /> Attendance Date
            </label>
            <input
              type="date"
              className="form-input"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              max={getTodayString()}
            />
          </div>
        </div>
      </div>

      {/* Main Marking Area */}
      <div className="glass-card">
        {/* Actions & Metrics Bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '1.25rem'
        }}>
          {/* Summary Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center' }}>
            <span style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              Total: {totalCount} Students
            </span>

            <span style={{
              background: 'var(--success-bg)',
              color: '#34d399',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: '1px solid var(--success-border)'
            }}>
              Present: {presentCount}
            </span>

            <span style={{
              background: 'var(--danger-bg)',
              color: '#f87171',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: '1px solid var(--danger-border)'
            }}>
              Absent: {absentCount}
            </span>
          </div>

          {/* Quick Mark All Buttons */}
          {students.length > 0 && (
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => markAll('present')}
                style={{ color: '#34d399', borderColor: 'var(--success-border)' }}
              >
                <CheckCircle2 size={15} />
                <span>Mark All Present</span>
              </button>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => markAll('absent')}
                style={{ color: '#f87171', borderColor: 'var(--danger-border)' }}
              >
                <XCircle size={15} />
                <span>Mark All Absent</span>
              </button>
            </div>
          )}
        </div>

        {/* Students List */}
        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading class roster...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <Users className="empty-state-icon" />
            <h4>No Students Found for this Batch</h4>
            <p>
              There are currently no students registered in {selectedBranch}, {selectedYear}, Section {selectedSection}.
            </p>
          </div>
        ) : (
          <>
            <div className="table-responsive" style={{ marginBottom: '2rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Index</th>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th>Gmail Address</th>
                    <th style={{ textAlign: 'center', width: '260px' }}>Attendance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => {
                    const currentStatus = attendanceMap[student.id] || 'present';
                    return (
                      <tr key={student.id}>
                        <td style={{ color: 'var(--text-muted)' }}>#{idx + 1}</td>
                        <td>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#ffffff' }}>
                            {student.rollNumber}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{student.name}</span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{student.email}</td>
                        <td>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            background: 'rgba(15, 23, 42, 0.7)',
                            padding: '0.25rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-subtle)'
                          }}>
                            {/* Present Toggle Button */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, 'present')}
                              style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.35rem',
                                padding: '0.45rem 0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                transition: 'var(--transition-smooth)',
                                background: currentStatus === 'present' ? 'var(--success)' : 'transparent',
                                color: currentStatus === 'present' ? '#ffffff' : 'var(--text-secondary)'
                              }}
                            >
                              <CheckCircle2 size={15} />
                              <span>Present</span>
                            </button>

                            {/* Absent Toggle Button */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, 'absent')}
                              style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.35rem',
                                padding: '0.45rem 0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                transition: 'var(--transition-smooth)',
                                background: currentStatus === 'absent' ? 'var(--danger)' : 'transparent',
                                color: currentStatus === 'absent' ? '#ffffff' : 'var(--text-secondary)'
                              }}
                            >
                              <XCircle size={15} />
                              <span>Absent</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Save Bar */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border-subtle)'
            }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                Ready to commit attendance for <strong style={{ color: '#ffffff' }}>{selectedBranch} ({selectedYear} Sec {selectedSection})</strong> on <strong style={{ color: '#ffffff' }}>{attendanceDate}</strong>.
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveAttendance}
                disabled={saving || students.length === 0}
                style={{ padding: '0.75rem 1.75rem' }}
              >
                {saving ? (
                  <>
                    <div className="spinner" />
                    <span>Saving Attendance...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Save Batch Attendance</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MarkAttendance;
