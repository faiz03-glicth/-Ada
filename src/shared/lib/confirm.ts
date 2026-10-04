import { Alert } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  /** "Cancel" unless the other choice needs a name of its own. */
  cancelLabel?: string;
  destructive?: boolean;
}

export type Confirm = (options: ConfirmOptions) => Promise<boolean>;

/** A native two-button confirmation, as a promise. */
export const confirm: Confirm = ({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
}) =>
  new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
