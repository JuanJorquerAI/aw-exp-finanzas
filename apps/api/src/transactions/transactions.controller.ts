import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  BadRequestException,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionsDto } from './dto/filter-transactions.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MoveTransactionDto } from './dto/move-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  findAll(@Query() filters: FilterTransactionsDto) {
    return this.transactionsService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.transactionsService.update(id, dto);
  }

  @Patch(':id/paid')
  markPaid(@Param('id') id: string) {
    return this.transactionsService.markPaid(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.transactionsService.cancel(id);
  }

  @Patch(':id/move')
  move(@Param('id') id: string, @Body() dto: MoveTransactionDto) {
    return this.transactionsService.moveToCompany(id, dto.companyId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    const valid = ['PENDING', 'PAID', 'REJECTED', 'CANCELLED', 'RECONCILED'] as const;
    type ValidStatus = (typeof valid)[number];
    if (!valid.includes(body.status as ValidStatus)) {
      throw new BadRequestException(
        `Estado inválido: ${body.status}. Valores permitidos: ${valid.join(', ')}`,
      );
    }
    return this.transactionsService.updateStatus(id, body.status as ValidStatus);
  }

  @Post(':id/payments')
  addPayment(@Param('id') id: string, @Body() dto: CreatePaymentDto) {
    return this.transactionsService.addPayment(id, dto);
  }
}
