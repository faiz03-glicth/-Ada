import type { AuthIntent } from '../domain/types';

export type LoginStep = 'providers' | 'email' | 'code';

export interface LoginHeading {
  title: string;
  subtitle: string;
}

/** PURE: the heading for each in-page step (and, on the first step, each intent). */
export function loginHeading(step: LoginStep, intent: AuthIntent, email: string): LoginHeading {
  if (step === 'email') return { title: 'Continue with email', subtitle: "We'll send you a 6-digit code." };
  if (step === 'code') return { title: 'Check your inbox', subtitle: `Enter the code sent to ${email}` };
  return intent === 'new'
    ? {
        title: 'Create your Streak account',
        subtitle: 'Save your heatmap and keep it in sync on every device.',
      }
    : { title: 'Welcome back', subtitle: 'Sign in to pick up your heatmap where you left off.' };
}

export const RESEND_COOLDOWN_SECONDS = 60;
