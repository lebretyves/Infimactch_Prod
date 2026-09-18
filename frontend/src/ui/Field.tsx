import { forwardRef, useId, useState } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { Icon, type IconName } from './Icon';
import s from './Field.module.css';

type Width = 'sm' | 'md' | 'lg';

type WrapperProps = {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  required?: boolean;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
};

function Wrapper({ label, hint, error, optional, required, children }: WrapperProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>
        {label}
        {required && (
          <span className={s.required} aria-hidden="true">
            *
          </span>
        )}
        {optional && <span className={s.optional}>(facultatif)</span>}
      </label>

      {children({ id, describedBy, invalid: Boolean(error) })}

      {error && (
        <p className={s.error} id={errorId} role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p className={s.hint} id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  required?: boolean;
  width?: Width;
  icon?: IconName;
  action?: ReactNode;
};

function shell(icon?: IconName, action?: ReactNode) {
  return [s.shell, icon && s.withIcon, action && s.withAction].filter(Boolean).join(' ');
}

export const TextField = forwardRef<
  HTMLInputElement,
  FieldProps & InputHTMLAttributes<HTMLInputElement>
>(function TextField(
  { label, hint, error, optional, required, width, icon, action, ...rest },
  ref,
) {
  return (
    <Wrapper label={label} hint={hint} error={error} optional={optional} required={required}>
      {({ id, describedBy, invalid }) => (
        <span className={shell(icon, action)}>
          {icon && (
            <span className={s.icon} aria-hidden="true">
              <Icon name={icon} size={19} />
            </span>
          )}
          <input
            {...rest}
            ref={ref}
            id={id}
            className={[s.control, invalid && s.invalid, width && s[`width-${width}`]]
              .filter(Boolean)
              .join(' ')}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            required={required}
          />
          {action && <span className={s.action}>{action}</span>}
        </span>
      )}
    </Wrapper>
  );
});

type PasswordProps = Omit<FieldProps, 'action'> & InputHTMLAttributes<HTMLInputElement>;

export const PasswordField = forwardRef<HTMLInputElement, PasswordProps>(
  function PasswordField({ icon = 'lock', ...rest }, ref) {
    const [visible, setVisible] = useState(false);

    const bascule = (
      <button
        type="button"
        className={s.bouton}
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      >
        <Icon name={visible ? 'eye-off' : 'eye'} size={19} />
      </button>
    );

    return (
      <TextField
        {...rest}
        ref={ref}
        icon={icon}
        type={visible ? 'text' : 'password'}
        action={bascule}
      />
    );
  },
);

export function TextArea({
  label,
  hint,
  error,
  optional,
  required,
  ...rest
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Wrapper label={label} hint={hint} error={error} optional={optional} required={required}>
      {({ id, describedBy, invalid }) => (
        <textarea
          {...rest}
          id={id}
          className={[s.control, s.textarea, invalid && s.invalid].filter(Boolean).join(' ')}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          required={required}
        />
      )}
    </Wrapper>
  );
}

export function SelectField({
  label,
  hint,
  error,
  optional,
  required,
  width,
  icon,
  children,
  ...rest
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Wrapper label={label} hint={hint} error={error} optional={optional} required={required}>
      {({ id, describedBy, invalid }) => (
        <span className={shell(icon)}>
          {icon && (
            <span className={s.icon} aria-hidden="true">
              <Icon name={icon} size={19} />
            </span>
          )}
          <select
            {...rest}
            id={id}
            className={[s.control, s.select, invalid && s.invalid, width && s[`width-${width}`]]
              .filter(Boolean)
              .join(' ')}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            required={required}
          >
            {children}
          </select>
        </span>
      )}
    </Wrapper>
  );
}
