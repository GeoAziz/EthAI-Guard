#!/usr/bin/env node
/*
 Simple seeding script for backend users. Creates test users with various roles.
 Usage:
   NODE_ENV=development node backend/scripts/seedUsers.js [mapping.json|mapping.csv]
 Environment:
   MONGO_URL - optional MongoDB connection string
   AUTH_PROVIDER=firebase - optional; if set and firebase-admin is configured, attempts to set custom claims.
   SEED_MAPPING_JSON - alternative environment variable pointing to a JSON file with [{ email, firebase_uid }, ...]

 The script will merge any provided mapping (by email) and, when AUTH_PROVIDER=firebase and firebaseAdmin is available,
 will call firebaseAdmin.setCustomUserClaims(firebase_uid, { roles: [role] }) for mapped users.
*/

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/ethixai';
const USE_IN_MEMORY = process.env.USE_IN_MEMORY_DB === '1' || process.env.NODE_ENV === 'test';

async function main() {
  if (USE_IN_MEMORY) {
    console.log('USE_IN_MEMORY set — seeding in-memory store is not supported by this script. Start backend in normal mode or set MONGO_URL.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB:', MONGO_URL);
  await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected.');

  const User = require(path.join(__dirname, '..', 'src', 'models', 'User'));

  const users = [
    { name: 'Promote Test', email: 'promote-test@example.com', password: 'PromotePass123!', role: 'admin', firebase_uid: null },
    { name: 'Analyst Test', email: 'analyst-test@example.com', password: 'AnalystPass123!', role: 'analyst', firebase_uid: null },
    { name: 'Reviewer Test', email: 'reviewer-test@example.com', password: 'ReviewerPass123!', role: 'reviewer', firebase_uid: null },
    { name: 'Regular User', email: 'user-test@example.com', password: 'UserPass123!', role: 'user', firebase_uid: null },
    { name: 'Guest User', email: 'guest-test@example.com', password: 'GuestPass123!', role: 'guest', firebase_uid: null }
  ];

  // Optional mapping file (JSON or CSV) to attach firebase_uids to seeded users.
  // Usage: node backend/scripts/seedUsers.js mapping.json
  const mappingPath = process.argv[2] || process.env.SEED_MAPPING_JSON;
  if (mappingPath) {
    const fs = require('fs');
    try {
      const raw = fs.readFileSync(mappingPath, 'utf8');
      let mappings = [];
      if (mappingPath.toLowerCase().endsWith('.json')) {
        mappings = JSON.parse(raw);
      } else {
        // simple CSV parser: header email,firebase_uid (optional role)
        const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const header = lines.shift().split(',').map(h => h.trim().toLowerCase());
        const emailIdx = header.indexOf('email');
        const uidIdx = header.indexOf('firebase_uid');
        const roleIdx = header.indexOf('role');
        mappings = lines.map(line => {
          const parts = line.split(',').map(p => p.trim());
          return { email: parts[emailIdx], firebase_uid: parts[uidIdx] || null, role: parts[roleIdx] || undefined };
        });
      }

      // Merge mappings into users array by email
      for (const m of mappings) {
        if (!m || !m.email) continue;
        const found = users.find(u => u.email.toLowerCase() === (m.email || '').toLowerCase());
        if (found) {
          found.firebase_uid = m.firebase_uid || found.firebase_uid;
          if (m.role) found.role = m.role;
          console.log('Mapping applied for', found.email, '->', found.firebase_uid);
        } else {
          // If mapping contains an email not in defaults, append a new user with provided data.
          users.push({ name: m.name || m.email.split('@')[0], email: m.email, password: 'ChangeMe123!', role: m.role || 'user', firebase_uid: m.firebase_uid || null });
          console.log('Added new seeded user from mapping:', m.email);
        }
      }
    } catch (e) {
      console.warn('Failed to read/parse mapping file', mappingPath, e.message || e);
    }
  }

  const firebaseAdminAvailable = (() => {
    try {
      require.resolve('../src/services/firebaseAdmin');
      return true;
    } catch (e) {
      return false;
    }
  })();

  let firebaseAdmin = null;
  if (process.env.AUTH_PROVIDER === 'firebase' && firebaseAdminAvailable) {
    try {
      firebaseAdmin = require('../src/services/firebaseAdmin');
      firebaseAdmin.initFirebase();
    } catch (e) {
      console.warn('Failed to init firebaseAdmin, proceeding without setting custom claims:', e.message || e);
      firebaseAdmin = null;
    }
  }

  // Aggressive cleanup: drop the users collection before seeding
  try {
    await mongoose.connection.dropCollection('users');
    console.log('Dropped users collection for a full reset.');
  } catch (dropErr) {
    if (dropErr.code === 26) {
      // NamespaceNotFound: collection does not exist, safe to ignore
      console.log('Users collection did not exist, nothing to drop.');
    } else {
      console.error('Error dropping users collection:', dropErr.message || dropErr);
    }
  }

  for (const u of users) {
    try {
      const existing = await User.findOne({ email: u.email });
      const hash = await bcrypt.hash(u.password, 10);
      if (existing) {
        existing.name = u.name;
        existing.password_hash = hash;
        existing.role = u.role;
        if (u.firebase_uid) existing.firebase_uid = u.firebase_uid;
        await existing.save();
        console.log('Updated user:', u.email, 'role=', u.role, 'firebase_uid=', existing.firebase_uid);
      } else {
        try {
          await User.create({ name: u.name, email: u.email, password_hash: hash, role: u.role, firebase_uid: u.firebase_uid });
          console.log('Created user:', u.email, 'role=', u.role, 'firebase_uid=', u.firebase_uid);
        } catch (createErr) {
          if (createErr.code === 11000 && String(createErr.message).includes('firebase_uid')) {
            console.error('Duplicate firebase_uid for', u.email, '— skipping.');
          } else {
            console.error('Error creating user', u.email, createErr.message || createErr);
          }
        }
      }

      if (firebaseAdmin) {
        try {
          // Ensure a Firebase Auth user exists for this email/uid; if not, create one.
          let fbUid = u.firebase_uid || null;
          try {
            if (fbUid) {
              // Try to lookup by provided uid
              try {
                await firebaseAdmin.getUser(fbUid);
              } catch (notFoundErr) {
                // create with provided uid
                // Mark privileged roles as emailVerified
                const isPrivileged = ['admin', 'analyst', 'reviewer'].includes(u.role);
                const created = await firebaseAdmin.createUser({ email: u.email, password: u.password, uid: fbUid, displayName: u.name, emailVerified: isPrivileged });
                fbUid = created.uid;
                console.log('Created firebase user (by uid) for', u.email, fbUid);
              }
            } else {
              // Try to find by email
              try {
                const found = await firebaseAdmin.getUserByEmail(u.email);
                fbUid = found.uid;
              } catch (byEmailErr) {
                // Not found by email — create a Firebase user
                // Mark privileged roles as emailVerified
                const isPrivileged = ['admin', 'analyst', 'reviewer'].includes(u.role);
                const created = await firebaseAdmin.createUser({ email: u.email, password: u.password, displayName: u.name, emailVerified: isPrivileged });
                fbUid = created.uid;
                console.log('Created firebase user (by email) for', u.email, fbUid);
              }
            }

            // If Mongo user didn't have a firebase_uid, persist it so future runs are deterministic
            if (fbUid && (!existing || !existing.firebase_uid)) {
              try {
                const mongoUser = await User.findOne({ email: u.email });
                if (mongoUser && !mongoUser.firebase_uid) {
                  mongoUser.firebase_uid = fbUid;
                  await mongoUser.save();
                  console.log('Persisted firebase_uid to mongo for', u.email);
                }
              } catch (e) {
                // non-fatal
              }
            }

            // Set custom claims (roles) on the Firebase user
            if (fbUid) {
              try {
                await firebaseAdmin.setCustomUserClaims(fbUid, { roles: [u.role] });
                console.log('Set firebase custom claims for', u.email, fbUid);
              } catch (e) {
                console.warn('Failed to set firebase claims for', u.email, e.message || e);
              }
            }
          } catch (fbErr) {
            console.warn('Firebase provisioning failed for', u.email, fbErr && fbErr.message ? fbErr.message : fbErr);
          }
        } catch (e) {
          console.warn('Failed to provision firebase user/claims for', u.email, e && e.message ? e.message : e);
        }
      }
    } catch (e) {
      console.error('Error processing user', u.email, e.message || e);
    }
  }

  console.log('Seeding complete. Disconnecting.');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(2);
});
