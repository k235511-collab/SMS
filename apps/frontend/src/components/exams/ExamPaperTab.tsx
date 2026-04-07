'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import ImageExt from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import FontFamily from '@tiptap/extension-font-family'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import UnderlineExt from '@tiptap/extension-underline'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import Placeholder from '@tiptap/extension-placeholder'
import { FontSize } from './extensions/FontSize'
import { api } from '@/lib/api-client'
import {
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter,
  AlignRight, Image as ImageIcon, Table as TableIcon,
  Printer, Save, Plus, Trash2, ChevronDown, Type, Palette,
  List, ListOrdered, RotateCcw, RotateCw, FileText, GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────

type SectionType = 'OBJECTIVE' | 'SUBJECTIVE' | 'FILL_BLANK' | 'TRUE_FALSE' | 'MATCHING' | 'CUSTOM'
type QuestionType = 'MCQ' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'FILL_BLANK' | 'TRUE_FALSE' | 'MATCHING'

interface QuestionOption {
  id?: string
  optionText: string
  isCorrect: boolean
  sortOrder: number
}

interface ExamQuestion {
  id?: string
  questionText: string
  questionType: QuestionType
  marks: number
  sortOrder: number
  imageBase64?: string
  options: QuestionOption[]
}

interface ExamSectionData {
  id?: string
  title: string
  type: SectionType
  instructions: string
  totalMarks: number
  sortOrder: number
  questions: ExamQuestion[]
}

interface ExamPaperData {
  id?: string
  examId: string
  paperTitle: string
  schoolName: string
  schoolLogo: string
  headerInstructions: string
  date: string
  totalMarks: number
  duration: string
  instructions: string
  sections: ExamSectionData[]
}

// ─── Constants ────────────────────────────────────────────────

const FONTS = [
  { label: 'Default', value: 'inherit' },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: "'Courier New', Courier, monospace" },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Noto Nastaliq Urdu', value: "'Noto Nastaliq Urdu', serif" },
]

const FONT_SIZES = ['8', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36']

const SECTION_TYPES: { value: SectionType; label: string; color: string }[] = [
  { value: 'OBJECTIVE', label: 'Objective (MCQs)', color: 'bg-blue-100 text-blue-800' },
  { value: 'SUBJECTIVE', label: 'Subjective', color: 'bg-green-100 text-green-800' },
  { value: 'FILL_BLANK', label: 'Fill in the Blanks', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'TRUE_FALSE', label: 'True / False', color: 'bg-purple-100 text-purple-800' },
  { value: 'MATCHING', label: 'Matching', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'CUSTOM', label: 'Custom', color: 'bg-gray-100 text-gray-800' },
]

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'MCQ', label: 'Multiple Choice' },
  { value: 'SHORT_ANSWER', label: 'Short Answer' },
  { value: 'LONG_ANSWER', label: 'Long Answer' },
  { value: 'FILL_BLANK', label: 'Fill in Blank' },
  { value: 'TRUE_FALSE', label: 'True / False' },
  { value: 'MATCHING', label: 'Matching' },
]

function defaultQuestionType(sectionType: SectionType): QuestionType {
  switch (sectionType) {
    case 'OBJECTIVE': return 'MCQ'
    case 'FILL_BLANK': return 'FILL_BLANK'
    case 'TRUE_FALSE': return 'TRUE_FALSE'
    case 'MATCHING': return 'MATCHING'
    default: return 'SHORT_ANSWER'
  }
}

// ─── Toolbar Button ───────────────────────────────────────────

function ToolbarBtn({ onClick, active, disabled, title, children }: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'h-7 w-7 flex items-center justify-center rounded text-sm transition-colors',
        active ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100 text-gray-600',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  )
}

// ─── Question Rich Text Editor ────────────────────────────────

function QuestionEditor({ content, onChange, editable, placeholder }: {
  content: string
  onChange: (html: string) => void
  editable: boolean
  placeholder?: string
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      UnderlineExt,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ImageExt.configure({ allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: placeholder || 'Write question text...' }),
    ],
    content: content || '',
    editable,
    onUpdate: ({ editor: updatedEditor }) => {
      onChange(updatedEditor.getHTML())
    },
    editorProps: {
      attributes: { class: 'exam-editor-content min-h-[60px] outline-none prose prose-sm max-w-none' },
    },
  })

  const fileRef = useRef<HTMLInputElement>(null)

  const insertBase64Image = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      editor?.chain().focus().setImage({ src: reader.result as string }).run()
    }
    reader.readAsDataURL(file)
  }, [editor])

  if (!editor) return null

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {editable && (
        <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-100 flex-wrap bg-gray-50/50">
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
            <Bold size={12} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
            <Italic size={12} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
            <UnderlineIcon size={12} />
          </ToolbarBtn>

          <Separator orientation="vertical" className="h-4 mx-0.5" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-0.5 px-1.5 h-7 text-[11px] rounded hover:bg-gray-100 text-gray-600 border border-gray-200">
                <Type size={11} /> <ChevronDown size={9} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {FONTS.map((f) => (
                <DropdownMenuItem key={f.value} style={{ fontFamily: f.value }} onClick={() => editor.chain().focus().setFontFamily(f.value).run()}>
                  {f.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-0.5 px-1.5 h-7 text-[11px] rounded hover:bg-gray-100 text-gray-600 border border-gray-200">
                {editor.getAttributes('textStyle').fontSize?.replace('px', '') || '14'} <ChevronDown size={9} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-48 overflow-y-auto">
              {FONT_SIZES.map((s) => (
                <DropdownMenuItem key={s} onClick={() => editor.chain().focus().setFontSize(`${s}px`).run()}>
                  {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100" title="Text color">
                <Palette size={12} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-2 w-40">
              <input type="color" className="w-full h-8 cursor-pointer rounded" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-4 mx-0.5" />

          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Left">
            <AlignLeft size={12} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center">
            <AlignCenter size={12} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Right">
            <AlignRight size={12} />
          </ToolbarBtn>

          <Separator orientation="vertical" className="h-4 mx-0.5" />

          <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
            <List size={12} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
            <ListOrdered size={12} />
          </ToolbarBtn>

          <Separator orientation="vertical" className="h-4 mx-0.5" />

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) insertBase64Image(f) }} />
          <ToolbarBtn onClick={() => fileRef.current?.click()} title="Insert image">
            <ImageIcon size={12} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Table">
            <TableIcon size={12} />
          </ToolbarBtn>

          <Separator orientation="vertical" className="h-4 mx-0.5" />

          <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
            <RotateCcw size={12} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
            <RotateCw size={12} />
          </ToolbarBtn>
        </div>
      )}
      <div className="px-3 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

// ─── Single Question Component ────────────────────────────────

function QuestionCard({ question, qIndex, editable, onChange, onDelete }: {
  question: ExamQuestion
  qIndex: number
  editable: boolean
  onChange: (updated: ExamQuestion) => void
  onDelete: () => void
}) {
  const needsOptions = question.questionType === 'MCQ' || question.questionType === 'TRUE_FALSE'

  const addOption = () => {
    const newOpt: QuestionOption = {
      optionText: '',
      isCorrect: false,
      sortOrder: question.options.length,
    }
    onChange({ ...question, options: [...question.options, newOpt] })
  }

  const updateOption = (idx: number, updated: Partial<QuestionOption>) => {
    const opts = question.options.map((o, i) => i === idx ? { ...o, ...updated } : o)
    onChange({ ...question, options: opts })
  }

  const deleteOption = (idx: number) => {
    onChange({ ...question, options: question.options.filter((_, i) => i !== idx).map((o, i) => ({ ...o, sortOrder: i })) })
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-start gap-2 mb-2">
        <div className="flex items-center gap-1 mt-1 text-gray-400">
          <GripVertical size={14} />
          <span className="text-xs font-medium text-gray-500 w-5">Q{qIndex + 1}</span>
        </div>
        <div className="flex-1 space-y-2">
          {/* Question text editor */}
          <QuestionEditor
            content={question.questionText}
            onChange={(html) => onChange({ ...question, questionText: html })}
            editable={editable}
            placeholder={`Question ${qIndex + 1} text...`}
          />

          {/* Question metadata row */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Label className="text-[11px] text-gray-400">Type</Label>
              <select
                value={question.questionType}
                onChange={(e) => onChange({ ...question, questionType: e.target.value as QuestionType })}
                disabled={!editable}
                className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white disabled:opacity-60"
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-[11px] text-gray-400">Marks</Label>
              <Input
                type="number"
                value={question.marks}
                onChange={(e) => onChange({ ...question, marks: Number(e.target.value) || 0 })}
                disabled={!editable}
                className="w-14 h-6 text-xs text-center"
                min={0}
              />
            </div>
            {editable && (
              <button onClick={onDelete} className="ml-auto p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete question">
                <Trash2 size={13} />
              </button>
            )}
          </div>

          {/* Options for MCQ / T-F */}
          {needsOptions && (
            <div className="space-y-1.5 pl-1">
              {question.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type={question.questionType === 'TRUE_FALSE' ? 'radio' : 'checkbox'}
                    name={`q-${qIndex}-opt`}
                    checked={opt.isCorrect}
                    onChange={(e) => {
                      if (question.questionType === 'TRUE_FALSE') {
                        const opts = question.options.map((o, i) => ({ ...o, isCorrect: i === oi }))
                        onChange({ ...question, options: opts })
                      } else {
                        updateOption(oi, { isCorrect: e.target.checked })
                      }
                    }}
                    disabled={!editable}
                    className="accent-green-600"
                  />
                  <Input
                    value={opt.optionText}
                    onChange={(e) => updateOption(oi, { optionText: e.target.value })}
                    disabled={!editable}
                    placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                    className="h-7 text-xs flex-1"
                  />
                  {editable && (
                    <button onClick={() => deleteOption(oi)} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500">
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              ))}
              {editable && (
                <button onClick={addOption} className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 mt-1">
                  <Plus size={12} /> Add Option
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Section Component ────────────────────────────────────────

function SectionCard({ section, sIndex, editable, onChange, onDelete }: {
  section: ExamSectionData
  sIndex: number
  editable: boolean
  onChange: (updated: ExamSectionData) => void
  onDelete: () => void
}) {
  const sectionType = SECTION_TYPES.find((t) => t.value === section.type)

  const addQuestion = () => {
    const q: ExamQuestion = {
      questionText: '',
      questionType: defaultQuestionType(section.type),
      marks: 1,
      sortOrder: section.questions.length,
      options: section.type === 'TRUE_FALSE'
        ? [{ optionText: 'True', isCorrect: false, sortOrder: 0 }, { optionText: 'False', isCorrect: false, sortOrder: 1 }]
        : section.type === 'OBJECTIVE'
          ? [{ optionText: '', isCorrect: false, sortOrder: 0 }, { optionText: '', isCorrect: false, sortOrder: 1 }, { optionText: '', isCorrect: false, sortOrder: 2 }, { optionText: '', isCorrect: false, sortOrder: 3 }]
          : [],
    }
    onChange({ ...section, questions: [...section.questions, q] })
  }

  const updateQuestion = (idx: number, updated: ExamQuestion) => {
    onChange({ ...section, questions: section.questions.map((q, i) => i === idx ? updated : q) })
  }

  const deleteQuestion = (idx: number) => {
    onChange({
      ...section,
      questions: section.questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, sortOrder: i })),
    })
  }

  const computedMarks = section.questions.reduce((sum, q) => sum + q.marks, 0)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm mb-4">
      {/* Section Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 flex-1">
          <span className="font-semibold text-gray-700 text-sm">Section {String.fromCharCode(65 + sIndex)}</span>
          <Badge className={cn('text-xs font-medium', sectionType?.color)}>{sectionType?.label}</Badge>
          <span className="text-xs text-gray-400 ml-2">
            {section.questions.length} Q &middot; {computedMarks} marks
          </span>
        </div>
        <div className="flex items-center gap-2">
          {editable && (
            <>
              <Label className="text-xs text-gray-500">Type</Label>
              <select
                value={section.type}
                onChange={(e) => onChange({ ...section, type: e.target.value as SectionType })}
                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
              >
                {SECTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <button onClick={onDelete} className="ml-2 p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete section">
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Section Title + Instructions */}
      <div className="px-4 pt-3 grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">Section Title</Label>
          <Input
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            disabled={!editable}
            placeholder="e.g. Section A — Multiple Choice"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">Instructions (optional)</Label>
          <Input
            value={section.instructions}
            onChange={(e) => onChange({ ...section, instructions: e.target.value })}
            disabled={!editable}
            placeholder="e.g. Circle the correct answer."
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Questions */}
      <div className="px-4 py-3 space-y-2">
        {section.questions.map((q, qi) => (
          <QuestionCard
            key={qi}
            question={q}
            qIndex={qi}
            editable={editable}
            onChange={(updated) => updateQuestion(qi, updated)}
            onDelete={() => deleteQuestion(qi)}
          />
        ))}
        {editable && (
          <button
            onClick={addQuestion}
            className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus size={13} /> Add Question
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Print Helper ─────────────────────────────────────────────

function buildPrintHTML(paper: ExamPaperData) {
  const sectionsHTML = paper.sections
    .map((sec, i) => {
      const questionsHTML = sec.questions
        .map((q, qi) => {
          let qHTML = `<div class="question"><span class="q-num">${qi + 1}.</span> <span class="q-text">${q.questionText}</span> <span class="q-marks">[${q.marks}]</span></div>`
          if (q.options.length > 0) {
            const optsHTML = q.options.map((o, oi) => `<span class="option">(${String.fromCharCode(97 + oi)}) ${o.optionText}</span>`).join('&emsp;')
            qHTML += `<div class="options">${optsHTML}</div>`
          }
          return qHTML
        })
        .join('')

      return `
        <div class="section">
          <div class="section-header">
            <span class="section-label">Section ${String.fromCharCode(65 + i)}: ${sec.title}</span>
            <span class="section-marks">[${sec.questions.reduce((s, q) => s + q.marks, 0)} Marks]</span>
          </div>
          ${sec.instructions ? `<p class="instructions"><em>${sec.instructions}</em></p>` : ''}
          <div class="questions">${questionsHTML}</div>
        </div>`
    })
    .join('')

  return `<!DOCTYPE html>
<html><head><title>${paper.paperTitle}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Times New Roman',serif;font-size:12pt;color:#000;background:#fff}
.page{width:210mm;min-height:297mm;padding:20mm 18mm;margin:0 auto}
.header{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:12px}
.school-logo{height:60px;width:auto;margin-bottom:6px}
.school-name{font-size:20pt;font-weight:bold;letter-spacing:1px;text-transform:uppercase}
.title{font-size:16pt;font-weight:bold;margin-top:4px}
.header-inst{font-size:10pt;font-style:italic;margin-top:4px;color:#333}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11pt;margin:12px 0;border:1px solid #000;padding:8px}
.meta b{margin-right:4px}
.general-inst{font-style:italic;font-size:10pt;margin-bottom:16px;border:1px solid #ccc;padding:6px;background:#f9f9f9}
.section{margin-top:18px}
.section-header{display:flex;justify-content:space-between;font-weight:bold;font-size:12pt;border-bottom:1px solid #333;padding-bottom:4px;margin-bottom:8px}
.instructions{font-style:italic;font-size:10pt;color:#333;margin-bottom:8px}
.question{margin-bottom:10px;line-height:1.7}
.q-num{font-weight:bold}
.q-marks{float:right;font-size:10pt;color:#555}
.q-text img{max-width:300px;height:auto;display:block;margin:4px 0}
.options{margin:4px 0 10px 20px;font-size:11pt}
.option{margin-right:16px}
.footer{margin-top:30px;border-top:1px solid #000;padding-top:8px;text-align:center;font-size:9pt;color:#555}
table{width:100%;border-collapse:collapse;margin:8px 0}
td,th{border:1px solid #999;padding:6px 8px}
th{background:#eee;font-weight:bold}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.page{width:100%;padding:0}}
</style></head><body>
<div class="page">
  <div class="header">
    ${paper.schoolLogo ? `<img src="${paper.schoolLogo}" class="school-logo" alt="Logo" />` : ''}
    ${paper.schoolName ? `<div class="school-name">${paper.schoolName}</div>` : ''}
    <div class="title">${paper.paperTitle}</div>
    ${paper.headerInstructions ? `<div class="header-inst">${paper.headerInstructions}</div>` : ''}
  </div>
  <div class="meta">
    <div><b>Date:</b> ${paper.date}</div>
    <div><b>Total Marks:</b> ${paper.totalMarks}</div>
    <div><b>Time Allowed:</b> ${paper.duration}</div>
    <div></div>
  </div>
  ${paper.instructions ? `<div class="general-inst"><b>Instructions:</b> ${paper.instructions}</div>` : ''}
  ${sectionsHTML}
  <div class="footer">*** End of Paper ***</div>
</div>
<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script>
</body></html>`
}

// ─── Main Component ───────────────────────────────────────────

interface ExamPaperTabProps {
  examId: string
  editable: boolean
  defaultSchoolName?: string
  defaultSchoolLogo?: string
}

export default function ExamPaperTab({ examId, editable, defaultSchoolName, defaultSchoolLogo }: ExamPaperTabProps) {
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [paper, setPaper] = useState<ExamPaperData>({
    examId,
    paperTitle: '',
    schoolName: defaultSchoolName || '',
    schoolLogo: defaultSchoolLogo || '',
    headerInstructions: '',
    date: new Date().toISOString().split('T')[0],
    totalMarks: 100,
    duration: '2 hours',
    instructions: '',
    sections: [],
  })

  // Load existing paper
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const res = await api.get<ExamPaperData>(`/exams/${examId}/paper`)
      if (!cancelled && res.success && res.data) {
        setPaper(res.data)
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [examId])

  const addSection = () => {
    const s: ExamSectionData = {
      title: `Section ${String.fromCharCode(65 + paper.sections.length)}`,
      type: 'SUBJECTIVE',
      instructions: '',
      totalMarks: 0,
      sortOrder: paper.sections.length,
      questions: [],
    }
    setPaper((p) => ({ ...p, sections: [...p.sections, s] }))
  }

  const updateSection = (idx: number, updated: ExamSectionData) => {
    setPaper((p) => ({ ...p, sections: p.sections.map((s, i) => i === idx ? updated : s) }))
  }

  const deleteSection = (idx: number) => {
    setPaper((p) => ({
      ...p,
      sections: p.sections.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sortOrder: i })),
    }))
  }

  const totalQuestionMarks = paper.sections.reduce((sum, s) => sum + s.questions.reduce((qs, q) => qs + q.marks, 0), 0)

  const savePaper = async () => {
    setSaving(true)
    try {
      // Calculate section totalMarks from questions
      const payload = {
        paperTitle: paper.paperTitle,
        schoolName: paper.schoolName,
        schoolLogo: paper.schoolLogo,
        headerInstructions: paper.headerInstructions,
        date: paper.date,
        totalMarks: paper.totalMarks,
        duration: paper.duration,
        instructions: paper.instructions,
        sections: paper.sections.map((s, si) => ({
          title: s.title,
          type: s.type,
          instructions: s.instructions,
          totalMarks: s.questions.reduce((sum, q) => sum + q.marks, 0),
          sortOrder: si,
          questions: s.questions.map((q, qi) => ({
            questionText: q.questionText,
            questionType: q.questionType,
            marks: q.marks,
            sortOrder: qi,
            imageBase64: q.imageBase64 || undefined,
            options: q.options.map((o, oi) => ({
              optionText: o.optionText,
              isCorrect: o.isCorrect,
              sortOrder: oi,
            })),
          })),
        })),
      }
      const res = await api.post<ExamPaperData>(`/exams/${examId}/paper`, payload)
      if (res.success && res.data) {
        setPaper(res.data)
        toast.success('Exam paper saved')
      } else {
        toast.error(res.message || 'Failed to save exam paper')
      }
    } catch {
      toast.error('Failed to save exam paper')
    } finally {
      setSaving(false)
    }
  }

  const printPaper = () => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(buildPrintHTML(paper))
    win.document.close()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 mb-4">
        <div className="flex items-center gap-3">
          <FileText size={16} className="text-green-600" />
          <span className="text-sm font-medium text-gray-700">Exam Paper Builder</span>
          {paper.sections.length > 0 && (
            <Badge variant="outline" className={cn('text-xs', totalQuestionMarks === paper.totalMarks ? 'border-green-500 text-green-700' : 'border-yellow-500 text-yellow-700')}>
              {totalQuestionMarks} / {paper.totalMarks} marks
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={printPaper} className="gap-1.5 text-xs" disabled={paper.sections.length === 0}>
            <Printer size={13} /> Print / PDF
          </Button>
          {editable && (
            <Button size="sm" onClick={savePaper} disabled={saving} className="gap-1.5 text-xs bg-green-600 hover:bg-green-700">
              <Save size={13} /> {saving ? 'Saving...' : 'Save Paper'}
            </Button>
          )}
        </div>
      </div>

      {/* Paper Meta */}
      <div className="border border-gray-200 rounded-xl p-4 bg-white mb-4">
        {/* School Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 pb-3 border-b border-gray-100">
          <div className="md:col-span-1">
            <Label className="text-xs text-gray-500">School Logo URL</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input value={paper.schoolLogo} onChange={(e) => setPaper((p) => ({ ...p, schoolLogo: e.target.value }))} disabled={!editable} className="h-8 text-sm flex-1" placeholder="https://example.com/logo.png" />
              {paper.schoolLogo && (
                <img src={paper.schoolLogo} alt="Logo" className="h-8 w-8 object-contain rounded border border-gray-200" />
              )}
            </div>
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs text-gray-500">School Name</Label>
            <Input value={paper.schoolName} onChange={(e) => setPaper((p) => ({ ...p, schoolName: e.target.value }))} disabled={!editable} className="mt-1 h-8 text-sm" placeholder="The Citizen Foundation" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-gray-500">Paper Title</Label>
            <Input value={paper.paperTitle} onChange={(e) => setPaper((p) => ({ ...p, paperTitle: e.target.value }))} disabled={!editable} className="mt-1 h-8 text-sm" placeholder="Mid-Term Examination" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Date</Label>
            <Input type="date" value={paper.date} onChange={(e) => setPaper((p) => ({ ...p, date: e.target.value }))} disabled={!editable} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Total Marks</Label>
            <Input type="number" value={paper.totalMarks} onChange={(e) => setPaper((p) => ({ ...p, totalMarks: Number(e.target.value) || 0 }))} disabled={!editable} className="mt-1 h-8 text-sm" min={0} />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Duration</Label>
            <Input value={paper.duration} onChange={(e) => setPaper((p) => ({ ...p, duration: e.target.value }))} disabled={!editable} className="mt-1 h-8 text-sm" placeholder="2 hours" />
          </div>
        </div>
        <div className="mt-3">
          <Label className="text-xs text-gray-500">Header Instructions (printed below header)</Label>
          <Input value={paper.headerInstructions} onChange={(e) => setPaper((p) => ({ ...p, headerInstructions: e.target.value }))} disabled={!editable} className="mt-1 h-8 text-sm" placeholder="Read all questions carefully before answering." />
        </div>
        <div className="mt-3">
          <Label className="text-xs text-gray-500">General Instructions</Label>
          <Input value={paper.instructions} onChange={(e) => setPaper((p) => ({ ...p, instructions: e.target.value }))} disabled={!editable} className="mt-1 h-8 text-sm" placeholder="Attempt all questions. Each question carries equal marks." />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {paper.sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
              <FileText size={22} className="text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-1">No sections yet</h3>
            <p className="text-sm text-gray-400 mb-4">Add sections like Objective, Subjective, Fill-in-Blanks etc.</p>
            {editable && (
              <Button onClick={addSection} size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700">
                <Plus size={14} /> Add First Section
              </Button>
            )}
          </div>
        ) : (
          <>
            {paper.sections.map((section, si) => (
              <SectionCard
                key={si}
                section={section}
                sIndex={si}
                editable={editable}
                onChange={(updated) => updateSection(si, updated)}
                onDelete={() => deleteSection(si)}
              />
            ))}
            {editable && (
              <button
                onClick={addSection}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={15} /> Add Section
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
