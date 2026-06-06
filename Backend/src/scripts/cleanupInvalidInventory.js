import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import mongoose from 'mongoose'
import { connectDatabase } from '../config/db.js'
import Inventory from '../models/Inventory.model.js'

const currentFilePath = fileURLToPath(import.meta.url)
const currentDir = dirname(currentFilePath)
const backendRoot = resolve(currentDir, '../..')

dotenv.config({ path: resolve(backendRoot, '.env') })

const shouldApply = process.argv.includes('--apply')

const invalidInventoryQuery = {
  $or: [
    { atcCode: { $exists: false } },
    { atcCode: null },
    { atcCode: '' },
    { currentStock: { $exists: false } },
    { currentStock: null },
  ],
}

const run = async () => {
  await connectDatabase()

  const invalidDocs = await Inventory.find(invalidInventoryQuery)
    .select('_id medicineId atcCode currentStock batchId createdAt updatedAt')
    .lean()

  if (!invalidDocs.length) {
    console.log('No invalid inventory records found.')
    await mongoose.disconnect()
    process.exit(0)
  }

  console.log(`Found ${invalidDocs.length} invalid inventory record(s).`)
  invalidDocs.forEach((doc) => {
    console.log(JSON.stringify(doc))
  })

  if (!shouldApply) {
    console.log('Dry run only. Re-run with --apply to delete these records.')
    await mongoose.disconnect()
    process.exit(0)
  }

  const ids = invalidDocs.map((doc) => doc._id)
  const result = await Inventory.deleteMany({ _id: { $in: ids } })

  console.log(`Deleted ${result.deletedCount || 0} invalid inventory record(s).`)
  await mongoose.disconnect()
  process.exit(0)
}

run().catch(async (error) => {
  console.error(`Failed to clean invalid inventory: ${error.message}`)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
