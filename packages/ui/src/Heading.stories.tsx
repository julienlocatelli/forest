import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heading } from './Text.tsx';

const meta = {
  title: 'Components/Heading',
  component: Heading,
  args: { children: 'Forest', level: 1 },
  argTypes: {
    level: { control: 'inline-radio', options: [1, 2, 3] },
    children: { control: 'text' },
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Level1: Story = {};

export const Level2: Story = { args: { level: 2, children: 'Sign in' } };

export const Level3: Story = { args: { level: 3, children: 'Account details' } };
