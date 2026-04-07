import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SupabaseStorageService } from './supabase-storage.service'

@Injectable()
export class UploadsService {
  constructor(
    private readonly supabaseStorage: SupabaseStorageService,
    private readonly configService: ConfigService,
  ) {}

  async saveFile(file: Express.Multer.File, folder: string): Promise<string> {
    const bucket = this.configService.get<string>('supabase.bucket', 'uploads')
    return this.supabaseStorage.uploadFile(file, bucket, folder)
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl) return

    try {
      const bucket = this.configService.get<string>('supabase.bucket', 'uploads')
      const urlObj = new URL(fileUrl)
      
      // Decode the URL so spaces (e.g., %20) match the original bucket name
      const decodedPathname = decodeURIComponent(urlObj.pathname)
      const parts = decodedPathname.split('/')
      const bucketIndex = parts.indexOf(bucket)
      
      if (bucketIndex !== -1 && bucketIndex < parts.length - 1) {
        const filePath = parts.slice(bucketIndex + 1).join('/')
        await this.supabaseStorage.deleteFile(bucket, filePath)
      } else {
        console.warn(`Could not parse bucket '${bucket}' from URL: ${fileUrl}`)
      }
    } catch (error) {
      // Log error but avoid throwing exception to not break business logic if file deletion fails
      console.error(`Failed to parse or delete file URL: ${fileUrl}`, error)
    }
  }
}
