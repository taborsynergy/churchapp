import { NextRequest, NextResponse } from 'next/server';

const LIMITS: Record<string, number> = {
  default:      64  * 1024,  // 64 KB  — standard API payloads
  upload:       5   * 1024 * 1024, // 5 MB — image uploads
  webhook:      512 * 1024,  // 512 KB — webhook payloads
};

/**
 * Enforces a maximum request body size.
 * Returns a 413 NextResponse if exceeded, otherwise null.
 */
export function checkBodySize(
  req: NextRequest,
  limitType: keyof typeof LIMITS = 'default'
): NextResponse | null {
  const contentLength = req.headers.get('content-length');
  if (!contentLength) return null; // No content-length header — allow through

  const size  = parseInt(contentLength, 10);
  const limit = LIMITS[limitType] ?? LIMITS.default;

  if (isNaN(size) || size > limit) {
    return NextResponse.json(
      { error: `Payload too large. Maximum allowed size is ${Math.round(limit / 1024)} KB.` },
      { status: 413 }
    );
  }

  return null;
}
