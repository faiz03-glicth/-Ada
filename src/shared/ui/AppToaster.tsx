import { Toaster } from 'sonner-native';
import { useUnistyles } from 'react-native-unistyles';

/** Global toast host styled like the prototype: inverted colours, above the tab bar. */
export function AppToaster() {
  const { theme } = useUnistyles();
  const background = theme.glass?.toast.background ?? theme.colors.text;
  const foreground = theme.glass?.toast.foreground ?? theme.colors.canvas;

  return (
    <Toaster
      position="bottom-center"
      offset={104}
      theme={theme.scheme}
      swipeToDismissDirection="left"
      toastOptions={{
        style: { backgroundColor: background, borderRadius: theme.glass ? 22 : 16, borderWidth: 0 },
        titleStyle: { color: foreground, fontFamily: theme.fonts.semibold, fontSize: 14 },
        descriptionStyle: { color: foreground, opacity: 0.75, fontFamily: theme.fonts.regular, fontSize: 13 },
        actionButtonStyle: { backgroundColor: 'transparent' },
      }}
    />
  );
}
