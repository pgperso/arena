import Link from 'next/link';
import Image from 'next/image';

interface CommunityCardProps {
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
  logoUrl: string | null;
  isMember?: boolean;
}

export function CommunityCard({
  name,
  slug,
  description,
  memberCount,
  logoUrl,
  isMember = false,
}: CommunityCardProps) {
  return (
    <Link
      href={`/tribunes/${slug}`}
      className="group relative rounded-xl border border-gray-200 p-6 transition hover:border-gray-300 hover:shadow-md"
    >
      {isMember && (
        <span className="absolute right-3 top-3 rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-xs font-semibold text-brand-blue">
          Membre
        </span>
      )}
      <div className="mb-4 flex items-center gap-3">
        {logoUrl ? (
          <Image src={logoUrl} alt={name} width={48} height={48} className="h-12 w-12 object-contain" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-lg font-bold text-gray-500">
            {name[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="truncate text-base font-semibold text-gray-900 group-hover:text-brand-blue">
            {name}
          </h3>
          <p className="text-sm text-gray-500">
            {memberCount} membre{memberCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      {description && (
        <p className="line-clamp-2 text-sm text-gray-600">{description}</p>
      )}
    </Link>
  );
}
