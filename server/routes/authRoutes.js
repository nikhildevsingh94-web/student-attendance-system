import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { readData } from '../utils/jsonStorage.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_student_portal_jwt_token_key_2026_change_in_production';
const JWT_EXPIRES_IN = '7d';

/**
 * @route   POST /api/auth/login
 * @desc    Login for admin or student
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and portal type (role) are required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const data = await readData();

    if (role === 'admin') {
      const admin = data.admins.find(a => a.email.toLowerCase() === normalizedEmail);
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid admin email or password.'
        });
      }

      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid admin email or password.'
        });
      }

      const payload = {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: 'admin'
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      return res.status(200).json({
        success: true,
        message: 'Admin login successful.',
        token,
        user: payload
      });
    } else if (role === 'student') {
      const student = data.students.find(s => s.email.toLowerCase() === normalizedEmail);
      if (!student) {
        return res.status(401).json({
          success: false,
          message: 'Invalid student Gmail or password. Please verify your credentials.'
        });
      }

      const isMatch = await bcrypt.compare(password, student.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid student Gmail or password. Please verify your credentials.'
        });
      }

      const payload = {
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
        email: student.email,
        branch: student.branch,
        classYear: student.classYear,
        section: student.section,
        role: 'student'
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      return res.status(200).json({
        success: true,
        message: 'Student login successful.',
        token,
        user: payload
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified. Must be "admin" or "student".'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get authenticated user info
 * @access  Private
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const data = await readData();
    if (req.user.role === 'admin') {
      const admin = data.admins.find(a => a.id === req.user.id);
      if (!admin) {
        return res.status(404).json({ success: false, message: 'Admin not found.' });
      }
      return res.status(200).json({
        success: true,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: 'admin'
        }
      });
    } else if (req.user.role === 'student') {
      const student = data.students.find(s => s.id === req.user.id);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }
      return res.status(200).json({
        success: true,
        user: {
          id: student.id,
          name: student.name,
          rollNumber: student.rollNumber,
          email: student.email,
          branch: student.branch,
          classYear: student.classYear,
          section: student.section,
          role: 'student'
        }
      });
    }
  } catch (error) {
    console.error('Auth verification error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving user data.' });
  }
});

export default router;
