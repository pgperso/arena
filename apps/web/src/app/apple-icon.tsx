import { ImageResponse } from 'next/og';
import { BRAND } from '@/lib/brand';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
          borderRadius: 36,
          color: BRAND.colors.white,
          fontSize: 90,
          fontWeight: 700,
        }}
      >
        {BRAND.shortName}
      </div>
    ),
    { ...size },
  );
}
