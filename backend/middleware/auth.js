const jwt = require('jsonwebtoken');
const pool = require('../db/postgres');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query('SELECT id, email, name, created_at FROM users WHERE id = $1', [decoded.id]);
    req.user = rows[0];
    
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    // Map _id to id to avoid breaking other routes/queries referencing req.user._id
    req.user._id = req.user.id;
    
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

module.exports = { protect };
