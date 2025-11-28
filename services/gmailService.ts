import { GmailSettings } from '../types';

const GMAIL_STORAGE_KEY = 'seam_media_gmail_settings';
const SCOPES = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email';

// Get Gmail settings from localStorage
export const getGmailSettings = (): GmailSettings | null => {
  const stored = localStorage.getItem(GMAIL_STORAGE_KEY);
  if (!stored) return null;

  try {
    const settings = JSON.parse(stored) as GmailSettings;
    // Check if token is expired (with 5 min buffer)
    if (settings.expiresAt < Date.now() + 300000) {
      return null; // Token expired or about to expire
    }
    return settings;
  } catch {
    return null;
  }
};

// Save Gmail settings to localStorage
export const saveGmailSettings = (settings: GmailSettings): void => {
  localStorage.setItem(GMAIL_STORAGE_KEY, JSON.stringify(settings));
};

// Clear Gmail settings
export const clearGmailSettings = (): void => {
  localStorage.removeItem(GMAIL_STORAGE_KEY);
};

// Check if Gmail is connected
export const isGmailConnected = (): boolean => {
  return getGmailSettings() !== null;
};

// Get the connected Gmail email address
export const getConnectedEmail = (): string | null => {
  const settings = getGmailSettings();
  return settings?.email || null;
};

// Initialize Google OAuth popup
export const connectGmail = (clientId: string): Promise<GmailSettings> => {
  return new Promise((resolve, reject) => {
    const redirectUri = `${window.location.origin}/oauth/callback`;

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('access_type', 'online');

    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl.toString(),
      'gmail_oauth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Listen for the OAuth callback
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'GMAIL_OAUTH_SUCCESS') {
        window.removeEventListener('message', handleMessage);

        const { access_token, expires_in } = event.data;

        try {
          // Get user email
          const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
          });
          const userData = await userInfo.json();

          const settings: GmailSettings = {
            accessToken: access_token,
            refreshToken: '', // Not available with implicit flow
            expiresAt: Date.now() + (expires_in * 1000),
            email: userData.email
          };

          saveGmailSettings(settings);
          resolve(settings);
        } catch (error) {
          reject(new Error('Failed to get user info'));
        }
      } else if (event.data.type === 'GMAIL_OAUTH_ERROR') {
        window.removeEventListener('message', handleMessage);
        reject(new Error(event.data.error || 'OAuth failed'));
      }
    };

    window.addEventListener('message', handleMessage);

    // Check if popup was closed without completing auth
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        reject(new Error('Authentication cancelled'));
      }
    }, 1000);
  });
};

// Send email via Gmail API
export const sendEmail = async (
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string }> => {
  const settings = getGmailSettings();

  if (!settings) {
    return { success: false, error: 'Gmail not connected. Please connect your Gmail account first.' };
  }

  try {
    // Create email in RFC 2822 format
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body
    ].join('\r\n');

    // Encode to base64url
    const encodedEmail = btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedEmail })
    });

    if (!response.ok) {
      const error = await response.json();

      // Check if token expired
      if (response.status === 401) {
        clearGmailSettings();
        return { success: false, error: 'Gmail session expired. Please reconnect your account.' };
      }

      return { success: false, error: error.error?.message || 'Failed to send email' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to send email' };
  }
};
