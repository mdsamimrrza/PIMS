const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User.model');

dotenv.config();

const migrateRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    const users = await User.find({});
    let updatedCount = 0;

    for (const user of users) {
      if (user.role && user.role !== user.role.toLowerCase()) {
        const oldRole = user.role;
        user.role = user.role.toLowerCase();
        // Use set to bypass enum validation if it's currently uppercase
        user.set('role', user.role.toLowerCase());
        await user.save();
        console.log(`Migrated ${user.email}: ${oldRole} -> ${user.role}`);
        updatedCount++;
      }
    }

    console.log(`Successfully migrated ${updatedCount} users to lowercase roles.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrateRoles();
