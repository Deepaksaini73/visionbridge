import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import syncRoutes from './routes/syncRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import userRoutes from './routes/userRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import screeningRoutes from './routes/screeningRoutes.js';
import imageRoutes from './routes/imageRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// Security and utility middleware
app.use(helmet({
  contentSecurityPolicy: false // Allows inline images/fonts during rapid development
}));
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(morgan('dev'));

// API Routing
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/screenings', screeningRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/ai', aiRoutes);

// Root fallback / ping
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'VisionBridge Platform API',
    tagline: 'Speak. We listen. An eye-care professional reviews.',
    status: 'ACTIVE',
    version: '1.2.0',
    documentation: '/docs',
    healthCheck: '/api/health'
  });
});

// 404 Not Found
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested VisionBridge API endpoint does not exist'
    }
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
