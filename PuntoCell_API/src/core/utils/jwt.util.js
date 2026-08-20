import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const generateToken = (payload, expiresIn = '8h') => {
  return jwt.sign(payload, env.JWT.SECRET, { expiresIn });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.JWT.SECRET);
  } catch (error) {
    return null;
  }
};