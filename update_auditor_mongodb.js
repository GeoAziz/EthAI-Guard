#!/usr/bin/env node
/**
 * Update MongoDB User collection to set auditor-test@example.com role to auditor
 */

const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI || 'mongodb://mongo:27017/ethixai';

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  password_hash: String,
  role: { type: String, enum: ['admin', 'auditor', 'analyst', 'reviewer', 'user'], default: 'user' },
  firebase_uid: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function updateAuditorRole() {
  try {
    console.log('[1] Connecting to MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected');

    console.log('\n[2] Finding auditor-test@example.com...');
    let user = await User.findOne({ email: 'auditor-test@example.com' });

    if (!user) {
      console.log('⚠️  User not found in MongoDB, creating...');
      user = await User.create({
        name: 'Auditor Test',
        email: 'auditor-test@example.com',
        password_hash: '$2b$10$mock_auditor_hash',
        role: 'auditor',
        firebase_uid: 'gyXqBZnsHYaA6yGEEudAnWO4GCF3', // From Firebase setup output
      });
      console.log('✅ User created with auditor role');
    } else {
      console.log('✅ User found');
      console.log(`   Current role: ${user.role}`);
      
      if (user.role !== 'auditor') {
        console.log('\n[3] Updating role to auditor...');
        user.role = 'auditor';
        await user.save();
        console.log('✅ Role updated to auditor');
      } else {
        console.log('✅ Role is already auditor');
      }
    }

    console.log('\n[4] Verifying...');
    const verify = await User.findOne({ email: 'auditor-test@example.com' });
    console.log(`✅ Final state:`);
    console.log(`   Email: ${verify.email}`);
    console.log(`   Role: ${verify.role}`);
    console.log(`   Firebase UID: ${verify.firebase_uid}`);

    await mongoose.disconnect();
    console.log('\n' + '='.repeat(70));
    console.log('✅ MongoDB User document updated successfully');
    console.log('='.repeat(70) + '\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

updateAuditorRole();
