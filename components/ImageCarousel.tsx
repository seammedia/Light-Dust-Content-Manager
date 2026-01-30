import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Image, Film } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
  onClose?: () => void;
  initialIndex?: number;
  showControls?: boolean;
  className?: string;
}

// Detect if URL is a video
const isVideoUrl = (url: string): boolean => {
  const videoExtensions = ['.mp4', '.mov', '.webm', '.m4v'];
  const urlLower = url.toLowerCase();
  return videoExtensions.some(ext => urlLower.includes(ext)) || url.startsWith('data:video/');
};

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  onClose,
  initialIndex = 0,
  showControls = true,
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goToPrevious = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  const goToIndex = useCallback((index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(index);
  }, []);

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext, onClose]);

  if (!images || images.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-stone-100 ${className}`}>
        <div className="text-stone-400 text-center">
          <Image className="w-8 h-8 mx-auto mb-2" />
          <span className="text-sm">No images</span>
        </div>
      </div>
    );
  }

  const currentImage = images[currentIndex];
  const isVideo = isVideoUrl(currentImage);
  const hasMultipleImages = images.length > 1;

  return (
    <div className={`relative group ${className}`} onClick={(e) => e.stopPropagation()}>
      {/* Main Image/Video Display */}
      <div className="relative w-full h-full overflow-hidden">
        {isVideo ? (
          <video
            key={currentImage}
            src={currentImage + '#t=0.5'}
            className="w-full h-full object-cover"
            controls
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <img
            key={currentImage}
            src={currentImage}
            alt={`Slide ${currentIndex + 1}`}
            className="w-full h-full object-cover"
          />
        )}

        {/* Video indicator badge */}
        {isVideo && (
          <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-medium px-2 py-1 rounded flex items-center gap-1">
            <Film className="w-3 h-3" />
            VIDEO
          </div>
        )}

        {/* Carousel indicator (shows 1/3 etc) */}
        {hasMultipleImages && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Navigation Arrows */}
      {showControls && hasMultipleImages && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-stone-800 rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-stone-800 rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {showControls && hasMultipleImages && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => goToIndex(index, e)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-white scale-110'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Close Button (for modal view) */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-full p-1.5 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

// Fullscreen Modal Carousel for viewing images in detail
interface CarouselModalProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export const CarouselModal: React.FC<CarouselModalProps> = ({
  images,
  initialIndex = 0,
  onClose
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div className="max-w-5xl max-h-[90vh] w-full h-full" onClick={(e) => e.stopPropagation()}>
        <ImageCarousel
          images={images}
          initialIndex={initialIndex}
          onClose={onClose}
          className="w-full h-full rounded-lg overflow-hidden"
        />
      </div>
    </div>
  );
};

// Thumbnail strip component for table view preview
interface CarouselThumbnailsProps {
  images: string[];
  maxThumbnails?: number;
  onImageClick?: (index: number) => void;
  className?: string;
}

export const CarouselThumbnails: React.FC<CarouselThumbnailsProps> = ({
  images,
  maxThumbnails = 4,
  onImageClick,
  className = ''
}) => {
  if (!images || images.length <= 1) {
    return null;
  }

  const displayImages = images.slice(1, maxThumbnails + 1);
  const remainingCount = images.length - maxThumbnails - 1;

  return (
    <div className={`flex gap-1 mt-1 ${className}`}>
      {displayImages.map((url, index) => (
        <button
          key={index}
          onClick={() => onImageClick?.(index + 1)}
          className="relative w-8 h-8 rounded overflow-hidden border border-stone-200 hover:border-brand-green transition-colors flex-shrink-0"
        >
          {isVideoUrl(url) ? (
            <video
              src={url + '#t=0.5'}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img src={url} alt="" className="w-full h-full object-cover" />
          )}
          {/* Video indicator on thumbnail */}
          {isVideoUrl(url) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Film className="w-3 h-3 text-white" />
            </div>
          )}
        </button>
      ))}
      {remainingCount > 0 && (
        <div className="w-8 h-8 rounded bg-stone-200 flex items-center justify-center text-xs font-medium text-stone-600 flex-shrink-0">
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

// Editable carousel thumbnails with drag-and-drop reordering
interface EditableCarouselThumbnailsProps {
  images: string[];
  onReorder: (newImages: string[]) => void;
  onRemove?: (index: number) => void;
  onImageClick?: (index: number) => void;
  disabled?: boolean;
  className?: string;
}

export const EditableCarouselThumbnails: React.FC<EditableCarouselThumbnailsProps> = ({
  images,
  onReorder,
  onRemove,
  onImageClick,
  disabled = false,
  className = ''
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!images || images.length === 0) {
    return null;
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (disabled) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (disabled || draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (disabled || draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder the images
    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(targetIndex, 0, draggedImage);

    onReorder(newImages);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap gap-2">
        {images.map((url, index) => (
          <div
            key={`${url}-${index}`}
            draggable={!disabled}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`relative group/thumb ${!disabled ? 'cursor-grab active:cursor-grabbing' : ''}`}
          >
            <div
              className={`relative w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                index === 0 ? 'border-brand-green' : 'border-stone-200'
              } ${dragOverIndex === index ? 'border-purple-500 scale-105' : ''} ${
                draggedIndex === index ? 'opacity-50' : ''
              }`}
              onClick={() => onImageClick?.(index)}
            >
              {isVideoUrl(url) ? (
                <video
                  src={url + '#t=0.5'}
                  className="w-full h-full object-cover pointer-events-none"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img src={url} alt={`Image ${index + 1}`} className="w-full h-full object-cover pointer-events-none" />
              )}

              {/* Index badge */}
              <div className="absolute top-0.5 left-0.5 bg-black/70 text-white text-[9px] w-4 h-4 rounded flex items-center justify-center font-bold">
                {index + 1}
              </div>

              {/* Video indicator */}
              {isVideoUrl(url) && (
                <div className="absolute bottom-0.5 left-0.5">
                  <Film className="w-3 h-3 text-white drop-shadow" />
                </div>
              )}

              {/* Cover badge for first image */}
              {index === 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-brand-green text-white text-[8px] font-bold text-center py-0.5">
                  COVER
                </div>
              )}
            </div>

            {/* Remove button */}
            {onRemove && !disabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(index);
                }}
                className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity z-10"
                title="Remove image"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      {images.length > 1 && !disabled && (
        <p className="text-[10px] text-stone-500">Drag to reorder. First image is the cover.</p>
      )}
    </div>
  );
};

export default ImageCarousel;
