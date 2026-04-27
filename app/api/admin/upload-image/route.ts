import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrStaff, adminClient, validateImageFile } from '@/lib/api-auth';

const MAGIC_BYTES: { sig: number[]; offset?: number }[] = [
  { sig: [0xff, 0xd8, 0xff] },
  { sig: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { sig: [0x52, 0x49, 0x46, 0x46], offset: 0 },
  { sig: [0x47, 0x49, 0x46, 0x38] },
];

function verifyMagicBytes(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 12));
  return MAGIC_BYTES.some(({ sig, offset = 0 }) =>
    sig.every((b, i) => bytes[offset + i] === b)
  );
}

// Allowed upload destination folders (prevent path traversal)
const ALLOWED_FOLDERS = new Set(['uploads', 'sermons', 'events', 'groups', 'announcements']);

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminOrStaff(req.headers.get('authorization'));
    if (!auth.ok) return auth.response;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const rawFolder = (formData.get('folder') as string | null) ?? 'uploads';

    // Validate folder against allowlist to prevent path traversal
    const folder = ALLOWED_FOLDERS.has(rawFolder) ? rawFolder : 'uploads';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const validation = validateImageFile(file);
    if (!validation.ok) return validation.response;

    const buffer = await file.arrayBuffer();

    if (!verifyMagicBytes(buffer)) {
      return NextResponse.json(
        { error: 'File content does not match an allowed image format' },
        { status: 400 }
      );
    }

    // Use MIME-derived extension, never trust client-supplied filename
    const path = `${folder}/${crypto.randomUUID()}.${validation.ext}`;

    const svc = adminClient();
    const { error: uploadError } = await svc.storage
      .from('church-media')
      .upload(path, buffer, { upsert: false, contentType: file.type });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = svc.storage.from('church-media').getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
