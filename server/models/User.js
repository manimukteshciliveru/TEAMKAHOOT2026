const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['faculty', 'student', 'admin', 'none'],
    default: 'none'
  },


  employeeId: {
    type: String,
    unique: true,
    sparse: true
  },
  rollNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  branch: String,
  department: String,
  section: String,
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
