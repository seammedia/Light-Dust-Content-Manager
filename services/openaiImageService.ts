// OpenAI gpt-image-2 (ChatGPT Images 2.0) integration
// Replaces Gemini Nano Banana for image generation across the dashboard
//
// Setup: add VITE_OPENAI_API_KEY to .env.local and Vercel environment variables.
// Get a key at https://platform.openai.com/api-keys

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const MODEL = 'gpt-image-2';

// Instagram square posts - matches existing storage cropper output
const INSTAGRAM_SIZE = '1024x1024';
const DEFAULT_QUALITY = 'medium';

// Helper to fetch image as Blob (used to convert URL inputs into multipart form parts)
const fetchImageAsBlob = async (url: string): Promise<Blob> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  return response.blob();
};

// Convert a base64 data URL to a Blob (for multipart edit requests)
const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, base64Data] = dataUrl.split(',');
  const mimeMatch = header.match(/data:([^;]+);base64/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
};

const isUrl = (str: string): boolean => str.startsWith('http://') || str.startsWith('https://');

interface ImageResult {
  imageBase64: string;
  mimeType: string;
}

/**
 * Generate a brand new image from a text prompt.
 * Used by the "Generate Image" button on each post.
 */
export const generateImageFromPrompt = async (
  prompt: string,
  brandContext?: string,
  referenceImages?: string[]
): Promise<ImageResult> => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Add VITE_OPENAI_API_KEY to .env.local and Vercel.');
  }

  // Build a richer prompt with brand context
  const fullPrompt = [
    prompt,
    brandContext ? `\nBrand context: ${brandContext}` : '',
    '\nHigh-quality, professional image suitable for Instagram. Square 1:1 composition.'
  ].join('');

  // If reference images are provided, use the /edits endpoint (which accepts source images for style)
  // Otherwise use /generations
  if (referenceImages && referenceImages.length > 0) {
    return await editWithReferences(apiKey, fullPrompt, null, referenceImages);
  }

  // Plain generation - JSON request
  const response = await fetch(`${OPENAI_API_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      prompt: fullPrompt,
      size: INSTAGRAM_SIZE,
      quality: DEFAULT_QUALITY,
      n: 1
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI image generation failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('OpenAI returned no image data');
  }

  return { imageBase64: b64, mimeType: 'image/png' };
};

/**
 * Edit an existing image (or generate from references) based on feedback.
 * Drop-in replacement for the previous Gemini-based generateImageFromFeedback.
 */
export const generateImageFromFeedback = async (
  currentImageSource: string | null,
  feedback: string,
  brandContext?: string,
  referenceImages?: string[]
): Promise<ImageResult> => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Add VITE_OPENAI_API_KEY to .env.local and Vercel.');
  }

  const promptParts: string[] = [];
  if (currentImageSource) {
    promptParts.push(`Edit this image based on the following feedback: "${feedback}"`);
  } else {
    promptParts.push(`Generate a new image based on this description: "${feedback}"`);
  }
  if (brandContext) promptParts.push(`Brand context: ${brandContext}`);
  if (referenceImages && referenceImages.length > 0) {
    promptParts.push('IMPORTANT: Match the visual aesthetic, colour palette, lighting and overall brand feel of the provided reference images.');
  }
  promptParts.push('High-quality, professional image suitable for Instagram. Square 1:1 composition.');
  const fullPrompt = promptParts.join('\n\n');

  // If we have a source image OR reference images, use the edit endpoint
  if (currentImageSource || (referenceImages && referenceImages.length > 0)) {
    return await editWithReferences(apiKey, fullPrompt, currentImageSource, referenceImages);
  }

  // Pure text-to-image generation
  return await generateImageFromPrompt(feedback, brandContext, referenceImages);
};

/**
 * Internal: call /v1/images/edits with one or more input images.
 * gpt-image-2 supports multiple input images for style/reference matching.
 */
async function editWithReferences(
  apiKey: string,
  prompt: string,
  primaryImage: string | null,
  referenceImages?: string[]
): Promise<ImageResult> {
  const formData = new FormData();
  formData.append('model', MODEL);
  formData.append('prompt', prompt);
  formData.append('size', INSTAGRAM_SIZE);
  formData.append('quality', DEFAULT_QUALITY);
  formData.append('n', '1');

  // Collect all images to send - primary first, then references (max 8 total)
  const allImages: string[] = [];
  if (primaryImage) allImages.push(primaryImage);
  if (referenceImages) allImages.push(...referenceImages.slice(0, 8 - allImages.length));

  for (let i = 0; i < allImages.length; i++) {
    const src = allImages[i];
    let blob: Blob;

    if (isUrl(src)) {
      blob = await fetchImageAsBlob(src);
    } else if (src.startsWith('data:')) {
      blob = dataUrlToBlob(src);
    } else {
      // Assume raw base64 - default to png
      blob = dataUrlToBlob(`data:image/png;base64,${src}`);
    }

    // gpt-image-2 accepts image[] array for multi-image edits
    formData.append('image[]', blob, `reference-${i}.png`);
  }

  const response = await fetch(`${OPENAI_API_BASE}/images/edits`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI image edit failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('OpenAI returned no image data');
  }

  return { imageBase64: b64, mimeType: 'image/png' };
}
