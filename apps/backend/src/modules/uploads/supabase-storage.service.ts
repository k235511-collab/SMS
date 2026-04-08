import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SupabaseStorageService {
  private supabase: SupabaseClient
  private readonly logger = new Logger(SupabaseStorageService.name)

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('supabase.url')
    const serviceRoleKey = this.configService.get<string>('supabase.serviceRoleKey')
    const anonKey = this.configService.get<string>('supabase.key')

    this.logger.log(`Initializing Supabase client with URL: ${supabaseUrl}`)
    this.logger.log(`Service Role Key present: ${!!serviceRoleKey}`)
    this.logger.log(`Anon Key present: ${!!anonKey}`)

    // File-based debug log because terminal is not visible
    try {
      const fs = require('fs');
      const path = require('path');
      const logPath = path.join(process.cwd(), 'supabase-debug.log');
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] URL: ${supabaseUrl}, ServiceRole: ${!!serviceRoleKey}, Anon: ${!!anonKey}\n`);
    } catch (e) {}

    const supabaseKey = serviceRoleKey || anonKey

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Key must be provided in environment variables.')
    }

    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  async uploadFile(file: Express.Multer.File, bucket: string, folder: string): Promise<string> {
    const fileExt = file.originalname.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
    const path = folder ? `${folder}/${fileName}` : fileName

    this.logger.log(`Uploading file ${file.originalname} to bucket ${bucket}, path ${path}`)

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      })

    if (error) {
      this.logger.error(`Error uploading to Supabase bucket "${bucket}": ${error.message}`)
      if (error.message.includes('not found')) {
        throw new Error(`Supabase bucket "${bucket}" not found. Please ensure it exists and is public.`)
      }
      throw error
    }

    const { data: publicData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return publicData.publicUrl
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    this.logger.log(`Deleting file from bucket ${bucket}, path ${path}`)

    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      this.logger.error(`Error deleting from Supabase bucket "${bucket}": ${error.message}`)
      throw error
    }
  }
}
