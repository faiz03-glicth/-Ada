import { toast } from 'sonner-native';

export interface ToastMessage {
  title: string;
  sub?: string;
  /** Adds an "Undo" action and keeps the toast up a little longer. */
  undo?: () => void;
}

export function showSuccess({ title, sub, undo }: ToastMessage): void {
  toast.success(title, {
    description: sub,
    action: undo ? { label: 'Undo', onClick: undo } : undefined,
    duration: undo ? 5000 : 3500,
  });
}

export function showInfo({ title, sub }: Omit<ToastMessage, 'undo'>): void {
  toast.info(title, { description: sub, duration: 3000 });
}
