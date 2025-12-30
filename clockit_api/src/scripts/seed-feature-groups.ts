#!/usr/bin/env node
/**
 * Seed Default Feature Groups
 *
 * Usage:
 *   npm run seed-feature-groups
 *   npm run seed-feature-groups -- --all  (seed all feature groups)
 */

import { FeatureGroupService } from '../services/feature-group.service';
import { FirestoreService } from '../services/firestore.service';
import type { FeatureGroup } from '../types/feature-group.types';
import {
  DEFAULT_FEATURE_GROUP_DESCRIPTION,
  DEFAULT_FEATURE_GROUP_ID,
  DEFAULT_FEATURE_GROUP_NAME,
  DEFAULT_CLOCKIT_ONLINE_FEATURES,
  ALL_FEATURE_GROUPS,
} from './feature-seed.defaults';



async function seedDefaultFeatureGroup() {
  try {
    console.log('🌱 Seeding default feature group...');

    const existing = await FeatureGroupService.getFeatureGroup(DEFAULT_FEATURE_GROUP_ID);
    const now = new Date().toISOString();

    const featureGroup: FeatureGroup = {
      id: DEFAULT_FEATURE_GROUP_ID,
      name: existing?.name ?? DEFAULT_FEATURE_GROUP_NAME,
      description: existing?.description ?? DEFAULT_FEATURE_GROUP_DESCRIPTION,
      features: {
        ...(existing?.features ?? {}),
        ...DEFAULT_CLOCKIT_ONLINE_FEATURES,
      },
      isActive: existing?.isActive ?? true,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await FirestoreService.setDocument(
      `FeatureGroups/${DEFAULT_FEATURE_GROUP_ID}`,
      featureGroup
    );

    console.log(`✅ Seeded feature group: ${featureGroup.name} (${featureGroup.id})`);
    console.log(`   Features: ${Object.keys(featureGroup.features).join(', ')}`);
  } catch (error) {
    console.error('❌ Failed to seed default feature group.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}

async function seedAllFeatureGroups() {
  try {
    console.log('🌱 Seeding all feature groups...\n');

    for (const group of ALL_FEATURE_GROUPS) {
      const existing = await FeatureGroupService.getFeatureGroup(group.id);
      const now = new Date().toISOString();

      const featureGroup: FeatureGroup = {
        ...group,
        features: {
          ...(existing?.features ?? {}),
          ...group.features,
        },
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      await FirestoreService.setDocument(
        `FeatureGroups/${group.id}`,
        featureGroup
      );

      console.log(`✅ Seeded feature group: ${featureGroup.name} (${featureGroup.id})`);
      console.log(`   Features: ${Object.keys(featureGroup.features).join(', ')}`);
      console.log('');
    }

    console.log('📋 Summary:');
    console.log(`   Total feature groups: ${ALL_FEATURE_GROUPS.length}`);
    console.log(`   Total unique features: ${new Set(ALL_FEATURE_GROUPS.flatMap(g => Object.keys(g.features))).size}`);
  } catch (error) {
    console.error('❌ Failed to seed all feature groups.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}

const seedAll = process.argv.includes('--all');

const seedFunction = seedAll ? seedAllFeatureGroups : seedDefaultFeatureGroup;

seedFunction()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
