'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  onUploadComplete: (url: string) => void;
}

export default function AvatarUpload({ 
  userId, 
  currentAvatarUrl, 
  onUploadComplete 
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset error
    setError(null);

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a JPG, PNG, or WebP image');
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      setError('Image must be less than 2MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    await uploadAvatar(file);
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      // Create file extension
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true, // Replace if exists
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Update user profile with avatar URL
      const { error: updateError } = await supabase
        .from('users')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Call success callback
      onUploadComplete(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
      setPreview(currentAvatarUrl); // Revert to previous avatar on error
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!currentAvatarUrl) return;

    setUploading(true);
    setError(null);

    try {
      // Extract file path from URL
      const url = new URL(currentAvatarUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts.slice(-2).join('/'); // Get "userId/avatar.ext"

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([fileName]);

      if (deleteError) throw deleteError;

      // Update user profile to remove avatar URL
      const { error: updateError } = await supabase
        .from('users')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      setPreview(null);
      onUploadComplete('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete avatar');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Avatar Preview */}
      <div className="flex items-center gap-6">
        <div className="relative">
          {preview ? (
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200">
              <Image
                src={preview}
                alt="Profile avatar"
                fill
                className="object-cover"
                sizes="128px"
              />
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-4 border-gray-200">
              <span className="text-5xl">👤</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {preview ? 'Change Avatar' : 'Upload Avatar'}
          </button>

          {preview && (
            <button
              type="button"
              onClick={handleDeleteAvatar}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-300 hover:border-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Remove Avatar
            </button>
          )}
        </div>
      </div>

      {/* Info Text */}
      <p className="text-sm text-gray-500">
        JPG, PNG, or WebP. Max size 2MB. Recommended: 400x400px square image.
      </p>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {!error && uploading && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-600">Uploading avatar...</p>
        </div>
      )}
    </div>
  );
}
