import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { config } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { defaultRateLimiter } from './middleware/rate-limit';
import { cache } from './middleware/cache';
import routes from './routes';
import { logger } from './utils/logger';

export const createApp = (): Application => {
  const app = express();

  app.use(helmet());

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || config.allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );

  app.use(compression());

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  const morganFormat = config.isDevelopment ? 'dev' : 'combined';
  app.use(
    morgan(morganFormat, {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    })
  );

  app.use(defaultRateLimiter);

  app.use(cache());

  app.use('/api/v1', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
