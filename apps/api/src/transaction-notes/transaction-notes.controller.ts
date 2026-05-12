import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { TransactionNotesService } from './transaction-notes.service';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('transactions/:transactionId/notes')
export class TransactionNotesController {
  constructor(private readonly service: TransactionNotesService) {}

  @Post()
  addNote(
    @Param('transactionId') transactionId: string,
    @Body() body: { content: string },
  ) {
    return this.service.addNote(transactionId, body.content);
  }

  @Get()
  getNotes(@Param('transactionId') transactionId: string) {
    return this.service.getNotes(transactionId);
  }
}
