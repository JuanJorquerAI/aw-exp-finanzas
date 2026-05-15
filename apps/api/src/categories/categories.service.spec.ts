import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  category: { findMany: jest.fn(), findUnique: jest.fn() },
  categorizationRule: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  transaction: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

describe('CategoriesService.recategorize', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  it('actualiza categoría cuando regla hace match', async () => {
    mockPrisma.categorizationRule.findMany.mockResolvedValue([
      { pattern: 'SII', isRegex: false, categoryId: 'cat-1' },
    ]);
    mockPrisma.transaction.findMany.mockResolvedValue([
      { id: 'tx-1', description: 'Pago SII F29', counterparty: null },
    ]);
    mockPrisma.transaction.update.mockResolvedValue({});

    const result = await service.recategorize();

    expect(result).toEqual({ processed: 1, updated: 1, skipped: 0 });
    expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
      where: { id: 'tx-1' },
      data: { categoryId: 'cat-1' },
    });
  });

  it('no actualiza cuando no hay match', async () => {
    mockPrisma.categorizationRule.findMany.mockResolvedValue([
      { pattern: 'FOGAPE', isRegex: false, categoryId: 'cat-1' },
    ]);
    mockPrisma.transaction.findMany.mockResolvedValue([
      { id: 'tx-2', description: 'Transferencia genérica', counterparty: null },
    ]);

    const result = await service.recategorize();

    expect(result).toEqual({ processed: 1, updated: 0, skipped: 1 });
    expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
  });

  it('retorna ceros cuando no hay transacciones sin categoría', async () => {
    mockPrisma.categorizationRule.findMany.mockResolvedValue([]);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    const result = await service.recategorize();

    expect(result).toEqual({ processed: 0, updated: 0, skipped: 0 });
  });
});
