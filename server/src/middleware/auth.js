import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'No access token provided.' }
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).populate('linkedAccounts.userId', 'fullName email userType');
    
    if (!user || user.deletedAt) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'User account has been suspended or deleted.' }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Access token is invalid or expired.' }
    });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: { code: 'UNAUTHORIZED_ROLE', message: 'You do not have access to this resource.' }
      });
    }
    next();
  };
};
