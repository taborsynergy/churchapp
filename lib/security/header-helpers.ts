interface HeaderEntry {
  key: string;
  value: string;
}

export function parseSecurityHeaders(headers: HeaderEntry[]): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach(({ key, value }) => {
    result[key.toLowerCase()] = value;
  });
  return result;
}
