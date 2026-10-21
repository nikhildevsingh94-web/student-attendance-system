import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import XLSX from 'xlsx';
import { readData, mutateData } from '../utils/jsonStorage.js';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @route   GET /api/students
 * @desc    Get all students with optional search & filters
 * @access  Private (Admin only)
 */
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { search, branch, classYear, section } = req.query;
    const data = await readData();
    let students = [...data.students];

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      students = students.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      );
    }

    if (branch && branch !== 'all') {
      students = students.filter(s => s.branch.toLowerCase() === branch.toLowerCase());
    }

    if (classYear && classYear !== 'all') {
      students = students.filter(s => s.classYear.toLowerCase() === classYear.toLowerCase());
    }

    if (section && section !== 'all') {
      students = students.filter(s => s.section.toLowerCase() === section.toLowerCase());
    }

    // Sort students by Roll Number / Name
    students.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }));

    // Strip passwords before returning
    const safeStudents = students.map(({ password, ...rest }) => rest);

    return res.status(200).json({
      success: true,
      count: safeStudents.length,
      students: safeStudents
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving students.'
    });
  }
});

/**
 * @route   POST /api/students
 * @desc    Create a new student
 * @access  Private (Admin only)
 */
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, rollNumber, email, branch, classYear, section, password } = req.body;

    // Validate required fields
    if (!name || !rollNumber || !email || !branch || !classYear || !section || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required (Name, Roll Number, Gmail, Branch, Class/Year, Section, Password).'
      });
    }

    const cleanName = name.trim();
    const cleanRollNumber = rollNumber.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanBranch = branch.trim();
    const cleanClassYear = classYear.trim();
    const cleanSection = section.trim().toUpperCase();

    // Validate email format
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 4 characters long.'
      });
    }

    const currentData = await readData();

    // Check duplicate roll number
    const duplicateRoll = currentData.students.find(
      s => s.rollNumber.toUpperCase() === cleanRollNumber
    );
    if (duplicateRoll) {
      return res.status(409).json({
        success: false,
        message: `Roll Number "${cleanRollNumber}" is already registered for ${duplicateRoll.name}.`
      });
    }

    // Check duplicate email
    const duplicateEmail = currentData.students.find(
      s => s.email.toLowerCase() === cleanEmail
    );
    if (duplicateEmail) {
      return res.status(409).json({
        success: false,
        message: `Email "${cleanEmail}" is already registered.`
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newStudent = {
      id: uuidv4(),
      name: cleanName,
      rollNumber: cleanRollNumber,
      email: cleanEmail,
      branch: cleanBranch,
      classYear: cleanClassYear,
      section: cleanSection,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    await mutateData(data => {
      data.students.push(newStudent);
      return data;
    });

    const { password: _, ...studentResponse } = newStudent;

    return res.status(201).json({
      success: true,
      message: `Student ${cleanName} (${cleanRollNumber}) registered successfully.`,
      student: studentResponse
    });
  } catch (error) {
    console.error('Error adding student:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating student record.'
    });
  }
});

/**
 * @route   DELETE /api/students/:id
 * @desc    Delete student and clean up associated attendance records
 * @access  Private (Admin only)
 */
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const studentId = req.params.id;
    const currentData = await readData();

    const studentIndex = currentData.students.findIndex(s => s.id === studentId);
    if (studentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found.'
      });
    }

    const studentName = currentData.students[studentIndex].name;
    const rollNumber = currentData.students[studentIndex].rollNumber;

    let removedAttendanceCount = 0;

    await mutateData(data => {
      // Remove the student
      data.students = data.students.filter(s => s.id !== studentId);

      // Clean up related attendance records for this student
      const initialAttendanceCount = data.attendance.length;
      data.attendance = data.attendance.filter(a => a.studentId !== studentId);
      removedAttendanceCount = initialAttendanceCount - data.attendance.length;

      return data;
    });

    return res.status(200).json({
      success: true,
      message: `Student ${studentName} (${rollNumber}) and ${removedAttendanceCount} related attendance record(s) deleted successfully.`
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting student.'
    });
  }
});


// ─── Multer: memory storage (no disk writes) ───────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv'
    ];
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (allowed.includes(file.mimetype) || ['xlsx', 'xls', 'csv'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx, .xls, and .csv files are allowed.'));
    }
  }
});

/**
 * @route   POST /api/students/bulk-import
 * @desc    Bulk import students from Excel / CSV file
 * @access  Private (Admin only)
 */
router.post('/bulk-import', verifyToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    // Parse workbook from uploaded buffer
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ success: false, message: 'The uploaded file is empty or has no data rows.' });
    }

    if (rawRows.length > 1000) {
      return res.status(400).json({ success: false, message: 'File exceeds the 1000-row limit per import.' });
    }

    const currentData = await readData();
    const existingRollNumbers = new Set(currentData.students.map(s => s.rollNumber.toUpperCase()));
    const existingEmails    = new Set(currentData.students.map(s => s.email.toLowerCase()));

    // Track duplicates within the uploaded file
    const seenRollNumbers = new Set();
    const seenEmails      = new Set();

    const errors   = [];
    const toInsert = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row      = rawRows[i];
      const rowIndex = i + 2; // Row 1 = header, so data starts at row 2

      // Normalize column names (trim & case-insensitive)
      const get = (keys) => {
        for (const k of keys) {
          for (const rk of Object.keys(row)) {
            if (rk.trim().toLowerCase() === k.toLowerCase()) return String(row[rk]).trim();
          }
        }
        return '';
      };

      const name       = get(['Name', 'name', 'Student Name', 'Full Name']);
      const rollNumber = get(['Roll Number', 'RollNumber', 'Roll No', 'roll_number']).toUpperCase();
      const email      = get(['Gmail', 'Email', 'email', 'gmail']).toLowerCase();
      const branch     = get(['Branch', 'branch']);
      const classYear  = get(['Class', 'classYear', 'class_year', 'Year', 'class']);
      const section    = get(['Section', 'section']).toUpperCase();
      const password   = get(['Password', 'password']);

      const rowErrors = [];

      // Required field checks
      if (!name)       rowErrors.push('Name is required');
      if (!rollNumber) rowErrors.push('Roll Number is required');
      if (!email)      rowErrors.push('Gmail/Email is required');
      if (!branch)     rowErrors.push('Branch is required');
      if (!classYear)  rowErrors.push('Class/Year is required');
      if (!section)    rowErrors.push('Section is required');
      if (!password)   rowErrors.push('Password is required');

      if (rowErrors.length === 0) {
        // Email format validation
        if (!EMAIL_REGEX.test(email)) {
          rowErrors.push(`Invalid email format: "${email}"`);
        }

        // Password length
        if (password.length < 4) {
          rowErrors.push('Password must be at least 4 characters');
        }

        // Within-file duplicates
        if (seenRollNumbers.has(rollNumber)) {
          rowErrors.push(`Duplicate Roll Number within file: "${rollNumber}"`);
        }
        if (seenEmails.has(email)) {
          rowErrors.push(`Duplicate Gmail within file: "${email}"`);
        }

        // Conflict with existing DB records
        if (existingRollNumbers.has(rollNumber)) {
          rowErrors.push(`Roll Number "${rollNumber}" already exists in the system`);
        }
        if (existingEmails.has(email)) {
          rowErrors.push(`Email "${email}" already exists in the system`);
        }
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowIndex, name: name || '(unknown)', rollNumber, errors: rowErrors });
      } else {
        seenRollNumbers.add(rollNumber);
        seenEmails.add(email);
        toInsert.push({ name, rollNumber, email, branch, classYear, section, password });
      }
    }

    // If there are any errors, return without inserting
    if (errors.length > 0 && toInsert.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All rows failed validation. No records were imported.',
        errors
      });
    }

    // Hash passwords and build new student objects
    const newStudents = await Promise.all(
      toInsert.map(async (s) => ({
        id: uuidv4(),
        name: s.name,
        rollNumber: s.rollNumber,
        email: s.email,
        branch: s.branch,
        classYear: s.classYear,
        section: s.section,
        password: await bcrypt.hash(s.password, 10),
        createdAt: new Date().toISOString()
      }))
    );

    // Persist to data.json
    await mutateData(data => {
      data.students.push(...newStudents);
      return data;
    });

    return res.status(201).json({
      success: true,
      message: `Successfully imported ${newStudents.length} student(s).${errors.length > 0 ? ` ${errors.length} row(s) were skipped due to errors.` : ''}`,
      importedCount: newStudents.length,
      skippedCount: errors.length,
      errors
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during bulk import.'
    });
  }
});

export default router;

