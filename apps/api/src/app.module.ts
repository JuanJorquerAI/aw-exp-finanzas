import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { CompaniesModule } from './companies/companies.module';
import { AccountsModule } from './accounts/accounts.module';
import { CounterpartiesModule } from './counterparties/counterparties.module';
import { CategoriesModule } from './categories/categories.module';
import { DocumentsModule } from './documents/documents.module';
import { TransactionsModule } from './transactions/transactions.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { ImportersModule } from './importers/importers.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    CompaniesModule,
    AccountsModule,
    CounterpartiesModule,
    CategoriesModule,
    DocumentsModule,
    TransactionsModule,
    OpportunitiesModule,
    ImportersModule,
  ],
})
export class AppModule {}
