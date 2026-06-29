const express = require('express');
const Alert = require('../models/Alert');
const { protect } = require('../middleware/auth');
const { parseBoundedInteger } = require('../utils/queryParams');

const router = express.Router();

// @GET /api/alerts - Get all alerts for user
router.get('/', protect, async (req, res) => {
  try {
    const { unread } = req.query;
    const limit = parseBoundedInteger(req.query.limit, { fallback: 20, min: 1, max: 100 });
    const query = { user: req.user._id };
    if (unread === 'true') query.read = false;

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    const unreadCount = await Alert.countDocuments({ user: req.user._id, read: false });

    res.json({ success: true, alerts, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @PUT /api/alerts/:id/read - Mark single alert as read
router.put('/:id/read', protect, async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @PUT /api/alerts/read-all - Mark all alerts as read
router.put('/read-all', protect, async (req, res) => {
  try {
    await Alert.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ success: true, message: 'All alerts marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @DELETE /api/alerts/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await Alert.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Alert deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
