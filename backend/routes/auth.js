const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  age: user.age,
  gender: user.gender,
  weight: user.weight,
  height: user.height,
  dailyGoals: user.dailyGoals,
  subscription: user.subscription,
  organization: user.organization,
  onboarding: user.onboarding,
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

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password,
      ...(age !== undefined ? { age } : {}),
      ...(gender ? { gender } : {}),
      ...(weight !== undefined ? { weight } : {}),
      ...(height !== undefined ? { height } : {}),
      ...(organization ? { organization } : {}),
    });
    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: serializeUser(user),
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
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

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken(user._id);
    res.json({
      success: true,
      token,
      user: serializeUser(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: serializeUser(req.user) });
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
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        name,
        age,
        gender,
        weight,
        height,
        organization: normalizedOrganization,
        ...(onboarding ? { onboarding } : {}),
      },
      { new: true, runValidators: true }
    );
    res.json({ success: true, user: serializeUser(user) });
  } catch (err) {
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
