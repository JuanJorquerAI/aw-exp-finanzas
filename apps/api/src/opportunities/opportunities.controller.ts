import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
} from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { OpportunityStage } from '@aw-finanzas/database';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  findAll(@Query('companyId') companyId?: string) {
    if (companyId) return this.opportunitiesService.findByCompany(companyId);
    return this.opportunitiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.opportunitiesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateOpportunityDto) {
    return this.opportunitiesService.create(dto);
  }

  @Patch(':id/stage')
  updateStage(@Param('id') id: string, @Body('stage') stage: OpportunityStage) {
    return this.opportunitiesService.updateStage(id, stage);
  }
}
