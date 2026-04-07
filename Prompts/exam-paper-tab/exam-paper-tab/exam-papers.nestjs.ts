// ============================================================
// NestJS Backend – Exam Paper Module
// ============================================================
// File structure:
//   src/exam-papers/
//     exam-paper.entity.ts
//     exam-paper.dto.ts
//     exam-papers.controller.ts
//     exam-papers.service.ts
//     exam-papers.module.ts

// ──────────────────────────────────────────────────────────────
// exam-paper.entity.ts
// ──────────────────────────────────────────────────────────────
export interface ExamPaperSection {
  id: string;
  title: string;
  type: 'objective' | 'subjective' | 'fill-in-blanks' | 'true-false' | 'custom';
  totalMarks: number;
  instructions: string;
  content: string; // TipTap JSON string
}

// ──────────────────────────────────────────────────────────────
// exam-paper.dto.ts
// ──────────────────────────────────────────────────────────────
import { IsString, IsNumber, IsArray, IsOptional, IsUUID } from 'class-validator';

export class UpsertExamPaperDto {
  @IsUUID()
  examId: string;

  @IsString()
  schoolName: string;

  @IsString()
  paperTitle: string;

  @IsString()
  subject: string;

  @IsString()
  classGrade: string;

  @IsString()
  date: string;

  @IsNumber()
  totalMarks: number;

  @IsString()
  duration: string;

  @IsArray()
  sections: ExamPaperSection[];

  @IsOptional()
  @IsString()
  headerContent?: string;

  @IsOptional()
  @IsString()
  footerContent?: string;
}

// ──────────────────────────────────────────────────────────────
// exam-papers.service.ts
// ──────────────────────────────────────────────────────────────
import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service'; // your existing Supabase service

@Injectable()
export class ExamPapersService {
  constructor(private supabase: SupabaseService) {}

  async getByExamId(examId: string) {
    const { data, error } = await this.supabase.client
      .from('exam_papers')
      .select('*')
      .eq('exam_id', examId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data ?? null;
  }

  async upsert(dto: UpsertExamPaperDto) {
    const payload = {
      exam_id: dto.examId,
      school_name: dto.schoolName,
      paper_title: dto.paperTitle,
      subject: dto.subject,
      class_grade: dto.classGrade,
      date: dto.date,
      total_marks: dto.totalMarks,
      duration: dto.duration,
      sections: dto.sections,
      header_content: dto.headerContent ?? '',
      footer_content: dto.footerContent ?? '',
    };

    const { data, error } = await this.supabase.client
      .from('exam_papers')
      .upsert(payload, { onConflict: 'exam_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(examId: string) {
    const { error } = await this.supabase.client
      .from('exam_papers')
      .delete()
      .eq('exam_id', examId);

    if (error) throw error;
    return { deleted: true };
  }

  // Generate printable HTML server-side (optional – useful for PDF generation)
  generatePrintHTML(paper: any): string {
    const sectionsHTML = (paper.sections as ExamPaperSection[])
      .map((sec, i) => `
        <div class="section">
          <div class="section-header">
            <span>Section ${String.fromCharCode(65 + i)}: ${sec.title}</span>
            <span>[${sec.totalMarks} Marks]</span>
          </div>
          ${sec.instructions ? `<p class="instructions">${sec.instructions}</p>` : ''}
          <div class="content">${sec.content}</div>
        </div>
      `)
      .join('');

    return `<!DOCTYPE html><html><body>
      <h1>${paper.paper_title}</h1>
      <p>${paper.school_name} | ${paper.subject} | ${paper.class_grade}</p>
      <p>Total Marks: ${paper.total_marks} | Duration: ${paper.duration}</p>
      ${sectionsHTML}
    </body></html>`;
  }
}

// ──────────────────────────────────────────────────────────────
// exam-papers.controller.ts
// ──────────────────────────────────────────────────────────────
import {
  Controller, Get, Post, Delete,
  Param, Body, UseGuards, Res
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';

@Controller('exam-papers')
@UseGuards(JwtAuthGuard)
export class ExamPapersController {
  constructor(private examPapersService: ExamPapersService) {}

  // GET /exam-papers/:examId
  @Get(':examId')
  getByExamId(@Param('examId') examId: string) {
    return this.examPapersService.getByExamId(examId);
  }

  // POST /exam-papers  (create or update)
  @Post()
  upsert(@Body() dto: UpsertExamPaperDto) {
    return this.examPapersService.upsert(dto);
  }

  // DELETE /exam-papers/:examId
  @Delete(':examId')
  delete(@Param('examId') examId: string) {
    return this.examPapersService.delete(examId);
  }

  // GET /exam-papers/:examId/print  → returns printable HTML
  @Get(':examId/print')
  async print(@Param('examId') examId: string, @Res() res: Response) {
    const paper = await this.examPapersService.getByExamId(examId);
    if (!paper) return res.status(404).send('Not found');
    const html = this.examPapersService.generatePrintHTML(paper);
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  }
}

// ──────────────────────────────────────────────────────────────
// exam-papers.module.ts
// ──────────────────────────────────────────────────────────────
import { Module } from '@nestjs/common';

@Module({
  controllers: [ExamPapersController],
  providers: [ExamPapersService],
  exports: [ExamPapersService],
})
export class ExamPapersModule {}

// In app.module.ts → imports: [ ..., ExamPapersModule ]
