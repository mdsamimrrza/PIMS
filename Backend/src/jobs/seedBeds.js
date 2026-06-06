const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Bed = require('../models/Bed.model');

dotenv.config();

const beds = [
  // General Ward - Floor 1
  { bedCode: 'G1-01', ward: 'General', floor: 1, room: '101', type: 'general', status: 'available', pricePerDay: 500 },
  { bedCode: 'G1-02', ward: 'General', floor: 1, room: '101', type: 'general', status: 'available', pricePerDay: 500 },
  { bedCode: 'G1-03', ward: 'General', floor: 1, room: '102', type: 'general', status: 'available', pricePerDay: 500 },
  
  // ICU - Floor 2
  { bedCode: 'ICU-01', ward: 'ICU', floor: 2, room: '201', type: 'icu', status: 'available', pricePerDay: 2500 },
  { bedCode: 'ICU-02', ward: 'ICU', floor: 2, room: '201', type: 'icu', status: 'available', pricePerDay: 2500 },
  
  // Emergency (ER) - Floor 1
  { bedCode: 'ER-01', ward: 'ER', floor: 1, room: 'ER-A', type: 'emergency', status: 'available', pricePerDay: 1000 },
  { bedCode: 'ER-02', ward: 'ER', floor: 1, room: 'ER-A', type: 'emergency', status: 'available', pricePerDay: 1000 },
];

async function seed() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    await Bed.deleteMany({});
    console.log('Cleared existing beds');
    
    await Bed.insertMany(beds);
    console.log('Seeded beds successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  }
}

seed();
