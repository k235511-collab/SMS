"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import FontFamily from "@tiptap/extension-font-family";
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import { FontSize } from "./extensions/FontSize"; // custom extension (see below)
import { ExamSection } from "./extensions/ExamSection"; // custom extension
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import {
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, Image as ImageIcon, Table as TableIcon,
  Printer, Save, Plus, Trash2, ChevronDown, Type, Palette,
  List, ListOrdered, Minus, RotateCcw, RotateCw, CheckSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExamPaperSection {
  id: string;
  title: string;
  type: "objective" | "subjective" | "fill-in-blanks" | "true-false" | "custom";
  totalMarks: number;
  instructions: string;
  content: string; // TipTap JSON stringified
}

interface ExamPaper {
  id?: string;
  examId: string;
  schoolName: string;
  paperTitle: string;
  subject: string;
  classGrade: string;
  date: string;
  totalMarks: number;
  duration: string;
  sections: ExamPaperSection[];
  headerContent: string; // TipTap JSON
  footerContent: string; // TipTap JSON
}

// ─── Font Options ─────────────────────────────────────────────────────────────

const FONTS = [
  { label: "Default", value: "inherit" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
  { label: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Noto Nastaliq Urdu", value: "'Noto Nastaliq Urdu', serif" }, // For Urdu support
];

const FONT_SIZES = ["8", "10", "11", "12", "14", "16", "18", "20", "24", "28", "32", "36", "48", "60", "72"];

const SECTION_TYPES = [
  { value: "objective", label: "Objective (MCQs)", color: "bg-blue-100 text-blue-800" },
  { value: "subjective", label: "Subjective", color: "bg-green-100 text-green-800" },
  { value: "fill-in-blanks", label: "Fill in the Blanks", color: "bg-yellow-100 text-yellow-800" },
  { value: "true-false", label: "True / False", color: "bg-purple-100 text-purple-800" },
  { value: "custom", label: "Custom", color: "bg-gray-100 text-gray-800" },
];

// ─── Toolbar Button ────────────────────────────────────────────────────────────

function ToolbarBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "h-8 w-8 flex items-center justify-center rounded text-sm transition-colors",
        active ? "bg-green-100 text-green-700" : "hover:bg-gray-100 text-gray-600",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

// ─── Section Editor ────────────────────────────────────────────────────────────

function SectionEditor({
  section,
  index,
  onChange,
  onDelete,
}: {
  section: ExamPaperSection;
  index: number;
  onChange: (updated: ExamPaperSection) => void;
  onDelete: () => void;
}) {
  const sectionType = SECTION_TYPES.find((t) => t.value === section.type);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ resizable: true, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: "Write questions here…" }),
    ],
    content: section.content ? JSON.parse(section.content) : undefined,
    onUpdate: ({ editor }) => {
      onChange({ ...section, content: JSON.stringify(editor.getJSON()) });
    },
    editorProps: {
      attributes: { class: "exam-editor-content min-h-[180px] outline-none prose max-w-none" },
    },
  });

  // ── Image upload ────────────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const uploadImage = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop();
    const path = `exam-papers/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from("exam-assets").upload(path, file, { upsert: true });
    if (error) { toast.error("Image upload failed"); return; }
    const { data: urlData } = supabase.storage.from("exam-assets").getPublicUrl(data.path);
    editor?.chain().focus().setImage({ src: urlData.publicUrl }).run();
  }, [editor, supabase]);

  if (!editor) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm mb-4">
      {/* Section Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 flex-1">
          <span className="font-semibold text-gray-700 text-sm">Section {index + 1}</span>
          <Badge className={cn("text-xs font-medium", sectionType?.color)}>{sectionType?.label}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-gray-500">Type</Label>
          <select
            value={section.type}
            onChange={(e) => onChange({ ...section, type: e.target.value as ExamPaperSection["type"] })}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
          >
            {SECTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <Label className="text-xs text-gray-500 ml-2">Marks</Label>
          <Input
            type="number"
            value={section.totalMarks}
            onChange={(e) => onChange({ ...section, totalMarks: Number(e.target.value) })}
            className="w-16 h-7 text-xs text-center"
            min={0}
          />

          <button
            onClick={onDelete}
            className="ml-2 p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete section"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Section Title + Instructions */}
      <div className="px-4 pt-3 grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">Section Title</Label>
          <Input
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            placeholder="e.g. Section A – Multiple Choice"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">Instructions (optional)</Label>
          <Input
            value={section.instructions}
            onChange={(e) => onChange({ ...section, instructions: e.target.value })}
            placeholder="e.g. Circle the correct answer."
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Mini Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 flex-wrap">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <Bold size={13} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <Italic size={13} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
          <UnderlineIcon size={13} />
        </ToolbarBtn>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Font Family */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 h-8 text-xs rounded hover:bg-gray-100 text-gray-600 border border-gray-200">
              <Type size={12} /> Font <ChevronDown size={10} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {FONTS.map((f) => (
              <DropdownMenuItem
                key={f.value}
                style={{ fontFamily: f.value }}
                onClick={() => editor.chain().focus().setFontFamily(f.value).run()}
              >
                {f.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Font Size */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-2 h-8 text-xs rounded hover:bg-gray-100 text-gray-600 border border-gray-200">
              {editor.getAttributes("textStyle").fontSize?.replace("px", "") || "14"} <ChevronDown size={10} />
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

        {/* Color */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100" title="Text color">
              <Palette size={13} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-2">
            <input type="color" className="w-full h-8 cursor-pointer rounded"
              onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left">
          <AlignLeft size={13} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Center">
          <AlignCenter size={13} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right">
          <AlignRight size={13} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Justify">
          <AlignJustify size={13} />
        </ToolbarBtn>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
          <List size={13} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">
          <ListOrdered size={13} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
          <Minus size={13} />
        </ToolbarBtn>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Image Upload */}
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
        <ToolbarBtn onClick={() => fileRef.current?.click()} title="Insert image">
          <ImageIcon size={13} />
        </ToolbarBtn>

        {/* Table */}
        <ToolbarBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table">
          <TableIcon size={13} />
        </ToolbarBtn>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
          <RotateCcw size={13} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
          <RotateCw size={13} />
        </ToolbarBtn>
      </div>

      {/* Editor Area */}
      <div className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// ─── Main Tab Component ────────────────────────────────────────────────────────

export default function ExamPaperTab({ examData }: { examData: { id: string; name: string; subject: string; class: string } }) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [paper, setPaper] = useState<ExamPaper>({
    examId: examData.id,
    schoolName: "The Citizen Foundation",
    paperTitle: examData.name,
    subject: examData.subject,
    classGrade: examData.class,
    date: new Date().toLocaleDateString("en-PK"),
    totalMarks: 100,
    duration: "2 hours",
    sections: [],
    headerContent: "",
    footerContent: "",
  });

  // Load existing paper from Supabase
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("exam_papers")
        .select("*")
        .eq("exam_id", examData.id)
        .single();
      if (data) {
        setPaper({ ...data, sections: data.sections ?? [] });
      }
    })();
  }, [examData.id]);

  const addSection = () => {
    const newSection: ExamPaperSection = {
      id: crypto.randomUUID(),
      title: `Section ${String.fromCharCode(65 + paper.sections.length)}`,
      type: "subjective",
      totalMarks: 20,
      instructions: "",
      content: "",
    };
    setPaper((p) => ({ ...p, sections: [...p.sections, newSection] }));
  };

  const updateSection = (id: string, updated: ExamPaperSection) => {
    setPaper((p) => ({ ...p, sections: p.sections.map((s) => (s.id === id ? updated : s)) }));
  };

  const deleteSection = (id: string) => {
    setPaper((p) => ({ ...p, sections: p.sections.filter((s) => s.id !== id) }));
  };

  const totalSectionMarks = paper.sections.reduce((a, s) => a + s.totalMarks, 0);

  // ── Save to Supabase ────────────────────────────────────────────────────────
  const savePaper = async () => {
    setSaving(true);
    try {
      const payload = {
        exam_id: paper.examId,
        school_name: paper.schoolName,
        paper_title: paper.paperTitle,
        subject: paper.subject,
        class_grade: paper.classGrade,
        date: paper.date,
        total_marks: paper.totalMarks,
        duration: paper.duration,
        sections: paper.sections,
        header_content: paper.headerContent,
        footer_content: paper.footerContent,
        updated_at: new Date().toISOString(),
      };

      if (paper.id) {
        await supabase.from("exam_papers").update(payload).eq("id", paper.id);
      } else {
        const { data } = await supabase.from("exam_papers").insert(payload).select().single();
        if (data) setPaper((p) => ({ ...p, id: data.id }));
      }
      toast.success("Exam paper saved successfully");
    } catch {
      toast.error("Failed to save exam paper");
    } finally {
      setSaving(false);
    }
  };

  // ── Print ────────────────────────────────────────────────────────────────────
  const printPaper = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const sectionsHTML = paper.sections
      .map((sec, i) => {
        const content = sec.content
          ? (() => {
              // Convert TipTap JSON → plain HTML via a temporary div
              const tempDiv = document.createElement("div");
              // In production use generateHTML from @tiptap/html
              tempDiv.innerHTML = sec.content;
              return tempDiv.innerHTML;
            })()
          : "";

        return `
          <div class="section">
            <div class="section-header">
              <span class="section-label">Section ${String.fromCharCode(65 + i)}: ${sec.title}</span>
              <span class="section-marks">[${sec.totalMarks} Marks]</span>
            </div>
            ${sec.instructions ? `<p class="instructions"><em>${sec.instructions}</em></p>` : ""}
            <div class="section-content">${content}</div>
          </div>`;
      })
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${paper.paperTitle}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; background: #fff; }
          .page { width: 210mm; min-height: 297mm; padding: 20mm 18mm; margin: 0 auto; }
          .school-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px; }
          .school-name { font-size: 18pt; font-weight: bold; letter-spacing: 1px; }
          .exam-title { font-size: 14pt; font-weight: bold; margin-top: 4px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11pt; margin: 12px 0; border: 1px solid #000; padding: 8px; }
          .meta-item { display: flex; gap: 4px; }
          .meta-label { font-weight: bold; }
          .section { margin-top: 20px; }
          .section-header { display: flex; justify-content: space-between; font-weight: bold; font-size: 12pt; border-bottom: 1px solid #333; padding-bottom: 4px; margin-bottom: 8px; }
          .instructions { font-style: italic; font-size: 11pt; color: #333; margin-bottom: 8px; }
          .section-content { font-size: 11pt; line-height: 1.8; }
          .footer { margin-top: 30px; border-top: 1px solid #000; padding-top: 8px; text-align: center; font-size: 9pt; color: #555; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          td, th { border: 1px solid #999; padding: 6px 8px; }
          th { background: #eee; font-weight: bold; }
          img { max-width: 100%; height: auto; }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .page { width: 100%; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="school-header">
            <div class="school-name">${paper.schoolName}</div>
            <div class="exam-title">${paper.paperTitle} – ${paper.subject}</div>
          </div>
          <div class="meta-grid">
            <div class="meta-item"><span class="meta-label">Class:</span> ${paper.classGrade}</div>
            <div class="meta-item"><span class="meta-label">Date:</span> ${paper.date}</div>
            <div class="meta-item"><span class="meta-label">Total Marks:</span> ${paper.totalMarks}</div>
            <div class="meta-item"><span class="meta-label">Time Allowed:</span> ${paper.duration}</div>
          </div>
          ${sectionsHTML}
          <div class="footer">*** End of Paper ***</div>
        </div>
        <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Exam Paper Builder</span>
          {totalSectionMarks > 0 && (
            <Badge variant="outline" className={cn("text-xs", totalSectionMarks === paper.totalMarks ? "border-green-500 text-green-700" : "border-yellow-500 text-yellow-700")}>
              {totalSectionMarks} / {paper.totalMarks} marks allocated
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={printPaper} className="gap-1.5 text-xs">
            <Printer size={13} /> Print / Export PDF
          </Button>
          <Button size="sm" onClick={savePaper} disabled={saving} className="gap-1.5 text-xs bg-green-600 hover:bg-green-700">
            <Save size={13} /> {saving ? "Saving…" : "Save Paper"}
          </Button>
        </div>
      </div>

      {/* Paper Meta */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-gray-500">School / Institution</Label>
            <Input value={paper.schoolName} onChange={(e) => setPaper((p) => ({ ...p, schoolName: e.target.value }))} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Paper Title</Label>
            <Input value={paper.paperTitle} onChange={(e) => setPaper((p) => ({ ...p, paperTitle: e.target.value }))} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Total Marks</Label>
            <Input type="number" value={paper.totalMarks} onChange={(e) => setPaper((p) => ({ ...p, totalMarks: Number(e.target.value) }))} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Duration</Label>
            <Input value={paper.duration} onChange={(e) => setPaper((p) => ({ ...p, duration: e.target.value }))} placeholder="e.g. 2 hours" className="mt-1 h-8 text-sm" />
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
        {paper.sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-4">
              <CheckSquare size={24} className="text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-1">No sections yet</h3>
            <p className="text-sm text-gray-400 mb-5">Add sections like Objective, Subjective, Fill-in-Blanks etc.</p>
            <Button onClick={addSection} size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700">
              <Plus size={14} /> Add First Section
            </Button>
          </div>
        ) : (
          <>
            {paper.sections.map((section, i) => (
              <SectionEditor
                key={section.id}
                section={section}
                index={i}
                onChange={(updated) => updateSection(section.id, updated)}
                onDelete={() => deleteSection(section.id)}
              />
            ))}
            <button
              onClick={addSection}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={15} /> Add Section
            </button>
          </>
        )}
      </div>
    </div>
  );
}
