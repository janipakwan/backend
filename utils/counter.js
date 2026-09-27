const Counter = require('../models/Counter');

/**
 * Atomically increments and returns the next value for the named counter.
 * Uses MongoDB's findOneAndUpdate with $inc and upsert to avoid race conditions.
 * First call auto-creates the counter starting at 1.
 */
async function getNextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return counter.value;
}

module.exports = { getNextSequence };
