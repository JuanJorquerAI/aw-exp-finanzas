import { Controller, Post, Delete, Get, Body, Param } from '@nestjs/common';
import { TransactionDocumentsService } from './transaction-documents.service';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('transaction-documents')
export class TransactionDocumentsController {
  constructor(private readonly service: TransactionDocumentsService) {}

  @Post()
  link(@Body() body: { transactionId: string; documentId: string; note?: string }) {
    return this.service.link(body.transactionId, body.documentId, body.note);
  }

  @Get('by-transaction/:transactionId')
  findByTransaction(@Param('transactionId') transactionId: string) {
    return this.service.findByTransaction(transactionId);
  }

  @Delete(':id')
  unlink(@Param('id') id: string) {
    return this.service.unlink(id);
  }
}
