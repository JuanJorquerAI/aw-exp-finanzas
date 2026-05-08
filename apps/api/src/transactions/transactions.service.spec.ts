import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';

type MockPrisma = {
  transaction: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  transactionAllocation: { createMany: jest.Mock };
  $transaction: jest.Mock;
};

const mockPrisma: MockPrisma = {
  transaction: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  transactionAllocation: { createMany: jest.fn() },
  $transaction: jest.fn((cb: (p: MockPrisma) => unknown) => cb(mockPrisma)),
};

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<TransactionsService>(TransactionsService);
  });

  describe('findAll', () => {
    it('filtra por allocations.some.companyId cuando se pasa companyId', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      await service.findAll({ companyId: 'company-aw' });
      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            allocations: { some: { companyId: 'company-aw' } },
          }),
        }),
      );
    });

    it('no incluye companyId directo en where', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      await service.findAll({ companyId: 'company-aw' });
      const callArgs = mockPrisma.transaction.findMany.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(callArgs.where).not.toHaveProperty('companyId');
    });
  });

  describe('create', () => {
    it('crea allocations proporcionales cuando se pasa allocations[]', async () => {
      const mockTx = { id: 'tx-1', amountCLP: '80000' };
      mockPrisma.transaction.create.mockResolvedValue(mockTx);
      mockPrisma.transactionAllocation.createMany.mockResolvedValue({ count: 2 });

      await service.create({
        companyId: 'company-aw',
        type: 'EXPENSE' as const,
        amount: 80000,
        currency: 'CLP' as const,
        amountCLP: 80000,
        date: '2026-05-01',
        description: 'Contador',
        allocations: [
          { companyId: 'company-aw', percentage: 50 },
          { companyId: 'company-expro', percentage: 50 },
        ],
      });

      expect(mockPrisma.transactionAllocation.createMany).toHaveBeenCalledWith({
        data: [
          { transactionId: 'tx-1', companyId: 'company-aw', percentage: 50, amountCLP: 40000 },
          { transactionId: 'tx-1', companyId: 'company-expro', percentage: 50, amountCLP: 40000 },
        ],
      });
    });

    it('crea allocation 100% cuando no se pasan allocations', async () => {
      const mockTx = { id: 'tx-2', amountCLP: '100000' };
      mockPrisma.transaction.create.mockResolvedValue(mockTx);
      mockPrisma.transactionAllocation.createMany.mockResolvedValue({ count: 1 });

      await service.create({
        companyId: 'company-aw',
        type: 'EXPENSE' as const,
        amount: 100000,
        currency: 'CLP' as const,
        amountCLP: 100000,
        date: '2026-05-01',
        description: 'Test sin allocations',
      });

      expect(mockPrisma.transactionAllocation.createMany).toHaveBeenCalledWith({
        data: [
          { transactionId: 'tx-2', companyId: 'company-aw', percentage: 100, amountCLP: 100000 },
        ],
      });
    });
  });
});
