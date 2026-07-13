import { DeepPartial, Money, VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';
import type { NepalPaymentProviderCode, PaymentAttemptStatus } from '../types';

/**
 * Stores the asynchronous provider-side lifecycle before a verified Vendure
 * {@link Payment} is created. Applications should treat these records as
 * operational data and must not manually mark them settled.
 *
 * @category Entity
 */
@Entity()
@Index(['provider', 'merchantReference'], { unique: true })
@Index(['provider', 'providerReference'], { unique: true })
export class NepalPaymentAttempt extends VendureEntity {
  constructor(input?: DeepPartial<NepalPaymentAttempt>) {
    super(input);
  }

  @Column('varchar')
  orderId!: string;

  @Column('varchar')
  orderCode!: string;

  @Column('varchar')
  channelId!: string;

  @Column('varchar')
  channelToken!: string;

  @Column('varchar')
  provider!: NepalPaymentProviderCode;

  @Column('varchar')
  paymentMethodCode!: string;

  @Column('varchar')
  merchantReference!: string;

  @Column('varchar', { nullable: true })
  providerReference!: string | null;

  @Money()
  amount!: number;

  @Column('varchar', { length: 3 })
  currencyCode!: string;

  @Column('varchar')
  status!: PaymentAttemptStatus | 'verifying';

  @Column('varchar', { unique: true })
  idempotencyKey!: string;

  @Column({ nullable: true })
  expiresAt?: Date;

  @Column({ nullable: true })
  verifiedAt?: Date;

  @Column('varchar', { nullable: true })
  providerTransactionId!: string | null;

  @Column('varchar', { nullable: true })
  vendurePaymentId!: string | null;

  @Column('simple-json', { nullable: true })
  providerResponse!: Record<string, unknown> | null;
}
