/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {NodeJS.ProcessEnv}
 */
export function ensureDirectUrl(env) {
  if (env.DIRECT_URL?.trim()) {
    return env;
  }

  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    return env;
  }

  const directUrl = databaseUrl.includes("-pooler.")
    ? databaseUrl.replace(/-pooler\./g, ".")
    : databaseUrl;

  return { ...env, DIRECT_URL: directUrl };
}
