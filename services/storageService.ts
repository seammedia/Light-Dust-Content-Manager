import { supabase } from './supabaseClient';

const BUCKET_NAME = 'post-images';

/**
 * Upload an image to Supabase Storage and return the public URL
 * @param file - File object or base64 data URL
 * @param clientId - Client ID for organizing files
 * @param postId - Post ID for unique filename
 * @returns Public URL of the uploaded image
 */
export const uploadImage = async (
  file: File | string,
  clientId: string,
  postId: string
): Promise<string> => {
  let fileData: Blob;
  let fileExt: string;

  if (typeof file === 'string') {
    // Handle base64 data URL
    if (!file.startsWith('data:')) {
      // Already a URL, return as-is
      return file;
    }

    // Convert base64 to blob
    const base64Data = file.split(',')[1];
    const mimeType = file.split(';')[0].split(':')[1];
    fileExt = mimeType.split('/')[1] || 'png';

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    fileData = new Blob([byteArray], { type: mimeType });
  } else {
    // Handle File object
    fileData = file;
    fileExt = file.name.split('.').pop() || 'png';
  }

  // Generate unique filename
  const timestamp = Date.now();
  const fileName = `${clientId}/${postId}-${timestamp}.${fileExt}`;

  // Upload to Supabase Storage
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, fileData, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Storage upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
};

/**
 * Delete an image from Supabase Storage
 * @param url - Public URL of the image to delete
 */
export const deleteImage = async (url: string): Promise<void> => {
  // Extract path from URL
  const bucketUrl = supabase.storage.from(BUCKET_NAME).getPublicUrl('').data.publicUrl;
  const path = url.replace(bucketUrl, '');

  if (!path) return;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    console.error('Storage delete error:', error);
  }
};

/**
 * Check if a URL is a base64 data URL
 */
export const isBase64Url = (url: string): boolean => {
  return url?.startsWith('data:');
};

/**
 * Check if a URL is a public URL (not base64)
 */
export const isPublicUrl = (url: string): boolean => {
  return url?.startsWith('http://') || url?.startsWith('https://');
};
