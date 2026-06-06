const dotenv = require('dotenv');
const { connectDatabase } = require('../config/db');
const User = require('../models/User.model');
const { generatePassword, hashPassword } = require('../utils/password');

dotenv.config();

const basePassword = String(process.env.SEED_USERS_PASSWORD || generatePassword(18));
const seedUsers = [
  { firstName: 'Admin', lastName: 'User', email: 'admin@pims.com', password: basePassword, role: 'admin' },
  { firstName: 'John', lastName: 'Doctor', email: 'doctor@pims.com', password: basePassword, role: 'doctor' },
  { firstName: 'Sarah', lastName: 'Pharmacist', email: 'pharma@pims.com', password: basePassword, role: 'pharmacist' },
  { firstName: 'Emily', lastName: 'Nurse', email: 'nurse@pims.com', password: basePassword, role: 'nurse' },
  { firstName: 'Mike', lastName: 'Reception', email: 'recep@pims.com', password: basePassword, role: 'receptionist' },
  { firstName: 'Linda', lastName: 'Cashier', email: 'cashier@pims.com', password: basePassword, role: 'cashier' },
  { firstName: 'Alice', lastName: 'Patient', email: 'patient@pims.com', password: basePassword, role: 'patient' }
];

const seed = async () => {
  await connectDatabase();

  for (const user of seedUsers) {
    await User.updateOne(
      { email: user.email },
      {
        $set: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          passwordHash: hashPassword(user.password),
          role: user.role,
          isActive: true,
        },
      },
      { upsert: true }
    );
  }

  console.log(`Seeded ${seedUsers.length} backend auth users.`);
  console.log(`Seed password used for this run: ${basePassword}`);
  process.exit(0);
};

seed().catch((error) => {
  console.error('Failed to seed users', error);
  process.exit(1);
});
