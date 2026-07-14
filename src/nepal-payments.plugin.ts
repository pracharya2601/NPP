import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';
import { NepalPaymentsShopResolver } from './api/shop.resolver';
import { shopApiExtensions } from './api/api-extensions';
import { PaymentCallbackController } from './api/payment-callback.controller';
import { NepalPaymentsPluginOptions, setPluginOptions } from './config';
import { NepalPaymentAttempt } from './entities/payment-attempt.entity';
import { esewaPaymentHandler, fonepayPaymentHandler, khaltiPaymentHandler } from './handlers/payment-handlers';
import { PaymentHttpClient } from './providers/http-client';
import { PaymentOrchestratorService } from './services/payment-orchestrator.service';
import { ReconciliationService } from './services/reconciliation.service';
import { reconcileNepalPaymentsTask } from './services/reconciliation.task';

/**
 * Adds Khalti by IME, eSewa, and experimental Fonepay payment integrations to Vendure.
 *
 * @example
 * ```ts
 * NepalPaymentsPlugin.init({
 *   publicServerUrl: process.env.PUBLIC_SERVER_URL!,
 *   storefrontResultUrl: process.env.STOREFRONT_PAYMENT_RESULT_URL!,
 *   internalSigningSecret: process.env.NEPAL_PAYMENTS_INTERNAL_SECRET!,
 *   khalti: {
 *     secretKey: process.env.KHALTI_SECRET_KEY!,
 *     websiteUrl: process.env.KHALTI_WEBSITE_URL!,
 *   },
 * })
 * ```
 *
 * @category Plugin
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [NepalPaymentAttempt],
  providers: [PaymentHttpClient, PaymentOrchestratorService, ReconciliationService],
  controllers: [PaymentCallbackController],
  shopApiExtensions: {
    schema: shopApiExtensions,
    resolvers: [NepalPaymentsShopResolver],
  },
  configuration: config => {
    const handlers = config.paymentOptions.paymentMethodHandlers ?? [];
    const codes = new Set(handlers.map(handler => handler.code));
    const options = getInitializedOptions();
    if (options.khalti && !codes.has(khaltiPaymentHandler.code)) handlers.push(khaltiPaymentHandler);
    if (options.esewa && !codes.has(esewaPaymentHandler.code)) handlers.push(esewaPaymentHandler);
    if (options.fonepay && !codes.has(fonepayPaymentHandler.code)) handlers.push(fonepayPaymentHandler);
    config.paymentOptions.paymentMethodHandlers = handlers;
    if (options.reconciliationSchedule !== false) {
      reconcileNepalPaymentsTask.configure({
        schedule: options.reconciliationSchedule ?? '*/5 * * * *',
      });
      config.schedulerOptions.tasks = [
        ...(config.schedulerOptions.tasks ?? []).filter(task => task.id !== reconcileNepalPaymentsTask.id),
        reconcileNepalPaymentsTask,
      ];
    }
    return config;
  },
  compatibility: '^3.7.0',
})
export class NepalPaymentsPlugin {
  /** @internal */
  static options: NepalPaymentsPluginOptions;

  /**
   * Configures the enabled providers, public callback origin, storefront
   * result URL, and reconciliation behavior.
   */
  static init(options: NepalPaymentsPluginOptions): Type<NepalPaymentsPlugin> {
    setPluginOptions(options);
    this.options = options;
    return NepalPaymentsPlugin;
  }
}

function getInitializedOptions(): NepalPaymentsPluginOptions {
  if (!NepalPaymentsPlugin.options) throw new Error('NepalPaymentsPlugin.init() was not called');
  return NepalPaymentsPlugin.options;
}
