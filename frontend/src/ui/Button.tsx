import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import s from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'icon';
type Size = 'sm' | 'md' | 'lg';

type BaseProps = {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  children?: ReactNode;
};

type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { to?: never };
type LinkProps = BaseProps & { to: string; className?: string; 'aria-label'?: string };

function classes(variant: Variant, size: Size, block?: boolean, extra?: string) {
  return [s.button, s[variant], variant !== 'icon' && s[size], block && s.block, extra]
    .filter(Boolean)
    .join(' ');
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  loading,
  children,
  disabled,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={classes(variant, size, block, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className={s.spinner} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  block,
  children,
  className,
  ...rest
}: LinkProps) {
  return (
    <Link to={to} className={classes(variant, size, block, className)} {...rest}>
      {children}
    </Link>
  );
}
