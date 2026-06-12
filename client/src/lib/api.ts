const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';

/**
 * Get the base server URL (no /api suffix).
 * Used by socket.ts, image paths, and anywhere a raw server URL is needed.
 */
export function getServerUrl(): string {
    return SERVER_URL;
}

/**
 * Resolve a relative asset path to a full URL.
 * If the path already starts with 'http', returns it unchanged.
 */
export function getAssetUrl(path: string): string {
    if (path.startsWith('http')) return path;
    return `${SERVER_URL}${path}`;
}

/**
 * Get the session token from localStorage.
 */
function getSessionToken(): string | null {
    if (typeof window === 'undefined') return null;
    const session = localStorage.getItem('athas_session');
    if (!session) return null;
    try {
        return JSON.parse(session).sessionToken;
    } catch {
        return null;
    }
}

/**
 * Fetch wrapper that automatically adds session token header.
 */
async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getSessionToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['x-session-token'] = token;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        // Expired or invalid session — redirect to lobby
        if (res.status === 401 && typeof window !== 'undefined') {
            localStorage.removeItem('athas_session');
            window.location.href = '/';
            throw new Error('Session expired');
        }
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }

    if (res.status === 204) return {} as T;
    return res.json();
}

export const api = {
    get: <T>(endpoint: string) => request<T>(endpoint),
    post: <T, B = unknown>(endpoint: string, body: B) =>
        request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    patch: <T, B = unknown>(endpoint: string, body: B) =>
        request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(endpoint: string) =>
        request<T>(endpoint, { method: 'DELETE' }),
    upload: <T>(endpoint: string, formData: FormData) => {
        const token = getSessionToken();
        const headers: Record<string, string> = {};
        if (token) {
            headers['x-session-token'] = token;
        }
        return fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers,
            body: formData,
        }).then(async (res) => {
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Upload failed' }));
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            return res.json() as Promise<T>;
        });
    },
};
