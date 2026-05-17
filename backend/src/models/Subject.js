/**
 * Subject.js — Study subject with mastery tracking and exam scheduling.
 */
import mongoose from 'mongoose';
const { Schema } = mongoose;

const subjectSchema = new Schema({
  user:        { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:        { type: String, required: true, trim: true, maxlength: 80 },
  emoji:       { type: String, default: '📚', maxlength: 4 },
  color:       { type: String, default: '#0ea5e9' },
  examDate:    { type: Date, default: null },
  targetHours: { type: Number, default: 100, min: 1 },
  studiedHours:{ type: Number, default: 0, min: 0 },
  priority:    { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  mastery:     { type: Number, default: 0, min: 0, max: 100 },
  active:      { type: Boolean, default: true },
  category:    { type: String, default: 'General' }, // JEE, UPSC, GATE, etc.
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

subjectSchema.virtual('daysToExam').get(function () {
  if (!this.examDate) return null;
  return Math.ceil((this.examDate - new Date()) / (1000 * 60 * 60 * 24));
});

subjectSchema.virtual('progressPct').get(function () {
  return this.targetHours > 0 ? Math.min((this.studiedHours / this.targetHours) * 100, 100) : 0;
});

export default mongoose.model('Subject', subjectSchema);
