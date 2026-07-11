import type { Prisma, PrismaClient } from "@prisma/client";
import { DEFAULT_SHIFT_PRESETS } from "@/lib/shift-presets";

type DbClient = PrismaClient | Prisma.TransactionClient;

/** Idempotent: create starter shift presets when an org has none. */
export async function ensureDefaultShiftTemplates(
  organizationId: string,
  db: DbClient,
): Promise<number> {
  const existing = await db.shiftTemplate.count({ where: { organizationId } });
  if (existing > 0) return 0;

  await db.shiftTemplate.createMany({
    data: DEFAULT_SHIFT_PRESETS.map((preset) => ({
      organizationId,
      name: preset.name,
      startTime: preset.startTime,
      endTime: preset.endTime,
      unpaidBreakMinutes: preset.unpaidBreakMinutes,
      color: preset.color,
    })),
  });

  return DEFAULT_SHIFT_PRESETS.length;
}
