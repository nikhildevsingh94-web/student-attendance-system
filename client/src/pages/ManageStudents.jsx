import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Users,
  Search,
  Filter,
  Trash2,
  AlertTriangle,
  Mail,
  GraduationCap,
  Hash,
  Lock,
  Layers,
  Calendar,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { studentService } from '../services/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import BulkImportModal from '../components/BulkImportModal';

const BRANCH_OPTIONS = ['Computer Science', 'Information Technology', 'Electronics & Comm', 'Mechanical', 'Civil', 'Electrical'];
const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const SECTION_OPTIONS = ['A', 'B', 'C', 'D'];

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    email: '',
    branch: 'Computer Science',
    classYear: '1st Year',
    section: 'A',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterSection, setFilterSection] = useState('all');

  // Delete Modal State
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { addToast } = useToast();

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await studentService.getStudents({
        search: searchQuery,
        branch: filterBranch,
        classYear: filterYear,
        section: filterSection
      });
      if (data.success) {
        setStudents(data.students);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      addToast('Failed to load students list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [filterBranch, filterYear, filterSection]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'rollNumber' ? value.toUpperCase() : value
    }));
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();

    // Frontend validations
    if (!formData.name.trim() || !formData.rollNumber.trim() || !formData.email.trim() || !formData.password) {
      addToast('Please fill in all required fields.', 'error');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      addToast('Please enter a valid Gmail / Email address.', 'error');
      return;
    }

    if (formData.password.length < 4) {
      addToast('Password must be at least 4 characters long.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await studentService.createStudent(formData);
      if (res.success) {
        addToast(res.message, 'success');
        // Reset form & close
        setFormData({
          name: '',
          rollNumber: '',
          email: '',
          branch: 'Computer Science',
          classYear: '1st Year',
          section: 'A',
          password: ''
        });
        setShowAddForm(false);
        fetchStudents();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error creating student.';
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    setDeleting(true);
    try {
      const res = await studentService.deleteStudent(studentToDelete.id);
      if (res.success) {
        addToast(res.message, 'success');
        setStudentToDelete(null);
        fetchStudents();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error deleting student.';
      addToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-content">
      {/* Page Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Manage Students</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Register new students, update rosters, and manage enrollment directory
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowBulkModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FileSpreadsheet size={17} style={{ color: 'var(--info)' }} />
            <span>Bulk Add Students</span>
          </button>

          <button
            className={`btn ${showAddForm ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? <X size={17} /> : <UserPlus size={17} />}
            <span>{showAddForm ? 'Close Form' : 'Register New Student'}</span>
          </button>
        </div>
      </div>

      {/* Add Student Form Card */}
      {showAddForm && (
        <div className="glass-card" style={{ marginBottom: '2rem', animation: 'fadeIn 0.25s ease-out' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={20} style={{ color: 'var(--primary)' }} />
              <h2>Enroll New Student</h2>
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleAddStudent}>
            <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">
                  <Users size={14} /> Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  placeholder="e.g. Priya Sharma"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Hash size={14} /> Roll Number *
                </label>
                <input
                  type="text"
                  name="rollNumber"
                  className="form-input"
                  placeholder="e.g. CS2026-042"
                  value={formData.rollNumber}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Mail size={14} /> Registered Gmail Address *
                </label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="e.g. priya.sharma@gmail.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <GraduationCap size={14} /> Academic Branch *
                </label>
                <select
                  name="branch"
                  className="form-select"
                  value={formData.branch}
                  onChange={handleInputChange}
                  required
                >
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Calendar size={14} /> Class / Year *
                </label>
                <select
                  name="classYear"
                  className="form-select"
                  value={formData.classYear}
                  onChange={handleInputChange}
                  required
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Layers size={14} /> Section *
                </label>
                <select
                  name="section"
                  className="form-select"
                  value={formData.section}
                  onChange={handleInputChange}
                  required
                >
                  {SECTION_OPTIONS.map((s) => (
                    <option key={s} value={s}>Section {s}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Lock size={14} /> Initial Login Password *
                </label>
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  placeholder="Enter initial student password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="spinner" />
                    <span>Registering Student...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Save Student Record</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit} className="filter-input-search" style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, roll no, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.8rem' }}
          >
            <option value="all">All Branches</option>
            {BRANCH_OPTIONS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            className="form-select"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.8rem' }}
          >
            <option value="all">All Years</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            className="form-select"
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.8rem' }}
          >
            <option value="all">All Sections</option>
            {SECTION_OPTIONS.map((s) => (
              <option key={s} value={s}>Section {s}</option>
            ))}
          </select>

          {(filterBranch !== 'all' || filterYear !== 'all' || filterSection !== 'all' || searchQuery) && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                setSearchQuery('');
                setFilterBranch('all');
                setFilterYear('all');
                setFilterSection('all');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Students Roster Table */}
      <div className="glass-card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} style={{ color: 'var(--primary)' }} />
            <h3>Registered Students ({students.length})</h3>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowBulkModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <FileSpreadsheet size={15} style={{ color: 'var(--info)' }} />
            <span>Bulk Add Students</span>
          </button>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading student directory...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <Users className="empty-state-icon" />
            <h4>No Students Found</h4>
            <p>
              {searchQuery || filterBranch !== 'all'
                ? 'No students match your filter criteria.'
                : 'No students registered in the database yet. Click "Register New Student" to get started.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Student Name</th>
                  <th>Gmail Address</th>
                  <th>Branch</th>
                  <th>Class / Year</th>
                  <th>Section</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#ffffff' }}>
                        {student.rollNumber}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          color: '#ffffff'
                        }}>
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{student.name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                        <Mail size={13} />
                        <span>{student.email}</span>
                      </div>
                    </td>
                    <td>{student.branch}</td>
                    <td>{student.classYear}</td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.06)',
                        fontWeight: 600
                      }}>
                        Sec {student.section}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        onClick={() => setStudentToDelete(student)}
                        title="Delete Student"
                      >
                        <Trash2 size={15} />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!studentToDelete}
        onClose={() => !deleting && setStudentToDelete(null)}
        title="Confirm Student Deletion"
        actions={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setStudentToDelete(null)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={confirmDeleteStudent}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <div className="spinner" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Confirm Delete</span>
                </>
              )}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)'
          }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p style={{ color: '#ffffff', fontWeight: 600, marginBottom: '0.5rem' }}>
              Are you sure you want to delete {studentToDelete?.name} ({studentToDelete?.rollNumber})?
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
              This action will permanently delete the student account from the system along with all of their recorded attendance records. This operation cannot be undone.
            </p>
          </div>
        </div>
      </Modal>

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSuccess={() => fetchStudents()}
      />
    </div>
  );
};

export default ManageStudents;
