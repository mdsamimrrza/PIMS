const mongoose = require('mongoose');

const connectDatabase = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(process.env.MONGO_URI);
  return mongoose.connection;
};

module.exports = { connectDatabase };
