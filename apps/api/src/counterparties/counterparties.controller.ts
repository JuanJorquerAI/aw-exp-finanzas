import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { CounterpartiesService } from './counterparties.service';
import { CreateCounterpartyDto } from './dto/create-counterparty.dto';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('counterparties')
export class CounterpartiesController {
  constructor(private readonly counterpartiesService: CounterpartiesService) {}

  @Get()
  findAll() {
    return this.counterpartiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.counterpartiesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCounterpartyDto) {
    return this.counterpartiesService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateCounterpartyDto>) {
    return this.counterpartiesService.update(id, dto);
  }
}
