'use client'

import { useEffect, useMemo, useState } from 'react'
import { ProtectedRoute } from '@/components/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StudentSearch } from '@/components/student-search'
import { reportsService } from '@/services/analytics.service'
import { examsService } from '@/services/exams.service'
import { useAuth } from '@/context/auth-context'
import { useSession } from '@/context/session-context'
import { Eye, FileText, Loader2, PencilLine, Plus, Printer, Save, Trash2 } from 'lucide-react'
import { getAssetUrl } from '@/lib/utils'
import { toast } from 'sonner'

type StudentOption = {
  id: string
  rollNumber: string
  firstName: string
  lastName: string
  class?: { name: string }
  section?: { name: string }
}

type StudentReportResponse = {
  school?: {
    id: string
    name: string
    logo?: string | null
    address?: string | null
    phone?: string | null
    email?: string | null
  }
  student: {
    id: string
    name: string
    firstName?: string
    lastName?: string
    rollNumber: string
    guardianName?: string | null
    guardianPhone?: string | null
    guardianEmail?: string | null
    enrollmentDate?: string | Date
  }
  class?: { id?: string; name?: string; code?: string } | null
  section?: { id?: string; name?: string } | null
  attendance: {
    total: number
    present: number
    percentage: number
  }
  examResults: Array<{
    id: string
    marksObtained: number
    grade?: string | null
    isAbsent?: boolean
    percentage?: number | null
    subject?: { id: string; name: string } | null
    exam?: { id: string; name: string; totalMarks?: number; type?: string | null } | null
  }>
  grades: Array<{
    id: string
    score: number
    maxScore: number
    weight: number
    remarks?: string | null
    subject?: { id: string; name: string } | null
  }>
  generatedAt: string
}

type TemplateOption = {
  id: string
  name: string
  description: string
  templatePath: string
}

type StudentCardTemplateApiItem = {
  templateKey: string
  templateName: string
  description: string
  htmlContent: string | null
  isCustomized: boolean
  updatedAt: string | null
}

type TemplateMeta = {
  templateName: string
  description: string
  isCustomized: boolean
  updatedAt: string | null
}

type TemplateDesignModel = {
  pageBackground: string
  textColor: string
  borderColor: string
  softBackground: string
  panelBackground: string
  mutedColor: string
  accentColor: string
  fontFamily: string
}

type TemplateDesignVariableMap = {
  textVar: string
  borderVar: string
  softVar: string
  panelVar: string
  mutedVar: string
  accentVar: string
}

type ExamTypeSection = {
  id: string
  examType: string
  label: string
  note: string
}

type CustomSection = {
  id: string
  title: string
  content: string
}

type SubjectTypeCell = {
  totalMarks: number
  obtainedMarks: number
  percentage: number
  status: string
}

type SubjectMatrixRow = {
  subject: string
  cells: SubjectTypeCell[]
}

type SubjectMatrix = {
  rows: SubjectMatrixRow[]
  totals: Array<{
    totalMarks: number
    obtainedMarks: number
  }>
}

type ExamTypeOption = {
  value: string
  label: string
}

type EditableSubjectCell = {
  totalMarks: string
  obtainedMarks: string
  status: string
}

type EditableSubjectRow = {
  id: string
  subject: string
  cells: EditableSubjectCell[]
}

type EditableCardData = {
  schoolName: string
  schoolAddress: string
  schoolPhone: string
  schoolEmail: string
  schoolLogo: string | null

  academicYear: string
  studentName: string
  rollNumber: string
  className: string
  sectionName: string
  guardianName: string
  guardianPhone: string
  guardianEmail: string
  enrollmentDate: string

  attendanceTotal: string
  attendancePresent: string
  attendancePercent: string

  sections: ExamTypeSection[]
  customSections: CustomSection[]
  subjectRows: EditableSubjectRow[]

  generatedAt: string
}

const PASS_THRESHOLD_PERCENT = 40

const EXAM_TYPE_LABELS: Record<string, string> = {
  QUIZ: 'Quiz',
  MID_TERM: 'Mid Term',
  FINAL: 'Final Term',
  ASSIGNMENT: 'Assignment',
  PRACTICAL: 'Practical',
  CUSTOM: 'Custom',
}

const EXAM_TYPE_ORDER = ['QUIZ', 'MID_TERM', 'FINAL', 'ASSIGNMENT', 'PRACTICAL', 'CUSTOM']

const DEFAULT_EXAM_TYPE_OPTIONS: ExamTypeOption[] = EXAM_TYPE_ORDER.map((item) => ({
  value: item,
  label: EXAM_TYPE_LABELS[item] || item,
}))

const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: 'foldable-classic',
    name: 'Foldable Classic Card',
    description: 'Outside panel shows student details, inside panel shows type-wise marks table.',
    templatePath: '/report-templates/student-report-foldable.html',
  },
  {
    id: 'green-ledger',
    name: 'Green Ledger Card',
    description: 'Traditional green marks ledger format similar to school paper cards.',
    templatePath: '/report-templates/student-report-green-ledger.html',
  },
  {
    id: 'clean-modern',
    name: 'Clean Modern Card',
    description: 'Professional clean layout with high readability for print.',
    templatePath: '/report-templates/student-report-clean-modern.html',
  },
]

const TEMPLATE_DESIGN_DEFAULTS: Record<string, TemplateDesignModel> = {
  'foldable-classic': {
    pageBackground: '#dce9d9',
    textColor: '#153428',
    borderColor: '#365c49',
    softBackground: '#eef6ec',
    panelBackground: '#ffffff',
    mutedColor: '#4a6656',
    accentColor: '#8cbe6b',
    fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif',
  },
  'green-ledger': {
    pageBackground: '#dae8d4',
    textColor: '#1b2f24',
    borderColor: '#2f4939',
    softBackground: '#c9dfbf',
    panelBackground: '#b8d3ad',
    mutedColor: '#3f5a4b',
    accentColor: '#2f4939',
    fontFamily: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
  },
  'clean-modern': {
    pageBackground: '#dde5f5',
    textColor: '#1e2b45',
    borderColor: '#486190',
    softBackground: '#eef3ff',
    panelBackground: '#f8faff',
    mutedColor: '#5f6f90',
    accentColor: '#486190',
    fontFamily: '"Calibri", "Segoe UI", Arial, sans-serif',
  },
}

const TEMPLATE_DESIGN_VARIABLES: Record<string, TemplateDesignVariableMap> = {
  'foldable-classic': {
    textVar: 'ink',
    borderVar: 'line',
    softVar: 'soft',
    panelVar: 'panel',
    mutedVar: 'muted',
    accentVar: 'accent',
  },
  'green-ledger': {
    textVar: 'ink',
    borderVar: 'line',
    softVar: 'cell',
    panelVar: 'cell-dark',
    mutedVar: 'muted',
    accentVar: 'accent',
  },
  'clean-modern': {
    textVar: 'ink',
    borderVar: 'line',
    softVar: 'soft',
    panelVar: 'panel',
    mutedVar: 'muted',
    accentVar: 'accent',
  },
}

const FONT_FAMILY_OPTIONS = [
  '"Segoe UI", Tahoma, Arial, sans-serif',
  '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
  '"Calibri", "Segoe UI", Arial, sans-serif',
  'Verdana, Geneva, sans-serif',
  'Georgia, "Times New Roman", serif',
]

const SETTINGS_STORAGE_KEY = 'student-report-card-builder.v4'

function normalizeExamType(value: string | null | undefined): string {
  if (!value) return ''
  return value.trim().toUpperCase().replace(/[\s-]+/g, '_')
}

function normalizeTemplateKey(value: string | null | undefined): string {
  if (!value) return ''
  return value.trim().toLowerCase()
}

function toExamTypeLabel(value: string): string {
  const normalized = normalizeExamType(value)
  if (!normalized) return 'Exam Type'
  return EXAM_TYPE_LABELS[normalized] || normalized.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (s) => s.toUpperCase())
}

function guessExamTypeFromLegacyLabel(value: string): string {
  const normalized = value.toLowerCase()
  if (normalized.includes('quiz')) return 'QUIZ'
  if (normalized.includes('mid')) return 'MID_TERM'
  if (normalized.includes('final') || normalized.includes('annual')) return 'FINAL'
  if (normalized.includes('assignment')) return 'ASSIGNMENT'
  if (normalized.includes('practical')) return 'PRACTICAL'
  return 'CUSTOM'
}

function buildExamTypeOptions(types: Set<string>): ExamTypeOption[] {
  const normalized = new Set<string>()

  types.forEach((item) => {
    const key = normalizeExamType(item)
    if (key) normalized.add(key)
  })

  const sorted = Array.from(normalized).sort((a, b) => {
    const aIndex = EXAM_TYPE_ORDER.indexOf(a)
    const bIndex = EXAM_TYPE_ORDER.indexOf(b)

    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b)
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  return sorted.map((item) => ({ value: item, label: toExamTypeLabel(item) }))
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function toHtmlParagraph(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br/>')
}

function toNumber(value: string | number | undefined | null): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDateSafe(value?: string | Date | null): string {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString()
}

function formatMark(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function replaceTemplateTokens(template: string, replacements: Record<string, string>): string {
  let output = template
  for (const [key, value] of Object.entries(replacements)) {
    output = output.split(`{{${key}}}`).join(value)
  }
  return output
}

function createDefaultCell(): EditableSubjectCell {
  return {
    totalMarks: '0',
    obtainedMarks: '0',
    status: '-',
  }
}

function getTemplateDesignDefaults(templateId: string): TemplateDesignModel {
  return TEMPLATE_DESIGN_DEFAULTS[templateId] || TEMPLATE_DESIGN_DEFAULTS['clean-modern']
}

function getTemplateVariableMap(templateId: string): TemplateDesignVariableMap {
  return TEMPLATE_DESIGN_VARIABLES[templateId] || TEMPLATE_DESIGN_VARIABLES['clean-modern']
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeHexColor(value: string, fallback: string): string {
  const raw = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase()

  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase()
  }

  const rgb = raw.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
  if (rgb) {
    const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
    return `#${toHex(Number(rgb[1]))}${toHex(Number(rgb[2]))}${toHex(Number(rgb[3]))}`
  }

  return fallback
}

function readCssVarValue(html: string, varName: string): string | null {
  const match = html.match(new RegExp(`--${escapeRegExp(varName)}\\s*:\\s*([^;]+);`, 'i'))
  return match?.[1]?.trim() || null
}

function writeCssVarValue(html: string, varName: string, value: string): string {
  const declaration = new RegExp(`(--${escapeRegExp(varName)}\\s*:\\s*)([^;]+)(;)`, 'i')
  if (declaration.test(html)) {
    return html.replace(declaration, `$1${value}$3`)
  }

  const rootBlock = /:root\s*\{([\s\S]*?)\}/i
  if (!rootBlock.test(html)) return html

  return html.replace(rootBlock, (_all, body) => {
    const cleanBody = String(body).trimEnd()
    return `:root {\n${cleanBody}\n      --${varName}: ${value};\n    }`
  })
}

function readBodyCssProperty(html: string, property: string): string | null {
  const bodyBlock = html.match(/body\s*\{([\s\S]*?)\}/i)
  if (!bodyBlock) return null

  const prop = bodyBlock[1].match(new RegExp(`${escapeRegExp(property)}\\s*:\\s*([^;]+);`, 'i'))
  return prop?.[1]?.trim() || null
}

function writeBodyCssProperty(html: string, property: string, value: string): string {
  const bodyBlock = /body\s*\{([\s\S]*?)\}/i
  if (!bodyBlock.test(html)) return html

  return html.replace(bodyBlock, (_all, body) => {
    const block = String(body)
    const prop = new RegExp(`(${escapeRegExp(property)}\\s*:\\s*)([^;]+)(;)`, 'i')

    if (prop.test(block)) {
      return `body {${block.replace(prop, `$1${value}$3`)}}`
    }

    const trimmed = block.trimEnd()
    return `body {\n${trimmed}\n      ${property}: ${value};\n    }`
  })
}

function readTemplateDesignFromHtml(templateId: string, html: string): TemplateDesignModel {
  const defaults = getTemplateDesignDefaults(templateId)
  const vars = getTemplateVariableMap(templateId)

  const readColor = (varName: string, fallback: string) => normalizeHexColor(readCssVarValue(html, varName) || '', fallback)

  const pageBg = normalizeHexColor(readBodyCssProperty(html, 'background') || '', defaults.pageBackground)
  const font = readBodyCssProperty(html, 'font-family') || defaults.fontFamily

  return {
    pageBackground: pageBg,
    textColor: readColor(vars.textVar, defaults.textColor),
    borderColor: readColor(vars.borderVar, defaults.borderColor),
    softBackground: readColor(vars.softVar, defaults.softBackground),
    panelBackground: readColor(vars.panelVar, defaults.panelBackground),
    mutedColor: readColor(vars.mutedVar, defaults.mutedColor),
    accentColor: readColor(vars.accentVar, defaults.accentColor),
    fontFamily: font,
  }
}

function applyTemplateDesignToHtml(templateId: string, html: string, design: TemplateDesignModel): string {
  const vars = getTemplateVariableMap(templateId)
  let next = html

  next = writeCssVarValue(next, vars.textVar, design.textColor)
  next = writeCssVarValue(next, vars.borderVar, design.borderColor)
  next = writeCssVarValue(next, vars.softVar, design.softBackground)
  next = writeCssVarValue(next, vars.panelVar, design.panelBackground)
  next = writeCssVarValue(next, vars.mutedVar, design.mutedColor)
  next = writeCssVarValue(next, vars.accentVar, design.accentColor)

  next = writeBodyCssProperty(next, 'background', design.pageBackground)
  next = writeBodyCssProperty(next, 'font-family', design.fontFamily)

  return next
}

function buildTemplatePreviewHtml(templateSource: string, schoolName: string): string {
  const headerCells = '<th colspan="3">Mid Term</th><th colspan="3">Final Term</th>'
  const subHeaderCells = '<th>Total Marks</th><th>Obt Marks</th><th>Status</th><th>Total Marks</th><th>Obt Marks</th><th>Status</th>'
  const subjectRows = `
    <tr>
      <td class="subject-name">English</td>
      <td>100</td><td>84</td><td>Pass</td>
      <td>100</td><td>88</td><td>Pass</td>
    </tr>
    <tr>
      <td class="subject-name">Mathematics</td>
      <td>100</td><td>78</td><td>Pass</td>
      <td>100</td><td>81</td><td>Pass</td>
    </tr>
    <tr>
      <td class="subject-name">Science</td>
      <td>100</td><td>69</td><td>Pass</td>
      <td>100</td><td>74</td><td>Pass</td>
    </tr>
  `
  const totalRowCells = '<td>300</td><td>231</td><td>Pass</td><td>300</td><td>243</td><td>Pass</td>'
  const summaryCards = `
    <article class="term-card">
      <h4>Mid Term</h4>
      <p>Exam Type: Mid Term</p>
      <p>Total Marks: 300</p>
      <p>Obtained: 231</p>
      <p>Percentage: 77.00%</p>
    </article>
    <article class="term-card">
      <h4>Final Term</h4>
      <p>Exam Type: Final</p>
      <p>Total Marks: 300</p>
      <p>Obtained: 243</p>
      <p>Percentage: 81.00%</p>
    </article>
  `
  const customBlocks = `
    <article class="custom-block">
      <h4>Teacher Remarks</h4>
      <p>Consistent progress and active class participation.</p>
    </article>
  `

  return replaceTemplateTokens(templateSource, {
    SCHOOL_NAME: escapeHtml(schoolName || 'School Name'),
    SCHOOL_CONTACT_LINE: 'Main Road Campus | +92 300 0000000 | info@school.edu',
    SCHOOL_ADDRESS: 'Main Road Campus',
    SCHOOL_PHONE: '+92 300 0000000',
    SCHOOL_EMAIL: 'info@school.edu',
    SCHOOL_LOGO_BLOCK: '<div class="logo-fallback">SC</div>',

    ACADEMIC_YEAR: '2025-2026',
    STUDENT_NAME: 'Sample Student',
    ROLL_NUMBER: 'A-102',
    CLASS_NAME: 'Grade 8',
    SECTION_NAME: 'Section A',
    GUARDIAN_NAME: 'Parent Name',
    GUARDIAN_PHONE: '+92 300 1234567',
    GUARDIAN_EMAIL: 'guardian@example.com',
    ENROLLMENT_DATE: '01/03/2024',

    ATTENDANCE_TOTAL: '120',
    ATTENDANCE_PRESENT: '112',
    ATTENDANCE_PERCENT: '93.33',

    TERM_HEADER_CELLS: headerCells,
    TERM_SUBHEADER_CELLS: subHeaderCells,
    SUBJECT_ROWS: subjectRows,
    TOTAL_ROW_CELLS: totalRowCells,
    TERM_SUMMARY_CARDS: summaryCards,
    CUSTOM_SECTIONS_HTML: customBlocks,

    GENERATED_AT: new Date().toLocaleString(),
  })
}

function buildSubjectMatrix(reportData: StudentReportResponse, sections: ExamTypeSection[]): SubjectMatrix {
  const sectionTypeToIndex = new Map<string, number>()
  sections.forEach((section, index) => {
    const key = normalizeExamType(section.examType)
    if (key) sectionTypeToIndex.set(key, index)
  })

  const rowMap = new Map<string, { subject: string; cells: Array<{ totalMarks: number; obtainedMarks: number }> }>()

  for (const result of reportData.examResults) {
    const typeKey = normalizeExamType(result.exam?.type)
    const sectionIndex = sectionTypeToIndex.get(typeKey)
    if (sectionIndex === undefined) continue

    const subjectName = result.subject?.name?.trim() || 'Subject'
    if (!rowMap.has(subjectName)) {
      rowMap.set(subjectName, {
        subject: subjectName,
        cells: sections.map(() => ({ totalMarks: 0, obtainedMarks: 0 })),
      })
    }

    const row = rowMap.get(subjectName)
    if (!row) continue

    const totalMarks = result.exam?.totalMarks || 100
    const obtainedMarks = result.isAbsent ? 0 : result.marksObtained || 0
    row.cells[sectionIndex].totalMarks += totalMarks
    row.cells[sectionIndex].obtainedMarks += obtainedMarks
  }

  // Keep template usable if no exam results are matched yet.
  if (rowMap.size === 0 && reportData.grades.length > 0 && sections.length > 0) {
    for (const grade of reportData.grades) {
      const subjectName = grade.subject?.name?.trim() || 'Subject'
      if (!rowMap.has(subjectName)) {
        rowMap.set(subjectName, {
          subject: subjectName,
          cells: sections.map(() => ({ totalMarks: 0, obtainedMarks: 0 })),
        })
      }

      const row = rowMap.get(subjectName)
      if (!row) continue
      row.cells[0].totalMarks += grade.maxScore || 0
      row.cells[0].obtainedMarks += grade.score || 0
    }
  }

  const rows: SubjectMatrixRow[] = Array.from(rowMap.values())
    .sort((a, b) => a.subject.localeCompare(b.subject))
    .map((row) => ({
      subject: row.subject,
      cells: row.cells.map((cell) => {
        const percentage = cell.totalMarks > 0 ? (cell.obtainedMarks / cell.totalMarks) * 100 : 0
        return {
          totalMarks: Number(cell.totalMarks.toFixed(2)),
          obtainedMarks: Number(cell.obtainedMarks.toFixed(2)),
          percentage: Number(percentage.toFixed(2)),
          status: cell.totalMarks > 0
            ? percentage >= PASS_THRESHOLD_PERCENT
              ? 'Pass'
              : 'Needs Improve'
            : '-',
        }
      }),
    }))

  const totals = sections.map(() => ({ totalMarks: 0, obtainedMarks: 0 }))
  rows.forEach((row) => {
    row.cells.forEach((cell, index) => {
      totals[index].totalMarks += cell.totalMarks
      totals[index].obtainedMarks += cell.obtainedMarks
    })
  })

  return {
    rows,
    totals: totals.map((term) => ({
      totalMarks: Number(term.totalMarks.toFixed(2)),
      obtainedMarks: Number(term.obtainedMarks.toFixed(2)),
    })),
  }
}

export default function StudentReportCardPage() {
  const { user } = useAuth()
  const { selectedYear } = useSession()

  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null)
  const [templateId, setTemplateId] = useState('foldable-classic')
  const [sections, setSections] = useState<ExamTypeSection[]>([
    { id: 'section-mid-term', examType: 'MID_TERM', label: toExamTypeLabel('MID_TERM'), note: '' },
    { id: 'section-final', examType: 'FINAL', label: toExamTypeLabel('FINAL'), note: '' },
  ])
  const [customSections, setCustomSections] = useState<CustomSection[]>([
    { id: 'teacher-remarks', title: 'Class Teacher Remarks', content: '' },
  ])
  const [examTypeOptions, setExamTypeOptions] = useState<ExamTypeOption[]>(DEFAULT_EXAM_TYPE_OPTIONS)

  const [loadingReport, setLoadingReport] = useState(false)
  const [reportData, setReportData] = useState<StudentReportResponse | null>(null)
  const [templateHtmlMap, setTemplateHtmlMap] = useState<Record<string, string>>({})
  const [templateMetaMap, setTemplateMetaMap] = useState<Record<string, TemplateMeta>>({})
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [builderTab, setBuilderTab] = useState<'templates' | 'sections' | 'notes'>('templates')

  const [templateEditorOpen, setTemplateEditorOpen] = useState(false)
  const [templateEditorId, setTemplateEditorId] = useState('')
  const [templateEditorName, setTemplateEditorName] = useState('')
  const [templateEditorDescription, setTemplateEditorDescription] = useState('')
  const [templateEditorHtml, setTemplateEditorHtml] = useState('')
  const [templateEditorDesign, setTemplateEditorDesign] = useState<TemplateDesignModel>(
    getTemplateDesignDefaults('foldable-classic'),
  )
  const [templateEditorAdvancedOpen, setTemplateEditorAdvancedOpen] = useState(false)
  const [templateEditorMobileView, setTemplateEditorMobileView] = useState<'design' | 'preview'>('design')
  const [templateGalleryPreviewOpen, setTemplateGalleryPreviewOpen] = useState(false)
  const [templateGalleryPreviewId, setTemplateGalleryPreviewId] = useState('')

  const [previewOpen, setPreviewOpen] = useState(false)
  const [mobileModalView, setMobileModalView] = useState<'editor' | 'preview'>('preview')
  const [editableCard, setEditableCard] = useState<EditableCardData | null>(null)

  const activeTemplate = useMemo(
    () => TEMPLATE_OPTIONS.find((item) => item.id === templateId) || TEMPLATE_OPTIONS[0],
    [templateId],
  )

  const activeTemplateName = templateMetaMap[templateId]?.templateName || activeTemplate.name
  const activeTemplateDescription = templateMetaMap[templateId]?.description || activeTemplate.description
  const canGenerateSelectedTemplate = Boolean(selectedStudent) && !loadingReport && !loadingTemplates
  const canEditSelectedTemplate = Boolean(templateHtmlMap[templateId]) && !loadingTemplates

  useEffect(() => {
    let cancelled = false

    const loadTemplates = async () => {
      setLoadingTemplates(true)

      const map: Record<string, string> = {}
      const metaMap: Record<string, TemplateMeta> = {}
      let staticFailures = 0

      TEMPLATE_OPTIONS.forEach((template) => {
        metaMap[template.id] = {
          templateName: template.name,
          description: template.description,
          isCustomized: false,
          updatedAt: null,
        }
      })

      await Promise.all(
        TEMPLATE_OPTIONS.map(async (template) => {
          try {
            const response = await fetch(template.templatePath, { cache: 'no-store' })
            if (!response.ok) throw new Error('Template request failed')
            map[template.id] = await response.text()
          } catch {
            staticFailures += 1
          }
        }),
      )

      const overridesRes = await reportsService.getStudentCardTemplates()
      if (overridesRes.success && Array.isArray(overridesRes.data)) {
        (overridesRes.data as StudentCardTemplateApiItem[]).forEach((item) => {
          const key = normalizeTemplateKey(item.templateKey)
          if (!key) return

          if (item.htmlContent) {
            map[key] = item.htmlContent
          }

          metaMap[key] = {
            templateName: item.templateName,
            description: item.description,
            isCustomized: item.isCustomized,
            updatedAt: item.updatedAt,
          }
        })
      } else if (!overridesRes.success) {
        // Overrides are optional. Keep defaults if backend is unavailable/migration is pending.
        console.warn('Template overrides unavailable on initial load. Using defaults.', {
          statusCode: overridesRes.statusCode,
          message: overridesRes.message,
        })
      }

      if (cancelled) return
      setTemplateHtmlMap(map)
      setTemplateMetaMap(metaMap)
      setLoadingTemplates(false)

      if (staticFailures > 0) {
        toast.error(`Unable to load ${staticFailures} report card template file(s)`)
      }
    }

    loadTemplates().catch(() => {
      if (!cancelled) {
        setLoadingTemplates(false)
        toast.error('Unable to initialize report templates')
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (!raw) return

      const parsed = JSON.parse(raw)

      if (parsed?.templateId && TEMPLATE_OPTIONS.some((item) => item.id === parsed.templateId)) {
        setTemplateId(parsed.templateId)
      }

      if (Array.isArray(parsed?.sections) && parsed.sections.length > 0) {
        setSections(
          parsed.sections
            .slice(0, 6)
            .map((item: any, index: number) => ({
              id: item?.id || `section-${index + 1}`,
              examType: normalizeExamType(item?.examType) || 'CUSTOM',
              label: item?.label || toExamTypeLabel(item?.examType || 'CUSTOM'),
              note: item?.note || '',
            })),
        )
      } else if (Array.isArray(parsed?.termSections) && parsed.termSections.length > 0) {
        // Migration path from previous "term" model.
        setSections(
          parsed.termSections
            .slice(0, 6)
            .map((item: any, index: number) => {
              const examType = guessExamTypeFromLegacyLabel(item?.label || '')
              return {
                id: item?.id || `section-${index + 1}`,
                examType,
                label: item?.label || toExamTypeLabel(examType),
                note: item?.note || '',
              }
            }),
        )
      }

      if (Array.isArray(parsed?.customSections)) {
        setCustomSections(
          parsed.customSections.slice(0, 8).map((item: any, index: number) => ({
            id: item?.id || `custom-${index + 1}`,
            title: item?.title || 'Custom Section',
            content: item?.content || '',
          })),
        )
      }
    } catch {
      // Ignore invalid local draft config.
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        templateId,
        sections,
        customSections,
      }),
    )
  }, [templateId, sections, customSections])

  useEffect(() => {
    if (!reportData) return

    let cancelled = false

    const loadExamTypes = async () => {
      const discoveredTypes = new Set<string>()

      reportData.examResults.forEach((result) => {
        const type = normalizeExamType(result.exam?.type)
        if (type) discoveredTypes.add(type)
      })

      if (reportData.class?.id) {
        const res = await examsService.getAll({
          classId: String(reportData.class.id),
          academicYearId: selectedYear?.id,
          pageSize: 200,
        })

        if (res.success && res.data) {
          const rows = Array.isArray(res.data) ? res.data : (res.data.data || [])
          rows.forEach((exam: any) => {
            const sectionId = reportData.section?.id
            if (sectionId && exam?.section?.id && exam.section.id !== sectionId) return

            const type = normalizeExamType(exam?.type)
            if (type) discoveredTypes.add(type)
          })
        }
      }

      if (discoveredTypes.size === 0) {
        discoveredTypes.add('MID_TERM')
        discoveredTypes.add('FINAL')
      }

      const options = buildExamTypeOptions(discoveredTypes)
      const resolvedOptions = options.length > 0 ? options : DEFAULT_EXAM_TYPE_OPTIONS

      if (cancelled) return
      setExamTypeOptions(resolvedOptions)

      setSections((prev) => {
        const allowed = new Set(resolvedOptions.map((item) => item.value))
        const next: ExamTypeSection[] = []
        const seen = new Set<string>()

        prev.forEach((section) => {
          const key = normalizeExamType(section.examType)
          if (!allowed.has(key)) return
          if (seen.has(key)) return
          seen.add(key)

          next.push({
            ...section,
            examType: key,
            label: section.label || toExamTypeLabel(key),
          })
        })

        if (next.length === 0 && resolvedOptions.length > 0) {
          next.push({
            id: `section-${Date.now()}`,
            examType: resolvedOptions[0].value,
            label: resolvedOptions[0].label,
            note: '',
          })
        }

        return next
      })
    }

    loadExamTypes().catch(() => {
      if (!cancelled) {
        toast.error('Unable to load exam types from Exams module')
      }
    })

    return () => {
      cancelled = true
    }
  }, [reportData, selectedYear?.id])

  const selectedTypeSet = useMemo(
    () => new Set(sections.map((section) => normalizeExamType(section.examType))),
    [sections],
  )

  const addableType = useMemo(
    () => examTypeOptions.find((option) => !selectedTypeSet.has(option.value)) || null,
    [examTypeOptions, selectedTypeSet],
  )

  const editableSelectedTypeSet = useMemo(
    () => new Set((editableCard?.sections || []).map((section) => normalizeExamType(section.examType))),
    [editableCard],
  )

  const editableAddableType = useMemo(
    () => examTypeOptions.find((option) => !editableSelectedTypeSet.has(option.value)) || null,
    [examTypeOptions, editableSelectedTypeSet],
  )

  const templatePreviewHtmlMap = useMemo(() => {
    const previews: Record<string, string> = {}
    const schoolName = user?.schoolName || 'School Name'

    TEMPLATE_OPTIONS.forEach((template) => {
      const source = templateHtmlMap[template.id]
      if (!source) return
      previews[template.id] = buildTemplatePreviewHtml(source, schoolName)
    })

    return previews
  }, [templateHtmlMap, user?.schoolName])

  const templateGalleryPreviewTemplate = useMemo(
    () => TEMPLATE_OPTIONS.find((item) => item.id === templateGalleryPreviewId) || null,
    [templateGalleryPreviewId],
  )

  const templateGalleryPreviewMeta = templateGalleryPreviewId ? templateMetaMap[templateGalleryPreviewId] : null
  const templateGalleryPreviewName = templateGalleryPreviewMeta?.templateName || templateGalleryPreviewTemplate?.name || 'Template Preview'
  const templateGalleryPreviewDescription = templateGalleryPreviewMeta?.description
    || templateGalleryPreviewTemplate?.description
    || 'Preview the full template card layout.'
  const templateGalleryPreviewUpdatedAt = templateGalleryPreviewMeta?.updatedAt
    ? new Date(templateGalleryPreviewMeta.updatedAt).toLocaleString()
    : null
  const templateGalleryPreviewHtml = templateGalleryPreviewId ? templatePreviewHtmlMap[templateGalleryPreviewId] || '' : ''

  const templateEditorHtmlWithDesign = useMemo(() => {
    if (!templateEditorHtml || !templateEditorId) return templateEditorHtml
    return applyTemplateDesignToHtml(templateEditorId, templateEditorHtml, templateEditorDesign)
  }, [templateEditorHtml, templateEditorId, templateEditorDesign])

  const templateEditorPreviewHtml = useMemo(() => {
    if (!templateEditorHtmlWithDesign) return ''
    return buildTemplatePreviewHtml(templateEditorHtmlWithDesign, user?.schoolName || 'School Name')
  }, [templateEditorHtmlWithDesign, user?.schoolName])

  const compiledReportHtml = useMemo(() => {
    if (!editableCard) return ''

    const templateSource = templateHtmlMap[templateId]
    if (!templateSource) return ''

    const activeSections = editableCard.sections.length > 0
      ? editableCard.sections
      : [{ id: 'fallback-section', examType: 'FINAL', label: 'Final Term', note: '' }]

    const sectionTotals = activeSections.map(() => ({ totalMarks: 0, obtainedMarks: 0 }))
    editableCard.subjectRows.forEach((row) => {
      row.cells.forEach((cell, index) => {
        if (!sectionTotals[index]) return
        sectionTotals[index].totalMarks += toNumber(cell.totalMarks)
        sectionTotals[index].obtainedMarks += toNumber(cell.obtainedMarks)
      })
    })

    const headerCells = activeSections
      .map((section) => `<th colspan="3">${escapeHtml(section.label)}</th>`)
      .join('')

    const subHeaderCells = activeSections
      .map(() => '<th>Total Marks</th><th>Obt Marks</th><th>Status</th>')
      .join('')

    const totalColumns = 1 + activeSections.length * 3
    const subjectRowsHtml = editableCard.subjectRows.length > 0
      ? editableCard.subjectRows.map((row) => {
        const cellHtml = activeSections
          .map((_, index) => {
            const cell = row.cells[index] || createDefaultCell()
            return `<td>${escapeHtml(formatMark(toNumber(cell.totalMarks)))}</td><td>${escapeHtml(formatMark(toNumber(cell.obtainedMarks)))}</td><td>${escapeHtml(cell.status || '-')}</td>`
          })
          .join('')
        return `<tr><td class="subject-name">${escapeHtml(row.subject || 'Subject')}</td>${cellHtml}</tr>`
      }).join('')
      : `<tr><td class="empty-row" colspan="${totalColumns}">No subject rows configured in editor.</td></tr>`

    const totalRowCells = sectionTotals.map((item) => {
      const percentage = item.totalMarks > 0 ? (item.obtainedMarks / item.totalMarks) * 100 : 0
      const status = item.totalMarks > 0
        ? percentage >= PASS_THRESHOLD_PERCENT
          ? 'Pass'
          : 'Needs Improve'
        : '-'

      return `<td>${escapeHtml(formatMark(item.totalMarks))}</td><td>${escapeHtml(formatMark(item.obtainedMarks))}</td><td>${escapeHtml(status)}</td>`
    }).join('')

    const sectionSummaryCards = activeSections.map((section, index) => {
      const totals = sectionTotals[index] || { totalMarks: 0, obtainedMarks: 0 }
      const percentage = totals.totalMarks > 0 ? (totals.obtainedMarks / totals.totalMarks) * 100 : 0
      const noteHtml = section.note ? `<p class="term-note">${toHtmlParagraph(section.note)}</p>` : ''

      return `
        <article class="term-card">
          <h4>${escapeHtml(section.label)}</h4>
          <p>Exam Type: ${escapeHtml(toExamTypeLabel(section.examType))}</p>
          <p>Total Marks: ${escapeHtml(formatMark(totals.totalMarks))}</p>
          <p>Obtained: ${escapeHtml(formatMark(totals.obtainedMarks))}</p>
          <p>Percentage: ${escapeHtml(formatMark(Number(percentage.toFixed(2))))}%</p>
          ${noteHtml}
        </article>
      `
    }).join('')

    const customSectionsHtml = editableCard.customSections.length > 0
      ? editableCard.customSections.map((section) => `
        <article class="custom-block">
          <h4>${escapeHtml(section.title || 'Custom Section')}</h4>
          <p>${toHtmlParagraph(section.content || 'No content provided.')}</p>
        </article>
      `).join('')
      : '<article class="custom-block"><h4>Remarks</h4><p>No additional remarks provided.</p></article>'

    const logoUrl = editableCard.schoolLogo ? getAssetUrl(editableCard.schoolLogo) : ''
    const logoBlock = logoUrl
      ? `<img src="${escapeHtml(logoUrl)}" alt="School logo" />`
      : `<div class="logo-fallback">${escapeHtml((editableCard.schoolName || 'S').slice(0, 2).toUpperCase())}</div>`

    const schoolContactLine = [editableCard.schoolAddress, editableCard.schoolPhone, editableCard.schoolEmail]
      .filter(Boolean)
      .map((item) => escapeHtml(item))
      .join(' | ')

    return replaceTemplateTokens(templateSource, {
      SCHOOL_NAME: escapeHtml(editableCard.schoolName || 'School Name'),
      SCHOOL_CONTACT_LINE: schoolContactLine || '-',
      SCHOOL_ADDRESS: escapeHtml(editableCard.schoolAddress || '-'),
      SCHOOL_PHONE: escapeHtml(editableCard.schoolPhone || '-'),
      SCHOOL_EMAIL: escapeHtml(editableCard.schoolEmail || '-'),
      SCHOOL_LOGO_BLOCK: logoBlock,

      ACADEMIC_YEAR: escapeHtml(editableCard.academicYear || 'Academic Year'),
      STUDENT_NAME: escapeHtml(editableCard.studentName || '-'),
      ROLL_NUMBER: escapeHtml(editableCard.rollNumber || '-'),
      CLASS_NAME: escapeHtml(editableCard.className || '-'),
      SECTION_NAME: escapeHtml(editableCard.sectionName || '-'),
      GUARDIAN_NAME: escapeHtml(editableCard.guardianName || '-'),
      GUARDIAN_PHONE: escapeHtml(editableCard.guardianPhone || '-'),
      GUARDIAN_EMAIL: escapeHtml(editableCard.guardianEmail || '-'),
      ENROLLMENT_DATE: escapeHtml(editableCard.enrollmentDate || '-'),

      ATTENDANCE_TOTAL: escapeHtml(editableCard.attendanceTotal || '0'),
      ATTENDANCE_PRESENT: escapeHtml(editableCard.attendancePresent || '0'),
      ATTENDANCE_PERCENT: escapeHtml(editableCard.attendancePercent || '0'),

      TERM_HEADER_CELLS: headerCells,
      TERM_SUBHEADER_CELLS: subHeaderCells,
      SUBJECT_ROWS: subjectRowsHtml,
      TOTAL_ROW_CELLS: totalRowCells,
      TERM_SUMMARY_CARDS: sectionSummaryCards,
      CUSTOM_SECTIONS_HTML: customSectionsHtml,

      GENERATED_AT: escapeHtml(editableCard.generatedAt || new Date().toLocaleString()),
    })
  }, [editableCard, templateHtmlMap, templateId])

  const printTemplateOnly = () => {
    if (!compiledReportHtml) {
      toast.error('Generate the report first to print')
      return
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=900')
    if (!printWindow) {
      toast.error('Please allow popups to print report card')
      return
    }

    printWindow.document.open()
    printWindow.document.write(compiledReportHtml)
    printWindow.document.close()

    printWindow.onload = () => {
      printWindow.focus()
      printWindow.print()
      printWindow.onafterprint = () => printWindow.close()
    }
  }

  const addExamTypeSection = () => {
    if (!addableType) {
      toast.error('All available exam types are already used in sections')
      return
    }

    setSections((prev) => [
      ...prev,
      {
        id: `section-${Date.now()}`,
        examType: addableType.value,
        label: addableType.label,
        note: '',
      },
    ])
  }

  const removeExamTypeSection = (id: string) => {
    if (sections.length <= 1) return
    setSections((prev) => prev.filter((section) => section.id !== id))
  }

  const updateExamTypeSection = (id: string, patch: Partial<ExamTypeSection>) => {
    setSections((prev) => prev.map((section) => (section.id === id ? { ...section, ...patch } : section)))
  }

  const updateSectionType = (id: string, nextType: string) => {
    const normalizedType = normalizeExamType(nextType)
    if (!normalizedType) return

    const alreadyUsed = sections.some((section) => section.id !== id && normalizeExamType(section.examType) === normalizedType)
    if (alreadyUsed) {
      toast.error('This exam type is already added as a section')
      return
    }

    setSections((prev) => prev.map((section) => {
      if (section.id !== id) return section
      const previousDefault = toExamTypeLabel(section.examType)
      const nextDefault = toExamTypeLabel(normalizedType)
      const nextLabel = !section.label || section.label === previousDefault ? nextDefault : section.label

      return {
        ...section,
        examType: normalizedType,
        label: nextLabel,
      }
    }))
  }

  const addCustomSection = () => {
    setCustomSections((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        title: 'Custom Section',
        content: '',
      },
    ])
  }

  const updateCustomSection = (id: string, patch: Partial<CustomSection>) => {
    setCustomSections((prev) => prev.map((section) => (section.id === id ? { ...section, ...patch } : section)))
  }

  const removeCustomSection = (id: string) => {
    setCustomSections((prev) => prev.filter((section) => section.id !== id))
  }

  const updateTemplateDesignColor = (
    field: keyof Omit<TemplateDesignModel, 'fontFamily'>,
    value: string,
  ) => {
    setTemplateEditorDesign((prev) => ({
      ...prev,
      [field]: normalizeHexColor(value, prev[field]),
    }))
  }

  const resetTemplateDesignToDefaults = () => {
    if (!templateEditorId) return
    setTemplateEditorDesign(getTemplateDesignDefaults(templateEditorId))
  }

  const reloadDesignFromHtml = () => {
    if (!templateEditorId || !templateEditorHtml) return
    setTemplateEditorDesign(readTemplateDesignFromHtml(templateEditorId, templateEditorHtml))
    toast.success('Design settings reloaded from HTML')
  }

  const openTemplateEditor = (selectedTemplateId: string) => {
    const key = normalizeTemplateKey(selectedTemplateId)
    const base = TEMPLATE_OPTIONS.find((item) => item.id === key)
    if (!base) return

    const source = templateHtmlMap[key]
    if (!source) {
      toast.error('Template source is not loaded yet')
      return
    }

    const meta = templateMetaMap[key]
    setTemplateEditorId(key)
    setTemplateEditorName(meta?.templateName || base.name)
    setTemplateEditorDescription(meta?.description || base.description)
    setTemplateEditorHtml(source)
    setTemplateEditorDesign(readTemplateDesignFromHtml(key, source))
    setTemplateEditorAdvancedOpen(false)
    setTemplateEditorMobileView('design')
    setTemplateEditorOpen(true)
    setTemplateId(key)
  }

  const saveTemplateEdits = async () => {
    if (!templateEditorId) return

    const htmlContent = templateEditorHtmlWithDesign.trim()
    if (!htmlContent) {
      toast.error('Template source is empty')
      return
    }

    setSavingTemplate(true)
    try {
      const res = await reportsService.saveStudentCardTemplate(templateEditorId, {
        htmlContent,
        templateName: templateEditorName.trim() || undefined,
        description: templateEditorDescription.trim() || undefined,
      })

      if (!res.success || !res.data) {
        toast.error(res.message || 'Unable to save template changes')
        return
      }

      const saved = res.data as StudentCardTemplateApiItem

      setTemplateHtmlMap((prev) => ({
        ...prev,
        [templateEditorId]: saved.htmlContent || htmlContent,
      }))

      setTemplateMetaMap((prev) => ({
        ...prev,
        [templateEditorId]: {
          templateName: saved.templateName,
          description: saved.description,
          isCustomized: saved.isCustomized,
          updatedAt: saved.updatedAt,
        },
      }))

      setTemplateId(templateEditorId)
      setTemplateEditorOpen(false)
      toast.success('Template saved successfully')
    } finally {
      setSavingTemplate(false)
    }
  }

  const generateReport = async (forcedTemplateId?: string) => {
    const effectiveTemplateId = forcedTemplateId ? normalizeTemplateKey(forcedTemplateId) : templateId

    if (effectiveTemplateId && effectiveTemplateId !== templateId) {
      setTemplateId(effectiveTemplateId)
    }

    if (!selectedStudent) {
      toast.error('Please select a student first')
      return
    }

    setLoadingReport(true)
    try {
      const res = await reportsService.generateStudentReport(selectedStudent.id)
      if (!res.success || !res.data) {
        toast.error(res.message || 'Unable to load report card data')
        return
      }

      const loadedReport = res.data as StudentReportResponse
      setReportData(loadedReport)

      const effectiveSections = sections.length > 0
        ? sections.map((section) => ({ ...section }))
        : [{ id: `section-${Date.now()}`, examType: 'FINAL', label: 'Final Term', note: '' }]

      const effectiveCustomSections = customSections.length > 0
        ? customSections.map((section) => ({ ...section }))
        : [{ id: `custom-${Date.now()}`, title: 'Remarks', content: '' }]

      const subjectMatrix = buildSubjectMatrix(loadedReport, effectiveSections)
      const subjectRows = (subjectMatrix.rows.length > 0
        ? subjectMatrix.rows
        : [{ subject: 'Subject', cells: effectiveSections.map(() => ({ totalMarks: 0, obtainedMarks: 0, percentage: 0, status: '-' })) }]
      ).map((row, rowIndex) => ({
        id: `row-${Date.now()}-${rowIndex}`,
        subject: row.subject,
        cells: effectiveSections.map((_, cellIndex) => {
          const cell = row.cells[cellIndex]
          return {
            totalMarks: String(cell?.totalMarks ?? 0),
            obtainedMarks: String(cell?.obtainedMarks ?? 0),
            status: cell?.status || '-',
          }
        }),
      }))

      const nextEditable: EditableCardData = {
        schoolName: loadedReport.school?.name || user?.schoolName || 'School Name',
        schoolAddress: loadedReport.school?.address || user?.schoolSettings?.address || '',
        schoolPhone: loadedReport.school?.phone || user?.schoolSettings?.phone || '',
        schoolEmail: loadedReport.school?.email || user?.schoolSettings?.email || '',
        schoolLogo: loadedReport.school?.logo || user?.schoolLogo || null,

        academicYear: selectedYear?.name || 'Academic Year',
        studentName: loadedReport.student.name || `${loadedReport.student.firstName || ''} ${loadedReport.student.lastName || ''}`.trim(),
        rollNumber: loadedReport.student.rollNumber || '-',
        className: loadedReport.class?.name || '-',
        sectionName: loadedReport.section?.name || '-',
        guardianName: loadedReport.student.guardianName || '-',
        guardianPhone: loadedReport.student.guardianPhone || '-',
        guardianEmail: loadedReport.student.guardianEmail || '-',
        enrollmentDate: formatDateSafe(loadedReport.student.enrollmentDate),

        attendanceTotal: String(loadedReport.attendance.total || 0),
        attendancePresent: String(loadedReport.attendance.present || 0),
        attendancePercent: String(loadedReport.attendance.percentage || 0),

        sections: effectiveSections,
        customSections: effectiveCustomSections,
        subjectRows,

        generatedAt: new Date(loadedReport.generatedAt).toLocaleString(),
      }

      setEditableCard(nextEditable)
      setPreviewOpen(true)
      setMobileModalView('preview')

      toast.success('Student report card loaded')
    } finally {
      setLoadingReport(false)
    }
  }

  const onPreviewOpenChange = (open: boolean) => {
    setPreviewOpen(open)
    if (!open && editableCard) {
      setSections(editableCard.sections)
      setCustomSections(editableCard.customSections)
    }
  }

  const openTemplateGalleryPreview = (selectedTemplateId: string) => {
    const key = normalizeTemplateKey(selectedTemplateId)
    const source = templatePreviewHtmlMap[key]
    if (!source) {
      toast.error('Template preview is not available yet')
      return
    }

    setTemplateGalleryPreviewId(key)
    setTemplateGalleryPreviewOpen(true)
  }

  const updateEditableField = (field: keyof EditableCardData, value: string) => {
    setEditableCard((prev) => {
      if (!prev) return prev
      return { ...prev, [field]: value }
    })
  }

  const addEditableSection = () => {
    if (!editableAddableType) {
      toast.error('All available exam types are already added')
      return
    }

    setEditableCard((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        sections: [
          ...prev.sections,
          {
            id: `modal-section-${Date.now()}`,
            examType: editableAddableType.value,
            label: editableAddableType.label,
            note: '',
          },
        ],
        subjectRows: prev.subjectRows.map((row) => ({
          ...row,
          cells: [...row.cells, createDefaultCell()],
        })),
      }
    })
  }

  const removeEditableSection = (id: string) => {
    setEditableCard((prev) => {
      if (!prev || prev.sections.length <= 1) return prev

      const removeIndex = prev.sections.findIndex((section) => section.id === id)
      if (removeIndex < 0) return prev

      return {
        ...prev,
        sections: prev.sections.filter((section) => section.id !== id),
        subjectRows: prev.subjectRows.map((row) => ({
          ...row,
          cells: row.cells.filter((_, index) => index !== removeIndex),
        })),
      }
    })
  }

  const updateEditableSection = (id: string, patch: Partial<ExamTypeSection>) => {
    setEditableCard((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        sections: prev.sections.map((section) => (section.id === id ? { ...section, ...patch } : section)),
      }
    })
  }

  const updateEditableSectionType = (id: string, nextType: string) => {
    const normalizedType = normalizeExamType(nextType)
    if (!normalizedType) return

    setEditableCard((prev) => {
      if (!prev) return prev

      const alreadyUsed = prev.sections.some((section) => section.id !== id && normalizeExamType(section.examType) === normalizedType)
      if (alreadyUsed) {
        toast.error('This exam type is already added as a section')
        return prev
      }

      return {
        ...prev,
        sections: prev.sections.map((section) => {
          if (section.id !== id) return section
          const previousDefault = toExamTypeLabel(section.examType)
          const nextDefault = toExamTypeLabel(normalizedType)
          const nextLabel = !section.label || section.label === previousDefault ? nextDefault : section.label

          return {
            ...section,
            examType: normalizedType,
            label: nextLabel,
          }
        }),
      }
    })
  }

  const addEditableSubjectRow = () => {
    setEditableCard((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        subjectRows: [
          ...prev.subjectRows,
          {
            id: `modal-row-${Date.now()}`,
            subject: 'New Subject',
            cells: prev.sections.map(() => createDefaultCell()),
          },
        ],
      }
    })
  }

  const removeEditableSubjectRow = (rowId: string) => {
    setEditableCard((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        subjectRows: prev.subjectRows.filter((row) => row.id !== rowId),
      }
    })
  }

  const updateEditableSubjectName = (rowId: string, value: string) => {
    setEditableCard((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        subjectRows: prev.subjectRows.map((row) => (row.id === rowId ? { ...row, subject: value } : row)),
      }
    })
  }

  const updateEditableSubjectCell = (
    rowId: string,
    cellIndex: number,
    field: keyof EditableSubjectCell,
    value: string,
  ) => {
    setEditableCard((prev) => {
      if (!prev) return prev

      return {
        ...prev,
        subjectRows: prev.subjectRows.map((row) => {
          if (row.id !== rowId) return row

          return {
            ...row,
            cells: row.cells.map((cell, index) => {
              if (index !== cellIndex) return cell
              return {
                ...cell,
                [field]: value,
              }
            }),
          }
        }),
      }
    })
  }

  const addEditableCustomSection = () => {
    setEditableCard((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        customSections: [
          ...prev.customSections,
          {
            id: `modal-custom-${Date.now()}`,
            title: 'Custom Section',
            content: '',
          },
        ],
      }
    })
  }

  const updateEditableCustomSection = (id: string, patch: Partial<CustomSection>) => {
    setEditableCard((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        customSections: prev.customSections.map((section) => (section.id === id ? { ...section, ...patch } : section)),
      }
    })
  }

  const removeEditableCustomSection = (id: string) => {
    setEditableCard((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        customSections: prev.customSections.filter((section) => section.id !== id),
      }
    })
  }

  const renderEditorPanel = () => {
    if (!editableCard) {
      return (
        <div className="rounded-md border bg-background p-6 text-sm text-muted-foreground">
          Generate report first to edit card details.
        </div>
      )
    }

    return (
      <div className="space-y-4 p-4 sm:p-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">School and Header</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>School Name</Label>
              <Input value={editableCard.schoolName} onChange={(e) => updateEditableField('schoolName', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Academic Year</Label>
              <Input value={editableCard.academicYear} onChange={(e) => updateEditableField('academicYear', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input value={editableCard.schoolAddress} onChange={(e) => updateEditableField('schoolAddress', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={editableCard.schoolPhone} onChange={(e) => updateEditableField('schoolPhone', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={editableCard.schoolEmail} onChange={(e) => updateEditableField('schoolEmail', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Student and Guardian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Student Name</Label>
                <Input value={editableCard.studentName} onChange={(e) => updateEditableField('studentName', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Roll Number</Label>
                <Input value={editableCard.rollNumber} onChange={(e) => updateEditableField('rollNumber', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Class</Label>
                <Input value={editableCard.className} onChange={(e) => updateEditableField('className', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Section</Label>
                <Input value={editableCard.sectionName} onChange={(e) => updateEditableField('sectionName', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Guardian Name</Label>
                <Input value={editableCard.guardianName} onChange={(e) => updateEditableField('guardianName', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Guardian Phone</Label>
                <Input value={editableCard.guardianPhone} onChange={(e) => updateEditableField('guardianPhone', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Guardian Email</Label>
                <Input value={editableCard.guardianEmail} onChange={(e) => updateEditableField('guardianEmail', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Enrollment Date</Label>
                <Input value={editableCard.enrollmentDate} onChange={(e) => updateEditableField('enrollmentDate', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Attendance</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Total Days</Label>
              <Input value={editableCard.attendanceTotal} onChange={(e) => updateEditableField('attendanceTotal', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Present Days</Label>
              <Input value={editableCard.attendancePresent} onChange={(e) => updateEditableField('attendancePresent', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Attendance %</Label>
              <Input value={editableCard.attendancePercent} onChange={(e) => updateEditableField('attendancePercent', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">Report Sections (Exam Type)</CardTitle>
              <Button variant="outline" size="sm" onClick={addEditableSection} disabled={!editableAddableType}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {editableCard.sections.map((section) => (
              <div key={section.id} className="space-y-2 rounded-md border p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px]">
                  <Select value={normalizeExamType(section.examType)} onValueChange={(value) => updateEditableSectionType(section.id, value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Exam type" />
                    </SelectTrigger>
                    <SelectContent>
                      {examTypeOptions.map((option) => {
                        const disabled = editableCard.sections.some((item) => item.id !== section.id && normalizeExamType(item.examType) === option.value)
                        return (
                          <SelectItem key={option.value} value={option.value} disabled={disabled}>
                            {option.label}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>

                  <Input
                    value={section.label}
                    onChange={(e) => updateEditableSection(section.id, { label: e.target.value })}
                    placeholder="Section name"
                  />

                  <Button variant="ghost" size="icon" onClick={() => removeEditableSection(section.id)} disabled={editableCard.sections.length <= 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <Textarea
                  value={section.note}
                  onChange={(e) => updateEditableSection(section.id, { note: e.target.value })}
                  placeholder="Optional section note"
                  rows={2}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">Subject Rows</CardTitle>
              <Button variant="outline" size="sm" onClick={addEditableSubjectRow}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Subject
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {editableCard.subjectRows.map((row) => (
              <div key={row.id} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={row.subject}
                    onChange={(e) => updateEditableSubjectName(row.id, e.target.value)}
                    placeholder="Subject name"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeEditableSubjectRow(row.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {editableCard.sections.map((section, sectionIndex) => {
                    const cell = row.cells[sectionIndex] || createDefaultCell()
                    return (
                      <div key={`${row.id}-${section.id}`} className="rounded-md border bg-muted/20 p-2">
                        <p className="mb-2 text-xs font-medium text-foreground">{section.label}</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <Input
                            type="number"
                            value={cell.totalMarks}
                            onChange={(e) => updateEditableSubjectCell(row.id, sectionIndex, 'totalMarks', e.target.value)}
                            placeholder="Total"
                          />
                          <Input
                            type="number"
                            value={cell.obtainedMarks}
                            onChange={(e) => updateEditableSubjectCell(row.id, sectionIndex, 'obtainedMarks', e.target.value)}
                            placeholder="Obtained"
                          />
                          <Input
                            value={cell.status}
                            onChange={(e) => updateEditableSubjectCell(row.id, sectionIndex, 'status', e.target.value)}
                            placeholder="Status"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">Custom Blocks</CardTitle>
              <Button variant="outline" size="sm" onClick={addEditableCustomSection}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {editableCard.customSections.map((section) => (
              <div key={section.id} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={section.title}
                    onChange={(e) => updateEditableCustomSection(section.id, { title: e.target.value })}
                    placeholder="Section title"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeEditableCustomSection(section.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  value={section.content}
                  onChange={(e) => updateEditableCustomSection(section.id, { content: e.target.value })}
                  placeholder="Section content"
                  rows={3}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderPreviewPanel = () => {
    const activeTemplateHtml = templateHtmlMap[templateId] || ''

    if (!editableCard) {
      return (
        <div className="rounded-md border bg-background p-8 text-center text-muted-foreground">
          Generate report first to preview card.
        </div>
      )
    }

    if (!activeTemplateHtml || !compiledReportHtml) {
      return (
        <div className="rounded-md border bg-background p-8 text-center text-muted-foreground">
          Loading selected template file...
        </div>
      )
    }

    return (
      <div className="mx-auto w-full max-w-[1120px] overflow-hidden rounded-lg border bg-background shadow-sm">
        <iframe
          title="Student report card full preview"
          srcDoc={compiledReportHtml}
          className="h-[calc(100vh-210px)] min-h-[700px] w-full"
        />
      </div>
    )
  }

  const renderTemplateEditorForm = () => (
    <div className="space-y-4 p-4 sm:p-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Template Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Template Name</Label>
            <Input value={templateEditorName} onChange={(event) => setTemplateEditorName(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              value={templateEditorDescription}
              onChange={(event) => setTemplateEditorDescription(event.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">Visual Style Editor</CardTitle>
            <Button variant="outline" size="sm" onClick={resetTemplateDesignToDefaults}>
              Reset Defaults
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Change theme colors and font here. Preview updates instantly and saved template keeps these design choices.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2 rounded-md border p-3">
              <Label className="text-xs">Page Background</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={templateEditorDesign.pageBackground}
                  onChange={(event) => updateTemplateDesignColor('pageBackground', event.target.value)}
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={templateEditorDesign.pageBackground}
                  onChange={(event) => updateTemplateDesignColor('pageBackground', event.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <Label className="text-xs">Panel Background</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={templateEditorDesign.panelBackground}
                  onChange={(event) => updateTemplateDesignColor('panelBackground', event.target.value)}
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={templateEditorDesign.panelBackground}
                  onChange={(event) => updateTemplateDesignColor('panelBackground', event.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <Label className="text-xs">Soft Background</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={templateEditorDesign.softBackground}
                  onChange={(event) => updateTemplateDesignColor('softBackground', event.target.value)}
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={templateEditorDesign.softBackground}
                  onChange={(event) => updateTemplateDesignColor('softBackground', event.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <Label className="text-xs">Main Text</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={templateEditorDesign.textColor}
                  onChange={(event) => updateTemplateDesignColor('textColor', event.target.value)}
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={templateEditorDesign.textColor}
                  onChange={(event) => updateTemplateDesignColor('textColor', event.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <Label className="text-xs">Border / Grid Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={templateEditorDesign.borderColor}
                  onChange={(event) => updateTemplateDesignColor('borderColor', event.target.value)}
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={templateEditorDesign.borderColor}
                  onChange={(event) => updateTemplateDesignColor('borderColor', event.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <Label className="text-xs">Muted Text</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={templateEditorDesign.mutedColor}
                  onChange={(event) => updateTemplateDesignColor('mutedColor', event.target.value)}
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={templateEditorDesign.mutedColor}
                  onChange={(event) => updateTemplateDesignColor('mutedColor', event.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-2 rounded-md border p-3 sm:col-span-2">
              <Label className="text-xs">Accent</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={templateEditorDesign.accentColor}
                  onChange={(event) => updateTemplateDesignColor('accentColor', event.target.value)}
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={templateEditorDesign.accentColor}
                  onChange={(event) => updateTemplateDesignColor('accentColor', event.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Font Family</Label>
            <Select
              value={templateEditorDesign.fontFamily}
              onValueChange={(value) => setTemplateEditorDesign((prev) => ({ ...prev, fontFamily: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select font family" />
              </SelectTrigger>
              <SelectContent>
                {Array.from(new Set([...FONT_FAMILY_OPTIONS, templateEditorDesign.fontFamily])).map((font) => (
                  <SelectItem key={font} value={font}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">Advanced HTML (Optional)</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={reloadDesignFromHtml} disabled={!templateEditorHtml.trim()}>
                Read Style from HTML
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTemplateEditorAdvancedOpen((prev) => !prev)}
              >
                {templateEditorAdvancedOpen ? 'Hide Code' : 'Show Code'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {templateEditorAdvancedOpen && (
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Keep tokens like {'{{STUDENT_NAME}}'}, {'{{TERM_HEADER_CELLS}}'}, and {'{{SUBJECT_ROWS}}'} unchanged where needed.
            </p>
            <Textarea
              value={templateEditorHtml}
              onChange={(event) => setTemplateEditorHtml(event.target.value)}
              rows={24}
              className="font-mono text-xs"
            />
          </CardContent>
        )}
      </Card>
    </div>
  )

  const renderTemplateEditorPreview = () => (
    <div className="mx-auto w-full max-w-[1120px] overflow-hidden rounded-lg border bg-background shadow-sm">
      {templateEditorPreviewHtml ? (
        <iframe
          title="Template live preview"
          srcDoc={templateEditorPreviewHtml}
          className="h-[calc(100vh-230px)] min-h-[700px] w-full"
        />
      ) : (
        <div className="flex h-[calc(100vh-230px)] min-h-[700px] items-center justify-center p-8 text-sm text-muted-foreground">
          Template preview will appear here.
        </div>
      )}
    </div>
  )

  return (
    <ProtectedRoute permission="reports:read">
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Student Report Card</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Build report cards in three simple steps with template preview, section setup, and one-click generation.
              </p>
            </div>
            <Badge variant="outline">{selectedYear?.name || 'Academic Year'}</Badge>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-background p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Step 1</p>
              <p className="mt-1 text-sm font-semibold text-foreground">Select Student</p>
              <p className="mt-1 text-xs text-muted-foreground">Pick the student to load attendance and exam records.</p>
            </div>
            <div className="rounded-xl border bg-background p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Step 2</p>
              <p className="mt-1 text-sm font-semibold text-foreground">Choose Template</p>
              <p className="mt-1 text-xs text-muted-foreground">Preview and edit templates before generating the card.</p>
            </div>
            <div className="rounded-xl border bg-background p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Step 3</p>
              <p className="mt-1 text-sm font-semibold text-foreground">Generate and Review</p>
              <p className="mt-1 text-xs text-muted-foreground">Open full preview modal, fine-tune content, then print.</p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-xl border bg-background p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-foreground">Report Builder Workspace</h2>
                <p className="text-xs text-muted-foreground">Use tabs to configure templates, exam sections, and custom notes.</p>
              </div>
              <Badge variant="outline">{activeTemplateName}</Badge>
            </div>

            <Tabs
              value={builderTab}
              onValueChange={(value) => setBuilderTab(value as 'templates' | 'sections' | 'notes')}
              className="mt-4"
            >
              <TabsList className="w-full justify-start">
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="sections">Exam Sections</TabsTrigger>
                <TabsTrigger value="notes">Custom Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="templates" className="space-y-3">
                <p className="text-xs text-muted-foreground">Template gallery with quick actions for using, editing, and generating.</p>

                <div className="space-y-3">
                  {TEMPLATE_OPTIONS.map((template) => {
                    const meta = templateMetaMap[template.id]
                    const templateName = meta?.templateName || template.name
                    const templateDescription = meta?.description || template.description
                    const isSelected = templateId === template.id
                    const previewHtml = templatePreviewHtmlMap[template.id]
                    const updatedAt = meta?.updatedAt ? new Date(meta.updatedAt).toLocaleString() : null

                    return (
                      <article
                        key={template.id}
                        className={`rounded-xl border ${isSelected ? 'border-primary bg-primary/10' : 'bg-card'}`}
                      >
                        <div className="grid gap-3 p-3 sm:grid-cols-[170px_minmax(0,1fr)]">
                          <button
                            type="button"
                            className="h-44 overflow-hidden rounded-lg border bg-background text-left"
                            onClick={() => openTemplateGalleryPreview(template.id)}
                          >
                            {previewHtml ? (
                              <iframe
                                title={`${templateName} preview`}
                                srcDoc={previewHtml}
                                className="h-full w-full origin-top-left scale-[0.34]"
                                style={{ width: '295%', height: '295%' }}
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                {loadingTemplates ? 'Loading preview...' : 'Template preview unavailable'}
                              </div>
                            )}
                          </button>

                          <div className="space-y-2">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-foreground">{templateName}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{templateDescription}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {meta?.isCustomized ? <Badge>Customized</Badge> : <Badge variant="outline">Default</Badge>}
                                {isSelected ? <Badge variant="outline">Selected</Badge> : null}
                              </div>
                            </div>

                            {updatedAt && <p className="text-[11px] text-muted-foreground">Saved: {updatedAt}</p>}

                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openTemplateGalleryPreview(template.id)}
                                disabled={!previewHtml}
                              >
                                <Eye className="mr-2 h-4 w-4" /> Preview
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant={isSelected ? 'default' : 'outline'}
                                onClick={() => setTemplateId(template.id)}
                              >
                                Use Template
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openTemplateEditor(template.id)}
                                disabled={!templateHtmlMap[template.id] || loadingTemplates}
                              >
                                <PencilLine className="mr-2 h-4 w-4" /> Edit
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                onClick={() => generateReport(template.id)}
                                disabled={!selectedStudent || loadingReport || loadingTemplates}
                              >
                                {loadingReport && templateId === template.id
                                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  : <FileText className="mr-2 h-4 w-4" />}
                                Generate
                              </Button>
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>

                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  {activeTemplateDescription}
                </div>
              </TabsContent>

              <TabsContent value="sections" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Exam-Type Sections</h3>
                    <p className="text-xs text-muted-foreground">Each section maps to one exam type to avoid duplicate columns.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addExamTypeSection} disabled={!addableType}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Section
                  </Button>
                </div>

                <ol className="space-y-3">
                  {sections.map((section, index) => (
                    <li key={section.id} className="rounded-xl border bg-background p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Section {index + 1}</p>
                        <Button variant="ghost" size="icon" onClick={() => removeExamTypeSection(section.id)} disabled={sections.length <= 1}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <Select value={normalizeExamType(section.examType)} onValueChange={(value) => updateSectionType(section.id, value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Exam type" />
                          </SelectTrigger>
                          <SelectContent>
                            {examTypeOptions.map((option) => {
                              const disabled = sections.some((item) => item.id !== section.id && normalizeExamType(item.examType) === option.value)
                              return (
                                <SelectItem key={option.value} value={option.value} disabled={disabled}>
                                  {option.label}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>

                        <Input
                          value={section.label}
                          onChange={(event) => updateExamTypeSection(section.id, { label: event.target.value })}
                          placeholder="Section heading"
                        />
                      </div>

                      <Textarea
                        value={section.note}
                        onChange={(event) => updateExamTypeSection(section.id, { note: event.target.value })}
                        placeholder="Optional section note"
                        rows={2}
                        className="mt-2"
                      />
                    </li>
                  ))}
                </ol>
              </TabsContent>

              <TabsContent value="notes" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Custom Text Sections</h3>
                    <p className="text-xs text-muted-foreground">Add narrative remarks that appear in generated report cards.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addCustomSection}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Note
                  </Button>
                </div>

                <div className="space-y-3">
                  {customSections.map((section) => (
                    <div key={section.id} className="rounded-xl border bg-background p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Input
                          value={section.title}
                          onChange={(event) => updateCustomSection(section.id, { title: event.target.value })}
                          placeholder="Section title"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeCustomSection(section.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <Textarea
                        value={section.content}
                        onChange={(event) => updateCustomSection(section.id, { content: event.target.value })}
                        placeholder="Section text"
                        rows={3}
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <aside className="h-fit rounded-xl border bg-card p-4 sm:p-5 xl:sticky xl:top-20">
            <h2 className="text-base font-semibold text-foreground">Quick Actions</h2>
            <p className="mt-1 text-xs text-muted-foreground">Search student, review selected template, and run generation from one place.</p>

            <div className="mt-4 space-y-2">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Student Search</Label>
              <StudentSearch
                onSelect={(student) => setSelectedStudent(student as StudentOption | null)}
                placeholder="Search student by name or roll number"
              />

              {selectedStudent ? (
                <div className="rounded-lg border bg-background p-3 text-xs text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">Student:</span> {selectedStudent.firstName} {selectedStudent.lastName}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold text-foreground">Roll No:</span> {selectedStudent.rollNumber}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                  Select a student to enable generation actions.
                </div>
              )}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2 rounded-lg border bg-background p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Selected Template</p>
              <p className="text-sm font-semibold text-foreground">{activeTemplateName}</p>
              <p className="text-xs text-muted-foreground">{activeTemplateDescription}</p>
            </div>

            <div className="mt-3 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => openTemplateEditor(templateId)}
                disabled={!canEditSelectedTemplate}
              >
                <PencilLine className="mr-2 h-4 w-4" /> Edit Selected Template
              </Button>

              <Button
                className="w-full justify-start"
                onClick={() => generateReport(templateId)}
                disabled={!canGenerateSelectedTemplate}
              >
                {loadingReport
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <FileText className="mr-2 h-4 w-4" />}
                Generate Selected Template
              </Button>

              <Button variant="outline" className="w-full justify-start" onClick={() => setPreviewOpen(true)} disabled={!editableCard}>
                <Eye className="mr-2 h-4 w-4" /> Open Last Generated Full Preview
              </Button>
            </div>

            <p className="mt-3 text-[11px] text-muted-foreground">
              Tip: use template tab for per-template actions and this panel for fastest end-to-end flow.
            </p>
          </aside>
        </div>

        <Dialog
          open={templateGalleryPreviewOpen}
          onOpenChange={(open) => {
            setTemplateGalleryPreviewOpen(open)
            if (!open) {
              setTemplateGalleryPreviewId('')
            }
          }}
        >
          <DialogContent className="left-0 top-0 h-screen w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 sm:rounded-none">
            <div className="flex h-full min-h-0 flex-col">
              <DialogHeader className="border-b px-4 py-4 pr-12 sm:px-6">
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Template Full Preview
                </DialogTitle>
                <DialogDescription>
                  {templateGalleryPreviewName} - {templateGalleryPreviewDescription}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{templateGalleryPreviewId || '-'}</Badge>
                  {templateGalleryPreviewUpdatedAt ? <span>Saved: {templateGalleryPreviewUpdatedAt}</span> : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!templateGalleryPreviewId) return
                      setTemplateId(templateGalleryPreviewId)
                      setTemplateGalleryPreviewOpen(false)
                    }}
                  >
                    Use Template
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!templateGalleryPreviewId) return
                      setTemplateGalleryPreviewOpen(false)
                      openTemplateEditor(templateGalleryPreviewId)
                    }}
                    disabled={!templateGalleryPreviewId || !templateHtmlMap[templateGalleryPreviewId] || loadingTemplates}
                  >
                    <PencilLine className="mr-2 h-4 w-4" /> Edit
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (!templateGalleryPreviewId) return
                      setTemplateGalleryPreviewOpen(false)
                      generateReport(templateGalleryPreviewId)
                    }}
                    disabled={!selectedStudent || loadingReport || loadingTemplates}
                  >
                    {loadingReport
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : <FileText className="mr-2 h-4 w-4" />}
                    Generate
                  </Button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto bg-muted/20 p-4 sm:p-6">
                <div className="mx-auto w-full max-w-[1200px] overflow-hidden rounded-xl border bg-background shadow-sm">
                  {templateGalleryPreviewHtml ? (
                    <iframe
                      title="Template full card preview"
                      srcDoc={templateGalleryPreviewHtml}
                      className="h-[calc(100vh-220px)] min-h-[720px] w-full"
                    />
                  ) : (
                    <div className="flex h-[calc(100vh-220px)] min-h-[720px] items-center justify-center p-8 text-sm text-muted-foreground">
                      Template preview is not available yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={templateEditorOpen}
          onOpenChange={(open) => {
            setTemplateEditorOpen(open)
            if (!open) {
              setTemplateEditorMobileView('design')
              setTemplateEditorAdvancedOpen(false)
            }
          }}
        >
          <DialogContent className="left-0 top-0 h-screen w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 sm:rounded-none">
            <div className="flex h-full min-h-0 flex-col">
              <DialogHeader className="border-b px-4 py-4 pr-12 sm:px-6">
                <DialogTitle className="flex items-center gap-2">
                  <PencilLine className="h-4 w-4" /> Edit Template
                </DialogTitle>
                <DialogDescription>
                  Adjust design with simple controls. Advanced HTML editing is optional.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Template Key:</span>
                  <Badge variant="outline">{templateEditorId || '-'}</Badge>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 lg:hidden">
                    <Button
                      variant={templateEditorMobileView === 'design' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTemplateEditorMobileView('design')}
                    >
                      Design
                    </Button>
                    <Button
                      variant={templateEditorMobileView === 'preview' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTemplateEditorMobileView('preview')}
                    >
                      Preview
                    </Button>
                  </div>

                  <Button
                    onClick={saveTemplateEdits}
                    disabled={savingTemplate || !templateEditorHtmlWithDesign.trim()}
                  >
                    {savingTemplate
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : <Save className="mr-2 h-4 w-4" />}
                    Save Template
                  </Button>
                </div>
              </div>

              <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-[430px_minmax(0,1fr)]">
                <div className="min-h-0 overflow-y-auto border-r bg-muted/10">{renderTemplateEditorForm()}</div>
                <div className="min-h-0 overflow-auto bg-muted/20 p-4">{renderTemplateEditorPreview()}</div>
              </div>

              <div className="min-h-0 flex-1 lg:hidden">
                {templateEditorMobileView === 'design'
                  ? <div className="h-full overflow-y-auto bg-muted/10">{renderTemplateEditorForm()}</div>
                  : <div className="h-full overflow-auto bg-muted/20 p-3">{renderTemplateEditorPreview()}</div>}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={previewOpen} onOpenChange={onPreviewOpenChange}>
          <DialogContent className="left-0 top-0 h-screen w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 sm:rounded-none">
            <div className="flex h-full min-h-0 flex-col">
              <DialogHeader className="border-b px-4 py-4 pr-12 sm:px-6">
                <DialogTitle className="flex items-center gap-2">
                  <PencilLine className="h-4 w-4" /> Report Card Full View and Editor
                </DialogTitle>
                <DialogDescription>
                  Edit all card content here, preview updates live, and print from this modal.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Template:</span>
                  <Badge variant="outline">{activeTemplateName}</Badge>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 lg:hidden">
                    <Button
                      variant={mobileModalView === 'editor' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMobileModalView('editor')}
                    >
                      Edit
                    </Button>
                    <Button
                      variant={mobileModalView === 'preview' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMobileModalView('preview')}
                    >
                      Preview
                    </Button>
                  </div>

                  <Button variant="outline" onClick={printTemplateOnly} disabled={!compiledReportHtml}>
                    <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
                  </Button>
                </div>
              </div>

              <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-[430px_minmax(0,1fr)]">
                <div className="min-h-0 overflow-y-auto border-r bg-muted/10">{renderEditorPanel()}</div>
                <div className="min-h-0 overflow-auto bg-muted/20 p-4">{renderPreviewPanel()}</div>
              </div>

              <div className="min-h-0 flex-1 lg:hidden">
                {mobileModalView === 'editor'
                  ? <div className="h-full overflow-y-auto bg-muted/10">{renderEditorPanel()}</div>
                  : <div className="h-full overflow-auto bg-muted/20 p-3">{renderPreviewPanel()}</div>}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
