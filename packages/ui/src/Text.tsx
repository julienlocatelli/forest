import type { HTMLAttributes } from 'react';

export interface TextProps extends HTMLAttributes<HTMLElement> {
  // The type scale: `body` for running text, `label` for short labels, `caption` for small print.
  variant?: 'body' | 'label' | 'caption';
  // `muted` for secondary text.
  tone?: 'default' | 'muted';
  // `p` by default; `span` inside a line, `div` around blocks.
  as?: 'p' | 'span' | 'div';
}

export function Text({ variant = 'body', tone = 'default', as: Element = 'p', className, ...props }: TextProps) {
  const classes = ['forest-text', `forest-text--${variant}`, `forest-text--${tone}`, className].filter(Boolean);
  return <Element className={classes.join(' ')} {...props} />;
}

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  // The document outline level: 1 for the page title, 2 for sections, 3 for subsections.
  level: 1 | 2 | 3;
}

export function Heading({ level, className, ...props }: HeadingProps) {
  const Element = `h${level}` as const;
  return <Element className={['forest-heading', `forest-heading--${level}`, className].filter(Boolean).join(' ')} {...props} />;
}
