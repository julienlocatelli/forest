import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // `primary` for the main action, `secondary` for the others, `danger` for a destructive one.
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({ variant = 'primary', type = 'button', className, ...props }: ButtonProps) {
  const classes = ['forest-button', `forest-button--${variant}`, 'forest-focusable', className].filter(Boolean);
  return <button type={type} className={classes.join(' ')} {...props} />;
}
