import s from './Segmented.module.css';

type Props<T extends string> = {
  legend: string;
  name: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: Props<T>) {
  return (
    <fieldset className={s.group}>
      <legend className="srOnly">{legend}</legend>
      {options.map((option) => (
        <label className={s.option} key={option.value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span className={s.label}>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
