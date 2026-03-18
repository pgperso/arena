import Link from 'next/link';

interface CommunityCardProps {
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
  primaryColor: string;
  logoUrl: string | null;
}

export function CommunityCard({
  name,
  slug,
  description,
  memberCount,
  primaryColor,
  logoUrl,
}: CommunityCardProps) {
  return (
    <Link
      href={`/communities/${slug}`}
      className="group rounded-xl border border-gray-200 bg-white p-6 transition hover:border-gray-300 hover:shadow-md"
    >
      <div className="mb-4 flex items-center gap-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={name}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {name[0]}
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
