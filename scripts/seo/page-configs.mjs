/**
 * Page-specific expectations for SEO static/production checks.
 * Add a new entry here when a commercial marketing page is ready for verification.
 */

/** @typedef {import('./shared.mjs').PageConfig} PageConfig */

/** @type {Record<string, PageConfig>} */
export const PAGE_CONFIGS = {
  "employee-leave-and-availability": {
    key: "employee-leave-and-availability",
    file: "landing-page/employee-leave-and-availability/index.html",
    url: "https://www.simplerosterplus.com/employee-leave-and-availability",
    title: "Employee Leave and Availability Software | Simple Roster Plus",
    h1: "Manage Leave and Availability Before You Build the Roster",
    canonical: "https://www.simplerosterplus.com/employee-leave-and-availability",
    requiredSchemaTypes: ["WebPage", "BreadcrumbList"],
    requiredInternalLinks: [
      "/employee-scheduling-software",
      "/employee-attendance-software",
      "/small-business-employee-scheduling",
    ],
  },
  "employee-time-clock-app": {
    key: "employee-time-clock-app",
    file: "landing-page/employee-time-clock-app/index.html",
    url: "https://www.simplerosterplus.com/employee-time-clock-app",
    title: "Employee Time Clock Software for Scheduled Teams | Simple Roster Plus",
    h1: "Connect Clock Events to the Weekly Roster",
    canonical: "https://www.simplerosterplus.com/employee-time-clock-app",
    requiredSchemaTypes: ["WebPage", "BreadcrumbList"],
    requiredInternalLinks: [
      "/employee-attendance-software",
      "/zkteco-attendance-integration",
      "/employee-scheduling-software",
      "/small-business-employee-scheduling",
      "/employee-leave-and-availability",
    ],
  },
};

/**
 * @param {string} key
 * @returns {PageConfig}
 */
export function getPageConfig(key) {
  const config = PAGE_CONFIGS[key];
  if (!config) {
    const known = Object.keys(PAGE_CONFIGS).sort().join(", ") || "(none)";
    throw new Error(`Unknown page key "${key}". Known keys: ${known}`);
  }
  return config;
}

export function listPageConfigs() {
  return Object.values(PAGE_CONFIGS);
}
