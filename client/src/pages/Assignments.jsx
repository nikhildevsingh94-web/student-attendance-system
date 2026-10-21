import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Calendar,
  AlertCircle,
  FileCode,
  FileCheck,
  GraduationCap,
  Layers,
  X,
  FilePlus,
  AlertTriangle
} from 'lucide-react';
import { assignmentService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

const BRANCH_OPTIONS = ['Computer Science', 'Information Technology', 'Electronics & Comm', 'Mechanical', 'Civil', 'Electrical'];
const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const SECTION_OPTIONS = ['A', 'B', 'C', 'D'];

const Assignments = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { addToast } = useToast();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin Upload Form State
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [branch, setBranch] = useState('Computer Science');
  const [classYear, setClassYear] = useState('1st Year');
  const [section, setSection] = useState('A');
  const [dueDate, setDueDate] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Delete Modal State
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Downloading state
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await assignmentService.getAssignments();
      if (res.success) {
        setAssignments(res.assignments);
      }
    } catch (err) {
      console.error('Error fetching assignments:', err);
      addToast('Failed to load assignments.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedExt = ['pdf', 'jpg', 'jpeg', 'png'];
      const ext = file.name.split('.').pop().toLowerCase();
      if (!allowedExt.includes(ext)) {
        addToast('Invalid file format. Only PDF, JPG, JPEG, and PNG allowed.', 'error');
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
      // 15MB limit
      if (file.size > 15 * 1024 * 1024) {
        addToast('File size must be under 15MB.', 'error');
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || !dueDate || !selectedFile) {
      addToast('Please fill all fields and attach a file.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('branch', branch);
    formData.append('classYear', classYear);
    formData.append('section', section);
    formData.append('dueDate', dueDate);
    formData.append('file', selectedFile);

    setUploading(true);
    setUploadProgress(0);

    try {
      const res = await assignmentService.uploadAssignment(formData, (progress) => {
        setUploadProgress(progress);
      });

      if (res.success) {
        addToast(res.message, 'success');
        setTitle('');
        setDescription('');
        setDueDate('');
        setSelectedFile(null);
        setShowUploadForm(false);
        fetchAssignments();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error uploading assignment.';
      addToast(msg, 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = async (assignment) => {
    setDownloadingId(assignment.id);
    try {
      await assignmentService.downloadAssignment(assignment.id, assignment.originalName);
      addToast(`Downloaded ${assignment.title}`, 'success');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Download failed.';
      addToast(msg, 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const confirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    setDeleting(true);
    try {
      const res = await assignmentService.deleteAssignment(assignmentToDelete.id);
      if (res.success) {
        addToast(res.message, 'success');
        setAssignmentToDelete(null);
        fetchAssignments();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete assignment.';
      addToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {isAdmin ? 'Course Assignments' : 'My Class Assignments'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            {isAdmin
              ? 'Upload, publish, and manage coursework materials by branch and class'
              : `Assignments assigned to your branch (${user?.branch}) - ${user?.classYear} Sec ${user?.section}`}
          </p>
        </div>

        {isAdmin && (
          <button
            className={`btn ${showUploadForm ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => setShowUploadForm(!showUploadForm)}
          >
            {showUploadForm ? <X size={17} /> : <FilePlus size={17} />}
            <span>{showUploadForm ? 'Close Form' : 'Upload Assignment'}</span>
          </button>
        )}
      </div>

      {/* Admin Upload Form */}
      {isAdmin && showUploadForm && (
        <div className="glass-card" style={{ marginBottom: '2rem', animation: 'fadeIn 0.25s ease-out' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={20} style={{ color: 'var(--primary)' }} />
              <h2>Publish Course Assignment</h2>
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setShowUploadForm(false)}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleUploadSubmit}>
            <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Assignment Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Data Structures & Algorithms - Problem Set 3"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Academic Branch *</label>
                <select
                  className="form-select"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  required
                >
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Class / Year *</label>
                <select
                  className="form-select"
                  value={classYear}
                  onChange={(e) => setClassYear(e.target.value)}
                  required
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Section *</label>
                <select
                  className="form-select"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  required
                >
                  {SECTION_OPTIONS.map((s) => (
                    <option key={s} value={s}>Section {s}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Submission Due Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Assignment Description & Instructions *</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Provide instructions, rubric, and submission requirements..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Attachment File (PDF, PNG, JPG, JPEG) *</label>
                <input
                  type="file"
                  className="form-input"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Maximum file size: 15MB.
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            {uploading && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                  <span>Uploading file...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '999px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${uploadProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #6366f1, #10b981)',
                    transition: 'width 0.2s ease-out'
                  }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowUploadForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <div className="spinner" />
                    <span>Publishing Assignment...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>Publish Assignment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assignments List */}
      <div className="glass-card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} style={{ color: 'var(--primary)' }} />
            <h3>Available Assignments ({assignments.length})</h3>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading course assignments...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="empty-state">
            <FileText className="empty-state-icon" />
            <h4>No Assignments Posted</h4>
            <p>
              {isAdmin
                ? 'No coursework assignments have been uploaded yet. Click "Upload Assignment" to create one.'
                : 'Great job! There are currently no active assignments assigned to your class.'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem'
          }}>
            {assignments.map((assignment) => {
              const isPdf = assignment.filename?.toLowerCase().endsWith('.pdf');
              return (
                <div
                  key={assignment.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  <div>
                    {/* Header Chips */}
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      marginBottom: '0.75rem'
                    }}>
                      <span style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: isPdf ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: isPdf ? '#f87171' : '#60a5fa',
                        border: `1px solid ${isPdf ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                      }}>
                        {isPdf ? 'PDF Document' : 'Image File'}
                      </span>

                      <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)'
                      }}>
                        Sec {assignment.section} • {assignment.classYear}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                      {assignment.title}
                    </h4>

                    <p style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      marginBottom: '1rem',
                      whiteSpace: 'pre-line'
                    }}>
                      {assignment.description}
                    </p>

                    <div style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      color: 'var(--text-secondary)'
                    }}>
                      <div>
                        <strong>Branch:</strong> {assignment.branch}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b' }}>
                        <Calendar size={13} />
                        <strong>Due Date:</strong> {assignment.dueDate}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        Uploaded: {new Date(assignment.uploadedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    gap: '0.5rem'
                  }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleDownload(assignment)}
                      disabled={downloadingId === assignment.id}
                      style={{ flex: 1 }}
                    >
                      {downloadingId === assignment.id ? (
                        <>
                          <div className="spinner" />
                          <span>Downloading...</span>
                        </>
                      ) : (
                        <>
                          <Download size={14} />
                          <span>Download File</span>
                        </>
                      )}
                    </button>

                    {isAdmin && (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        onClick={() => setAssignmentToDelete(assignment)}
                        title="Delete Assignment"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin Delete Confirmation Modal */}
      <Modal
        isOpen={!!assignmentToDelete}
        onClose={() => !deleting && setAssignmentToDelete(null)}
        title="Confirm Assignment Deletion"
        actions={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setAssignmentToDelete(null)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={confirmDeleteAssignment}
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
              Delete "{assignmentToDelete?.title}"?
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
              This will permanently delete the assignment record and remove the uploaded file from the server storage. Students will no longer be able to access this coursework.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Assignments;
