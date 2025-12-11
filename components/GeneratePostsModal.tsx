import { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Calendar, Hash, HardDrive, CheckCircle2 } from 'lucide-react';
import { Client } from '../types';
import { supabase } from '../services/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import {
  isDriveConnected,
  extractFolderIdFromUrl,
  getRandomImagesFromFolder,
  getFileAsBase64,
  DriveFile
} from '../services/driveService';
import { uploadImage } from '../services/storageService';

interface GeneratePostsModalProps {
  client: Client;
  onClose: () => void;
  onPostsGenerated: () => void;
}

// Extract Google Drive folder URL from client notes
const extractDriveFolderUrl = (notes: string): string | null => {
  if (!notes) return null;

  // Match various Google Drive folder URL patterns
  const patterns = [
    /https:\/\/drive\.google\.com\/drive\/folders\/[a-zA-Z0-9_-]+(\?[^\s]*)?\b/,
    /https:\/\/drive\.google\.com\/drive\/u\/\d+\/folders\/[a-zA-Z0-9_-]+(\?[^\s]*)?\b/,
  ];

  for (const pattern of patterns) {
    const match = notes.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return null;
};

// Generate content ideas using Gemini
const generateContentIdeas = async (
  brandName: string,
  brandMission: string,
  brandTone: string,
  brandKeywords: string[],
  clientNotes: string,
  numberOfPosts: number
): Promise<{ caption: string; hashtags: string[] }[]> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured.');
  }

  const { GoogleGenerativeAI, SchemaType } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    systemInstruction: `
      You are the expert social media manager for '${brandName}'.

      ${brandMission ? `Brand Mission: ${brandMission}` : ''}
      ${brandTone ? `Brand Tone: ${brandTone}` : ''}
      ${brandKeywords?.length ? `Key Themes: ${brandKeywords.join(", ")}` : ''}
      ${clientNotes ? `\nClient Guidelines: ${clientNotes}` : ''}

      Your task is to generate ${numberOfPosts} unique Instagram post ideas.

      IMPORTANT RULES:
      - NEVER use em dashes (—) or en dashes (–). Use commas or periods instead.
      - Each post should be different and cover a unique topic or angle.
      - Write in a warm, friendly, conversational tone.
      - Use short paragraphs (2-3 sentences max per paragraph).
      - Add line breaks between paragraphs for readability.
      - Use emojis sparingly but effectively (1-3 per caption).
      - Include a subtle call to action at the end.
      - Keep captions concise but engaging (3-5 short paragraphs).
      - Generate 4-5 relevant hashtags per post (without the # symbol).
    `,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          posts: {
            type: SchemaType.ARRAY,
            items: {
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
        },
        required: ["posts"],
      },
    },
  });

  const prompt = `
    Generate ${numberOfPosts} unique Instagram post ideas for ${brandName}.

    Each post should:
    - Have a unique topic or angle that showcases the brand
    - Include an engaging caption with a hook, value proposition, and call to action
    - Have 4-5 relevant hashtags (without the # symbol)

    Make sure each post is distinct and covers different aspects of the brand.
    Remember: NO em dashes or en dashes. Use commas, periods, or line breaks instead.
  `;

  const result = await model.generateContent([{ text: prompt }]);
  const response = result.response;
  const text = response.text();

  if (!text) throw new Error("No response from Gemini");

  const parsed = JSON.parse(text);

  // Clean up any em dashes that might have slipped through
  return (parsed.posts || []).map((post: any) => ({
    caption: (post.caption || '').replace(/—/g, ', ').replace(/–/g, ', '),
    hashtags: (post.hashtags || []).slice(0, 5),
  }));
};

export function GeneratePostsModal({ client, onClose, onPostsGenerated }: GeneratePostsModalProps) {
  const [numberOfPosts, setNumberOfPosts] = useState(3);
  const [startDate, setStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [frequency, setFrequency] = useState<'daily' | 'every2days' | 'every3days' | 'weekly'>('every2days');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Drive integration state
  const [includeImages, setIncludeImages] = useState(false);
  const [driveConnected] = useState(isDriveConnected());
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null);

  // Check for Drive folder URL in client notes on mount
  useEffect(() => {
    const folderUrl = extractDriveFolderUrl(client.client_notes || '');
    if (folderUrl) {
      const folderId = extractFolderIdFromUrl(folderUrl);
      setDriveFolderId(folderId);
      // Auto-enable images if Drive is connected and folder is found
      if (driveConnected && folderId) {
        setIncludeImages(true);
      }
    }
  }, [client.client_notes, driveConnected]);

  // Calculate post dates based on frequency
  const calculateDates = (): string[] => {
    const dates: string[] = [];
    const start = new Date(startDate);

    for (let i = 0; i < numberOfPosts; i++) {
      const postDate = new Date(start);

      switch (frequency) {
        case 'daily':
          postDate.setDate(start.getDate() + i);
          break;
        case 'every2days':
          postDate.setDate(start.getDate() + (i * 2));
          break;
        case 'every3days':
          postDate.setDate(start.getDate() + (i * 3));
          break;
        case 'weekly':
          postDate.setDate(start.getDate() + (i * 7));
          break;
      }

      dates.push(postDate.toISOString().split('T')[0]);
    }

    return dates;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setProgress('Generating content ideas...');

    try {
      // Generate content ideas
      const contentIdeas = await generateContentIdeas(
        client.brand_name,
        client.brand_mission || '',
        client.brand_tone || '',
        client.brand_keywords || [],
        client.client_notes || '',
        numberOfPosts
      );

      if (contentIdeas.length === 0) {
        throw new Error('No content ideas generated');
      }

      // Fetch images from Google Drive if enabled
      let driveImages: DriveFile[] = [];
      if (includeImages && driveFolderId) {
        // Re-check Drive connection at time of generation
        const currentlyConnected = isDriveConnected();
        if (!currentlyConnected) {
          console.warn('Drive not connected at generation time');
          setProgress('Drive not connected, continuing without images...');
        } else {
          setProgress('Fetching images from Google Drive...');
          try {
            driveImages = await getRandomImagesFromFolder(driveFolderId, numberOfPosts);
            console.log(`Fetched ${driveImages.length} images from Drive`);
            if (driveImages.length === 0) {
              setProgress('No images found in Drive folder, continuing without...');
            }
          } catch (driveError: any) {
            console.error('Drive fetch error:', driveError);
            // Show the actual error to help debug
            setProgress(`Drive error: ${driveError.message}. Continuing without images...`);
            // Wait a moment so user can see the error
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      // Calculate dates
      const dates = calculateDates();

      setProgress(`Creating ${contentIdeas.length} posts...`);

      // Create posts in database
      const postsToCreate: any[] = [];

      for (let i = 0; i < contentIdeas.length; i++) {
        const idea = contentIdeas[i];
        const date = dates[i] || dates[dates.length - 1];
        const postId = uuidv4();

        let imageUrl = '';

        // If we have Drive images, upload them to Supabase
        if (driveImages[i]) {
          setProgress(`Uploading image ${i + 1} of ${Math.min(driveImages.length, numberOfPosts)}...`);
          try {
            const { base64, mimeType } = await getFileAsBase64(driveImages[i].id);
            const dataUrl = `data:${mimeType};base64,${base64}`;
            imageUrl = await uploadImage(dataUrl, client.id, postId);
          } catch (uploadError) {
            console.error('Image upload error:', uploadError);
            // Continue without this image
          }
        }

        postsToCreate.push({
          id: postId,
          client_id: client.id,
          title: `Post ${i + 1}`,
          date: date,
          status: 'Generated',
          image_description: '',
          image_url: imageUrl,
          generated_caption: idea.caption,
          generated_hashtags: idea.hashtags,
          notes: '',
        });
      }

      setProgress('Saving posts to database...');

      // Insert all posts
      const { error: insertError } = await supabase
        .from('posts')
        .insert(postsToCreate);

      if (insertError) {
        throw new Error(`Failed to create posts: ${insertError.message}`);
      }

      setProgress('Done!');

      // Wait a moment then close
      setTimeout(() => {
        onPostsGenerated();
        onClose();
      }, 500);

    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate posts');
      setGenerating(false);
    }
  };

  // Preview dates
  const previewDates = calculateDates();

  // Determine if images can be included
  const canIncludeImages = driveConnected && driveFolderId;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-green/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-brand-green" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-800">Generate Posts</h2>
              <p className="text-sm text-stone-500">AI-powered content generation for {client.brand_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors"
            disabled={generating}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Number of Posts */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Number of Posts
            </label>
            <div className="flex gap-2">
              {[3, 5, 7, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => setNumberOfPosts(num)}
                  disabled={generating}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    numberOfPosts === num
                      ? 'bg-brand-green text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {num}
                </button>
              ))}
              <input
                type="number"
                min="1"
                max="20"
                value={numberOfPosts}
                onChange={(e) => setNumberOfPosts(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                disabled={generating}
                className="w-20 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                placeholder="Custom"
              />
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={generating}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-green focus:border-brand-green"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Posting Frequency
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as any)}
              disabled={generating}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-green focus:border-brand-green"
            >
              <option value="daily">Every Day</option>
              <option value="every2days">Every 2 Days</option>
              <option value="every3days">Every 3 Days</option>
              <option value="weekly">Once a Week</option>
            </select>
          </div>

          {/* Google Drive Images Option */}
          <div className={`rounded-lg p-4 ${canIncludeImages ? 'bg-blue-50 border border-blue-200' : 'bg-stone-50 border border-stone-200'}`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${canIncludeImages ? 'bg-blue-100' : 'bg-stone-200'}`}>
                <HardDrive className={`w-4 h-4 ${canIncludeImages ? 'text-blue-600' : 'text-stone-400'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className={`text-sm font-medium ${canIncludeImages ? 'text-blue-800' : 'text-stone-500'}`}>
                    Include Images from Google Drive
                  </h4>
                  {canIncludeImages && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                </div>
                {canIncludeImages ? (
                  <>
                    <p className="text-xs text-blue-600 mt-1">
                      Drive folder detected in client notes. Random images will be selected for each post.
                    </p>
                    <label className="flex items-center gap-2 mt-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeImages}
                        onChange={(e) => setIncludeImages(e.target.checked)}
                        disabled={generating}
                        className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-blue-700">Attach random images from Drive folder</span>
                    </label>
                  </>
                ) : (
                  <p className="text-xs text-stone-500 mt-1">
                    {!driveConnected
                      ? 'Connect Google Drive (bottom right) to enable this feature.'
                      : 'No Drive folder URL found in client notes. Add a Google Drive folder link to enable.'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Preview Dates */}
          <div className="bg-stone-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-stone-700 mb-2 flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Scheduled Dates Preview
            </h4>
            <div className="flex flex-wrap gap-2">
              {previewDates.slice(0, 10).map((date, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-white border border-stone-200 rounded text-xs text-stone-600"
                >
                  {new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </span>
              ))}
              {previewDates.length > 10 && (
                <span className="px-2 py-1 text-xs text-stone-400">
                  +{previewDates.length - 10} more
                </span>
              )}
            </div>
          </div>

          {/* What will be generated */}
          <div className="bg-blue-50 rounded-lg p-4 text-sm">
            <h4 className="font-medium text-blue-800 mb-1">What will be generated:</h4>
            <ul className="text-blue-700 space-y-1">
              <li>• {numberOfPosts} unique post captions tailored to {client.brand_name}</li>
              <li>• 4-5 relevant hashtags per post</li>
              <li>• Posts scheduled on your selected dates</li>
              {includeImages && canIncludeImages && (
                <li>• Random images from Google Drive attached to each post</li>
              )}
            </ul>
            {!includeImages && (
              <p className="mt-2 text-blue-600 text-xs">
                Note: Images can be added manually or generated separately after creation.
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Progress */}
          {generating && (
            <div className="flex items-center gap-3 text-sm text-stone-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              {progress}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-stone-200">
          <button
            onClick={onClose}
            disabled={generating}
            className="flex-1 px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || numberOfPosts < 1}
            className="flex-1 px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate {numberOfPosts} Posts
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
