import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '@/lib/request-helpers';
import { checkRateLimitStrict, rateLimitHeaders } from '@/lib/security/rate-limiter';
import { requireAuth, adminClient, validateImageFile } from '@/lib/api-auth';

// Magic byte signatures for allowed image types
const MAGIC_BYTES: { sig: number[]; offset?: number }[] = [
  { sig: [0xff, 0xd8, 0xff] },                            // JPEG
  { sig: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }, // PNG
  { sig: [0x52, 0x49, 0x46, 0x46], offset: 0 },           // RIFF (WebP prefix)
  { sig: [0x47, 0x49, 0x46, 0x38] },                      // GIF87a / GIF89a
];

function verifyMagicBytes(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 12));
  return MAGIC_BYTES.some(({ sig, offset = 0 }) =>
    sig.every((b, i) => bytes[offset + i] === b)
  );
}

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req.headers.get('authorization'));
    if (!auth.ok) return auth.response;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate MIME type from header
    const validation = validateImageFile(file);
    if (!validation.ok) return validation.response;

    // Size check before reading full buffer
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();

    // Verify actual file content via magic bytes (not just the Content-Type header)
    if (!verifyMagicBytes(buffer)) {
      return NextResponse.json(
        { error: 'File content does not match an allowed image format' },
        { status: 400 }
      );
    }

    // Path scoped to the authenticated user — prevents overwriting other users' avatars
    const path = `avatars/${auth.userId}.${validation.ext}`;

    const svc = adminClient();
    const { error: uploadError } = await svc.storage
      .from('church-media')
      .upload(path, buffer, { upsert: true, contentType: file.type });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = svc.storage.from('church-media').getPublicUrl(path);
    await svc.from('church_users').update({ avatar_url: data.publicUrl }).eq('id', auth.userId);

    return NextResponse.json({ url: data.publicUrl });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
