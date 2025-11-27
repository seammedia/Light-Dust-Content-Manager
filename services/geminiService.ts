import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { BrandContext, GenerationResult } from "../types";

const getClient = () => new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

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
