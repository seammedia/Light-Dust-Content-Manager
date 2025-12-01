import { supabase } from './supabaseClient';

const BUCKET_NAME = 'post-images';

// Instagram aspect ratio requirements
const MIN_ASPECT_RATIO = 0.75; // 4:5 portrait
const MAX_ASPECT_RATIO = 1.91; // landscape

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
