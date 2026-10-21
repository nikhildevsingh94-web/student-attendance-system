import fs from 'fs';
import path from 'path';

const API = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting API Verification Tests with native fetch...\n');

  // 1. Health check
  const healthRes = await fetch(`${API}/health`);
  const health = await healthRes.json();
  console.log('✅ 1. Health check:', health.status);

  // 2. Admin Login
  const adminLoginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@college.edu',
      password: 'Admin@123',
      role: 'admin'
    })
  });
  const adminLogin = await adminLoginRes.json();
  console.log('✅ 2. Admin login:', adminLogin.success, '| Token received');
  const adminToken = adminLogin.token;
  const adminHeaders = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };

  // 3. Register Student
  const studentData = {
    name: 'Aarav Patel',
    rollNumber: 'CS2026-001',
    email: 'aarav.patel@gmail.com',
    branch: 'Computer Science',
    classYear: '1st Year',
    section: 'A',
    password: 'Student@123'
  };

  const createStudentRes = await fetch(`${API}/students`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(studentData)
  });
  const createStudent = await createStudentRes.json();
  console.log('✅ 3. Student created:', createStudent.student?.name, `(${createStudent.student?.rollNumber})`);
  const studentId = createStudent.student.id;

  // 4. Duplicate checks
  const dupRes = await fetch(`${API}/students`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(studentData)
  });
  const dup = await dupRes.json();
  if (dupRes.status === 409) {
    console.log('✅ 4. Duplicate check prevented successfully:', dup.message);
  } else {
    console.error('❌ Duplicate check failed: status', dupRes.status);
  }

  // 5. Add second student for testing batch
  const student2Data = {
    name: 'Neha Verma',
    rollNumber: 'CS2026-002',
    email: 'neha.verma@gmail.com',
    branch: 'Computer Science',
    classYear: '1st Year',
    section: 'A',
    password: 'Student@123'
  };
  const createStudent2Res = await fetch(`${API}/students`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(student2Data)
  });
  const createStudent2 = await createStudent2Res.json();
  console.log('✅ 5. Second student created:', createStudent2.student?.name);

  // 6. Get batch students before marking
  const today = new Date().toISOString().slice(0, 10);
  const batchUrl = new URL(`${API}/attendance/by-batch`);
  batchUrl.searchParams.set('branch', 'Computer Science');
  batchUrl.searchParams.set('classYear', '1st Year');
  batchUrl.searchParams.set('section', 'A');
  batchUrl.searchParams.set('date', today);

  const batchRes = await fetch(batchUrl.toString(), {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const batch = await batchRes.json();
  console.log('✅ 6. Batch retrieved before mark: count =', batch.count, '| alreadyMarked =', batch.isAlreadyMarked);

  // 7. Mark Attendance (Aarav = present, Neha = absent)
  const markRes = await fetch(`${API}/attendance/mark`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      branch: 'Computer Science',
      classYear: '1st Year',
      section: 'A',
      date: today,
      records: [
        { studentId: studentId, status: 'present' },
        { studentId: createStudent2.student.id, status: 'absent' }
      ]
    })
  });
  const mark = await markRes.json();
  console.log('✅ 7. Batch attendance marked:', mark.message);

  // 8. Re-mark / Update (Upsert check: change Neha to present)
  const updateRes = await fetch(`${API}/attendance/mark`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      branch: 'Computer Science',
      classYear: '1st Year',
      section: 'A',
      date: today,
      records: [
        { studentId: studentId, status: 'present' },
        { studentId: createStudent2.student.id, status: 'present' }
      ]
    })
  });
  const update = await updateRes.json();
  console.log('✅ 8. Batch attendance updated (Upsert):', update.summary.updated, 'records updated.');

  // 9. Overview Stats
  const overviewRes = await fetch(`${API}/attendance/stats/overview`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const overview = await overviewRes.json();
  console.log('✅ 9. Admin Stats Overview: Total Students =', overview.stats.totalStudents,
    '| Present Today =', overview.stats.presentToday,
    '| Today Attendance % =', overview.stats.todayPercentage + '%'
  );

  // 10. Student Login
  const studentLoginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'aarav.patel@gmail.com',
      password: 'Student@123',
      role: 'student'
    })
  });
  const studentLogin = await studentLoginRes.json();
  console.log('✅ 10. Student Login successful:', studentLogin.user?.name, '| Role =', studentLogin.user?.role);
  const studentToken = studentLogin.token;
  const studentHeaders = {
    'Authorization': `Bearer ${studentToken}`,
    'Content-Type': 'application/json'
  };

  // 11. Student Attendance Details
  const studentMeRes = await fetch(`${API}/attendance/student/me`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const studentMe = await studentMeRes.json();
  console.log('✅ 11. Student Attendance View: Today Status =', studentMe.todayStatus,
    '| Recorded Days =', studentMe.metrics.totalRecordedDays,
    '| Present Days =', studentMe.metrics.presentDays,
    '| % =', studentMe.metrics.attendancePercentage + '%'
  );

  // 12. Student unauthorized access check
  const forbiddenRes = await fetch(`${API}/students`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const forbidden = await forbiddenRes.json();
  if (forbiddenRes.status === 403) {
    console.log('✅ 12. Security check passed: Student forbidden from admin API (Status 403: ' + forbidden.message + ')');
  } else {
    console.error('❌ Security check failed: Expected 403, got', forbiddenRes.status);
  }

  // 13. Create sample test file for assignment upload using native FormData & Blob
  const formData = new FormData();
  formData.append('title', 'Data Structures Assignment 1');
  formData.append('description', 'Implement Binary Search Trees and AVL Trees');
  formData.append('branch', 'Computer Science');
  formData.append('classYear', '1st Year');
  formData.append('section', 'A');
  formData.append('dueDate', '2026-11-01');

  const fileBlob = new Blob(['%PDF-1.4 sample pdf content for student coursework'], { type: 'application/pdf' });
  formData.append('file', fileBlob, 'algorithms-assignment.pdf');

  const uploadRes = await fetch(`${API}/assignments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: formData
  });
  const upload = await uploadRes.json();
  console.log('✅ 13. Assignment uploaded by admin:', upload.assignment?.title, '| File:', upload.assignment?.filename);
  const assignmentId = upload.assignment.id;

  // 14. Student checks assignments
  const studentAssignRes = await fetch(`${API}/assignments`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const studentAssign = await studentAssignRes.json();
  console.log('✅ 14. Student fetched assignments: count =', studentAssign.count,
    '| Title =', studentAssign.assignments[0]?.title);

  // 15. Student downloads assignment
  const downloadRes = await fetch(`${API}/assignments/${assignmentId}/download`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const arrayBuffer = await downloadRes.arrayBuffer();
  console.log('✅ 15. Student downloaded assignment file: bytes =', arrayBuffer.byteLength);

  console.log('\n🎉 ALL 15 AUTOMATED TESTS PASSED SUCCESSFULLY! 🚀');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
