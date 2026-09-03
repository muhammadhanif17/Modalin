import { initials, avatarTone } from '../../lib/format';

const SIZES = { sm: 'avatar-sm', md: 'avatar-md', lg: 'avatar-lg' } as const;

export function Avatar({
  name,
  seed,
  size = 'md',
}: {
  name?: string | null;
  seed?: string | null;
  size?: keyof typeof SIZES;
}) {
  return (
    <div className={`avatar ${SIZES[size]} ${avatarTone(seed ?? name)}`} aria-hidden="true">
      {initials(name)}
    </div>
  );
}
