export class CreatePaymentDto {
  amount!: number;
  currency?: string;
  paidAt?: string;
  note?: string;
  accountId?: string;
}
