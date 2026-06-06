const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User.model');

dotenv.config();

const checkUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    const users = await User.find({}, 'email role');
    console.log('Users in DB:');
    users.forEach(u => console.log(`- ${u.email}: ${u.role}`));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkUsers();
