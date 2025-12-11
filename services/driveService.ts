// Google Drive Service for fetching images from shared folders

export interface DriveSettings {
  accessToken: string;
  expiresAt: number;
  email: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
}

const DRIVE_STORAGE_KEY = 'seam_media_drive_settings';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email';

// Get Drive settings from localStorage
export const getDriveSettings = (): DriveSettings | null => {
  const stored = localStorage.getItem(DRIVE_STORAGE_KEY);
  if (!stored) return null;

  try {
    const settings = JSON.parse(stored) as DriveSettings;
    // Check if token is expired (with 5 min buffer)
    if (settings.expiresAt < Date.now() + 300000) {
      return null; // Token expired or about to expire
    }
    return settings;
  } catch {
    return null;
  }
};

// Save Drive settings to localStorage
export const saveDriveSettings = (settings: DriveSettings): void => {
  localStorage.setItem(DRIVE_STORAGE_KEY, JSON.stringify(settings));
};

// Clear Drive settings
export const clearDriveSettings = (): void => {
  localStorage.removeItem(DRIVE_STORAGE_KEY);
};

// Check if Drive is connected
export const isDriveConnected = (): boolean => {
  return getDriveSettings() !== null;
};

// Get the connected Drive email address
export const getDriveEmail = (): string | null => {
  const settings = getDriveSettings();
  return settings?.email || null;
};

// Initialize Google OAuth popup for Drive
export const connectDrive = (clientId: string): Promise<DriveSettings> => {
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
      'drive_oauth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Listen for the OAuth callback
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'GMAIL_OAUTH_SUCCESS' || event.data.type === 'DRIVE_OAUTH_SUCCESS') {
        window.removeEventListener('message', handleMessage);

        const { access_token, expires_in } = event.data;

        try {
          // Get user email
          const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
          });
          const userData = await userInfo.json();

          const settings: DriveSettings = {
            accessToken: access_token,
            expiresAt: Date.now() + (expires_in * 1000),
            email: userData.email
          };

          saveDriveSettings(settings);
          resolve(settings);
        } catch (error) {
          reject(new Error('Failed to get user info'));
        }
      } else if (event.data.type === 'GMAIL_OAUTH_ERROR' || event.data.type === 'DRIVE_OAUTH_ERROR') {
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

// Extract folder ID from Google Drive URL
export const extractFolderIdFromUrl = (url: string): string | null => {
  // Handle various Google Drive URL formats:
  // https://drive.google.com/drive/folders/FOLDER_ID
  // https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
  // https://drive.google.com/drive/u/0/folders/FOLDER_ID

  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

// List files in a Google Drive folder
export const listFolderFiles = async (folderId: string): Promise<DriveFile[]> => {
  const settings = getDriveSettings();

  if (!settings) {
    throw new Error('Google Drive not connected. Please connect your Google Drive account first.');
  }

  try {
    // Query for image files in the folder
    const query = `'${folderId}' in parents and (mimeType contains 'image/') and trashed = false`;
    const fields = 'files(id,name,mimeType,thumbnailLink,webContentLink)';

    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', query);
    url.searchParams.set('fields', fields);
    url.searchParams.set('pageSize', '100');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${settings.accessToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearDriveSettings();
        throw new Error('Google Drive session expired. Please reconnect your account.');
      }
      if (response.status === 404) {
        throw new Error('Folder not found. Make sure the folder is shared with you.');
      }
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to list files');
    }

    const data = await response.json();
    return data.files || [];
  } catch (error: any) {
    throw error;
  }
};

// Get a direct download URL for a file (requires the file to be shared)
export const getFileDownloadUrl = (fileId: string): string => {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
};

// Get file as base64 for uploading to Supabase
export const getFileAsBase64 = async (fileId: string): Promise<{ base64: string; mimeType: string }> => {
  const settings = getDriveSettings();

  if (!settings) {
    throw new Error('Google Drive not connected.');
  }

  try {
    // Get file metadata first
    const metaResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType,name`,
      {
        headers: {
          'Authorization': `Bearer ${settings.accessToken}`
        }
      }
    );

    if (!metaResponse.ok) {
      throw new Error('Failed to get file metadata');
    }

    const metadata = await metaResponse.json();

    // Download the file content
    const contentResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${settings.accessToken}`
        }
      }
    );

    if (!contentResponse.ok) {
      throw new Error('Failed to download file');
    }

    const blob = await contentResponse.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // Extract base64 data (remove the data:mime;base64, prefix)
        const base64 = dataUrl.split(',')[1] || dataUrl;
        resolve({ base64, mimeType: metadata.mimeType });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error: any) {
    throw error;
  }
};

// Get random images from a folder
export const getRandomImagesFromFolder = async (
  folderId: string,
  count: number
): Promise<DriveFile[]> => {
  const allFiles = await listFolderFiles(folderId);

  if (allFiles.length === 0) {
    return [];
  }

  // Shuffle and pick random files
  const shuffled = [...allFiles].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
};
