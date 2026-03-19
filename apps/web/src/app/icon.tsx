import { ImageResponse } from 'next/og';
import { BRAND } from '@/lib/brand';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BRAND.colors.blue,
          borderRadius: 6,
          color: BRAND.colors.white,
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        {BRAND.shortName}
      </div>
    ),
    { ...size },
  );
}
