import { Router } from 'express';
import tokensRoutes from './tokens.routes';
import uploadsRoutes from './uploads.routes';
import goalsRoutes from './goals.routes';
import sessionsRoutes from './sessions.routes';
import statsRoutes from './stats.routes';
import featuresRoutes from './features.routes';
import featureGroupRoutes from './feature-group.routes';
import rbacRoutes from './rbac.routes';
import adminSetupRoutes from './admin-setup.routes';

const router = Router();

router.use('/tokens', tokensRoutes);
router.use('/uploads', uploadsRoutes);
router.use('/goals', goalsRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/stats', statsRoutes);
router.use('/features', featuresRoutes);
router.use('/feature-groups', featureGroupRoutes);
router.use('/rbac', rbacRoutes);
router.use('/admin-setup', adminSetupRoutes);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
