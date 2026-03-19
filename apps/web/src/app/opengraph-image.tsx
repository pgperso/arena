import { ImageResponse } from 'next/og';
import { BRAND } from '@/lib/brand';

export const alt = 'La tribune des fans - Communautés sportives en direct';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BRAND.colors.blue,
          color: BRAND.colors.white,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 100,
            height: 100,
            backgroundColor: BRAND.colors.white,
            borderRadius: 20,
            marginBottom: 40,
            color: BRAND.colors.blue,
            fontSize: 52,
            fontWeight: 700,
          }}
        >
          {BRAND.shortName}
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, marginBottom: 16 }}>
          {BRAND.name}
        </div>
        <div style={{ fontSize: 28, opacity: 0.85 }}>
          {BRAND.tagline}
        </div>
      </div>
    ),
    { ...size },
  );
}
