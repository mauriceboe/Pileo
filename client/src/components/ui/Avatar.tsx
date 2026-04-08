import styles from './avatar.module.css';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: AvatarSize;
  className?: string;
}

const AVATAR_COLORS = [
  '#4A90D9',
  '#7ED321',
  '#F5A623',
  '#F5735A',
  '#50C8C6',
  '#9B59B6',
  '#E74C3C',
];

const FALLBACK_COLOR = '#4A90D9';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  const second = parts[1];
  if (parts.length >= 2 && first && second) {
    return (first.charAt(0) + second.charAt(0)).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getColorFromName(name: string): string {
  let hash = 0;
  for (const character of name) {
    hash = character.charCodeAt(0) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? FALLBACK_COLOR;
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const classNames = [styles.avatar, styles[size], className]
    .filter(Boolean)
    .join(' ');

  if (src) {
    return (
      <div className={classNames} title={name}>
        <img className={styles.image} src={src} alt={name} />
      </div>
    );
  }

  return (
    <div
      className={classNames}
      title={name}
      style={{ backgroundColor: getColorFromName(name) }}
    >
      {getInitials(name)}
    </div>
  );
}
