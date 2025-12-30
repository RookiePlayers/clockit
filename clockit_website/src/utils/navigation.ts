/**
 * Navigation utilities for building feature-gated navigation links
 */

type NavLink = {
  href: string;
  label: string;
  active?: boolean;
};

type FeatureFlags = {
  clockitOnlineEnabled: boolean;
  advancedStatsEnabled: boolean;
  sessionActivityEnabled: boolean;
};

/**
 * Build navigation links based on feature flags
 * @param features - Feature flags from useFeature hook
 * @param activePage - Current active page (optional)
 * @returns Array of navigation links
 */
export function buildNavLinks(
  features: FeatureFlags,
  activePage?: 'dashboard' | 'clockit-online' | 'advanced-stats' | 'session-activity' | 'profile' | 'docs'
): NavLink[] {
  const links: NavLink[] = [
    { href: "/dashboard", label: "Dashboard", active: activePage === 'dashboard' },
  ];

  if (features.clockitOnlineEnabled) {
    links.push({ href: "/clockit-online", label: "Clockit Online", active: activePage === 'clockit-online' });
  }

  if (features.advancedStatsEnabled) {
    links.push({ href: "/advanced-stats", label: "Advanced Stats", active: activePage === 'advanced-stats' });
  }

  if (features.sessionActivityEnabled) {
    links.push({ href: "/session-activity", label: "Session Activity", active: activePage === 'session-activity' });
  }

  links.push({ href: "/docs", label: "Docs", active: activePage === 'docs' });

  return links;
}

/**
 * Check if a feature is enabled for navigation
 */
export function isFeatureEnabledForNav(
  isFeatureEnabled: (feature: string) => boolean
): FeatureFlags {
  return {
    clockitOnlineEnabled: isFeatureEnabled("clockit-online"),
    advancedStatsEnabled: isFeatureEnabled("advanced-stats") || isFeatureEnabled("base-stats"),
    sessionActivityEnabled: isFeatureEnabled("session-activity") || isFeatureEnabled("session-explorer"),
  };
}
