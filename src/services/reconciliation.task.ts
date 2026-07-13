import { ScheduledTask } from '@vendure/core';
import { ReconciliationService } from './reconciliation.service';

export const reconcileNepalPaymentsTask = new ScheduledTask({
  id: 'reconcile-nepal-payments',
  description: 'Verify pending Khalti and eSewa payment attempts',
  schedule: '*/5 * * * *',
  preventOverlap: true,
  timeout: '4m',
  execute: ({ injector, scheduledContext }) =>
    injector.get(ReconciliationService).reconcile(scheduledContext),
});
