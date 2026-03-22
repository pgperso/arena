import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  const logoData = readFileSync(join(process.cwd(), 'public/images/fanstribune.png'));
  const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`;

  return new ImageResponse(
    (
      <img src={logoSrc} width={32} height={32} style={{ objectFit: 'contain' }} />
    ),
    { ...size },
  );
}
