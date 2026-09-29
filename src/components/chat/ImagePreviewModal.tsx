import React from 'react';
import { X, Download } from 'lucide-react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  imageUrl: string;
  imageName?: string;
  fileSize?: number;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  imageUrl,
  imageName = 'Image Preview',
  fileSize,
  onClose,
}) => {
  if (!isOpen || !imageUrl) return null;

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Controls bar */}
        <div className="w-full flex items-center justify-between pb-3 text-neutral-200">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-white truncate max-w-xs">{imageName}</span>
            {fileSize ? (
              <>
                <span className="text-neutral-500">·</span>
                <span className="text-neutral-400 tabular-nums">{formatSize(fileSize)}</span>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              download={imageName}
              className="p-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-colors"
              title="Download image"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950/80 shadow-2xl flex items-center justify-center">
          <img
            src={imageUrl}
            alt={imageName}
            className="max-w-full max-h-[80vh] object-contain select-none"
          />
        </div>
      </div>
    </div>
  );
};
