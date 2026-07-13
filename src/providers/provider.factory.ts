import { getPluginOptions } from '../config';
import type { NepalPaymentProvider, NepalPaymentProviderCode } from '../types';
import { EsewaProvider } from './esewa.provider';
import { KhaltiProvider } from './khalti.provider';

export function createProvider(code: NepalPaymentProviderCode): NepalPaymentProvider {
  const options = getPluginOptions();
  if (code === 'khalti' && options.khalti) return new KhaltiProvider(options.khalti);
  if (code === 'esewa' && options.esewa) return new EsewaProvider(options.esewa);
  if (code === 'fonepay') {
    throw new Error('Fonepay is not enabled until merchant-specific API documentation is configured');
  }
  throw new Error(`Payment provider "${code}" is not configured`);
}
