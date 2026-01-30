import type { Profile } from '@/types/dogspace';

interface OwnerChipProps {
  owner: Profile;
}

export function OwnerChip({ owner }: OwnerChipProps) {
  const displayName = owner.last_name_initial 
    ? `${owner.first_name} ${owner.last_name_initial}.`
    : owner.first_name;

  return (
    <div className="owner-chip pointer-events-none select-none">
      {owner.avatar_url ? (
        <img
          src={owner.avatar_url}
          alt=""
          className="owner-chip-avatar"
        />
      ) : (
        <div className="owner-chip-avatar flex items-center justify-center bg-muted text-[10px] font-medium text-muted-foreground">
          {owner.first_name[0]}
        </div>
      )}
      <span className="owner-chip-name">{displayName}</span>
    </div>
  );
}
