import { borderWidth, radius, shadows, spacing } from '@forest/design-tokens';
import { View, type ViewProps } from 'react-native';
import { useTheme } from './ThemeProvider.tsx';

export type CardProps = Omit<ViewProps, 'style'>;

// Groups content on the surface color. It stays a plain container for screen readers,
// so each child remains reachable on its own.
export function Card(props: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.lg,
        borderWidth: borderWidth.thin,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        ...shadows.md,
      }}
      {...props}
    />
  );
}
