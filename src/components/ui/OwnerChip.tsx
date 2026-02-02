import type { Profile } from '@/types/dogspace';
import { formatOwnerName } from '@/types/dogspace';

interface OwnerChipProps {
  owner: Profile;
}

export function OwnerChip({ owner }: OwnerChipProps) {
  const displayName = formatOwnerName(owner.display_name, owner.last_name);

  return (
    <div className="owner-chip pointer-events-none select-none">
      {owner.photo_url ? (
        <img
          src={owner.photo_url}
          alt=""
          className="owner-chip-avatar"
        />
      ) : (
        <div className="owner-chip-avatar flex items-center justify-center bg-muted text-[10px] font-medium text-muted-foreground">
          {owner.display_name[0]}
        </div>
      )}
      <span className="owner-chip-name">{displayName}</span>
    </div>
  );
}
