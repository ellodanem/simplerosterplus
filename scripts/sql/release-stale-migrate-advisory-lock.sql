-- Prisma Migrate uses advisory lock objid 72707369. Idle sessions that did not
-- release the lock (crashed deploy, pooler, etc.) block the next migrate deploy.
-- Only terminate idle holders; do not kill active migration sessions.
SELECT pg_terminate_backend(psa.pid)
FROM pg_locks pl
INNER JOIN pg_stat_activity psa ON psa.pid = pl.pid
WHERE pl.locktype = 'advisory'
  AND pl.objid = 72707369
  AND psa.state LIKE 'idle';
