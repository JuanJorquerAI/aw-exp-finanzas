import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
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
import { TaxesModule } from './taxes/taxes.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/auth.guard';

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
    TaxesModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
