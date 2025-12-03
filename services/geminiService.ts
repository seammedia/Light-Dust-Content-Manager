import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { GoogleGenAI, Modality } from "@google/genai";
import { BrandContext, GenerationResult } from "../types";

const getClient = () => new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
const getGenAIClient = () => new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

// Helper to detect MIME type from base64 data URL
const getMimeType = (dataUrl: string): string => {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  if (match) {
    return match[1];
  }
  // Default to jpeg if we can't detect
  return 'image/jpeg';
};

// Helper to fetch image from URL and convert to base64
const fetchImageAsBase64 = async (url: string): Promise<{ base64: string; mimeType: string }> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const blob = await response.blob();
  const mimeType = blob.type || 'image/jpeg';

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Extract base64 data (remove the data:mime;base64, prefix)
      const base64 = dataUrl.split(',')[1] || dataUrl;
      resolve({ base64, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Check if a string is a URL
const isUrl = (str: string): boolean => {
  return str.startsWith('http://') || str.startsWith('https://');
};

// Simple caption generation from image for agency use
export const generateCaptionFromImage = async (
  imageSource: string,
  brandName: string,
  clientNotes?: string
): Promise<{ caption: string; hashtags: string[] }> => {
  // Check if API key is configured
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to environment variables.');
  }

  // Build client notes section for prompt
  const clientNotesSection = clientNotes?.trim()
    ? `\n\nCLIENT-SPECIFIC GUIDELINES (IMPORTANT - follow these closely):\n${clientNotes}`
    : '';

  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    systemInstruction: `
      You are a social media copywriter for '${brandName}'.

      Your task is to write engaging Instagram captions based on the image provided.

      IMPORTANT RULES:
      - NEVER use em dashes (—) or en dashes (–). Use commas or periods instead.
      - Write in a warm, friendly, conversational tone.
      - Use short paragraphs (2-3 sentences max per paragraph).
      - Add line breaks between paragraphs for readability.
      - Use emojis sparingly but effectively (1-3 per caption).
      - Include a subtle call to action at the end.
      - Keep the caption concise but engaging (3-5 short paragraphs).
      ${clientNotesSection}
    `,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          caption: { type: SchemaType.STRING },
          hashtags: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ["caption", "hashtags"],
      },
    },
  });

  const prompt = `
    Look at this image and write an engaging Instagram caption for it.

    Generate exactly 4-5 relevant hashtags (without the # symbol).

    Remember: NO em dashes or en dashes. Use commas, periods, or line breaks instead.
  `;

  // Handle both URLs and base64 data
  let cleanBase64: string;
  let mimeType: string;

  if (isUrl(imageSource)) {
    // Fetch the image and convert to base64
    const imageData = await fetchImageAsBase64(imageSource);
    cleanBase64 = imageData.base64;
    mimeType = imageData.mimeType;
  } else {
    // Already base64 data
    mimeType = getMimeType(imageSource);
    cleanBase64 = imageSource.split(',')[1] || imageSource;
  }

  const parts = [
    {
      inlineData: {
        data: cleanBase64,
        mimeType: mimeType,
      },
    },
    { text: prompt }
  ];

  try {
    const result = await model.generateContent(parts);
    const response = result.response;
    const text = response.text();

    if (!text) throw new Error("No response from Gemini");

    const parsed = JSON.parse(text);

    // Clean up any em dashes that might have slipped through
    let caption = parsed.caption || '';
    caption = caption.replace(/—/g, ', ').replace(/–/g, ', ');

    return {
      caption,
      hashtags: (parsed.hashtags || []).slice(0, 5), // Ensure max 5 hashtags
    };

  } catch (error: any) {
    console.error("Gemini Caption Generation Error:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));

    const errorMsg = error.message?.toLowerCase() || '';
    const errorStr = JSON.stringify(error).toLowerCase();

    // Provide more specific error messages
    if (errorMsg.includes('api key') || errorMsg.includes('api_key') || errorMsg.includes('invalid key')) {
      throw new Error('Invalid Gemini API key. Please check your configuration.');
    }
    if (errorMsg.includes('quota exceeded') || errorMsg.includes('resource exhausted') || errorStr.includes('429')) {
      throw new Error('API rate limit reached. Please try again in a moment.');
    }
    if (errorMsg.includes('too large') || errorMsg.includes('payload')) {
      throw new Error('Image is too large. Please use a smaller image.');
    }
    // Show the actual error message for debugging
    throw new Error(`Generation failed: ${error.message || 'Unknown error'}`);
  }
};

// Update caption/hashtags based on client feedback
export const updateFromFeedback = async (
  currentCaption: string,
  currentHashtags: string[],
  feedback: string,
  brandName: string,
  clientNotes?: string
): Promise<{ caption: string; hashtags: string[] }> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured.');
  }

  // Build client notes section for prompt
  const clientNotesSection = clientNotes?.trim()
    ? `\n\nCLIENT-SPECIFIC GUIDELINES (keep these in mind when updating):\n${clientNotes}`
    : '';

  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    systemInstruction: `
      You are a social media copywriter for '${brandName}'.

      Your task is to update existing Instagram content based on client feedback.

      IMPORTANT RULES:
      - NEVER use em dashes (—) or en dashes (–). Use commas or periods instead.
      - Keep the same tone and style as the original.
      - Only make changes that address the specific feedback.
      - If feedback asks for more hashtags, add relevant ones.
      - If feedback asks for changes to the caption, update it accordingly.
      ${clientNotesSection}
    `,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          caption: { type: SchemaType.STRING },
          hashtags: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ["caption", "hashtags"],
      },
    },
  });

  const prompt = `
    Here is the current Instagram post content:

    CAPTION:
    ${currentCaption}

    HASHTAGS:
    ${currentHashtags.map(h => `#${h}`).join(' ')}

    CLIENT FEEDBACK:
    "${feedback}"

    Please update the caption and/or hashtags based on this feedback.
    Return the updated caption and hashtags (without # symbols).
    If the feedback only mentions hashtags, keep the caption the same but update hashtags.
    If the feedback only mentions the caption, keep the hashtags the same but update the caption.
  `;

  try {
    const result = await model.generateContent([{ text: prompt }]);
    const response = result.response;
    const text = response.text();

    if (!text) throw new Error("No response from Gemini");

    const parsed = JSON.parse(text);

    let caption = parsed.caption || currentCaption;
    caption = caption.replace(/—/g, ', ').replace(/–/g, ', ');

    return {
      caption,
      hashtags: parsed.hashtags || currentHashtags,
    };

  } catch (error: any) {
    console.error("Gemini Update Error:", error);
    throw new Error(`Update failed: ${error.message || 'Unknown error'}`);
  }
};

export const generatePostContent = async (
  imageDescription: string,
  brand: BrandContext,
  imageBase64?: string
): Promise<GenerationResult> => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: `
      You are the expert social media manager for '${brand.name}'.

      Brand Mission: ${brand.mission}
      Brand Tone: ${brand.tone}
      Key Themes: ${brand.keywords.join(", ")}

      Your goal is to write engaging, high-quality Instagram captions.
      - Use emojis sparingly but effectively.
      - Focus on the "smarter, sustainable" angle of pearl candles.
      - Encourage users to reuse old jars.
      - The caption should have a "Hook" (first line), "Value" (body), and "Call to Action" (end).
    `,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          caption: { type: SchemaType.STRING },
          hashtags: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ["caption", "hashtags"],
      },
    },
  });

  const prompt = `
    Generate an Instagram caption and a set of 20-30 relevant hashtags for a post about: "${imageDescription}".
  `;

  const parts: any[] = [{ text: prompt }];

  // If there's an image, add it to the prompt parts
  if (imageBase64) {
    // Strip header if present (e.g., "data:image/jpeg;base64,")
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
    parts.unshift({
      inlineData: {
        data: cleanBase64,
        mimeType: "image/jpeg", // Assuming JPEG for simplicity, though Gemini handles others
      },
    });
  }

  try {
    const result = await model.generateContent(parts);
    const response = result.response;
    const text = response.text();

    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as GenerationResult;

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

// Generate or edit an image using Nano Banana Pro (Gemini Image Generation)
// Tries gemini-2.5-flash-image first (more widely available), then gemini-3-pro-image-preview
export const generateImageFromFeedback = async (
  currentImageSource: string | null,
  feedback: string,
  brandContext?: string
): Promise<{ imageBase64: string; mimeType: string }> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured.');
  }

  const client = getGenAIClient();

  // Build the prompt based on whether we're editing or generating new
  let prompt: string;
  if (currentImageSource) {
    prompt = `Edit this image based on the following feedback: "${feedback}"

${brandContext ? `Brand context: ${brandContext}` : ''}

Important: Make the requested changes while maintaining high quality and professional appearance suitable for social media marketing.`;
  } else {
    prompt = `Generate a new image based on this description: "${feedback}"

${brandContext ? `Brand context: ${brandContext}` : ''}

Important: Create a high-quality, professional image suitable for social media marketing.`;
  }

  // Models to try in order of preference
  const modelsToTry = ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'];

  for (const modelName of modelsToTry) {
    try {
      console.log(`Trying image generation with model: ${modelName}`);

      // Build contents array
      const contents: any[] = [];

      if (currentImageSource) {
        // If editing an existing image, include it
        let imageData: { base64: string; mimeType: string };

        if (isUrl(currentImageSource)) {
          imageData = await fetchImageAsBase64(currentImageSource);
        } else {
          const mimeType = getMimeType(currentImageSource);
          const base64 = currentImageSource.split(',')[1] || currentImageSource;
          imageData = { base64, mimeType };
        }

        contents.push({
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.base64,
          },
        });
      }

      contents.push(prompt);

      const response = await client.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      // Extract the generated image from the response
      if (!response.candidates || response.candidates.length === 0) {
        console.warn(`No candidates in response from ${modelName}`);
        continue;
      }

      const candidate = response.candidates[0];
      if (!candidate.content || !candidate.content.parts) {
        console.warn(`No content parts in response from ${modelName}`);
        continue;
      }

      // Find the image part in the response
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
          console.log(`Successfully generated image with ${modelName}`);
          return {
            imageBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png',
          };
        }
      }

      console.warn(`No image data in response from ${modelName}`);

    } catch (error: any) {
      console.warn(`Model ${modelName} failed:`, error.message);
      // Continue to next model
    }
  }

  // If all models failed, throw a descriptive error
  throw new Error('Image generation is not available with your current API key. Your Gemini API key may not have access to image generation models (gemini-2.5-flash-image or gemini-3-pro-image-preview). Please check your Google AI Studio account tier and permissions.');
};

// Check if Nano Banana Pro image generation is available
export const isImageGenerationAvailable = (): boolean => {
  return !!import.meta.env.VITE_GEMINI_API_KEY;
};
