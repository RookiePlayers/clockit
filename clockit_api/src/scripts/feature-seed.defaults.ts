import { FeatureGroup } from '@/types/feature-group.types';
import type { FeatureEntitlement } from '../types/features.types';
export const DEFAULT_CLOCKIT_ONLINE_FEATURES: Record<string, boolean> = {
  'clockit-online': true,
  'create-goals-for-sessions': true,
  'create-sessions': true,
};

export const DEFAULT_GUEST_FEATURES: Record<string, boolean> = {
  'clockit-online': true,
  'create-goals-for-sessions': false,
  'create-sessions': true,
};

export const DEFAULT_DASHBOARD_FEATURES: Record<string, boolean> = {
  'dashboard-productivity-at-a-glance': true,
  'dashboard-focus-radars': true,
  'recent-activity': true,
  'upload-csv-data': true,
};

export const DEFAULT_STATS_FEATURES: Record<string, boolean> = {
  'base-stats': true,
  'advanced-stats': true,
  'clockit-focus-stats': false,
  'focus-radar': true,
  'grade-breakdown': true,
  'detailed-analytics': true,
};

export const DEFAULT_SESSION_ACTIVITY_FEATURES: Record<string, boolean> = {
  'session-activity': true,
  'session-explorer': true,
  'export-data': true,
};

export const DEFAULT_IDE_INTEGRATIONS_FEATURES: Record<string, boolean> = {
  'ide-integration': true,
  'custom-integrations': true,
  'api-access': true,
};

export const DEFAULT_SUPPORT_FEATURES: Record<string, boolean> = {
  'priority-support': true,
  'dedicated-support': false,
};

export const ALL_FEATURE_GROUPS: Omit<FeatureGroup, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'clockit-online',
    name: 'Clockit Online',
    description: 'Base access to Clockit Online features.',
    features: DEFAULT_CLOCKIT_ONLINE_FEATURES,
    isActive: true,
  },
  {
    id: 'dashboard-features',
    name: 'Dashboard Features',
    description: 'Dashboard and data visualization features for Clockit Online.',
    features: DEFAULT_DASHBOARD_FEATURES,
    isActive: true,
  },
  {
    id: 'stats-features',
    name: 'Stats Features',
    description: 'Statistics, analytics, and reporting features for Clockit Online.',
    features: DEFAULT_STATS_FEATURES,
    isActive: true,
  },
  {
    id: 'session-activity-features',
    name: 'Session Activity Features',
    description: 'Features related to session activity tracking and data export.',
    features: DEFAULT_SESSION_ACTIVITY_FEATURES,
    isActive: true,
  },
  {
    id: 'ide-integrations-features',
    name: 'IDE Integrations Features',
    description: 'Features for IDE integrations, custom integrations, and API access.',
    features: DEFAULT_IDE_INTEGRATIONS_FEATURES,
    isActive: true,
  },
  {
    id: 'support-features',
    name: 'Support Features',
    description: 'Support-related features including priority and dedicated support.',
    features: DEFAULT_SUPPORT_FEATURES,
    isActive: true,
  },
  {
    id: 'team-features',
    name: 'Team Features',
    description: 'Features for team collaboration, management, and shared resources.',
    features: {
      'team-collaboration': false,
      'team-management': false,
      'shared-reports': false,
      'role-based-access': false,
    },
    isActive: true,
  },
];

export const DEFAULT_FEATURE_GROUP_ID = 'clockit-online';
export const DEFAULT_FEATURE_GROUP_NAME = 'Clockit Online';
export const DEFAULT_FEATURE_GROUP_DESCRIPTION = 'Base access to Clockit Online features.';


export const DEFAULT_FEATURE_ENTITLEMENTS: FeatureEntitlement[] = [
  {
    id: 'free',
    name: 'Free',
    featureGroups: [
      DEFAULT_STATS_FEATURES,
      DEFAULT_SESSION_ACTIVITY_FEATURES,
      DEFAULT_IDE_INTEGRATIONS_FEATURES,
      DEFAULT_DASHBOARD_FEATURES
    ],
    features: {},
  },
  {
    id: 'guest',
    name: 'Guest',
    featureGroups: [
      DEFAULT_GUEST_FEATURES
    ],
    features: {},
  },
];
