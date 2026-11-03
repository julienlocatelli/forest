import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from './Text.tsx';

const meta = {
  title: 'Components/Text',
  component: Text,
  args: { children: 'Forest keeps your notes together.', variant: 'body', tone: 'default', as: 'p' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['body', 'label', 'caption'] },
    tone: { control: 'inline-radio', options: ['default', 'muted'] },
    as: { control: 'inline-radio', options: ['p', 'span', 'div'] },
    children: { control: 'text' },
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Body: Story = {};

export const Label: Story = { args: { variant: 'label', children: 'Email' } };

export const Caption: Story = { args: { variant: 'caption', children: 'Updated 2 minutes ago' } };

export const Muted: Story = { args: { tone: 'muted', children: 'Secondary information.' } };
