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
      const callArgs = mockPrisma.transaction.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(callArgs.where).not.toHaveProperty('companyId');
    });
  });
});
