import { borderWidth, radius, spacing, themes, typography } from '@forest/design-tokens';
import { type ThemePreference, useTheme } from '@forest/ui-native';
import { Pressable, Text, View } from 'react-native';

const label = (name: string) => `${name[0].toUpperCase()}${name.slice(1)}`;

// System, then every theme the tokens define: a theme added later appears with no change here.
const choices: ThemePreference[] = ['system', ...(Object.keys(themes) as ThemePreference[])];

// A radio group that sets the provider's preference; the whole screen recolors at once.
export function ThemeChoice() {
  const { colors, preference, setPreference } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Theme" style={{ flexDirection: 'row', gap: spacing.sm }}>
      {choices.map((choice) => {
        const checked = choice === preference;
        return (
          <Pressable
            key={choice}
            accessibilityRole="radio"
            accessibilityLabel={label(choice)}
            accessibilityState={{ checked }}
            onPress={() => setPreference(choice)}
            style={{
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.md,
              borderRadius: radius.full,
              borderWidth: borderWidth.thin,
              borderColor: checked ? colors.primary : colors.border,
              backgroundColor: checked ? colors.primary : colors.surface,
            }}
          >
            <Text
              style={{
                color: checked ? colors.onPrimary : colors.text,
                fontSize: typography.label.fontSize,
                lineHeight: typography.label.lineHeight,
                fontWeight: typography.label.fontWeight,
              }}
            >
              {label(choice)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
