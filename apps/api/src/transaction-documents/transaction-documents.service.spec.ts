import { Test } from '@nestjs/testing';
import { TransactionDocumentsService } from './transaction-documents.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  transactionDocument: {
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
};

describe('TransactionDocumentsService', () => {
  let service: TransactionDocumentsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TransactionDocumentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(TransactionDocumentsService);
    jest.clearAllMocks();
  });

  it('links document to transaction', async () => {
    mockPrisma.transactionDocument.create.mockResolvedValue({
      id: '1', transactionId: 'tx1', documentId: 'doc1',
    });
    const result = await service.link('tx1', 'doc1');
    expect(mockPrisma.transactionDocument.create).toHaveBeenCalledWith({
      data: { transactionId: 'tx1', documentId: 'doc1' },
      include: { document: true },
    });
    expect(result.transactionId).toBe('tx1');
  });

  it('returns links for a transaction', async () => {
    mockPrisma.transactionDocument.findMany.mockResolvedValue([
      { id: '1', transactionId: 'tx1', documentId: 'doc1' },
    ]);
    const result = await service.findByTransaction('tx1');
    expect(result).toHaveLength(1);
  });

  it('unlinks document', async () => {
    mockPrisma.transactionDocument.delete.mockResolvedValue({ id: '1' });
    await service.unlink('1');
    expect(mockPrisma.transactionDocument.delete).toHaveBeenCalledWith({ where: { id: '1' } });
  });
});
