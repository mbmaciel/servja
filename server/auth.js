import jwt from 'jsonwebtoken';
import { config } from './config.js';

export const createAuthToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      tipo: user.tipo,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

export const verifyAuthToken = (token) => jwt.verify(token, config.jwtSecret);
