import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { mutateData, initStorage, readData } from './jsonStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function initAdmin() {
  await initStorage();

  const args = process.argv.slice(2);
  const email = (args[0] || process.env.INITIAL_ADMIN_EMAIL || 'admin@college.edu').trim().toLowerCase();
  const name = (args[1] || process.env.INITIAL_ADMIN_NAME || 'System Administrator').trim();
  const password = args[2] || process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123';

  if (!email || !password) {
    console.error('Error: Email and password are required to create an admin account.');
    process.exit(1);
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const data = await readData();
  const existingAdminIndex = data.admins.findIndex(a => a.email.toLowerCase() === email);

  if (existingAdminIndex !== -1) {
    // Update existing admin password
    await mutateData(current => {
      current.admins[existingAdminIndex].password = hashedPassword;
      current.admins[existingAdminIndex].name = name;
      current.admins[existingAdminIndex].updatedAt = new Date().toISOString();
      return current;
    });
    console.log('----------------------------------------------------');
    console.log(`[Admin Init] Existing Admin "${email}" password updated!`);
    console.log(`Email:    ${email}`);
    console.log(`Name:     ${name}`);
    console.log(`Password: ${password}`);
    console.log('----------------------------------------------------');
  } else {
    // Create new admin
    const newAdmin = {
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date().toISOString()
    };

    await mutateData(current => {
      current.admins.push(newAdmin);
      return current;
    });

    console.log('====================================================');
    console.log('  Admin Account Initialized Successfully!           ');
    console.log('====================================================');
    console.log(`  Name:     ${name}`);
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Role:     admin`);
    console.log('====================================================');
    console.log('You can now log in at the Admin tab with these credentials.');
  }
}

initAdmin().catch(err => {
  console.error('[Admin Init Failed]:', err);
  process.exit(1);
});
