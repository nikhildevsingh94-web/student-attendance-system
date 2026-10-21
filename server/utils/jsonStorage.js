import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE_PATH = path.resolve(__dirname, '../data.json');
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

// Default initial JSON structure
const DEFAULT_DATA = {
  admins: [],
  students: [],
  attendance: [],
  assignments: []
};

// Serialized write queue to prevent race conditions & overlapping file writes
let writeQueue = Promise.resolve();

/**
 * Validates that data object has required arrays
 * @param {object} data
 * @returns {boolean}
 */
export function validateDataStructure(data) {
  if (!data || typeof data !== 'object') return false;
  const requiredKeys = ['admins', 'students', 'attendance', 'assignments'];
  for (const key of requiredKeys) {
    if (!Array.isArray(data[key])) {
      return false;
    }
  }
  return true;
}

/**
 * Initializes the storage file and uploads directory if they don't exist
 */
export async function initStorage() {
  try {
    // Ensure uploads folder exists
    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    // Check if data.json exists
    try {
      await fs.access(DATA_FILE_PATH);
      // File exists, check if it's valid JSON
      const content = await fs.readFile(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content || '{}');
      if (!validateDataStructure(parsed)) {
        // Repair missing fields while keeping existing ones
        const repaired = {
          admins: Array.isArray(parsed.admins) ? parsed.admins : [],
          students: Array.isArray(parsed.students) ? parsed.students : [],
          attendance: Array.isArray(parsed.attendance) ? parsed.attendance : [],
          assignments: Array.isArray(parsed.assignments) ? parsed.assignments : []
        };
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(repaired, null, 2), 'utf-8');
        console.log('[Storage] Repaired data.json structure.');
      }
    } catch (err) {
      // File does not exist or cannot be parsed, initialize default
      await fs.writeFile(DATA_FILE_PATH, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8');
      console.log('[Storage] Initialized new data.json file.');
    }
  } catch (error) {
    console.error('[Storage Error] Failed to initialize storage:', error);
    throw error;
  }
}

/**
 * Reads all data safely from data.json
 * @returns {Promise<typeof DEFAULT_DATA>}
 */
export async function readData() {
  try {
    const raw = await fs.readFile(DATA_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!validateDataStructure(parsed)) {
      throw new Error('Corrupt or invalid data.json structure');
    }
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      await initStorage();
      return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
    console.error('[Storage Error] Error reading data.json:', error.message);
    throw error;
  }
}

/**
 * Serialized write into data.json
 * Guarantees that only one write operation happens at a time
 * @param {object} nextData
 * @returns {Promise<void>}
 */
export function writeData(nextData) {
  if (!validateDataStructure(nextData)) {
    return Promise.reject(new Error('Invalid data structure passed to writeData'));
  }

  // Chain onto writeQueue
  writeQueue = writeQueue.then(async () => {
    try {
      const jsonString = JSON.stringify(nextData, null, 2);
      // Atomic write pattern with temp file if desired, or direct utf-8 write
      await fs.writeFile(DATA_FILE_PATH, jsonString, 'utf-8');
    } catch (err) {
      console.error('[Storage Error] Error writing data.json:', err.message);
      throw err;
    }
  });

  return writeQueue;
}

/**
 * Atomic mutation helper: safely reads, mutates via callback, and writes back
 * @param {(currentData: typeof DEFAULT_DATA) => typeof DEFAULT_DATA | Promise<typeof DEFAULT_DATA>} mutateFn
 * @returns {Promise<typeof DEFAULT_DATA>}
 */
export async function mutateData(mutateFn) {
  // Execute sequentially through write queue to avoid dirty reads during write
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue.then(async () => {
      try {
        const currentData = await readData();
        const mutated = await mutateFn(currentData);
        if (!validateDataStructure(mutated)) {
          throw new Error('Mutation returned invalid data structure');
        }
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(mutated, null, 2), 'utf-8');
        resolve(mutated);
      } catch (err) {
        reject(err);
      }
    });
  });
}
