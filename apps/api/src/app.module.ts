import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { TransactionDocumentsModule } from './transaction-documents/transaction-documents.module';
import { TransactionNotesModule } from './transaction-notes/transaction-notes.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/auth.guard';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
    ]),
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
    TransactionDocumentsModule,
    TransactionNotesModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
