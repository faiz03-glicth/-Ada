import { toast } from 'sonner-native';

export interface ToastMessage {
  title: string;
  sub?: string;
  /** Adds an "Undo" action and keeps the toast up a little longer. */
  undo?: () => void;
}

/**
 * Toasts are keyed by their title: showing the same message again refreshes the toast on screen
 * instead of stacking a duplicate (e.g. a double-tapped action).
 */
export function showSuccess({ title, sub, undo }: ToastMessage): void {
  toast.success(title, {
    id: title,
    description: sub,
    action: undo ? { label: 'Undo', onClick: undo } : undefined,
    duration: undo ? 5000 : 3500,
  });
}

export function showInfo({ title, sub }: Omit<ToastMessage, 'undo'>): void {
  toast.info(title, { id: title, description: sub, duration: 3000 });
}

/** Clears every toast, e.g. when the session changes or the app leaves the screen. */
export function dismissAllToasts(): void {
  toast.dismiss();
}
