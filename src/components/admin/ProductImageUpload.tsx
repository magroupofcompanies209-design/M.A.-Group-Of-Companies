import React, { useState, useRef } from 'react';
import { Upload, X, Star, RefreshCw, AlertCircle, CheckCircle2, Image as ImageIcon, ArrowLeft, ArrowRight } from 'lucide-react';

interface ProductImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export const ProductImageUpload: React.FC<ProductImageUploadProps> = ({
  images,
  onChange,
  maxImages = 6,
  disabled = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [lastFailedFile, setLastFailedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFileToSupabase = async (file: File): Promise<string> => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      throw new Error(`Invalid format (${file.type || 'unknown'}). Please choose JPG, PNG, or WEBP.`);
    }

    // Validate size (max 8MB)
    if (file.size > 8 * 1024 * 1024) {
      throw new Error('Image size exceeds 8MB limit. Please select a smaller photo.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          setUploadProgress(40);

          const token = localStorage.getItem('ma_admin_token') || sessionStorage.getItem('ma_admin_token');
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'x-admin-token': token } : {}),
            },
            body: JSON.stringify({
              filename: file.name,
              fileData: base64Data,
              contentType: file.type || 'image/jpeg',
            }),
          });

          setUploadProgress(80);
          const data = await res.json();
          if (!res.ok || !data.success || !data.url) {
            throw new Error(data.error || 'Failed to upload image to Supabase Storage.');
          }

          setUploadProgress(100);
          resolve(data.url);
        } catch (err: any) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file from device.'));
      reader.readAsDataURL(file);
    });
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);
    setUploadSuccess(null);

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      setUploadError(`Maximum of ${maxImages} images allowed per product.`);
      return;
    }

    const filesToUpload = Array.from(fileList).slice(0, remainingSlots);
    setIsUploading(true);
    setUploadProgress(10);

    const newUploadedUrls: string[] = [];
    let lastError = '';

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      try {
        const url = await uploadFileToSupabase(file);
        newUploadedUrls.push(url);
      } catch (err: any) {
        console.error('Upload error:', err);
        lastError = err?.message || 'Upload error';
        setLastFailedFile(file);
      }
    }

    setIsUploading(false);
    setUploadProgress(null);

    if (newUploadedUrls.length > 0) {
      onChange([...images, ...newUploadedUrls]);
      setUploadSuccess(`Successfully uploaded ${newUploadedUrls.length} image(s) to Supabase Storage.`);
      setTimeout(() => setUploadSuccess(null), 4000);
    }

    if (lastError) {
      setUploadError(lastError);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRetry = () => {
    if (lastFailedFile) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(lastFailedFile);
      setLastFailedFile(null);
      handleFilesSelected(dataTransfer.files);
    }
  };

  const handleRemoveImage = async (index: number) => {
    const urlToRemove = images[index];
    const newImages = images.filter((_, idx) => idx !== index);
    onChange(newImages);

    // Call server to safely remove from Supabase Storage if not shared
    if (urlToRemove && urlToRemove.includes('supabase.co')) {
      try {
        const token = localStorage.getItem('ma_admin_token') || sessionStorage.getItem('ma_admin_token');
        await fetch('/api/upload', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'x-admin-token': token } : {}),
          },
          body: JSON.stringify({ url: urlToRemove }),
        });
      } catch (err) {
        console.warn('Storage delete notice:', err);
      }
    }
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    const target = images[index];
    const rest = images.filter((_, idx) => idx !== index);
    onChange([target, ...rest]);
  };

  const handleMoveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const updated = [...images];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onChange(updated);
  };

  const handleAddManualUrl = () => {
    if (!manualUrl.trim()) return;
    if (images.length >= maxImages) {
      setUploadError(`Maximum of ${maxImages} images allowed.`);
      return;
    }
    onChange([...images, manualUrl.trim()]);
    setManualUrl('');
    setShowUrlFallback(false);
  };

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-[#111318] border border-[#2B3038] text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <label className="font-bold text-white text-xs flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-[#3B82F6]" />
            <span>Product Imagery</span>
            <span className="text-[10px] text-[#3B82F6] font-semibold">(Supabase Storage)</span>
          </label>
          <p className="text-[11px] text-[#6B7280] mt-0.5">
            Upload from device gallery or camera ({images.length}/{maxImages} images). First image is Primary.
          </p>
        </div>

        {isUploading && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/30 text-[#3B82F6] text-[11px] font-semibold animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Uploading ({uploadProgress || 0}%)...</span>
          </div>
        )}
      </div>

      {/* Hidden Native File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={(e) => handleFilesSelected(e.target.files)}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {/* Image Thumbnails & Management Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
          {images.map((imgUrl, idx) => (
            <div
              key={idx}
              className={`relative group rounded-xl overflow-hidden border transition-all ${
                idx === 0
                  ? 'border-[#2563EB] ring-2 ring-[#2563EB]/40 bg-[#1A1D23]'
                  : 'border-[#2B3038] bg-[#1A1D23] hover:border-[#3B82F6]'
              }`}
            >
              <div className="aspect-square w-full overflow-hidden bg-[#0B0D10] flex items-center justify-center">
                <img
                  src={imgUrl}
                  alt={`Product view ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=400&q=80';
                  }}
                />
              </div>

              {/* Primary Badge */}
              {idx === 0 ? (
                <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-[#2563EB] text-white font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Star className="w-2.5 h-2.5 fill-white" />
                  <span>Main Image</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSetPrimary(idx)}
                  className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-[#111318]/90 hover:bg-[#2563EB] text-[#E5E7EB] hover:text-white text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-[#2B3038]"
                  title="Make this the Primary Product Image"
                >
                  Set as Main
                </button>
              )}

              {/* Action Toolbar on Image */}
              <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                {/* Reorder Arrows */}
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => handleMoveImage(idx, idx - 1)}
                    className="p-1 rounded-md bg-[#111318]/80 hover:bg-[#2563EB] text-white transition-colors cursor-pointer"
                    title="Move Left"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                )}
                {idx < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => handleMoveImage(idx, idx + 1)}
                    className="p-1 rounded-md bg-[#111318]/80 hover:bg-[#2563EB] text-white transition-colors cursor-pointer"
                    title="Move Right"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                {/* Delete Button */}
                <button
                  type="button"
                  disabled={disabled || isUploading}
                  onClick={() => handleRemoveImage(idx)}
                  className="p-1 rounded-md bg-rose-600/90 hover:bg-rose-600 text-white transition-colors cursor-pointer shadow-md"
                  title="Remove Image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Storage Origin Badge */}
              <div className="p-1.5 text-[10px] text-[#6B7280] font-mono truncate bg-[#111318] border-t border-[#2B3038]">
                {imgUrl.includes('supabase.co') ? '✓ Supabase Storage' : 'External URL'}
              </div>
            </div>
          ))}

          {/* Add More Thumbnail Trigger if below max */}
          {images.length < maxImages && (
            <button
              type="button"
              disabled={disabled || isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-[#2B3038] hover:border-[#3B82F6] bg-[#1A1D23]/60 hover:bg-[#1A1D23] flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center text-[#3B82F6] group-hover:scale-105 transition-transform mb-1">
                <Upload className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-white">Add Photo</span>
              <span className="text-[9px] text-[#6B7280]">From device</span>
            </button>
          )}
        </div>
      )}

      {/* Big Drag and Drop Zone if no images yet */}
      {images.length === 0 && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            handleFilesSelected(e.dataTransfer.files);
          }}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all space-y-3 group ${
            isDragOver
              ? 'border-[#3B82F6] bg-[#2563EB]/10'
              : 'border-[#2B3038] hover:border-[#3B82F6] bg-[#1A1D23]/50 hover:bg-[#1A1D23]'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center text-[#3B82F6] mx-auto group-hover:scale-105 transition-transform">
            {isUploading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
          </div>
          <div>
            <div className="font-bold text-white text-xs">
              {isUploading ? 'Uploading to Supabase Storage...' : 'Tap or Drag & Drop Product Images'}
            </div>
            <p className="text-[11px] text-[#6B7280] mt-1">
              Select photos from your device gallery, phone camera, or files (JPG, PNG, WEBP up to 8MB)
            </p>
          </div>
          <div>
            <span className="inline-block px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-md transition-colors">
              {isUploading ? 'Uploading...' : 'Choose Images from Device'}
            </span>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {uploadSuccess && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {/* Error Notification with Retry */}
      {uploadError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="font-bold text-rose-200">Upload Issue</div>
            <div>{uploadError}</div>
            {lastFailedFile && (
              <button
                type="button"
                onClick={handleRetry}
                className="mt-1 px-2.5 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Upload ({lastFailedFile.name})</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-[#6B7280] hover:text-white p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Optional URL input fallback toggle */}
      <div className="pt-2 border-t border-[#2B3038]/60 flex items-center justify-between text-[11px]">
        <span className="text-[#6B7280]">Direct URL fallback</span>
        <button
          type="button"
          onClick={() => setShowUrlFallback(!showUrlFallback)}
          className="text-[#3B82F6] hover:underline cursor-pointer"
        >
          {showUrlFallback ? 'Hide URL Input' : '+ Add Image via External URL'}
        </button>
      </div>

      {showUrlFallback && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="url"
            placeholder="https://example.com/product-image.jpg"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-[#0B0D10] border border-[#2B3038] text-white text-xs font-mono focus:outline-none focus:border-[#2563EB]"
          />
          <button
            type="button"
            onClick={handleAddManualUrl}
            disabled={!manualUrl.trim()}
            className="px-3 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs cursor-pointer disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
};
