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
        <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
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
