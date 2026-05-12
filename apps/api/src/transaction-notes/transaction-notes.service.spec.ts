import { Test } from '@nestjs/testing';
import { TransactionNotesService } from './transaction-notes.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  transactionNote: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('TransactionNotesService', () => {
  let service: TransactionNotesService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TransactionNotesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(TransactionNotesService);
    jest.clearAllMocks();
  });

  it('creates note with content', async () => {
    mockPrisma.transactionNote.create.mockResolvedValue({
      id: '1', transactionId: 'tx1', content: 'Revisado con contador', createdAt: new Date(),
    });
    const note = await service.addNote('tx1', 'Revisado con contador');
    expect(mockPrisma.transactionNote.create).toHaveBeenCalledWith({
      data: { transactionId: 'tx1', content: 'Revisado con contador' },
    });
    expect(note.content).toBe('Revisado con contador');
  });

  it('returns notes ordered oldest first', async () => {
    const notes = [
      { id: '1', content: 'Primera', createdAt: new Date('2026-01-01') },
      { id: '2', content: 'Segunda', createdAt: new Date('2026-01-02') },
    ];
    mockPrisma.transactionNote.findMany.mockResolvedValue(notes);
    const result = await service.getNotes('tx1');
    expect(result[0].content).toBe('Primera');
    expect(mockPrisma.transactionNote.findMany).toHaveBeenCalledWith({
      where: { transactionId: 'tx1' },
      orderBy: { createdAt: 'asc' },
    });
  });
});
