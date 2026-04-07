# Exam Paper Builder – Integration Guide

## Library: TipTap (Recommended)
TipTap is a headless, framework-agnostic rich-text editor built on ProseMirror.
It's the best choice because: React-first, extensible, supports tables/images/fonts,
active maintenance, and widely used in production SaaS apps.

---

## 1. Install Packages

```bash
# Core TipTap
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit

# Official extensions
npm install @tiptap/extension-image \
  @tiptap/extension-text-align \
  @tiptap/extension-font-family \
  @tiptap/extension-color \
  @tiptap/extension-text-style \
  @tiptap/extension-underline \
  @tiptap/extension-table \
  @tiptap/extension-placeholder

# Peer deps (if not already installed)
npm install lucide-react
```

---

## 2. File Structure

```
src/
├── app/dashboard/exams/[examId]/
│   └── page.tsx                     ← add "Exam Paper" tab here
├── components/exams/
│   ├── ExamPaperTab.tsx             ← main component (provided)
│   └── extensions/
│       └── FontSize.ts              ← custom TipTap extension (provided)
└── styles/
    └── exam-editor.css              ← editor styles (see below)
```

---

## 3. Add the Tab to Existing Exam Detail Page

In your exam detail page (`/dashboard/exams/[examId]/page.tsx`), add the tab:

```tsx
// In your existing tabs definition array:
const tabs = [
  { id: "overview",   label: "Overview" },
  { id: "teachers",   label: "Teachers" },
  { id: "students",   label: "Students & Results" },
  { id: "analytics",  label: "Analytics" },
  { id: "paper",      label: "Exam Paper" },   // ← ADD THIS
];

// In your tab content rendering:
{activeTab === "paper" && (
  <ExamPaperTab
    examData={{
      id: exam.id,
      name: exam.name,
      subject: exam.subject,
      class: `${exam.class} - ${exam.section}`,
    }}
  />
)}
```

---

## 4. Editor CSS (exam-editor.css)

Add to your global CSS or import in ExamPaperTab:

```css
/* Import in globals.css */
.exam-editor-content {
  font-family: 'Times New Roman', Times, serif;
  font-size: 12pt;
  line-height: 1.8;
}

.exam-editor-content p { margin-bottom: 0.5em; }
.exam-editor-content h1 { font-size: 1.5em; font-weight: bold; }
.exam-editor-content h2 { font-size: 1.25em; font-weight: bold; }
.exam-editor-content ul { list-style: disc; padding-left: 1.5em; }
.exam-editor-content ol { list-style: decimal; padding-left: 1.5em; }

/* Table styles */
.exam-editor-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5em 0;
}
.exam-editor-content td,
.exam-editor-content th {
  border: 1px solid #aaa;
  padding: 6px 10px;
}
.exam-editor-content th {
  background-color: #f3f4f6;
  font-weight: 600;
}

/* TipTap placeholder */
.exam-editor-content p.is-editor-empty:first-child::before {
  color: #aaa;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
```

---

## 5. Supabase Storage Setup

In Supabase Dashboard → Storage:

1. Create bucket: `exam-assets`
2. Make it **Public**
3. Add policies:
   - INSERT: `auth.role() = 'authenticated'`
   - SELECT: `true` (public read)

---

## 6. Supabase Database Migration

Run the SQL in `supabase-migration.sql` in:
Supabase Dashboard → SQL Editor → New Query

---

## 7. NestJS Integration

1. Copy `exam-papers.nestjs.ts` code into `src/exam-papers/`
2. Add `ExamPapersModule` to `AppModule` imports
3. The frontend calls your NestJS API OR directly uses Supabase client
   (the component uses Supabase directly for simplicity – choose one approach)

**API Endpoints created:**
```
GET    /exam-papers/:examId        → fetch existing paper
POST   /exam-papers                → create or update paper
DELETE /exam-papers/:examId        → delete paper
GET    /exam-papers/:examId/print  → server-rendered HTML
```

---

## 8. Print / PDF Export Options

### Option A: Browser Print (built-in, already implemented)
- Opens a new window with formatted HTML
- User does Ctrl+P → Save as PDF
- Zero dependencies

### Option B: Server-side PDF (production-grade)
Install Puppeteer in NestJS:
```bash
npm install puppeteer
```

```typescript
// In ExamPapersService
async generatePDF(examId: string): Promise<Buffer> {
  const paper = await this.getByExamId(examId);
  const html = this.generatePrintHTML(paper);
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();
  return pdf;
}
```

Then add endpoint:
```typescript
@Get(':examId/pdf')
async downloadPDF(@Param('examId') examId: string, @Res() res: Response) {
  const pdf = await this.examPapersService.generatePDF(examId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="exam-paper.pdf"');
  res.send(pdf);
}
```

---

## Key TipTap Docs References
- Getting started: https://tiptap.dev/docs/editor/getting-started/install/nextjs
- Extensions: https://tiptap.dev/docs/editor/extensions/overview
- Image upload: https://tiptap.dev/docs/editor/extensions/nodes/image
- Custom extension: https://tiptap.dev/docs/editor/extensions/custom-extensions
