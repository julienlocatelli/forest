import { spacing } from '@forest/design-tokens';
import { Button, Card, Heading, Text, TextField, ThemeProvider, useTheme } from '@forest/ui-native';
import { ScrollView, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ThemeChoice } from './ThemeChoice';

// Every component of @forest/ui-native, in each of its variants and states. Add each new component here.
function Catalog() {
  const { name, colors } = useTheme();
  return (
    <SafeAreaView testID="catalog" style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={name === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
        <Heading level={1}>Forest components</Heading>
        <ThemeChoice />

        <Heading level={2}>Button</Heading>
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger">Danger</Button>
        <Button disabled>Disabled</Button>

        <Heading level={2}>TextField</Heading>
        <TextField label="Email" placeholder="ada@example.com" keyboardType="email-address" autoCapitalize="none" />
        <TextField label="With hint" hint="Your work email." />
        <TextField label="With error" error="Enter a valid email." />
        <TextField label="Disabled field" disabled />

        <Heading level={2}>Text and Heading</Heading>
        <Heading level={1}>Heading level 1</Heading>
        <Heading level={2}>Heading level 2</Heading>
        <Heading level={3}>Heading level 3</Heading>
        <Text>Body text</Text>
        <Text variant="label">Label text</Text>
        <Text variant="caption">Caption text</Text>
        <Text tone="muted">Muted text</Text>

        <Heading level={2}>Card</Heading>
        <Card>
          <Text>Card content</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Catalog />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
