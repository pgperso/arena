import { Link } from '@/i18n/navigation';
import Image from 'next/image';

interface CommunityCardProps {
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
  logoUrl: string | null;
}

export function CommunityCard({
  name,
  slug,
  description,
  memberCount,
  logoUrl,
}: CommunityCardProps) {
  return (
    <Link
      href={`/tribunes/${slug}`}
      className="group rounded-xl border border-gray-200 p-6 transition hover:border-gray-300 hover:shadow-md"
    >
      <div className="mb-4 flex items-center gap-3">
        <Image src={logoUrl || '/images/fanstribune.webp'} alt={name} width={48} height={48} className="h-12 w-12 shrink-0 object-contain" />
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
