import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { readData, mutateData } from '../utils/jsonStorage.js';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware.js';
import { uploadAssignmentFile } from '../middleware/uploadMiddleware.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

/**
 * @route   GET /api/assignments
 * @desc    Get assignments (Admin gets all, Student gets only their branch/class/section)
 * @access  Private (Admin or Student)
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const data = await readData();
    let assignments = [...data.assignments];

    if (req.user.role === 'admin') {
      const { branch, classYear, section } = req.query;
      if (branch && branch !== 'all') {
        assignments = assignments.filter(a => a.branch.toLowerCase() === branch.toLowerCase());
      }
      if (classYear && classYear !== 'all') {
        assignments = assignments.filter(a => a.classYear.toLowerCase() === classYear.toLowerCase());
      }
      if (section && section !== 'all') {
        assignments = assignments.filter(a => a.section.toLowerCase() === section.toLowerCase());
      }
    } else if (req.user.role === 'student') {
      // Strictly match student's branch, classYear, and section
      assignments = assignments.filter(a =>
        a.branch.toLowerCase() === req.user.branch.toLowerCase() &&
        a.classYear.toLowerCase() === req.user.classYear.toLowerCase() &&
        a.section.toLowerCase() === req.user.section.toLowerCase()
      );
    }

    // Sort by upload date descending
    assignments.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return res.status(200).json({
      success: true,
      count: assignments.length,
      assignments
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving assignments.' });
  }
});

/**
 * @route   POST /api/assignments
 * @desc    Upload new assignment (Admin only)
 * @access  Private (Admin only)
 */
router.post('/', verifyToken, requireAdmin, (req, res) => {
  uploadAssignmentFile.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed.'
      });
    }

    try {
      const { title, description, branch, classYear, section, dueDate } = req.body;

      if (!title || !description || !branch || !classYear || !section || !dueDate) {
        // If file was uploaded, clean it up since form validation failed
        if (req.file) {
          await fs.unlink(req.file.path).catch(() => {});
        }
        return res.status(400).json({
          success: false,
          message: 'All fields are required (Title, Description, Branch, Class/Year, Section, Due Date, and File).'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please attach a valid file (PDF, JPG, JPEG, or PNG).'
        });
      }

      const newAssignment = {
        id: uuidv4(),
        title: title.trim(),
        description: description.trim(),
        branch: branch.trim(),
        classYear: classYear.trim(),
        section: section.trim().toUpperCase(),
        dueDate,
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
        uploadedBy: req.user.name || 'Administrator'
      };

      await mutateData(data => {
        data.assignments.push(newAssignment);
        return data;
      });

      return res.status(201).json({
        success: true,
        message: `Assignment "${newAssignment.title}" uploaded successfully.`,
        assignment: newAssignment
      });
    } catch (error) {
      console.error('Error saving assignment:', error);
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      return res.status(500).json({ success: false, message: 'Server error saving assignment.' });
    }
  });
});

/**
 * @route   DELETE /api/assignments/:id
 * @desc    Delete assignment and its file from server (Admin only)
 * @access  Private (Admin only)
 */
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const currentData = await readData();

    const assignment = currentData.assignments.find(a => a.id === assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found.'
      });
    }

    // Delete file from uploads directory
    if (assignment.filename) {
      const filePath = path.join(UPLOADS_DIR, assignment.filename);
      await fs.unlink(filePath).catch(err => {
        console.warn(`[Assignment Delete] File unlink warning for ${assignment.filename}:`, err.message);
      });
    }

    // Remove from data.json
    await mutateData(data => {
      data.assignments = data.assignments.filter(a => a.id !== assignmentId);
      return data;
    });

    return res.status(200).json({
      success: true,
      message: `Assignment "${assignment.title}" deleted successfully.`
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting assignment.' });
  }
});

/**
 * @route   GET /api/assignments/:id/download
 * @desc    Securely download assignment file with authorization check
 * @access  Private (Admin or Authorized Student)
 */
router.get('/:id/download', verifyToken, async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const data = await readData();

    const assignment = data.assignments.find(a => a.id === assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    // Authorization check: student can only download if it matches their batch
    if (req.user.role === 'student') {
      const isMatch = (
        assignment.branch.toLowerCase() === req.user.branch.toLowerCase() &&
        assignment.classYear.toLowerCase() === req.user.classYear.toLowerCase() &&
        assignment.section.toLowerCase() === req.user.section.toLowerCase()
      );
      if (!isMatch) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: You do not have permission to view assignments from other classes.'
        });
      }
    }

    const filePath = path.join(UPLOADS_DIR, assignment.filename);

    // Verify file exists on disk
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'The requested assignment file was not found on the server.'
      });
    }

    // Trigger download
    return res.download(filePath, assignment.originalName || assignment.filename);
  } catch (error) {
    console.error('Error downloading assignment file:', error);
    return res.status(500).json({ success: false, message: 'Server error downloading file.' });
  }
});

export default router;
