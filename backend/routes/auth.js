const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../db/postgres');
const Profile = require('../models/Profile');
const { protect } = require('../middleware/auth');

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const serializeUser = (user, profile = {}) => ({
  id: user.id || user._id,
  _id: user.id || user._id,   // alias for frontend compatibility
  name: user.name,
  email: user.email,
  age: profile?.age,
  gender: profile?.gender,
  weight: profile?.weight,
  height: profile?.height,
  dailyGoals: profile?.dailyGoals || { steps: 10000, activeMinutes: 60, hydration: 100 },
  subscription: profile?.subscription || { plan: 'starter', billingCycle: 'monthly', status: 'active' },
  organization: profile?.organization || {},
  onboarding: profile?.onboarding || { completed: false },
});

// @POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, age, gender, weight, height, organization } = req.body;
    const normalizedName = name?.trim();
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists in PostgreSQL
    const existingCheck = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Insert user into PostgreSQL
    const userRes = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [normalizedName, normalizedEmail, password_hash]
    );
    const user = userRes.rows[0];

    // Create profile in MongoDB
    const profile = await Profile.create({
      userId: user.id,
      ...(age !== undefined ? { age } : {}),
      ...(gender ? { gender } : {}),
      ...(weight !== undefined ? { weight } : {}),
      ...(height !== undefined ? { height } : {}),
      ...(organization ? { organization } : {}),
    });

    const token = signToken(user.id);

    res.status(201).json({
      success: true,
      token,
      user: serializeUser(user, profile),
    });
  } catch (err) {
    console.error('❌ /register error:', err.message, err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Query user from PostgreSQL
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userRes.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Fetch profile from MongoDB (upsert in case it doesn't exist)
    let profile = await Profile.findOne({ userId: user.id });
    if (!profile) {
      profile = await Profile.create({ userId: user.id });
    }

    const token = signToken(user.id);
    res.json({
      success: true,
      token,
      user: serializeUser(user, profile),
    });
  } catch (err) {
    console.error('❌ /login error:', err.message, err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    let profile = await Profile.findOne({ userId: req.user.id });
    if (!profile) {
      profile = await Profile.create({ userId: req.user.id });
    }
    res.json({ success: true, user: serializeUser(req.user, profile) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const {
      name,
      age,
      gender,
      weight,
      height,
      organization,
      organizationName,
      organizationRole,
      onboarding,
    } = req.body;

    const normalizedOrganization = organization || {
      name: organizationName,
      role: organizationRole,
    };

    // Update name in PostgreSQL
    const userRes = await pool.query(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING *',
      [name || req.user.name, req.user.id]
    );
    const user = userRes.rows[0];

    // Update profile in MongoDB
    const profile = await Profile.findOneAndUpdate(
      { userId: req.user.id },
      {
        age,
        gender,
        weight,
        height,
        organization: normalizedOrganization,
        ...(onboarding ? { onboarding } : {}),
      },
      { new: true, runValidators: true, upsert: true }
    );

    res.json({ success: true, user: serializeUser(user, profile) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
