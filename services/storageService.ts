import { supabase } from './supabaseClient';
import { MediaType } from '../types';

const BUCKET_NAME = 'post-images';

// Supported video formats
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'avi', 'm4v'];
const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-m4v'];

// Max file sizes (in bytes)
const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB (reasonable limit for web upload)

// Instagram aspect ratio requirements
const MIN_ASPECT_RATIO = 0.75; // 4:5 portrait
const MAX_ASPECT_RATIO = 1.91; // landscape

/**
 * Detect media type from file or MIME type
 */
export const detectMediaType = (file: File | string): MediaType => {
  if (typeof file === 'string') {
    // Check data URL MIME type
    if (file.startsWith('data:video/')) {
      return 'video';
    }
    if (file.startsWith('data:image/')) {
      return 'image';
    }
    // Check URL extension
    const urlLower = file.toLowerCase();
    if (VIDEO_EXTENSIONS.some(ext => urlLower.includes(`.${ext}`))) {
      return 'video';
    }
    return 'image';
  }

  // Check File object
  if (VIDEO_MIME_TYPES.includes(file.type) ||
      VIDEO_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(`.${ext}`))) {
    return 'video';
  }
  return 'image';
};

/**
 * Check if a file is a video
 */
export const isVideoFile = (file: File | string): boolean => {
  return detectMediaType(file) === 'video';
};

/**
 * Validate file size based on media type
 */
export const validateFileSize = (file: File, mediaType: MediaType): { valid: boolean; error?: string } => {
  const maxSize = mediaType === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  const maxSizeMB = maxSize / (1024 * 1024);

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit for ${mediaType}s`
    };
  }
  return { valid: true };
};

/**
 * Crop image to fit Instagram's aspect ratio requirements (0.75 to 1.91)
 * Centers the crop on the image
 */
const cropImageForInstagram = (file: File | Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const originalWidth = img.width;
      const originalHeight = img.height;
      const aspectRatio = originalWidth / originalHeight;

      // Check if cropping is needed
      if (aspectRatio >= MIN_ASPECT_RATIO && aspectRatio <= MAX_ASPECT_RATIO) {
        // Already within acceptable range, return original
        resolve(file);
        return;
      }

      let cropWidth = originalWidth;
      let cropHeight = originalHeight;
      let offsetX = 0;
      let offsetY = 0;

      if (aspectRatio < MIN_ASPECT_RATIO) {
        // Too tall (portrait) - crop height to fit 4:5
        cropHeight = originalWidth / MIN_ASPECT_RATIO;
        offsetY = (originalHeight - cropHeight) / 2;
      } else if (aspectRatio > MAX_ASPECT_RATIO) {
        // Too wide (landscape) - crop width to fit 1.91:1
        cropWidth = originalHeight * MAX_ASPECT_RATIO;
        offsetX = (originalWidth - cropWidth) / 2;
      }

      // Create canvas and crop
      const canvas = document.createElement('canvas');
      canvas.width = cropWidth;
      canvas.height = cropHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw cropped image
      ctx.drawImage(
        img,
        offsetX, offsetY, cropWidth, cropHeight, // Source
        0, 0, cropWidth, cropHeight // Destination
      );

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create cropped image'));
          }
        },
        'image/jpeg',
        0.92 // Quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for cropping'));
    };

    img.src = url;
  });
};

/**
 * Upload an image to Supabase Storage and return the public URL
 * Automatically crops images to fit Instagram's aspect ratio requirements
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
  let fileExt: string = 'jpg'; // Default to jpg after cropping

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

  // Crop image to fit Instagram's aspect ratio requirements
  try {
    fileData = await cropImageForInstagram(fileData);
    fileExt = 'jpg'; // Cropped images are always jpg
  } catch (error) {
    console.warn('Image cropping failed, using original:', error);
    // Continue with original if cropping fails
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
 * Upload a video to Supabase Storage and return the public URL
 * Videos are NOT cropped or processed, uploaded as-is
 * @param file - File object or base64 data URL
 * @param clientId - Client ID for organizing files
 * @param postId - Post ID for unique filename
 * @returns Public URL of the uploaded video
 */
export const uploadVideo = async (
  file: File | string,
  clientId: string,
  postId: string
): Promise<string> => {
  let fileData: Blob;
  let fileExt: string = 'mp4';

  if (typeof file === 'string') {
    // Handle base64 data URL
    if (!file.startsWith('data:')) {
      // Already a URL, return as-is
      return file;
    }

    // Convert base64 to blob
    const base64Data = file.split(',')[1];
    const mimeType = file.split(';')[0].split(':')[1];
    fileExt = mimeType.split('/')[1] || 'mp4';
    // Normalize quicktime to mov
    if (fileExt === 'quicktime') fileExt = 'mov';

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
    fileExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
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
    throw new Error(`Failed to upload video: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
};

/**
 * Upload media (image or video) to Supabase Storage
 * Automatically detects media type and handles appropriately
 * @param file - File object or base64 data URL
 * @param clientId - Client ID for organizing files
 * @param postId - Post ID for unique filename
 * @returns Object with public URL and detected media type
 */
export const uploadMedia = async (
  file: File | string,
  clientId: string,
  postId: string
): Promise<{ url: string; mediaType: MediaType }> => {
  const mediaType = detectMediaType(file);

  // Validate file size if it's a File object
  if (file instanceof File) {
    const validation = validateFileSize(file, mediaType);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
  }

  if (mediaType === 'video') {
    const url = await uploadVideo(file, clientId, postId);
    return { url, mediaType: 'video' };
  } else {
    const url = await uploadImage(file, clientId, postId);
    return { url, mediaType: 'image' };
  }
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
