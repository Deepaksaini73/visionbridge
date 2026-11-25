/**
 * VisionBridge API Client
 * Centralized fetch wrapper for backend communication.
 * Safely resolves authentication token from localStorage and document.cookie.
 */

const BASE_URL = '/api';

export function getAuthToken(): string | null {
  try {
    const local = localStorage.getItem('vb_auth_token');
    if (local && local !== 'demo_mock_jwt_token' && local.startsWith('eyJ')) {
      return local;
    }

    // Cookie fallback
    const match = document.cookie.match(/(?:^|;\s*)vb_auth_token=([^;]*)/);
    if (match && match[1] && match[1] !== 'demo_mock_jwt_token' && match[1].startsWith('eyJ')) {
      return decodeURIComponent(match[1]);
    }
    return local && local.startsWith('eyJ') ? local : null;
  } catch {
    return null;
  }
}

/**
 * Builds an authenticated media URL for <img> tags and direct file downloads.
 * Appends ?token=<jwt> if a signed session token exists, ensuring authenticated streaming
 * even when strict cookie policies or cross-context restrictions apply.
 */
export function getAuthenticatedMediaUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  const token = getAuthToken();
  if (!token) return url;

  const separator = url.includes('?') ? '&' : '?';
  if (url.includes('token=')) return url;
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

/**
 * Returns the authenticated direct URL for the clinical PDF report.
 */
export function getClinicalReportUrl(identifier: string, isCustomer: boolean = false): string {
  if (!identifier) return '';
  const token = getAuthToken();
  const endpoint = isCustomer
    ? `/api/customers/${encodeURIComponent(identifier)}/report`
    : `/api/screenings/${encodeURIComponent(identifier)}/pdf`;
  return token ? `${endpoint}?token=${encodeURIComponent(token)}` : endpoint;
}

/**
 * Opens or triggers printing/saving of the comprehensive Clinical Report (PDF)
 * in a new secure browser tab.
 */
export function openClinicalReportPdf(identifier: string, isCustomer: boolean = false): void {
  if (!identifier) return;
  const url = getClinicalReportUrl(identifier, isCustomer);
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; meta?: any; error?: any }> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const text = await response.text();
    let data: any = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = {
          success: false,
          error: {
            code: 'PARSE_ERROR',
            message: response.status >= 500
              ? 'Backend server error or proxy failure. Please verify the backend service is running.'
              : `Invalid server response: ${text.substring(0, 100)}`
          }
        };
      }
    } else {
      data = {
        success: false,
        error: {
          code: 'EMPTY_RESPONSE',
          message: 'Backend server returned an empty response. The server may have restarted or encountered a network error.'
        }
      };
    }

    // If backend reports token is invalid, clear corrupted token
    if (!response.ok && data?.error?.code === 'INVALID_TOKEN') {
      console.warn('[API Auth] Received INVALID_TOKEN. Clearing invalid session.');
      localStorage.removeItem('vb_auth_token');
      document.cookie = 'vb_auth_token=; path=/; max-age=0;';
    }

    return data;
  } catch (error: any) {
    console.error(`[API Error] ${endpoint}:`, error);
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: error.message || 'Network request failed' },
    };
  }
}
