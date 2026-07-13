/**
 * Configuration for the Khalti KPG-2 integration.
 *
 * @category Configuration
 */
export interface KhaltiPluginOptions {
  secretKey: string;
  websiteUrl: string;
  paymentMethodCode?: string;
  environment?: 'sandbox' | 'production';
}

/**
 * Configuration for the eSewa ePay v2 integration.
 *
 * @category Configuration
 */
export interface EsewaPluginOptions {
  productCode: string;
  secretKey: string;
  paymentMethodCode?: string;
  environment?: 'sandbox' | 'production';
}

/**
 * Reserved configuration shape for a future official Fonepay integration.
 * Fonepay is not implemented in the current release.
 *
 * @category Configuration
 */
export interface FonepayPluginOptions {
  paymentMethodCode?: string;
}

/**
 * Options passed to {@link NepalPaymentsPlugin.init}.
 *
 * @category Configuration
 */
export interface NepalPaymentsPluginOptions {
  /** Public origin of the Vendure server, without a trailing slash. */
  publicServerUrl: string;
  /** Storefront page to receive the final attempt status. */
  storefrontResultUrl: string;
  /** At least 32 random characters, used to authenticate internal settlement metadata. */
  internalSigningSecret: string;
  /** Cron expression for pending-payment reconciliation, or false to disable. Defaults to every 5 minutes. */
  reconciliationSchedule?: string | false;
  khalti?: KhaltiPluginOptions;
  esewa?: EsewaPluginOptions;
  fonepay?: FonepayPluginOptions;
}

export const defaultPaymentMethodCodes = {
  khalti: 'khalti',
  esewa: 'esewa',
  fonepay: 'fonepay',
} as const;

let options: NepalPaymentsPluginOptions | undefined;

export function setPluginOptions(value: NepalPaymentsPluginOptions): void {
  assertPublicUrl(value.publicServerUrl, 'publicServerUrl');
  assertPublicUrl(value.storefrontResultUrl, 'storefrontResultUrl');
  if (value.internalSigningSecret.length < 32) {
    throw new Error('internalSigningSecret must contain at least 32 characters');
  }
  if (!value.khalti && !value.esewa) {
    throw new Error('At least one implemented payment provider must be configured');
  }
  if (value.khalti && (!value.khalti.secretKey || !value.khalti.websiteUrl)) {
    throw new Error('Khalti secretKey and websiteUrl are required');
  }
  if (value.khalti) assertPublicUrl(value.khalti.websiteUrl, 'Khalti websiteUrl');
  if (value.esewa && (!value.esewa.secretKey || !value.esewa.productCode)) {
    throw new Error('eSewa secretKey and productCode are required');
  }
  options = value;
}

export function getPluginOptions(): NepalPaymentsPluginOptions {
  if (!options) {
    throw new Error('NepalPaymentsPlugin.init() must be called before the plugin is used');
  }
  return options;
}

function assertPublicUrl(value: string, name: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute URL`);
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new Error(`${name} must use HTTPS outside localhost`);
  }
  if (url.username || url.password) throw new Error(`${name} must not include credentials`);
}
