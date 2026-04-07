import { Module, Global } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { UploadsService } from './uploads.service'
import { SupabaseStorageService } from './supabase-storage.service'

@Global()
@Module({
  imports: [ConfigModule],
  providers: [UploadsService, SupabaseStorageService],
  exports: [UploadsService, SupabaseStorageService],
})
export class UploadsModule {}
