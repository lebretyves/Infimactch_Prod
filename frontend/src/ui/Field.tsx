import { useId, useState } from 'react';
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

function ReadOnlyField({ label, value, hint, error, name, disabled, type }: {
  label: string;
  value?: InputHTMLAttributes<HTMLInputElement>['value'];
  hint?: string;
  error?: string;
  name?: string;
  disabled?: boolean;
  type?: string;
}) {
  const raw = Array.isArray(value) ? value.join(', ') : String(value ?? '');
  const display = type === 'password' && raw
    ? '••••••••'
    : type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? raw.split('-').reverse().join('/')
      : raw;
  return (
    <div className={s.field}>
      <dl className={s.readOnly}>
        <dt className={s.label}>{label}</dt>
        <dd>{display || 'Non renseigné'}</dd>
      </dl>
      {name && <input type="hidden" name={name} value={raw} disabled={disabled} />}
      {error && <p className={s.error} role="alert">{error}</p>}
      {hint && !error && <p className={s.hint}>{hint}</p>}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  optional,
  required,
  width,
  icon,
  action,
  ...rest
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  if (rest.readOnly) return <ReadOnlyField label={label} value={rest.value ?? rest.defaultValue}
    hint={hint} error={error} name={rest.name} disabled={rest.disabled} type={rest.type} />;
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
            id={id}
            className={[s.control, invalid && s.invalid, width && s[`width-${width}`]]
              .filter(Boolean)
              .join(' ')}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            required={required}
            {...rest}
          />
          {action && <span className={s.action}>{action}</span>}
        </span>
      )}
    </Wrapper>
  );
}

type PasswordProps = Omit<FieldProps, 'action'> & InputHTMLAttributes<HTMLInputElement>;

export function PasswordField({ icon = 'lock', ...rest }: PasswordProps) {
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

  return <TextField {...rest} icon={icon} type={visible ? 'text' : 'password'} action={bascule} />;
}

export function TextArea({
  label,
  hint,
  error,
  optional,
  required,
  ...rest
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  if (rest.readOnly) return <ReadOnlyField label={label} value={rest.value ?? rest.defaultValue}
    hint={hint} error={error} name={rest.name} disabled={rest.disabled} />;
  return (
    <Wrapper label={label} hint={hint} error={error} optional={optional} required={required}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          className={[s.control, s.textarea, invalid && s.invalid].filter(Boolean).join(' ')}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          required={required}
          {...rest}
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
            id={id}
            className={[s.control, s.select, invalid && s.invalid, width && s[`width-${width}`]]
              .filter(Boolean)
              .join(' ')}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            required={required}
            {...rest}
          >
            {children}
          </select>
        </span>
      )}
    </Wrapper>
  );
}
