import { typography } from '@forest/design-tokens';
import { Text as NativeText, type TextProps as NativeTextProps } from 'react-native';
import { useTheme } from './ThemeProvider.tsx';

export interface TextProps extends Omit<NativeTextProps, 'style'> {
  // The type scale: `body` for running text, `label` for short labels, `caption` for small print.
  variant?: 'body' | 'label' | 'caption';
  // `muted` for secondary text.
  tone?: 'default' | 'muted';
}

export function Text({ variant = 'body', tone = 'default', ...props }: TextProps) {
  const { colors } = useTheme();
  const scale = typography[variant];
  return (
    <NativeText
      style={{
        color: tone === 'muted' ? colors.textMuted : colors.text,
        fontSize: scale.fontSize,
        lineHeight: scale.lineHeight,
        fontWeight: scale.fontWeight,
      }}
      {...props}
    />
  );
}

export interface HeadingProps extends Omit<NativeTextProps, 'style'> {
  // 1 for the screen title, 2 for sections, 3 for subsections.
  level: 1 | 2 | 3;
}

// Size by level, as on the web: level 3 uses the label size in the title weight.
const headings = {
  1: { size: typography.headline, weight: typography.headline.fontWeight },
  2: { size: typography.title, weight: typography.title.fontWeight },
  3: { size: typography.label, weight: typography.title.fontWeight },
};

export function Heading({ level, ...props }: HeadingProps) {
  const { colors } = useTheme();
  const { size, weight } = headings[level];
  return (
    <NativeText
      accessibilityRole="header"
      style={{ color: colors.text, fontSize: size.fontSize, lineHeight: size.lineHeight, fontWeight: weight }}
      {...props}
    />
  );
}
