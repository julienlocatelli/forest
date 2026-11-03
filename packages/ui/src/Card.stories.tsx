import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button.tsx';
import { Card } from './Card.tsx';
import { Heading, Text } from './Text.tsx';
import { TextField } from './TextField.tsx';

const meta = {
  title: 'Components/Card',
  component: Card,
  args: { as: 'div' },
  argTypes: {
    as: { control: 'inline-radio', options: ['div', 'section', 'article'] },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: <Text>A card groups related content on the surface color.</Text>,
  },
};

export const SignInSection: Story = {
  args: {
    as: 'section',
    'aria-labelledby': 'sign-in-title',
    children: (
      <>
        <Heading level={2} id="sign-in-title">
          Sign in
        </Heading>
        <TextField label="Email" type="email" hint="Your work email." />
        <TextField label="Password" type="password" />
        <Button type="submit">Sign in</Button>
      </>
    ),
  },
};
