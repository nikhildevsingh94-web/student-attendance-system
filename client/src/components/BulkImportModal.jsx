import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  Users,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText
} from 'lucide-react';
import { studentService } from '../services/api';
import { useToast } from './Toast';

const REQUIRED_COLUMNS = ['Name', 'Roll Number', 'Gmail', 'Branch', 'Class', 'Section', 'Password'];

const TEMPLATE_SAMPLE_ROWS = [
  {
    Name: 'Rahul Sharma',
    'Roll Number': 'CS001',
    Gmail: 'rahul@example.com',
    Branch: 'CSE',
    Class: '1st Year',
    Section: 'A',
    Password: 'Student@123'
  },
  {
    Name: 'Priya Verma',
    'Roll Number': 'CS002',
    Gmail: 'priya@example.com',
    Branch: 'CSE',
    Class: '1st Year',
    Section: 'A',
    Password: 'Student@456'
  },
  {
    Name: 'Ankit Singh',
    'Roll Number': 'IT003',
    Gmail: 'ankit@example.com',
    Branch: 'IT',
    Class: '2nd Year',
    Section: 'B',
    Password: 'Student@789'
  }
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function downloadExcelTemplate() {
  const ws = XLSX.utils.json_to_sheet(TEMPLATE_SAMPLE_ROWS, { header: REQUIRED_COLUMNS });
  ws['!cols'] = [
    { wch: 20 },
    { wch: 14 },
    { wch: 28 },
    { wch: 18 },
    { wch: 12 },
    { wch: 10 },
    { wch: 16 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students_Template');
  XLSX.writeFile(wb, 'student_registration_template.xlsx');
}

function getColValue(row, keys) {
  for (const k of keys) {
    for (const rk of Object.keys(row)) {
      if (rk.trim().toLowerCase() === k.toLowerCase()) {
        const val = row[rk];
        return val !== undefined && val !== null ? String(val).trim() : '';
      }
    }
  }
  return '';
}

function parseFileRows(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        if (!firstSheetName) {
          return reject(new Error('The spreadsheet has no sheets.'));
        }
        const ws = wb.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        resolve(rows);
      } catch (err) {
        reject(new Error('Could not parse spreadsheet file. Please check file format.'));
      }
    };
    reader.onerror = () => reject(new Error('File reading failed.'));
    reader.readAsArrayBuffer(file);
  });
}

const BulkImportModal = ({ isOpen, onClose, onSuccess }) => {
  const { addToast } = useToast();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [parseError, setParseError] = useState('');
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const resetState = () => {
    setSelectedFile(null);
    setPreviewRows([]);
    setParseError('');
    setParsing(false);
    setUploading(false);
    setUploadProgress(0);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (uploading) return;
    resetState();
    onClose();
  };

  const validateAndSetRows = (rawRows) => {
    if (!rawRows || rawRows.length === 0) {
      setParseError('The file contains no student data rows.');
      setPreviewRows([]);
      return;
    }

    const seenRolls = new Set();
    const seenEmails = new Set();

    const validated = rawRows.map((row, idx) => {
      const rowIndex = idx + 2; // header is row 1
      const name = getColValue(row, ['Name', 'Student Name', 'Full Name']);
      const rollNumber = getColValue(row, ['Roll Number', 'RollNumber', 'Roll No', 'roll_number']).toUpperCase();
      const email = getColValue(row, ['Gmail', 'Email', 'gmail', 'email']).toLowerCase();
      const branch = getColValue(row, ['Branch', 'Department', 'dept']);
      const classYear = getColValue(row, ['Class', 'classYear', 'class_year', 'Year', 'Year of Study']);
      const section = getColValue(row, ['Section', 'Sec']).toUpperCase();
      const password = getColValue(row, ['Password', 'Pass']);

      const errors = [];
      if (!name) errors.push('Missing Name');
      if (!rollNumber) errors.push('Missing Roll No');
      if (!email) errors.push('Missing Gmail');
      if (!branch) errors.push('Missing Branch');
      if (!classYear) errors.push('Missing Class/Year');
      if (!section) errors.push('Missing Section');
      if (!password) errors.push('Missing Password');

      if (email && !EMAIL_REGEX.test(email)) {
        errors.push('Invalid Gmail format');
      }
      if (password && password.length < 4) {
        errors.push('Password must be >= 4 chars');
      }

      if (rollNumber) {
        if (seenRolls.has(rollNumber)) {
          errors.push(`Duplicate Roll (${rollNumber}) in file`);
        } else {
          seenRolls.add(rollNumber);
        }
      }

      if (email) {
        if (seenEmails.has(email)) {
          errors.push(`Duplicate Gmail (${email}) in file`);
        } else {
          seenEmails.add(email);
        }
      }

      return {
        rowIndex,
        name,
        rollNumber,
        email,
        branch,
        classYear,
        section,
        password,
        isValid: errors.length === 0,
        errors
      };
    });

    setPreviewRows(validated);
    setParseError('');
  };

  const processFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setParseError('Unsupported format. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    setSelectedFile(file);
    setImportResult(null);
    setParsing(true);
    setParseError('');

    try {
      const rawRows = await parseFileRows(file);
      validateAndSetRows(rawRows);
    } catch (err) {
      setParseError(err.message || 'Failed to read file.');
      setPreviewRows([]);
    } finally {
      setParsing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleImportSubmit = async () => {
    if (!selectedFile) {
      addToast('Please select a spreadsheet file first.', 'warning');
      return;
    }

    const validCount = previewRows.filter((r) => r.isValid).length;
    if (validCount === 0) {
      addToast('Cannot import: none of the records passed validation.', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await studentService.bulkImportStudents(selectedFile, (pct) => {
        setUploadProgress(pct);
      });

      if (response.success) {
        setImportResult(response);
        addToast(
          `Successfully registered ${response.importedCount} student(s)!${
            response.skippedCount > 0 ? ` (${response.skippedCount} skipped due to issues)` : ''
          }`,
          'success'
        );
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      const errData = err.response?.data;
      if (errData && errData.errors) {
        setImportResult({
          success: false,
          message: errData.message || 'Import failed.',
          importedCount: 0,
          skippedCount: errData.errors.length,
          errors: errData.errors
        });
      } else {
        const msg = errData?.message || err.message || 'Failed to upload and import students.';
        addToast(msg, 'error');
        setParseError(msg);
      }
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const validRowsCount = previewRows.filter((r) => r.isValid).length;
  const invalidRowsCount = previewRows.filter((r) => !r.isValid).length;

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 17, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={handleClose}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0c1222',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(6, 182, 212, 0.25))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8',
                border: '1px solid rgba(99, 102, 241, 0.3)'
              }}
            >
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Bulk Add Students
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.15rem 0 0 0' }}>
                Quickly import multiple students using an Excel (.xlsx, .xls) or CSV (.csv) file
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={uploading}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              color: '#94a3b8',
              padding: '0.45rem',
              borderRadius: '8px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1 }}>
          {/* Action Row: Template Download & Column Guide */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem'
            }}
          >
            <button
              type="button"
              onClick={downloadExcelTemplate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#34d399',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Download size={15} />
              <span>Download Excel Template</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                padding: '0.55rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <Info size={14} style={{ color: '#06b6d4' }} />
              <span>{showGuide ? 'Hide Format Guide' : 'View Column Requirements'}</span>
              {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Format Guide Drawer */}
          {showGuide && (
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.25rem',
                fontSize: '0.82rem',
                color: '#cbd5e1',
                animation: 'fadeIn 0.2s ease-out'
              }}
            >
              <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Info size={15} />
                Required Template Headers & Guidelines:
              </div>
              <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0 0.6rem 0', lineHeight: 1.6 }}>
                <li><strong>Name</strong>: Full student name (e.g. <code>Rahul Sharma</code>)</li>
                <li><strong>Roll Number</strong>: Unique identifier (e.g. <code>CS001</code>). Duplicates are rejected.</li>
                <li><strong>Gmail</strong>: Registered email address (e.g. <code>rahul@example.com</code>). Must be valid email.</li>
                <li><strong>Branch</strong>: Department (e.g. <code>CSE</code>, <code>Computer Science</code>, <code>IT</code>)</li>
                <li><strong>Class</strong>: Year of study (e.g. <code>1st Year</code>, <code>2nd Year</code>, etc.)</li>
                <li><strong>Section</strong>: Section letter (e.g. <code>A</code>, <code>B</code>, <code>C</code>)</li>
                <li><strong>Password</strong>: Initial login password (minimum 4 characters, securely hashed with bcrypt upon import)</li>
              </ul>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                Note: Columns are case-insensitive. You can upload files containing 50, 100, 500, or more records (up to 1,000 per batch).
              </div>
            </div>
          )}

          {/* Import Result Feedback Card (if already imported) */}
          {importResult && (
            <div
              style={{
                marginBottom: '1.25rem',
                padding: '1.1rem',
                borderRadius: '10px',
                background: importResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${importResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                {importResult.success ? (
                  <CheckCircle2 size={20} style={{ color: '#34d399' }} />
                ) : (
                  <AlertCircle size={20} style={{ color: '#f87171' }} />
                )}
                <div style={{ fontWeight: 700, color: importResult.success ? '#34d399' : '#f87171', fontSize: '0.95rem' }}>
                  {importResult.message}
                </div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f87171', marginBottom: '0.35rem' }}>
                    Issues encountered ({importResult.errors.length} skipped):
                  </div>
                  <div style={{ maxHeight: '140px', overflowY: 'auto', background: 'rgba(0, 0, 0, 0.3)', padding: '0.5rem', borderRadius: '6px' }}>
                    {importResult.errors.map((err, i) => (
                      <div key={i} style={{ fontSize: '0.76rem', color: '#fca5a5', marginBottom: '0.25rem' }}>
                        • Row {err.row} ({err.name || 'Unnamed'}{err.rollNumber ? ` - ${err.rollNumber}` : ''}): {Array.isArray(err.errors) ? err.errors.join(', ') : err.error || 'Validation error'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* File Upload / Dropzone */}
          {!importResult && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? '#6366f1' : 'rgba(255, 255, 255, 0.18)'}`,
                backgroundColor: isDragging ? 'rgba(99, 102, 241, 0.08)' : 'rgba(15, 23, 42, 0.5)',
                borderRadius: '12px',
                padding: '1.75rem 1.25rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: '1.25rem'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem auto',
                  color: '#818cf8'
                }}
              >
                {parsing ? <Loader2 size={24} className="spinner" /> : <Upload size={24} />}
              </div>
              <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.95rem' }}>
                {selectedFile ? selectedFile.name : 'Click to browse or drag & drop spreadsheet here'}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB — Click to choose a different file`
                  : 'Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv)'}
              </div>
            </div>
          )}

          {/* Parse error alert */}
          {parseError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem'
              }}
            >
              <AlertTriangle size={16} />
              <span>{parseError}</span>
            </div>
          )}

          {/* Preview Roster Table */}
          {previewRows.length > 0 && !importResult && (
            <div>
              {/* Summary status chips */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={16} style={{ color: '#818cf8' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                    File Preview ({previewRows.length} records detected)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      fontWeight: 600
                    }}
                  >
                    ✓ {validRowsCount} Valid
                  </span>
                  {invalidRowsCount > 0 && (
                    <span
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 600
                      }}
                    >
                      ⚠ {invalidRowsCount} Invalid
                    </span>
                  )}
                </div>
              </div>

              {/* Table Container */}
              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  background: 'rgba(10, 15, 29, 0.6)'
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <th style={{ padding: '0.5rem 0.75rem' }}>#</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Status</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Name</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Roll No</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Gmail</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Branch</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Class</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Sec</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Notes / Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          background: r.isValid ? 'transparent' : 'rgba(239, 68, 68, 0.06)'
                        }}
                      >
                        <td style={{ padding: '0.45rem 0.75rem', color: '#64748b' }}>{r.rowIndex}</td>
                        <td style={{ padding: '0.45rem 0.75rem' }}>
                          {r.isValid ? (
                            <span style={{ color: '#34d399', fontWeight: 600 }}>Ready</span>
                          ) : (
                            <span style={{ color: '#f87171', fontWeight: 600 }}>Issue</span>
                          )}
                        </td>
                        <td style={{ padding: '0.45rem 0.75rem', color: '#f8fafc', fontWeight: 500 }}>
                          {r.name || <span style={{ color: '#ef4444' }}>(missing)</span>}
                        </td>
                        <td style={{ padding: '0.45rem 0.75rem', color: '#38bdf8' }}>
                          {r.rollNumber || <span style={{ color: '#ef4444' }}>(missing)</span>}
                        </td>
                        <td style={{ padding: '0.45rem 0.75rem', color: '#cbd5e1' }}>
                          {r.email || <span style={{ color: '#ef4444' }}>(missing)</span>}
                        </td>
                        <td style={{ padding: '0.45rem 0.75rem', color: '#94a3b8' }}>{r.branch || '—'}</td>
                        <td style={{ padding: '0.45rem 0.75rem', color: '#94a3b8' }}>{r.classYear || '—'}</td>
                        <td style={{ padding: '0.45rem 0.75rem', color: '#94a3b8' }}>{r.section || '—'}</td>
                        <td style={{ padding: '0.45rem 0.75rem', color: r.isValid ? '#10b981' : '#f87171', fontSize: '0.74rem' }}>
                          {r.isValid ? 'Valid' : r.errors.join('; ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upload Progress Bar */}
          {uploading && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                <span>Uploading and hashing passwords...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${uploadProgress}%`,
                    background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                    transition: 'width 0.2s'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1.1rem 1.75rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            background: 'rgba(10, 15, 29, 0.6)'
          }}
        >
          {importResult ? (
            <>
              <button
                type="button"
                onClick={resetState}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#e2e8f0',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Import Another File
              </button>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  padding: '0.6rem 1.4rem',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={uploading}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#e2e8f0',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: uploading ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={!selectedFile || validRowsCount === 0 || uploading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.4rem',
                  borderRadius: '8px',
                  background:
                    !selectedFile || validRowsCount === 0 || uploading
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                  border: 'none',
                  color: !selectedFile || validRowsCount === 0 || uploading ? '#64748b' : '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: !selectedFile || validRowsCount === 0 || uploading ? 'not-allowed' : 'pointer'
                }}
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>
                      Import {validRowsCount > 0 ? `${validRowsCount} Students` : 'Students'}
                    </span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;