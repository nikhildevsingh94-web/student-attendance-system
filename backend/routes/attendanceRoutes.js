import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readData, mutateData } from '../utils/jsonStorage.js';
import { verifyToken, requireAdmin, requireStudent } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper to get local date in YYYY-MM-DD format
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * @route   GET /api/attendance/stats/overview
 * @desc    Get dashboard overview stats for Admin
 * @access  Private (Admin only)
 */
router.get('/stats/overview', verifyToken, requireAdmin, async (req, res) => {
  try {
    const data = await readData();
    const today = getTodayString();

    const totalStudents = data.students.length;

    // Filter attendance for today
    const todayRecords = data.attendance.filter(a => a.date === today);
    const presentToday = todayRecords.filter(a => a.status === 'present').length;
    const absentToday = todayRecords.filter(a => a.status === 'absent').length;
    const totalTodayMarked = presentToday + absentToday;
    const todayPercentage = totalTodayMarked > 0
      ? Math.round((presentToday / totalTodayMarked) * 100 * 10) / 10
      : 0;

    // Recent activity: last 10 records with student info
    const sortedAttendance = [...data.attendance].sort((a, b) => {
      const timeA = new Date(b.updatedAt || b.markedAt || b.date).getTime();
      const timeB = new Date(a.updatedAt || a.markedAt || a.date).getTime();
      return timeA - timeB;
    });

    const studentMap = new Map(data.students.map(s => [s.id, s]));

    const recentActivity = sortedAttendance.slice(0, 10).map(rec => {
      const student = studentMap.get(rec.studentId);
      return {
        id: rec.id,
        date: rec.date,
        status: rec.status,
        markedAt: rec.updatedAt || rec.markedAt,
        studentName: student ? student.name : 'Unknown Student',
        rollNumber: student ? student.rollNumber : 'N/A',
        branch: student ? student.branch : rec.branch,
        classYear: student ? student.classYear : rec.classYear,
        section: student ? student.section : rec.section
      };
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        presentToday,
        absentToday,
        totalTodayMarked,
        todayPercentage,
        todayDate: today
      },
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching attendance overview:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving statistics.' });
  }
});

/**
 * @route   GET /api/attendance/by-batch
 * @desc    Get students for branch/class/section and their status for a specific date
 * @access  Private (Admin only)
 */
router.get('/by-batch', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { branch, classYear, section, date } = req.query;

    if (!branch || !classYear || !section || !date) {
      return res.status(400).json({
        success: false,
        message: 'Branch, classYear, section, and date parameters are required.'
      });
    }

    const data = await readData();

    // Filter students matching branch, class, section
    const matchingStudents = data.students.filter(s =>
      s.branch.toLowerCase() === branch.toLowerCase() &&
      s.classYear.toLowerCase() === classYear.toLowerCase() &&
      s.section.toLowerCase() === section.toLowerCase()
    );

    matchingStudents.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }));

    // Find attendance records for this date and batch
    const dateRecords = data.attendance.filter(a => a.date === date);
    const attendanceMap = new Map(dateRecords.map(r => [r.studentId, r]));

    const studentsWithStatus = matchingStudents.map(student => {
      const record = attendanceMap.get(student.id);
      return {
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
        email: student.email,
        branch: student.branch,
        classYear: student.classYear,
        section: student.section,
        attendanceStatus: record ? record.status : null,
        recordId: record ? record.id : null
      };
    });

    return res.status(200).json({
      success: true,
      count: studentsWithStatus.length,
      date,
      branch,
      classYear,
      section,
      isAlreadyMarked: studentsWithStatus.some(s => s.attendanceStatus !== null),
      students: studentsWithStatus
    });
  } catch (error) {
    console.error('Error fetching batch attendance:', error);
    return res.status(500).json({ success: false, message: 'Server error loading batch data.' });
  }
});

/**
 * @route   POST /api/attendance/mark
 * @desc    Mark or update attendance in batch for selected date and students
 * @access  Private (Admin only)
 */
router.post('/mark', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { branch, classYear, section, date, records } = req.body;

    if (!branch || !classYear || !section || !date || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Branch, classYear, section, date, and records array are required.'
      });
    }

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Expected YYYY-MM-DD.'
      });
    }

    // Validate records
    for (const rec of records) {
      if (!rec.studentId || !['present', 'absent'].includes(rec.status)) {
        return res.status(400).json({
          success: false,
          message: 'Each record must have a valid studentId and status ("present" or "absent").'
        });
      }
    }

    let insertedCount = 0;
    let updatedCount = 0;

    await mutateData(data => {
      for (const rec of records) {
        const existingIdx = data.attendance.findIndex(
          a => a.studentId === rec.studentId && a.date === date
        );

        if (existingIdx !== -1) {
          // Update existing attendance
          data.attendance[existingIdx].status = rec.status;
          data.attendance[existingIdx].updatedAt = new Date().toISOString();
          data.attendance[existingIdx].branch = branch;
          data.attendance[existingIdx].classYear = classYear;
          data.attendance[existingIdx].section = section;
          updatedCount++;
        } else {
          // Insert new record
          data.attendance.push({
            id: uuidv4(),
            studentId: rec.studentId,
            date,
            status: rec.status,
            branch,
            classYear,
            section,
            markedBy: req.user.email || 'admin',
            markedAt: new Date().toISOString()
          });
          insertedCount++;
        }
      }
      return data;
    });

    return res.status(200).json({
      success: true,
      message: `Attendance for ${date} saved successfully (${insertedCount} new, ${updatedCount} updated).`,
      summary: {
        total: records.length,
        inserted: insertedCount,
        updated: updatedCount,
        date
      }
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    return res.status(500).json({ success: false, message: 'Server error saving attendance.' });
  }
});

/**
 * @route   GET /api/attendance/records
 * @desc    Get filtered attendance records with aggregated metrics
 * @access  Private (Admin only)
 */
router.get('/records', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { search, branch, classYear, section, date, status, from, to } = req.query;
    const data = await readData();

    const studentMap = new Map(data.students.map(s => [s.id, s]));

    let filtered = data.attendance.map(a => {
      const student = studentMap.get(a.studentId);
      return {
        id: a.id,
        studentId: a.studentId,
        studentName: student ? student.name : 'Unknown Student',
        rollNumber: student ? student.rollNumber : 'N/A',
        email: student ? student.email : '',
        branch: student ? student.branch : a.branch,
        classYear: student ? student.classYear : a.classYear,
        section: student ? student.section : a.section,
        date: a.date,
        status: a.status,
        markedAt: a.updatedAt || a.markedAt
      };
    });

    // Apply search filter (name, roll, or email)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(r =>
        r.studentName.toLowerCase().includes(q) ||
        r.rollNumber.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      );
    }

    // Apply branch filter
    if (branch && branch !== 'all') {
      filtered = filtered.filter(r => r.branch.toLowerCase() === branch.toLowerCase());
    }

    // Apply classYear filter
    if (classYear && classYear !== 'all') {
      filtered = filtered.filter(r => r.classYear.toLowerCase() === classYear.toLowerCase());
    }

    // Apply section filter
    if (section && section !== 'all') {
      filtered = filtered.filter(r => r.section.toLowerCase() === section.toLowerCase());
    }

    // Apply date filter
    if (date) {
      filtered = filtered.filter(r => r.date === date);
    }

    // Date range filter
    if (from) {
      filtered = filtered.filter(r => r.date >= from);
    }
    if (to) {
      filtered = filtered.filter(r => r.date <= to);
    }

    // Status filter
    if (status && status !== 'all') {
      filtered = filtered.filter(r => r.status.toLowerCase() === status.toLowerCase());
    }

    // Sort by Date descending, then rollNumber ascending
    filtered.sort((a, b) => {
      if (b.date !== a.date) {
        return b.date.localeCompare(a.date);
      }
      return a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true });
    });

    // Summary calculations
    const presentCount = filtered.filter(r => r.status === 'present').length;
    const absentCount = filtered.filter(r => r.status === 'absent').length;
    const totalCount = filtered.length;
    const attendancePercentage = totalCount > 0
      ? Math.round((presentCount / totalCount) * 100 * 10) / 10
      : 0;

    return res.status(200).json({
      success: true,
      records: filtered,
      metrics: {
        totalRecords: totalCount,
        presentCount,
        absentCount,
        attendancePercentage
      }
    });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving attendance records.' });
  }
});

/**
 * @route   GET /api/attendance/student/me
 * @desc    Get attendance records and metrics for currently logged in student
 * @access  Private (Student only)
 */
router.get('/student/me', verifyToken, requireStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    const data = await readData();

    // Student's individual attendance records
    const studentRecords = data.attendance
      .filter(a => a.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date));

    const today = getTodayString();
    const todayRecord = studentRecords.find(a => a.date === today);

    // Calculate metrics
    const totalRecordedDays = studentRecords.length;
    const presentDays = studentRecords.filter(a => a.status === 'present').length;
    const absentDays = studentRecords.filter(a => a.status === 'absent').length;

    const attendancePercentage = totalRecordedDays > 0
      ? Math.round((presentDays / totalRecordedDays) * 100 * 10) / 10
      : 0;

    return res.status(200).json({
      success: true,
      student: {
        id: req.user.id,
        name: req.user.name,
        rollNumber: req.user.rollNumber,
        branch: req.user.branch,
        classYear: req.user.classYear,
        section: req.user.section,
        email: req.user.email
      },
      todayStatus: todayRecord ? todayRecord.status : 'not_marked',
      todayDate: today,
      metrics: {
        totalRecordedDays,
        presentDays,
        absentDays,
        attendancePercentage
      },
      records: studentRecords.map(r => ({
        id: r.id,
        date: r.date,
        status: r.status,
        markedAt: r.updatedAt || r.markedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving student attendance.' });
  }
});

export default router;
