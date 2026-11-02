
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);

    return originUrl.origin === requestUrl.origin;
  } catch {
    return false;
  }
}
