import type { Session } from '@supabase/supabase-js';

export type OnboardingRecoveryResult =
  | { recovered: true; client: Record<string, unknown> }
  | { recovered: false; reason: 'NO_PAID_SUBSCRIPTION' | 'RECOVERY_UNAVAILABLE' };

export async function recoverPaidOnboarding(session: Session): Promise<OnboardingRecoveryResult> {
  const response = await fetch('/api/onboarding-recovery', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Your portal could not be prepared.');
  return result;
}
