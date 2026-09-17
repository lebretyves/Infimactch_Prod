import { Icon, type IconName } from './Icon';
import s from './ChoixRole.module.css';

export type Role = 'interimaire' | 'entreprise';

const roles: { value: Role; titre: string; detail: string; icone: IconName }[] = [
  { value: 'interimaire', titre: 'Intérimaire', detail: 'IDE · IADE · IBODE', icone: 'user' },
  { value: 'entreprise', titre: 'Entreprise', detail: 'Établissement · Agence', icone: 'building' },
];

type Props = {
  legende: string;
  name: string;
  value: Role;
  onChange: (role: Role) => void;
};

export function ChoixRole({ legende, name, value, onChange }: Props) {
  return (
    <fieldset className={s.groupe}>
      <legend className="srOnly">{legende}</legend>

      {roles.map((role) => (
        <label
          key={role.value}
          className={[s.carte, value === role.value && s.actif].filter(Boolean).join(' ')}
        >
          <input
            type="radio"
            name={name}
            value={role.value}
            checked={value === role.value}
            onChange={() => onChange(role.value)}
          />
          <span className={s.puce} aria-hidden="true" />
          <span className={s.icone} aria-hidden="true">
            <Icon name={role.icone} size={26} />
          </span>
          <span className={s.titre}>{role.titre}</span>
          <span className={s.detail}>{role.detail}</span>
        </label>
      ))}
    </fieldset>
  );
}
