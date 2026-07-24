/**
 * Page-specific expectations for SEO static/production checks.
 * Add a new entry here when a commercial marketing page is ready for verification.
 */

/** @typedef {import('./shared.mjs').PageConfig} PageConfig */

/** @type {Record<string, PageConfig>} */
export const PAGE_CONFIGS = {
  homepage: {
    key: "homepage",
    file: "landing-page/index.html",
    url: "https://www.simplerosterplus.com/",
    title: "Employee Roster Software for Small Teams | Simple Roster Plus",
    h1: "Build and Share Staff Rosters—Then Track What Actually Happened",
    canonical: "https://www.simplerosterplus.com/",
    requiredSchemaTypes: ["Organization", "WebSite", "SoftwareApplication"],
    requiredInternalLinks: [
      "/employee-scheduling-software",
      "/employee-attendance-software",
      "/employee-leave-and-availability",
      "/employee-time-clock-app",
      "/small-business-employee-scheduling",
      "/zkteco-attendance-integration",
    ],
  },
  "employee-scheduling-software": {
    key: "employee-scheduling-software",
    file: "landing-page/employee-scheduling-software/index.html",
    url: "https://www.simplerosterplus.com/employee-scheduling-software",
    title: "Employee Scheduling Software for Small Teams | Simple Roster Plus",
    h1: "Employee Scheduling Software That Keeps Every Shift Clear",
    canonical: "https://www.simplerosterplus.com/employee-scheduling-software",
    requiredSchemaTypes: ["WebPage", "BreadcrumbList"],
    requiredInternalLinks: [
      "/employee-leave-and-availability",
      "/employee-attendance-software",
      "/employee-time-clock-app",
      "/small-business-employee-scheduling",
    ],
  },
  "employee-attendance-software": {
    key: "employee-attendance-software",
    file: "landing-page/employee-attendance-software/index.html",
    url: "https://www.simplerosterplus.com/employee-attendance-software",
    title: "Employee Attendance Software Connected to Your Roster | Simple Roster Plus",
    h1: "Employee Attendance Software That Shows What Actually Happened",
    canonical: "https://www.simplerosterplus.com/employee-attendance-software",
    requiredSchemaTypes: ["WebPage", "BreadcrumbList"],
    requiredInternalLinks: [
      "/employee-scheduling-software",
      "/employee-leave-and-availability",
      "/employee-time-clock-app",
      "/zkteco-attendance-integration",
    ],
  },
  "zkteco-attendance-integration": {
    key: "zkteco-attendance-integration",
    file: "landing-page/zkteco-attendance-integration/index.html",
    url: "https://www.simplerosterplus.com/zkteco-attendance-integration",
    title: "ZKTeco Attendance Integration | Simple Roster Plus",
    h1: "Connect Supported ZKTeco Attendance Terminals to Your Staff Roster",
    canonical: "https://www.simplerosterplus.com/zkteco-attendance-integration",
    requiredSchemaTypes: ["WebPage", "BreadcrumbList"],
    requiredInternalLinks: [
      "/employee-attendance-software",
      "/employee-time-clock-app",
    ],
  },
  "small-business-employee-scheduling": {
    key: "small-business-employee-scheduling",
    file: "landing-page/small-business-employee-scheduling/index.html",
    url: "https://www.simplerosterplus.com/small-business-employee-scheduling",
    title: "Employee Scheduling Software for Small Business | Simple Roster Plus",
    h1: "Simple Employee Scheduling Software for Small Businesses",
    canonical: "https://www.simplerosterplus.com/small-business-employee-scheduling",
    requiredSchemaTypes: ["WebPage", "BreadcrumbList"],
    requiredInternalLinks: [
      "/employee-scheduling-software",
      "/employee-leave-and-availability",
      "/employee-attendance-software",
      "/employee-time-clock-app",
      "/zkteco-attendance-integration",
    ],
  },
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
