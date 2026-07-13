import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { getPluginOptions } from '../config';
import { PaymentOrchestratorService } from '../services/payment-orchestrator.service';
import { NEPAL_PAYMENT_PROVIDERS, type NepalPaymentProviderCode } from '../types';

@Controller('nepal-payments')
export class PaymentCallbackController {
  constructor(private readonly orchestrator: PaymentOrchestratorService) {}

  @Get('callback/:provider/:attemptId')
  async getCallback(
    @Param('provider') provider: string,
    @Param('attemptId') attemptId: string,
    @Query() query: Record<string, string | string[]>,
    @Res() response: Response,
  ) {
    return this.handle(provider, attemptId, flatten(query), response);
  }

  @Post('callback/:provider/:attemptId')
  async postCallback(
    @Param('provider') provider: string,
    @Param('attemptId') attemptId: string,
    @Body() body: Record<string, unknown>,
    @Res() response: Response,
  ) {
    return this.handle(provider, attemptId, body, response);
  }

  private async handle(
    providerValue: string,
    attemptId: string,
    payload: Record<string, unknown>,
    response: Response,
  ) {
    const provider = providerValue.toLowerCase() as NepalPaymentProviderCode;
    let status = 'error';
    let message: string | undefined;
    if (!NEPAL_PAYMENT_PROVIDERS.includes(provider)) {
      message = 'Unsupported payment provider';
    } else {
      try {
        const attempt = await this.orchestrator.processCallback(provider, attemptId, payload);
        status = attempt.status;
      } catch (error) {
        message = 'Payment verification could not be completed';
      }
    }
    const target = new URL(getPluginOptions().storefrontResultUrl);
    target.searchParams.set('attemptId', attemptId);
    target.searchParams.set('provider', providerValue);
    target.searchParams.set('status', status);
    if (message) target.searchParams.set('message', message.slice(0, 200));
    return response.redirect(303, target.toString());
  }
}

function flatten(input: Record<string, string | string[]>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
}
