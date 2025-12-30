#!/usr/bin/env node
/**
 * Seed Default Feature Entitlements
 *
 * Usage:
 *   npm run seed-feature-entitlements
 */

import { FirestoreService } from '../services/firestore.service';
import { DEFAULT_FEATURE_ENTITLEMENTS } from './feature-seed.defaults';

const FEATURE_ENTITLEMENTS_COLLECTION = 'FeatureEntitlements';

async function seedFeatureEntitlements() {
  try {
    console.log('🌱 Seeding default feature entitlements...');

    for (const entitlement of DEFAULT_FEATURE_ENTITLEMENTS) {
      const documentPath = `${FEATURE_ENTITLEMENTS_COLLECTION}/${entitlement.id}`;
      await FirestoreService.setDocument(documentPath, entitlement);
      console.log(`✅ Seeded entitlement: ${entitlement.name} (${entitlement.id})`);
    }
  } catch (error) {
    console.error('❌ Failed to seed default feature entitlements.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}

seedFeatureEntitlements()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
