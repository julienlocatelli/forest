import { type InputHTMLAttributes, useId } from 'react';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  // Help shown under the input, read with it by screen readers.
  hint?: string;
  // Shown under the input and announced as soon as it appears; marks the input invalid.
  error?: string;
}

export function TextField({ label, hint, error, className, type = 'text', ...props }: TextFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const classes = ['forest-text-field__input', 'forest-focusable', error && 'forest-text-field__input--invalid', className];
  return (
    <div className="forest-text-field">
      <label className="forest-text-field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        className={classes.filter(Boolean).join(' ')}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {hint && (
        <p id={hintId} className="forest-text-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="forest-text-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
