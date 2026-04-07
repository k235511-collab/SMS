'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { cn, getAssetUrl } from '@/lib/utils'
import { toast } from 'sonner'

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  onUpload?: (file: File) => Promise<string>
  onRemove?: () => Promise<void>
  disabled?: boolean
  className?: string
  aspectRatio?: 'square' | 'video' | 'rect'
}

export function ImageUpload({
  value,
  onChange,
  onUpload,
  onRemove,
  disabled,
  className,
  aspectRatio = 'square'
}: ImageUploadProps) {
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Basic validation
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    try {
      setLoading(true)
      if (onUpload) {
        const url = await onUpload(file)
        onChange(url)
        toast.success('Image uploaded successfully')
      } else {
        // Fallback or preview only if needed, but usually we handle upload here
        const reader = new FileReader()
        reader.onloadend = () => {
          onChange(reader.result as string)
        }
        reader.readAsDataURL(file)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error('Failed to upload image')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled || loading) return

    if (onRemove) {
      try {
        setLoading(true)
        await onRemove()
        onChange('')
        if (fileInputRef.current) fileInputRef.current.value = ''
        toast.success('Image removed successfully')
      } catch (error) {
        console.error('Remove failed:', error)
        toast.error('Failed to remove image')
      } finally {
        setLoading(false)
      }
    } else {
      onChange('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className={cn('space-y-4 w-full flex flex-col items-center justify-center', className)}>
      <div
        onClick={() => !disabled && !loading && fileInputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-xl hover:border-primary/50 transition-all cursor-pointer overflow-hidden bg-muted/30 group',
          aspectRatio === 'square' ? 'h-40 w-40' : 'h-40 w-full',
          disabled && 'opacity-50 cursor-not-allowed',
          value && 'border-solid border-primary/20'
        )}
      >
        {value ? (
          <>
            <img
              src={getAssetUrl(value)}
              alt="Preview"
              className="h-full w-full object-cover"
            />
            {!disabled && !loading && (
              <button
                onClick={handleRemove}
                className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground group-hover:text-primary transition-colors">
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <>
                <div className="p-3 rounded-full bg-primary/5 mb-2 group-hover:bg-primary/10 transition-colors">
                  <Upload className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium">Click to upload</span>
                <span className="text-[10px] opacity-60 mt-1">PNG, JPG up to 5MB</span>
              </>
            )}
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={disabled || loading}
      />
    </div>
  )
}
