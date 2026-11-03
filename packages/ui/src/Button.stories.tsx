import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button.tsx';

const meta = {
  title: 'Components/Button',
  component: Button,
  args: { children: 'Save', variant: 'primary', disabled: false },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'danger'] },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: 'secondary', children: 'Cancel' } };

export const Danger: Story = { args: { variant: 'danger', children: 'Delete' } };

export const Disabled: Story = { args: { disabled: true, children: 'Later' } };
