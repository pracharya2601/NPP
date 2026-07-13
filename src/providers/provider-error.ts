export class PaymentProviderError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly response?: unknown,
  ) {
    super(message);
    this.name = 'PaymentProviderError';
  }
}
