/**
 * StudySession.js — Timed study/revision/practice session with XP rewards.
 */
import mongoose from 'mongoose';
const { Schema } = mongoose;

const studySessionSchema = new Schema({
  user:        { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject:     { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  subjectName: { type: String },
  type:        { type: String, enum: ['study', 'revision', 'practice', 'mock_test'], default: 'study' },
  duration:    { type: Number, required: true, min: 1 },  // minutes
  score:       { type: Number, min: 0, max: 100, default: null },
  difficulty:  { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  notes:       { type: String, maxlength: 1000 },
  completed:   { type: Boolean, default: false },
  xpAwarded:   { type: Number, default: 0 },
  startedAt:   { type: Date, default: Date.now },
  endedAt:     { type: Date, default: null },
}, { timestamps: true });

studySessionSchema.index({ user: 1, startedAt: -1 });
studySessionSchema.index({ user: 1, subject: 1 });

export default mongoose.model('StudySession', studySessionSchema);
