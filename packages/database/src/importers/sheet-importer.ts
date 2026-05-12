import { PrismaClient, Prisma, TransactionSource } from '@prisma/client';
import { endOfMonth, startOfMonth, parseISO } from 'date-fns';

export interface SheetImportData {
  month: string;
  payments: Payment[];
  invoices: Invoice[];
  visa: VisaItem[];
  opportunities: OpportunityImport[];
  exchangeRate: { USD_CLP: number };
}

interface Payment {
  item: string;
  amount: number;
  paid: boolean;
  comment: string;
  company: string;
}

interface Invoice {
  rut: string;
  number: string;
  type: 'AFECTA' | 'EXENTA';
  counterparty: string;
  service: string;
  net: number;
  iva: number;
  total: number;
  sent: boolean;
  paidAt: string | null;
}

interface VisaItem {
  item: string;
  amountCLP: number | null;
  amountUSD: number | null;
}

interface OpportunityImport {
  name: string;
  amount: number;
  company: string;
}

const ITEM_TO_CATEGORY: Record<string, string> = {
  'IVA + PPM': 'IVA + PPM',
  'F29': 'F29',
  'PPM': 'IVA + PPM',
  'Pagos previsionales': 'Pagos previsionales',
  'Sueldo Damian': 'Sueldo developers',
  'Sueldo Juan': 'Sueldo socios',
  'Bryan Cartagena': 'Sueldo developers',
  'Luis Silva': 'Sueldo developers',
  'Luis Farías': 'Honorarios externos',
  'Eduardo Ricci': 'Honorarios externos',
  'Cuota Fogape': 'Cuota Fogape',
  'Préstamo BCI Celulares': 'Préstamo BCI',
  'Visa': 'Tarjeta Visa',
  'Mails de AW': 'Mails corporativos',
  'Canva': 'Canva',
  'Google Workspace Maxiclima': 'Google Workspace',
  'ChatGPT': 'ChatGPT',
  'Claude': 'Claude',
  'Notion': 'Notion',
};

export async function importFromSheet(
  data: SheetImportData,
  prisma: PrismaClient,
): Promise<{ payments: number; invoices: number; visa: number; opportunities: number }> {
  const companies = await prisma.company.findMany();
  const companiesMap = Object.fromEntries(companies.map((c: { shortCode: string; id: string; [key: string]: unknown }) => [c.shortCode, c]));

  const categories = await prisma.category.findMany();
  const categoriesMap = Object.fromEntries(categories.map((c: { name: string; id: string; [key: string]: unknown }) => [c.name, c]));

  const monthDate = parseISO(`${data.month}-01`);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  let paymentCount = 0;
  let invoiceCount = 0;
  let visaCount = 0;
  let opportunityCount = 0;

  const awCompany = companiesMap['AW'];

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const p of data.payments) {
      const codes = p.company.split(',').map((c) => c.trim());
      const primary = companiesMap[codes[0]];
      if (!primary) {
        console.warn(`⚠️  Empresa no encontrada: ${codes[0]}`);
        continue;
      }

      const catName = ITEM_TO_CATEGORY[p.item];
      const category = catName ? categoriesMap[catName] : undefined;

      const transaction = await tx.transaction.create({
        data: {
          type: 'EXPENSE',
          status: p.paid ? 'PAID' : 'PENDING',
          source: TransactionSource.SHEET_IMPORT,
          amount: p.amount,
          amountCLP: p.amount,
          currency: 'CLP',
          date: monthEnd,
          description: p.item,
          comment: p.comment || null,
          companyId: primary.id,
          categoryId: category?.id ?? null,
        },
      });

      const pct = 100 / codes.length;
      for (const code of codes) {
        const co = companiesMap[code];
        if (!co) continue;
        await tx.transactionAllocation.create({
          data: {
            transactionId: transaction.id,
            companyId: co.id,
            percentage: pct,
            amountCLP: (p.amount * pct) / 100,
          },
        });
      }

      paymentCount++;
    }

    if (!awCompany) throw new Error('Empresa AW no encontrada — ejecutar seed primero');

    for (const inv of data.invoices) {
      const cp = await upsertCounterparty(tx, inv.rut, inv.counterparty);

      const doc = await tx.document.create({
        data: {
          companyId: awCompany.id,
          counterpartyId: cp.id,
          type: inv.type as 'AFECTA' | 'EXENTA',
          number: inv.number || null,
          netAmount: inv.net,
          ivaAmount: inv.iva,
          totalAmount: inv.total,
          currency: 'CLP',
          description: inv.service || null,
          isSent: inv.sent,
        },
      });

      const incTx = await tx.transaction.create({
        data: {
          type: 'INCOME',
          status: inv.paidAt ? 'PAID' : 'PENDING',
          source: TransactionSource.SHEET_IMPORT,
          amount: inv.total,
          amountCLP: inv.total,
          currency: 'CLP',
          date: monthStart,
          paidAt: inv.paidAt ? new Date(inv.paidAt) : null,
          description: `Factura ${inv.number || 'S/N'} - ${inv.counterparty}`,
          companyId: awCompany.id,
          counterpartyId: cp.id,
        },
      });

      await tx.transactionDocument.create({
        data: { transactionId: incTx.id, documentId: doc.id },
      });

      await tx.transactionAllocation.create({
        data: {
          transactionId: incTx.id,
          companyId: awCompany.id,
          percentage: 100,
          amountCLP: inv.total,
        },
      });

      invoiceCount++;
    }

    for (const v of data.visa) {
      const isUSD = v.amountUSD !== null;
      const amount = isUSD ? v.amountUSD! : v.amountCLP!;
      const amountCLP = isUSD ? v.amountUSD! * data.exchangeRate.USD_CLP : v.amountCLP!;

      const catName = ITEM_TO_CATEGORY[v.item];
      const category = catName ? categoriesMap[catName] : undefined;

      const visaTx = await tx.transaction.create({
        data: {
          type: 'EXPENSE',
          status: 'PAID',
          source: TransactionSource.SHEET_IMPORT,
          amount,
          currency: isUSD ? 'USD' : 'CLP',
          exchangeRate: isUSD ? data.exchangeRate.USD_CLP : null,
          amountCLP,
          date: monthStart,
          description: v.item,
          companyId: awCompany.id,
          categoryId: category?.id ?? null,
        },
      });
      await tx.transactionAllocation.create({
        data: {
          transactionId: visaTx.id,
          companyId: awCompany.id,
          percentage: 100,
          amountCLP,
        },
      });

      visaCount++;
    }

    for (const o of data.opportunities) {
      const co = companiesMap[o.company];
      if (!co) {
        console.warn(`⚠️  Empresa no encontrada para oportunidad: ${o.company}`);
        continue;
      }

      await tx.opportunity.create({
        data: {
          name: o.name,
          estimatedAmount: o.amount,
          currency: 'CLP',
          stage: 'PROPOSAL_SENT',
          probability: 50,
          companyId: co.id,
        },
      });

      opportunityCount++;
    }
  });

  console.log(`✅ Importación completada: ${paymentCount} pagos, ${invoiceCount} facturas, ${visaCount} visa, ${opportunityCount} oportunidades`);

  return { payments: paymentCount, invoices: invoiceCount, visa: visaCount, opportunities: opportunityCount };
}

async function upsertCounterparty(
  tx: Prisma.TransactionClient,
  rut: string,
  name: string,
) {
  if (rut) {
    return tx.counterparty.upsert({
      where: { rut },
      update: { name },
      create: { type: 'CUSTOMER', name, rut },
    });
  }

  const existing = await tx.counterparty.findFirst({ where: { name } });
  if (existing) return existing;

  return tx.counterparty.create({ data: { type: 'CUSTOMER', name } });
}
