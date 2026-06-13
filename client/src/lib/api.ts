const ENV_API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const ENV_SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || '';
const DEFAULT_SERVER = 'http://localhost:3000';
const LS_KEY = 'athas_server_url';

/**
 * Get the effective server URL, checking (in order):
 * 1. localStorage `athas_server_url` (set via lobby UI)
 * 2. NEXT_PUBLIC_SERVER_URL env var (build-time override)
 * 3. Default: http://localhost:3000
 */
function getEffectiveServerUrl(): string {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(LS_KEY);
        if (stored) return stored;
    }
    return ENV_SERVER_URL || DEFAULT_SERVER;
}

/**
 * Get the base server URL (no /api suffix).
 * Used by socket.ts, image paths, and anywhere a raw server URL is needed.
 */
export function getServerUrl(): string {
    return getEffectiveServerUrl();
}

/**
 * Get the API base URL (server URL + /api).
 */
function getApiBase(): string {
    if (ENV_API_BASE) return ENV_API_BASE;
    return `${getEffectiveServerUrl()}/api`;
}

/**
 * Set the server URL for this client (persists in localStorage).
 * Called from the lobby when the user enters a server address.
 */
export function setServerUrl(url: string): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(LS_KEY, url);
    }
}

/**
 * Clear the stored server URL (reverts to env var / default).
 */
export function clearServerUrl(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(LS_KEY);
    }
}

/**
 * Get the stored server URL from localStorage (raw value, may be empty).
 * Used by the lobby to pre-populate the server address field.
 */
export function getStoredServerUrl(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(LS_KEY) || '';
}

/**
 * Resolve a relative asset path to a full URL.
 * If the path already starts with 'http', returns it unchanged.
 */
export function getAssetUrl(path: string): string {
    if (path.startsWith('http')) return path;
    return `${getEffectiveServerUrl()}${path}`;
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

    const res = await fetch(`${getApiBase()}${endpoint}`, {
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
        return fetch(`${getApiBase()}${endpoint}`, {
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
