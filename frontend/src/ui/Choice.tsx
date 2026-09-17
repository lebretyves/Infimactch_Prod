import type { InputHTMLAttributes, ReactNode } from 'react';
import s from './Choice.module.css';

const check = (
  <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true">
    <path
      d="M1 5.2 4.3 8.5 11 1.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const dot = (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
    <circle cx="5" cy="5" r="4" fill="currentColor" />
  </svg>
);

type ChoiceProps = InputHTMLAttributes<HTMLInputElement> & {
  children: ReactNode;
  required?: boolean;
};

export function Checkbox({ children, required, ...rest }: ChoiceProps) {
  return (
    <label className={s.choice}>
      <input type="checkbox" required={required} {...rest} />
      <span className={s.box} aria-hidden="true">
        {check}
      </span>
      <span className={s.text}>
        {children}
        {required && (
          <span className={s.required} aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </span>
    </label>
  );
}

export function Radio({ children, ...rest }: ChoiceProps) {
  return (
    <label className={s.choice}>
      <input type="radio" {...rest} />
      <span className={`${s.box} ${s.round}`} aria-hidden="true">
        {dot}
      </span>
      <span className={s.text}>{children}</span>
    </label>
  );
}

type TagGroupProps = {
  legend: string;
  name: string;
  options: readonly string[];
  selected: readonly string[];
  onToggle: (value: string) => void;
};

export function TagGroup({ legend, name, options, selected, onToggle }: TagGroupProps) {
  return (
    <fieldset className={s.tags}>
      <legend className="srOnly">{legend}</legend>
      {options.map((option) => (
        <label className={s.tag} key={option}>
          <input
            type="checkbox"
            name={name}
            value={option}
            checked={selected.includes(option)}
            onChange={() => onToggle(option)}
          />
          <span className={s.tagLabel}>{option}</span>
        </label>
      ))}
    </fieldset>
  );
}
