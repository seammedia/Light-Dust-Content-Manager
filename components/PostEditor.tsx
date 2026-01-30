import React, { useState } from 'react';
import { Post, BrandContext, MediaType } from '../types';
import { Sparkles, Save, Film, Image, Loader2, Images, X, Plus } from 'lucide-react';
import { detectMediaType, validateFileSize, uploadMedia } from '../services/storageService';

interface PostEditorProps {
  post: Post;
  brand: BrandContext;
  clientId: string;
  onUpdate: (updatedPost: Post) => void;
  onClose: () => void;
}

export const PostEditor: React.FC<PostEditorProps> = ({ post, clientId, onUpdate, onClose }) => {
  const [editedPost, setEditedPost] = useState<Post>({
    ...post,
    imageUrls: post.imageUrls || (post.imageUrl ? [post.imageUrl] : [])
  });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    const fileArray = Array.from(files);

    // Check for videos
    const hasVideo = fileArray.some(f => detectMediaType(f) === 'video');
    if (hasVideo && fileArray.length > 1) {
      setUploadError('Videos cannot be part of a carousel. Please upload a single video or multiple images.');
      return;
    }

    // Validate all files
    for (const file of fileArray) {
      const mediaType: MediaType = detectMediaType(file);
      const validation = validateFileSize(file, mediaType);
      if (!validation.valid) {
        setUploadError(validation.error || 'File too large');
        return;
      }
      // Don't allow mixing videos in carousel
      if (fileArray.length > 1 && mediaType === 'video') {
        setUploadError('Videos cannot be mixed with images in a carousel.');
        return;
      }
    }

    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < fileArray.length; i++) {
        setUploadProgress(`Uploading ${i + 1} of ${fileArray.length}...`);
        const file = fileArray[i];
        const { url: publicUrl } = await uploadMedia(file, clientId, `${editedPost.id}-${Date.now()}-${i}`);
        uploadedUrls.push(publicUrl);
      }

      // Merge with existing images if any
      const existingUrls = editedPost.imageUrls || [];
      const allUrls = [...existingUrls, ...uploadedUrls];

      const firstFileMediaType = detectMediaType(fileArray[0]);
      setEditedPost(prev => ({
        ...prev,
        imageUrl: allUrls[0],
        imageUrls: allUrls,
        mediaType: firstFileMediaType
      }));
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Failed to upload media');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleRemoveImage = (index: number) => {
    const currentUrls = editedPost.imageUrls || [];
    const newUrls = currentUrls.filter((_, i) => i !== index);
    setEditedPost(prev => ({
      ...prev,
      imageUrl: newUrls[0] || '',
      imageUrls: newUrls
    }));
  };

  const handleReorderImage = (fromIndex: number, toIndex: number) => {
    const currentUrls = editedPost.imageUrls || [];
    const newUrls = [...currentUrls];
    const [removed] = newUrls.splice(fromIndex, 1);
    newUrls.splice(toIndex, 0, removed);
    setEditedPost(prev => ({
      ...prev,
      imageUrl: newUrls[0] || '',
      imageUrls: newUrls
    }));
  };

  // Determine if current media is a video
  const isVideo = editedPost.mediaType === 'video' ||
    (editedPost.imageUrl && (
      editedPost.imageUrl.startsWith('data:video/') ||
      editedPost.imageUrl.includes('.mp4') ||
      editedPost.imageUrl.includes('.mov') ||
      editedPost.imageUrl.includes('.webm')
    ));

  const hasMultipleImages = (editedPost.imageUrls?.length || 0) > 1;
  const imageCount = editedPost.imageUrls?.length || (editedPost.imageUrl ? 1 : 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex overflow-hidden shadow-2xl">
        {/* Left: Image & Context */}
        <div className="w-1/3 bg-stone-100 p-6 border-r border-stone-200 overflow-y-auto">
          <h3 className="font-serif text-xl mb-4 text-brand-dark">New Post Visuals</h3>

          {/* Primary Image Display */}
          <div className="aspect-square bg-white rounded-lg border-2 border-dashed border-stone-300 flex items-center justify-center mb-4 relative overflow-hidden group">
            {isUploading ? (
              <div className="text-stone-400 text-center p-4">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p>{uploadProgress || 'Uploading...'}</p>
              </div>
            ) : editedPost.imageUrl ? (
              isVideo ? (
                <video
                  src={editedPost.imageUrl + '#t=0.5'}
                  className="w-full h-full object-cover"
                  controls
                  muted
                  playsInline
                  preload="metadata"
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
                <p>Upload Images or Video</p>
                <p className="text-xs mt-2">Select multiple for carousel</p>
              </div>
            )}
            <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleMediaUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isUploading}
            />
            {/* Carousel indicator badge */}
            {hasMultipleImages && (
              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
                <Images className="w-3 h-3" />
                {imageCount}
              </div>
            )}
          </div>

          {/* Carousel Thumbnail Grid */}
          {editedPost.imageUrls && editedPost.imageUrls.length > 0 && (
            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                {hasMultipleImages ? `Carousel Images (${imageCount})` : 'Image'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {editedPost.imageUrls.map((url, index) => (
                  <div
                    key={index}
                    className={`relative aspect-square rounded overflow-hidden border-2 ${index === 0 ? 'border-brand-green' : 'border-stone-200'} group/thumb`}
                  >
                    <img
                      src={url}
                      alt={`Image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Index badge */}
                    <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] w-4 h-4 rounded flex items-center justify-center font-medium">
                      {index + 1}
                    </div>
                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {/* Move buttons for reordering */}
                    {hasMultipleImages && (
                      <div className="absolute bottom-1 left-1 right-1 flex justify-center gap-1 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                        {index > 0 && (
                          <button
                            onClick={() => handleReorderImage(index, index - 1)}
                            className="bg-white/90 text-stone-700 text-[10px] px-1.5 py-0.5 rounded hover:bg-white"
                            title="Move left"
                          >
                            ←
                          </button>
                        )}
                        {index < (editedPost.imageUrls?.length || 0) - 1 && (
                          <button
                            onClick={() => handleReorderImage(index, index + 1)}
                            className="bg-white/90 text-stone-700 text-[10px] px-1.5 py-0.5 rounded hover:bg-white"
                            title="Move right"
                          >
                            →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {/* Add more images button */}
                <label className="aspect-square rounded border-2 border-dashed border-stone-300 flex items-center justify-center cursor-pointer hover:border-brand-green hover:bg-brand-green/5 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleMediaUpload}
                    className="hidden"
                    disabled={isUploading || !!isVideo}
                  />
                  <Plus className="w-5 h-5 text-stone-400" />
                </label>
              </div>
              {hasMultipleImages && (
                <p className="text-xs text-stone-500 mt-2">Drag to reorder. First image is the cover.</p>
              )}
            </div>
          )}

          {/* Media type indicator */}
          {editedPost.imageUrl && !hasMultipleImages && (
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
                <p className="text-sm text-stone-500">
                  {hasMultipleImages
                    ? `Carousel post with ${imageCount} images`
                    : 'Draft your new post details'
                  }
                </p>
             </div>
             <div className="flex gap-2">
                 <button
                   onClick={() => { onUpdate(editedPost); onClose(); }}
                   disabled={isUploading}
                   className="px-4 py-2 text-sm font-medium text-white bg-brand-dark hover:bg-black rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isUploading ? 'Uploading...' : 'Save to Calendar'}
                 </button>
                 <button onClick={onClose} disabled={isUploading} className="px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50">Cancel</button>
             </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-6 flex flex-col justify-center items-center text-center">
              <div className="max-w-md space-y-4">
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                    {hasMultipleImages ? <Images className="w-8 h-8" /> : <Sparkles className="w-8 h-8" />}
                </div>
                <h3 className="text-lg font-medium">
                  {hasMultipleImages ? 'Carousel Ready!' : 'Ready to Generate?'}
                </h3>
                <p className="text-stone-500">
                  {hasMultipleImages
                    ? `Your carousel has ${imageCount} images. Save to calendar, then use the table view to add captions and schedule.`
                    : 'Once you save this to the calendar, you can use the inline generation tools to create captions and hashtags instantly in the spreadsheet view.'
                  }
                </p>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};
