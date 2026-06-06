import Patient from '../models/Patient.model.js'
import Medicine from '../models/Medicine.model.js'

export const checkAllergies = async (req, _res, next) => {
  try {
    const { patientId, items = [] } = req.body
    req.allergyWarnings = []

    if (!patientId || items.length === 0) {
      return next()
    }

    const patient = await Patient.findById(patientId)
    if (!patient || !patient.allergies || patient.allergies.length === 0) {
      return next()
    }

    const patientAllergies = patient.allergies.map(a => String(a.substance).toLowerCase())

    for (const item of items) {
      const medicine = await Medicine.findById(item.medicineId)
      if (!medicine) continue

      const medName = String(medicine.name).toLowerCase()
      const genericName = String(medicine.genericName || '').toLowerCase()
      const atcCode = String(medicine.atcCode || '').toLowerCase()

      const match = patientAllergies.find(allergy => 
        medName.includes(allergy) || 
        genericName.includes(allergy) || 
        atcCode.includes(allergy)
      )

      if (match) {
        req.allergyWarnings.push(`Patient is allergic to ${match}. Detected in: ${medicine.name}`)
      }
    }

    next()
  } catch (error) {
    next(error)
  }
}
