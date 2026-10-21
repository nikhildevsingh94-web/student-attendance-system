import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach Authorization Bearer token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('portal_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses for 401 cleanup and clear network error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized and not already on login page, handle cleanup
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('portal_token');
        localStorage.removeItem('portal_user');
      }
    } else if (!error.response && (error.message === 'Network Error' || error.code === 'ERR_NETWORK')) {
      error.message = 'Cannot connect to backend server. Please verify that the backend is running on http://localhost:5000.';
    }
    return Promise.reject(error);
  }
);

// Authentication services
export const authService = {
  login: async (email, password, role) => {
    const response = await api.post('/auth/login', { email, password, role });
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

// Student management services
export const studentService = {
  getStudents: async (params = {}) => {
    const response = await api.get('/students', { params });
    return response.data;
  },
  createStudent: async (studentData) => {
    const response = await api.post('/students', studentData);
    return response.data;
  },
  deleteStudent: async (id) => {
    const response = await api.delete(`/students/${id}`);
    return response.data;
  },
  bulkImportStudents: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/students/bulk-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(pct);
        }
      }
    });
    return response.data;
  }
};

// Attendance services
export const attendanceService = {
  getOverviewStats: async () => {
    const response = await api.get('/attendance/stats/overview');
    return response.data;
  },
  getBatchStudents: async (params) => {
    const response = await api.get('/attendance/by-batch', { params });
    return response.data;
  },
  markAttendance: async (payload) => {
    const response = await api.post('/attendance/mark', payload);
    return response.data;
  },
  getRecords: async (params = {}) => {
    const response = await api.get('/attendance/records', { params });
    return response.data;
  },
  getStudentAttendance: async () => {
    const response = await api.get('/attendance/student/me');
    return response.data;
  }
};

// Assignment services
export const assignmentService = {
  getAssignments: async (params = {}) => {
    const response = await api.get('/assignments', { params });
    return response.data;
  },
  uploadAssignment: async (formData, onProgress) => {
    const response = await api.post('/assignments', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });
    return response.data;
  },
  deleteAssignment: async (id) => {
    const response = await api.delete(`/assignments/${id}`);
    return response.data;
  },
  downloadAssignment: async (id, originalFilename) => {
    const response = await api.get(`/assignments/${id}/download`, {
      responseType: 'blob'
    });
    // Create temporary link to trigger native browser download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', originalFilename || `assignment-${id}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};

export default api;
