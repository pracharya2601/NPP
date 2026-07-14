import { getPluginOptions } from '../config';
import type { NepalPaymentProvider, NepalPaymentProviderCode } from '../types';
import { EsewaProvider } from './esewa.provider';
import { FonepayProvider } from './fonepay.provider';
import { KhaltiProvider } from './khalti.provider';

export function createProvider(code: NepalPaymentProviderCode): NepalPaymentProvider {
  const options = getPluginOptions();
  if (code === 'khalti' && options.khalti) return new KhaltiProvider(options.khalti);
  if (code === 'esewa' && options.esewa) return new EsewaProvider(options.esewa);
  if (code === 'fonepay' && options.fonepay) return new FonepayProvider(options.fonepay);
  throw new Error(`Payment provider "${code}" is not configured`);
}
