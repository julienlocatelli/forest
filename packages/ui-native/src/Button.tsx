import { borderWidth, type ColorName, radius, shadows, spacing, typography } from '@forest/design-tokens';
import type { ComponentRef, Ref } from 'react';
import { Pressable, type PressableProps, Text } from 'react-native';
import { useTheme } from './ThemeProvider.tsx';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  // The label, read by screen readers.
  children: string;
  // `primary` for the main action, `secondary` for the others, `danger` for a destructive one.
  variant?: 'primary' | 'secondary' | 'danger';
  ref?: Ref<ComponentRef<typeof Pressable>>;
}

const variants: Record<NonNullable<ButtonProps['variant']>, { background: ColorName; border: ColorName; text: ColorName }> = {
  primary: { background: 'primary', border: 'primary', text: 'onPrimary' },
  secondary: { background: 'surface', border: 'border', text: 'text' },
  danger: { background: 'danger', border: 'danger', text: 'onDanger' },
};

const inactive = { background: 'surface', border: 'border', text: 'textMuted' } as const;

export function Button({ children, variant = 'primary', disabled, ...props }: ButtonProps) {
  const { colors } = useTheme();
  const palette = disabled ? inactive : variants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      style={{
        backgroundColor: colors[palette.background],
        borderColor: colors[palette.border],
        borderWidth: borderWidth.thin,
        borderRadius: radius.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        ...(disabled ? {} : shadows.sm),
      }}
      {...props}
    >
      <Text
        style={{
          color: colors[palette.text],
          fontSize: typography.label.fontSize,
          lineHeight: typography.label.lineHeight,
          fontWeight: typography.label.fontWeight,
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
