import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextField } from './TextField.tsx';

const meta = {
  title: 'Components/TextField',
  component: TextField,
  args: { label: 'Email', type: 'email', placeholder: 'ada@example.com', disabled: false },
  argTypes: {
    label: { control: 'text' },
    hint: { control: 'text' },
    error: { control: 'text' },
    type: { control: 'select', options: ['text', 'email', 'password'] },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHint: Story = { args: { hint: 'Your work email.' } };

export const WithError: Story = { args: { hint: 'Your work email.', error: 'Enter a valid email.' } };

export const Disabled: Story = { args: { disabled: true } };
