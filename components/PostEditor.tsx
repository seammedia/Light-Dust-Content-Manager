import React, { useState } from 'react';
import { Post, BrandContext, MediaType } from '../types';
import { Sparkles, Save, Film, Image } from 'lucide-react';
import { detectMediaType, validateFileSize } from '../services/storageService';

interface PostEditorProps {
  post: Post;
  brand: BrandContext;
  onUpdate: (updatedPost: Post) => void;
  onClose: () => void;
}

export const PostEditor: React.FC<PostEditorProps> = ({ post, onUpdate, onClose }) => {
  const [editedPost, setEditedPost] = useState<Post>(post);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadError(null);

      // Detect media type
      const mediaType: MediaType = detectMediaType(file);

      // Validate file size
      const validation = validateFileSize(file, mediaType);
      if (!validation.valid) {
        setUploadError(validation.error || 'File too large');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedPost(prev => ({
          ...prev,
          imageUrl: reader.result as string,
          mediaType: mediaType
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Determine if current media is a video
  const isVideo = editedPost.mediaType === 'video' ||
    (editedPost.imageUrl && (
      editedPost.imageUrl.startsWith('data:video/') ||
      editedPost.imageUrl.includes('.mp4') ||
      editedPost.imageUrl.includes('.mov') ||
      editedPost.imageUrl.includes('.webm')
    ));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex overflow-hidden shadow-2xl">
        {/* Left: Image & Context */}
        <div className="w-1/3 bg-stone-100 p-6 border-r border-stone-200 overflow-y-auto">
          <h3 className="font-serif text-xl mb-4 text-brand-dark">New Post Visuals</h3>

          <div className="aspect-square bg-white rounded-lg border-2 border-dashed border-stone-300 flex items-center justify-center mb-4 relative overflow-hidden group">
            {editedPost.imageUrl ? (
              isVideo ? (
                <video
                  src={editedPost.imageUrl}
                  className="w-full h-full object-cover"
                  controls
                  muted
                  playsInline
                />
              ) : (
                <img src={editedPost.imageUrl} alt="Post" className="w-full h-full object-cover" />
              )
            ) : (
              <div className="text-stone-400 text-center p-4">
                <div className="flex justify-center gap-2 mb-2">
                  <Image className="w-5 h-5" />
                  <Film className="w-5 h-5" />
                </div>
                <p>Upload Image or Video</p>
                <p className="text-xs mt-2">Click to browse...</p>
              </div>
            )}
            <input
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>

          {/* Media type indicator */}
          {editedPost.imageUrl && (
            <div className="flex items-center gap-2 mb-4 text-sm text-stone-500">
              {isVideo ? (
                <>
                  <Film className="w-4 h-4" />
                  <span>Video</span>
                </>
              ) : (
                <>
                  <Image className="w-4 h-4" />
                  <span>Image</span>
                </>
              )}
            </div>
          )}

          {/* Upload error message */}
          {uploadError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {uploadError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">Image Description</label>
              <textarea
                value={editedPost.imageDescription}
                onChange={(e) => setEditedPost({...editedPost, imageDescription: e.target.value})}
                className="w-full p-3 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-brand-green outline-none min-h-[120px]"
                placeholder="Describe what is in the photo to help the AI..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">Schedule Date</label>
              <input
                type="date"
                value={editedPost.date}
                onChange={(e) => setEditedPost({...editedPost, date: e.target.value})}
                className="w-full p-2 text-sm border border-stone-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Right: AI Output */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-6 border-b border-stone-100 flex justify-between items-center">
             <div>
                <h2 className="font-serif text-2xl text-brand-green">Create Content</h2>
                <p className="text-sm text-stone-500">Draft your new post details</p>
             </div>
             <div className="flex gap-2">
                 <button onClick={() => { onUpdate(editedPost); onClose(); }} className="px-4 py-2 text-sm font-medium text-white bg-brand-dark hover:bg-black rounded-lg flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save to Calendar
                 </button>
                 <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg">Cancel</button>
             </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-6 flex flex-col justify-center items-center text-center">
              <div className="max-w-md space-y-4">
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                    <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium">Ready to Generate?</h3>
                <p className="text-stone-500">
                    Once you save this to the calendar, you can use the inline generation tools to create captions and hashtags instantly in the spreadsheet view.
                </p>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};