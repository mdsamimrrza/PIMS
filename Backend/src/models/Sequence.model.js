const mongoose = require('mongoose');

const sequenceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  value: {
    type: Number,
    default: 0,
  },
});

const Sequence = mongoose.models.Sequence || mongoose.model('Sequence', sequenceSchema);

async function getNextSequence(name) {
  const seq = await Sequence.findOneAndUpdate(
    { name },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return seq.value;
}

module.exports = {
  Sequence,
  getNextSequence
};
