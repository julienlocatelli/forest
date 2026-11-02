import type { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  // `div` by default; `section` or `article` when the card is a landmark, labelled with `aria-labelledby`.
  as?: 'div' | 'section' | 'article';
}

export function Card({ as: Element = 'div', className, ...props }: CardProps) {
  return <Element className={['forest-card', className].filter(Boolean).join(' ')} {...props} />;
}
