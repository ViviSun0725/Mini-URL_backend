import express from 'express';
import { body } from 'express-validator';
import { registerUser, loginUser } from '../controllers/authController.js';

const router = express.Router();

// User Registration
// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().withMessage('Invalid email format').escape(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long').escape()
], registerUser);

// User Login
// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('Invalid email format').escape(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long').escape(),
], loginUser)

export default router;