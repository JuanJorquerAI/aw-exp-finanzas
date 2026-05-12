import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import {
  CreateCategorizationRuleDto,
  UpdateCategorizationRuleDto,
  TestRuleDto,
} from './dto/categorization-rule.dto';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@Query('tree') tree?: string) {
    if (tree === 'true') return this.categoriesService.findTree();
    return this.categoriesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  // ── Categorization rules ──────────────────────────────────────────────────

  @Get('rules')
  findRules() {
    return this.categoriesService.findRules();
  }

  @Post('rules')
  createRule(@Body() dto: CreateCategorizationRuleDto) {
    return this.categoriesService.createRule(dto);
  }

  @Patch('rules/:id')
  updateRule(@Param('id') id: string, @Body() dto: UpdateCategorizationRuleDto) {
    return this.categoriesService.updateRule(id, dto);
  }

  @Delete('rules/:id')
  deleteRule(@Param('id') id: string) {
    return this.categoriesService.deleteRule(id);
  }

  @Post('rules/test')
  testRule(@Body() dto: TestRuleDto) {
    return this.categoriesService.testRule(dto.text);
  }
}
