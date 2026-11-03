import { borderWidth, radius, spacing, typography } from '@forest/design-tokens';
import { Text, TextInput, type TextInputProps, View } from 'react-native';
import { useTheme } from './ThemeProvider.tsx';

export interface TextFieldProps extends Omit<TextInputProps, 'editable' | 'style'> {
  label: string;
  // Help shown under the input, read with it by screen readers.
  hint?: string;
  // Shown under the input, announced as soon as it appears, and read with the input.
  error?: string;
  disabled?: boolean;
}

export function TextField({ label, hint, error, disabled = false, accessibilityHint, ...props }: TextFieldProps) {
  const { colors } = useTheme();
  const small = { fontSize: typography.caption.fontSize, lineHeight: typography.caption.lineHeight };
  return (
    <View style={{ gap: spacing.xs }}>
      <Text
        style={{
          color: colors.text,
          fontSize: typography.label.fontSize,
          lineHeight: typography.label.lineHeight,
          fontWeight: typography.label.fontWeight,
        }}
      >
        {label}
      </Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        // The caller's hint comes first; the field's hint and error are always read with the input.
        accessibilityHint={[accessibilityHint, hint, error].filter(Boolean).join(' ') || undefined}
        accessibilityState={disabled ? { disabled: true } : undefined}
        editable={!disabled}
        placeholderTextColor={colors.textMuted}
        style={{
          backgroundColor: disabled ? colors.surface : colors.background,
          color: disabled ? colors.textMuted : colors.text,
          borderColor: error ? colors.danger : colors.border,
          borderWidth: borderWidth.thin,
          borderRadius: radius.md,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          fontSize: typography.body.fontSize,
          lineHeight: typography.body.lineHeight,
        }}
      />
      {hint && <Text style={{ ...small, color: colors.textMuted }}>{hint}</Text>}
      {error && (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ ...small, color: colors.danger }}>
          {error}
        </Text>
      )}
    </View>
  );
}
