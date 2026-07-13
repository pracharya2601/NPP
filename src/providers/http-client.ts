import { Injectable } from '@nestjs/common';
import { PaymentProviderError } from './provider-error';

@Injectable()
export class PaymentHttpClient {
  async request<T>(url: string, init: RequestInit, timeoutMs = 10_000): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, redirect: 'error', signal: controller.signal });
      const text = await response.text();
      let body: unknown;
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = { detail: text.slice(0, 500) };
      }
      if (!response.ok) {
        throw new PaymentProviderError(`Provider returned HTTP ${response.status}`, response.status, body);
      }
      return body as T;
    } catch (error) {
      if (error instanceof PaymentProviderError) throw error;
      const message = error instanceof Error ? error.message : 'Unknown provider network error';
      throw new PaymentProviderError(`Provider request failed: ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}
