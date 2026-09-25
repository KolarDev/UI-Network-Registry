/**
 * Headers for state-changing admin requests (routes in the `web` group).
 *
 * Those routes are session-authenticated and CSRF-protected. The CSRF token
 * rotates on login (session regeneration), so the `<meta name="csrf-token">`
 * rendered with the page is stale afterwards; Laravel's `XSRF-TOKEN` cookie is
 * refreshed on every response, so it is read fresh for each request.
 */
export function adminHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json', ...extra };

    const adminToken = sessionStorage.getItem('admin_token');
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;

    const xsrf = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    if (xsrf) headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf[1]);

    return headers;
}

export interface AdminProfile {
    id: number;
    username: string;
    email: string | null;
}

/** Profile of the signed-in admin, saved by AdminLogin for the dashboard header. */
export function getAdminProfile(): AdminProfile | null {
    try {
        const raw = sessionStorage.getItem('admin_user');
        return raw ? (JSON.parse(raw) as AdminProfile) : null;
    } catch {
        return null;
    }
}
