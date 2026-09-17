import sprite from '@/assets/sprite.svg?raw';

export type IconName =
  | 'arrow-left'
  | 'bell'
  | 'briefcase'
  | 'building'
  | 'calendar'
  | 'chevron'
  | 'close'
  | 'eye'
  | 'eye-off'
  | 'file-text'
  | 'folder'
  | 'graduation'
  | 'heart-outline'
  | 'lock'
  | 'mail'
  | 'map-pin'
  | 'menu'
  | 'nav-booking'
  | 'nav-home'
  | 'nav-messages'
  | 'nav-profile'
  | 'pharmacy'
  | 'record'
  | 'search'
  | 'settings'
  | 'spec-cardiologie'
  | 'spec-dermatologie'
  | 'spec-general'
  | 'spec-gynecologie'
  | 'spec-odontologie'
  | 'spec-oncologie'
  | 'specialty'
  | 'stethoscope'
  | 'user';

type Props = {
  name: IconName;
  size?: number;
  label?: string;
  className?: string;
};

export function Icon({ name, size = 24, label, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <use href={`#i-${name}`} />
    </svg>
  );
}

export function IconSprite() {
  return <div hidden dangerouslySetInnerHTML={{ __html: sprite }} />;
}
