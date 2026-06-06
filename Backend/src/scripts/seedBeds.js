import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Bed from '../models/Bed.model.js'

dotenv.config()

const beds = [
  // ICU: 10 beds, pricePerDay: 5000
  ...Array.from({ length: 10 }, (_, i) => ({
    bedCode: `ICU-${(i + 1).toString().padStart(3, '0')}`,
    ward: 'ICU',
    floor: 2,
    type: 'icu',
    status: 'available',
    pricePerDay: 5000,
  })),
  // ER: 8 beds, pricePerDay: 3000
  ...Array.from({ length: 8 }, (_, i) => ({
    bedCode: `ER-${(i + 1).toString().padStart(3, '0')}`,
    ward: 'ER',
    floor: 1,
    type: 'emergency',
    status: 'available',
    pricePerDay: 3000,
  })),
  // General: 20 beds, pricePerDay: 1500
  ...Array.from({ length: 20 }, (_, i) => ({
    bedCode: `GEN-${(i + 1).toString().padStart(3, '0')}`,
    ward: 'General',
    floor: 3,
    type: 'general',
    status: 'available',
    pricePerDay: 1500,
  })),
  // HDU: 6 beds, pricePerDay: 3500
  ...Array.from({ length: 6 }, (_, i) => ({
    bedCode: `HDU-${(i + 1).toString().padStart(3, '0')}`,
    ward: 'HDU',
    floor: 2,
    type: 'hdu',
    status: 'available',
    pricePerDay: 3500,
  })),
]

const seedBeds = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB...')

    await Bed.deleteMany({})
    console.log('Cleared existing beds.')

    await Bed.insertMany(beds)
    console.log(`Successfully seeded ${beds.length} beds.`)

    process.exit(0)
  } catch (error) {
    console.error('Error seeding beds:', error)
    process.exit(1)
  }
}

seedBeds()
