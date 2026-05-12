import { PrismaClient, Prisma } from '@prisma/client';

type AnyPrismaClient = PrismaClient | Prisma.TransactionClient;

export async function applyCategorizationRules(
  text: string,
  client: AnyPrismaClient,
): Promise<string | null> {
  const rules = await client.categorizationRule.findMany({
    where: { isActive: true },
    orderBy: { priority: 'desc' },
    select: { pattern: true, isRegex: true, categoryId: true },
  });

  const normalized = text.toLowerCase();

  for (const rule of rules) {
    if (rule.isRegex) {
      try {
        const re = new RegExp(rule.pattern, 'i');
        if (re.test(text)) return rule.categoryId;
      } catch {
        // patrón regex inválido — saltar
      }
    } else {
      if (normalized.includes(rule.pattern.toLowerCase())) {
        return rule.categoryId;
      }
    }
  }

  return null;
}
