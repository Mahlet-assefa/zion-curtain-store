import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../database/client';
import { requireAuth } from '../middleware/auth';

const router = Router();

const signupCredentials = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6),
  role: z.enum(['admin', 'sales_person']).default('sales_person')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

const signinCredentials = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['admin', 'sales_person']).optional()
});

const tokenFor = (user: { id: string; role: string }) =>
  jwt.sign(user, process.env.JWT_SECRET || 'development-secret', { expiresIn: '8h' });

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = signupCredentials.parse(req.body);
    const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`;
    const hash = await bcrypt.hash(data.password, 12);

    const result = await query<{ id: string; email: string; full_name: string; role: string }>(
      `INSERT INTO users(email, password_hash, full_name, role) VALUES($1, $2, $3, $4) RETURNING id, email, full_name, role`,
      [data.email.toLowerCase().trim(), hash, fullName, data.role]
    );

    const user = result.rows[0];
    res.status(201).json({ token: tokenFor(user), user });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }
    next(error);
  }
});

// POST /api/auth/signin
router.post('/signin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = signinCredentials.parse(req.body);
    const result = await query<{ id: string; email: string; full_name: string; role: string; password_hash: string }>(
      `SELECT * FROM users WHERE LOWER(email)=$1`,
      [data.email.toLowerCase().trim()]
    );

    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(data.password, user.password_hash))) {
      return res.status(401).json({ message: 'Email or password is incorrect' });
    }

    res.json({
      token: tokenFor(user),
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    const result = await query(`SELECT id, email, full_name, role FROM users WHERE id = $1`, [userId]);
    if (!result.rowCount) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
