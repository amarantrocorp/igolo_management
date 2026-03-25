import { notFound } from "next/navigation"
import fs from "fs"
import path from "path"
import Link from "next/link"

// ════════════════════════════════════════════════════════════════
// TYPES & DATA
// ════════════════════════════════════════════════════════════════

interface DocEntry {
  file: string
  title: string
  category: string
}

const SLUG_TO_FILE: Record<string, DocEntry> = {
  "getting-started": { file: "01-getting-started.md", title: "Welcome & Getting Started", category: "Getting Started" },
  "managing-team": { file: "02-managing-your-team.md", title: "Managing Your Team", category: "Getting Started" },
  "capturing-leads": { file: "03-capturing-leads.md", title: "Capturing & Managing Leads", category: "Running Your Business" },
  "site-survey": { file: "04-site-survey-and-requirements.md", title: "Client Requirements & Site Survey", category: "Running Your Business" },
  "quotation-design": { file: "05-quotation-design.md", title: "Creating Quotations & Design", category: "Running Your Business" },
  "project-execution": { file: "06-project-execution.md", title: "Managing Projects & Execution", category: "Running Your Business" },
  "financial-management": { file: "07-financial-management.md", title: "Payments, Expenses & Finances", category: "Money & Operations" },
  "inventory-labour": { file: "08-inventory-procurement-labour.md", title: "Inventory, Vendors & Labour", category: "Money & Operations" },
  "integrations": { file: "09-integrations.md", title: "Setting Up Integrations", category: "Setup & More" },
  "client-portal": { file: "10-client-portal.md", title: "Your Client's Experience", category: "Setup & More" },
  "reports-settings": { file: "11-reports-and-settings.md", title: "Reports & Settings", category: "Setup & More" },
  "tips": { file: "12-tips-and-best-practices.md", title: "Tips & Best Practices", category: "Setup & More" },
}

const SIDEBAR_CATEGORIES: { label: string; slugs: string[] }[] = [
  { label: "Getting Started", slugs: ["getting-started", "managing-team"] },
  { label: "Running Your Business", slugs: ["capturing-leads", "site-survey", "quotation-design", "project-execution"] },
  { label: "Money & Operations", slugs: ["financial-management", "inventory-labour"] },
  { label: "Setup & More", slugs: ["integrations", "client-portal", "reports-settings", "tips"] },
]

const ALL_SLUGS = SIDEBAR_CATEGORIES.flatMap((c) => c.slugs)

// ════════════════════════════════════════════════════════════════
// MARKDOWN PARSER
// ════════════════════════════════════════════════════════════════

interface TocItem {
  id: string
  text: string
  level: number
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function extractToc(md: string): TocItem[] {
  const items: TocItem[] = []
  const lines = md.split("\n")
  let inCodeBlock = false
  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue
    const match = line.match(/^(#{2,3})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const raw = match[2].trim()
      const text = raw.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1")
      items.push({ id: slugify(text), text, level })
    }
  }
  return items
}

function estimateReadingTime(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 230))
}

function markdownToHtml(md: string): string {
  // ── Collect code blocks and replace with placeholders ──
  const codeBlocks: string[] = []
  let processed = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const langLabel = lang || "text"
    const escaped = escapeHtml(code.trimEnd())
    const lineCount = escaped.split("\n").length
    const lineNums = Array.from({ length: lineCount }, (__, i) =>
      `<span class="doc-ln">${i + 1}</span>`
    ).join("\n")
    const block = [
      `<div class="doc-codeblock">`,
      `<div class="doc-codeblock-header">`,
      `<span class="doc-codeblock-lang">${escapeHtml(langLabel)}</span>`,
      `<button class="doc-copy-btn" onclick="navigator.clipboard.writeText(this.closest('.doc-codeblock').querySelector('code').textContent).then(()=>{this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',1500)})">Copy</button>`,
      `</div>`,
      `<div class="doc-code-scroll">`,
      `<pre class="doc-pre"><div class="doc-line-nums">${lineNums}</div><code>${escaped}</code></pre>`,
      `</div></div>`,
    ].join("")
    codeBlocks.push(block)
    return `%%CODEBLOCK_${codeBlocks.length - 1}%%`
  })

  // ── Headers with anchor IDs ──
  processed = processed.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes: string, text: string) => {
    const level = hashes.length
    const clean = text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1")
    const id = slugify(clean)
    const classes: Record<number, string> = {
      1: "doc-h1",
      2: "doc-h2",
      3: "doc-h3",
      4: "doc-h4",
      5: "doc-h5",
      6: "doc-h6",
    }
    // process inline formatting in the text
    let formatted = text
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="doc-inline-code">$1</code>')
    return `<h${level} id="${id}" class="${classes[level] || "doc-h6"}"><a href="#${id}" class="doc-anchor" aria-hidden="true">#</a>${formatted}</h${level}>`
  })

  // ── Tables ──
  processed = processed.replace(
    /(?:^\|.+\|$\n?)+/gm,
    (tableBlock) => {
      const rows = tableBlock.trim().split("\n").filter(Boolean)
      if (rows.length < 2) return tableBlock
      const parseRow = (row: string) =>
        row.split("|").slice(1, -1).map((c) => c.trim())
      const headerCells = parseRow(rows[0])
      // Check if row 1 is separator
      const sepRow = parseRow(rows[1])
      const isSep = sepRow.every((c) => /^[-:]+$/.test(c))
      if (!isSep) return tableBlock
      const dataRows = rows.slice(2)
      let html = '<div class="doc-table-wrap"><table class="doc-table"><thead><tr>'
      for (const cell of headerCells) {
        html += `<th>${cell}</th>`
      }
      html += "</tr></thead><tbody>"
      for (let i = 0; i < dataRows.length; i++) {
        const cells = parseRow(dataRows[i])
        const stripe = i % 2 === 1 ? ' class="doc-stripe"' : ""
        html += `<tr${stripe}>`
        for (const cell of cells) {
          html += `<td>${cell}</td>`
        }
        html += "</tr>"
      }
      html += "</tbody></table></div>"
      return html
    }
  )

  // ── Blockquotes (multi-line support) ──
  processed = processed.replace(
    /(?:^>\s?(.*)$\n?)+/gm,
    (block) => {
      const content = block
        .split("\n")
        .map((l) => l.replace(/^>\s?/, ""))
        .join("\n")
        .trim()
      return `<blockquote class="doc-blockquote"><p>${content}</p></blockquote>\n`
    }
  )

  // ── Unordered lists ──
  processed = processed.replace(
    /(?:^[ \t]*[-*]\s+.+$\n?)+/gm,
    (block) => {
      const items = block.trim().split("\n")
      let html = '<ul class="doc-ul">'
      for (const item of items) {
        const text = item.replace(/^[ \t]*[-*]\s+/, "")
        html += `<li>${text}</li>`
      }
      html += "</ul>"
      return html
    }
  )

  // ── Ordered lists ──
  processed = processed.replace(
    /(?:^\d+\.\s+.+$\n?)+/gm,
    (block) => {
      const items = block.trim().split("\n")
      let html = '<ol class="doc-ol">'
      for (const item of items) {
        const text = item.replace(/^\d+\.\s+/, "")
        html += `<li>${text}</li>`
      }
      html += "</ol>"
      return html
    }
  )

  // ── Horizontal rules ──
  processed = processed.replace(/^---+$/gm, '<hr class="doc-hr" />')

  // ── Images ──
  processed = processed.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<figure class="doc-figure"><img src="$2" alt="$1" class="doc-img" /><figcaption class="doc-figcaption">$1</figcaption></figure>'
  )

  // ── Links ──
  processed = processed.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="doc-link">$1</a>'
  )

  // ── Inline formatting ──
  processed = processed.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
  processed = processed.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  processed = processed.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
  processed = processed.replace(/`([^`]+)`/g, '<code class="doc-inline-code">$1</code>')

  // ── Paragraphs ──
  processed = processed.replace(
    /^(?!<[a-z/]|%%CODEBLOCK|$)(.+)$/gm,
    '<p class="doc-p">$1</p>'
  )

  // ── Restore code blocks ──
  processed = processed.replace(/%%CODEBLOCK_(\d+)%%/g, (_, idx) => codeBlocks[parseInt(idx)])

  return processed
}

// ════════════════════════════════════════════════════════════════
// STYLES (embedded <style> tag for the document viewer)
// ════════════════════════════════════════════════════════════════

const DOCS_STYLES = `
/* ── Layout ── */
.doc-page { display: flex; min-height: 100vh; background: #0B1120; }
.doc-left-sidebar {
  position: sticky; top: 80px; align-self: flex-start;
  width: 260px; min-width: 260px; max-height: calc(100vh - 80px);
  overflow-y: auto; padding: 24px 0 24px 24px;
  border-right: 1px solid rgba(255,255,255,0.06);
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
}
.doc-main { flex: 1; min-width: 0; max-width: 820px; margin: 0 auto; padding: 24px 40px 80px; }
.doc-right-sidebar {
  position: sticky; top: 80px; align-self: flex-start;
  width: 220px; min-width: 220px; max-height: calc(100vh - 80px);
  overflow-y: auto; padding: 24px 24px 24px 0;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
}

/* ── Sidebar Nav ── */
.doc-nav-category {
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
  color: rgba(255,255,255,0.35); padding: 16px 16px 6px; margin: 0;
}
.doc-nav-category:first-child { padding-top: 0; }
.doc-nav-link {
  display: block; padding: 6px 16px; font-size: 13.5px; line-height: 1.5;
  color: rgba(255,255,255,0.55); text-decoration: none; border-radius: 6px;
  transition: all 0.15s ease; border-left: 2px solid transparent; margin-left: 0;
}
.doc-nav-link:hover { color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.04); }
.doc-nav-link-active {
  color: #CBB282 !important; background: rgba(203,178,130,0.08);
  border-left-color: #CBB282; font-weight: 500;
}

/* ── ToC (Right Sidebar) ── */
.doc-toc-title {
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
  color: rgba(255,255,255,0.35); margin-bottom: 12px;
}
.doc-toc-link {
  display: block; padding: 4px 0; font-size: 12.5px; line-height: 1.6;
  color: rgba(255,255,255,0.45); text-decoration: none; transition: color 0.15s ease;
  border-left: 2px solid rgba(255,255,255,0.06); padding-left: 12px;
}
.doc-toc-link:hover { color: #CBB282; border-left-color: rgba(203,178,130,0.4); }
.doc-toc-h3 { padding-left: 24px; font-size: 12px; }

/* ── Breadcrumb ── */
.doc-breadcrumb {
  display: flex; align-items: center; gap: 8px; font-size: 13px;
  color: rgba(255,255,255,0.4); margin-bottom: 8px;
}
.doc-breadcrumb a { color: rgba(255,255,255,0.4); text-decoration: none; transition: color 0.15s; }
.doc-breadcrumb a:hover { color: #CBB282; }
.doc-breadcrumb-sep { color: rgba(255,255,255,0.2); }

/* ── Header Area ── */
.doc-header-meta {
  display: flex; align-items: center; gap: 16px; margin-top: 4px; margin-bottom: 32px;
  font-size: 13px; color: rgba(255,255,255,0.35);
}
.doc-header-meta svg { width: 14px; height: 14px; vertical-align: -2px; margin-right: 4px; }

/* ── Content Typography ── */
.doc-h1 {
  font-size: 2rem; font-weight: 700; color: #fff; margin: 0 0 8px; line-height: 1.25;
  letter-spacing: -0.02em;
}
.doc-h2 {
  font-size: 1.5rem; font-weight: 700; color: #CBB282; margin: 3rem 0 1rem;
  padding-bottom: 0.5rem; border-bottom: 1px solid rgba(203,178,130,0.15);
  line-height: 1.3; letter-spacing: -0.01em; position: relative;
}
.doc-h3 {
  font-size: 1.2rem; font-weight: 600; color: #fff; margin: 2rem 0 0.75rem;
  line-height: 1.35; position: relative;
}
.doc-h4 {
  font-size: 1.05rem; font-weight: 600; color: rgba(255,255,255,0.9);
  margin: 1.5rem 0 0.5rem; line-height: 1.4; position: relative;
}
.doc-h5 { font-size: 0.95rem; font-weight: 600; color: rgba(255,255,255,0.8); margin: 1.25rem 0 0.5rem; position: relative; }
.doc-h6 { font-size: 0.875rem; font-weight: 600; color: rgba(255,255,255,0.7); margin: 1rem 0 0.5rem; position: relative; }
.doc-anchor {
  position: absolute; left: -1.2em; color: rgba(203,178,130,0.3); text-decoration: none;
  font-weight: 400; opacity: 0; transition: opacity 0.15s;
}
.doc-h1:hover .doc-anchor,
.doc-h2:hover .doc-anchor,
.doc-h3:hover .doc-anchor,
.doc-h4:hover .doc-anchor,
.doc-h5:hover .doc-anchor,
.doc-h6:hover .doc-anchor { opacity: 1; }

.doc-p {
  font-size: 0.95rem; line-height: 1.75; color: rgba(255,255,255,0.65);
  margin: 0 0 1rem;
}

/* ── Code ── */
.doc-inline-code {
  background: rgba(255,255,255,0.08); color: #CBB282; padding: 2px 7px;
  border-radius: 4px; font-size: 0.85em; font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
}
.doc-codeblock {
  margin: 1.25rem 0; border-radius: 10px; overflow: hidden;
  background: #0d1117; border: 1px solid rgba(255,255,255,0.08);
}
.doc-codeblock-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 16px; background: rgba(255,255,255,0.04);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.doc-codeblock-lang {
  font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;
  color: rgba(255,255,255,0.35); font-family: inherit;
}
.doc-copy-btn {
  font-size: 12px; color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 5px;
  padding: 3px 10px; cursor: pointer; transition: all 0.15s;
  font-family: inherit;
}
.doc-copy-btn:hover { color: #CBB282; border-color: rgba(203,178,130,0.3); background: rgba(203,178,130,0.08); }
.doc-code-scroll { overflow-x: auto; }
.doc-pre {
  display: flex; margin: 0; padding: 16px; font-size: 13px; line-height: 1.65;
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  color: rgba(255,255,255,0.75); background: transparent;
}
.doc-line-nums {
  display: flex; flex-direction: column; text-align: right;
  padding-right: 16px; margin-right: 16px; border-right: 1px solid rgba(255,255,255,0.06);
  user-select: none; color: rgba(255,255,255,0.2); font-size: 12px;
}
.doc-ln { line-height: 1.65; }

/* ── Tables ── */
.doc-table-wrap { overflow-x: auto; margin: 1.25rem 0; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); }
.doc-table {
  width: 100%; border-collapse: collapse; font-size: 0.875rem;
}
.doc-table th {
  background: #111827; color: rgba(255,255,255,0.8); font-weight: 600;
  text-align: left; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.1);
}
.doc-table td {
  padding: 9px 14px; color: rgba(255,255,255,0.6);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.doc-stripe td { background: rgba(255,255,255,0.02); }
.doc-table tr:last-child td { border-bottom: none; }

/* ── Lists ── */
.doc-ul, .doc-ol {
  margin: 0.75rem 0 1rem; padding-left: 1.5rem; color: rgba(255,255,255,0.65);
  font-size: 0.95rem; line-height: 1.75;
}
.doc-ul { list-style: disc; }
.doc-ol { list-style: decimal; }
.doc-ul li, .doc-ol li { margin-bottom: 4px; }
.doc-ul li::marker { color: rgba(203,178,130,0.5); }
.doc-ol li::marker { color: rgba(203,178,130,0.5); }

/* ── Blockquotes ── */
.doc-blockquote {
  margin: 1.25rem 0; padding: 12px 20px; border-left: 3px solid #CBB282;
  background: rgba(203,178,130,0.04); border-radius: 0 8px 8px 0;
}
.doc-blockquote p {
  font-size: 0.925rem; line-height: 1.7; color: rgba(255,255,255,0.55);
  font-style: italic; margin: 0;
}

/* ── Links ── */
.doc-link {
  color: #CBB282; text-decoration: none; border-bottom: 1px solid rgba(203,178,130,0.3);
  transition: border-color 0.15s;
}
.doc-link:hover { border-bottom-color: #CBB282; }

/* ── Misc ── */
.doc-hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 2.5rem 0; }
.doc-figure { margin: 1.5rem 0; text-align: center; }
.doc-img { max-width: 100%; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); }
.doc-figcaption { font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 8px; }

/* ── Footer Nav ── */
.doc-footer {
  margin-top: 4rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.08);
}
.doc-footer-nav { display: flex; justify-content: space-between; gap: 16px; }
.doc-footer-link {
  display: flex; flex-direction: column; gap: 4px; padding: 16px 20px;
  border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
  text-decoration: none; transition: all 0.2s; flex: 1; max-width: 48%;
}
.doc-footer-link:hover { border-color: rgba(203,178,130,0.3); background: rgba(203,178,130,0.04); }
.doc-footer-link-label { font-size: 12px; color: rgba(255,255,255,0.35); }
.doc-footer-link-title { font-size: 14px; font-weight: 500; color: #CBB282; }
.doc-footer-link-next { text-align: right; }
.doc-feedback {
  display: flex; align-items: center; gap: 12px; margin-top: 24px;
  padding: 16px 0; font-size: 13px; color: rgba(255,255,255,0.35);
}
.doc-feedback-btn {
  padding: 4px 12px; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px;
  background: transparent; color: rgba(255,255,255,0.5); cursor: pointer;
  font-size: 13px; transition: all 0.15s; font-family: inherit;
}
.doc-feedback-btn:hover { border-color: rgba(203,178,130,0.3); color: #CBB282; background: rgba(203,178,130,0.06); }
.doc-last-updated { font-size: 12px; color: rgba(255,255,255,0.2); margin-top: 16px; }

/* ── Smooth scroll ── */
html { scroll-behavior: smooth; }

/* ── Responsive ── */
@media (max-width: 1200px) {
  .doc-right-sidebar { display: none; }
}
@media (max-width: 900px) {
  .doc-left-sidebar { display: none; }
  .doc-main { padding: 20px 16px 60px; }
}
`

// ════════════════════════════════════════════════════════════════
// SVG ICONS (inline to avoid extra imports)
// ════════════════════════════════════════════════════════════════

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "-2px", marginRight: "4px" }}>
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline" }}>
      {direction === "left" ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
    </svg>
  )
}

function BookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "-2px", marginRight: "6px" }}>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  )
}

// ════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ════════════════════════════════════════════════════════════════

export default function DocPage({ params }: { params: { slug: string } }) {
  const entry = SLUG_TO_FILE[params.slug]
  if (!entry) notFound()

  // ── Read file ──
  const possiblePaths = [
    path.join(process.cwd(), "..", "docs", entry.file),
    path.join(process.cwd(), "docs", entry.file),
    path.join("/documentation", entry.file),
  ]
  const filePath = possiblePaths.find((p) => fs.existsSync(p)) || possiblePaths[0]

  let content: string
  try {
    content = fs.readFileSync(filePath, "utf-8")
  } catch {
    notFound()
  }

  // ── Process content ──
  const html = markdownToHtml(content)
  const toc = extractToc(content)
  const readingTime = estimateReadingTime(content)

  // ── File stats for last updated ──
  let lastUpdated = ""
  try {
    const stats = fs.statSync(filePath)
    lastUpdated = stats.mtime.toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    })
  } catch {
    // ignore
  }

  // ── Prev/Next navigation ──
  const currentIdx = ALL_SLUGS.indexOf(params.slug)
  const prevSlug = currentIdx > 0 ? ALL_SLUGS[currentIdx - 1] : null
  const nextSlug = currentIdx < ALL_SLUGS.length - 1 ? ALL_SLUGS[currentIdx + 1] : null
  const prevEntry = prevSlug ? SLUG_TO_FILE[prevSlug] : null
  const nextEntry = nextSlug ? SLUG_TO_FILE[nextSlug] : null

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: DOCS_STYLES }} />

      <div className="doc-page" style={{ paddingTop: "72px" }}>
        {/* ════ Left Sidebar ════ */}
        <nav className="doc-left-sidebar">
          {SIDEBAR_CATEGORIES.map((category) => (
            <div key={category.label}>
              <p className="doc-nav-category">{category.label}</p>
              {category.slugs.map((s) => {
                const e = SLUG_TO_FILE[s]
                if (!e) return null
                const isActive = s === params.slug
                return (
                  <Link
                    key={s}
                    href={`/documentation/${s}`}
                    className={`doc-nav-link ${isActive ? "doc-nav-link-active" : ""}`}
                  >
                    {e.title}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* ════ Main Content ════ */}
        <main className="doc-main">
          {/* Breadcrumb */}
          <div className="doc-breadcrumb">
            <Link href="/documentation">Docs</Link>
            <span className="doc-breadcrumb-sep">/</span>
            <span>{entry.category}</span>
            <span className="doc-breadcrumb-sep">/</span>
            <span style={{ color: "rgba(255,255,255,0.65)" }}>{entry.title}</span>
          </div>

          {/* Meta */}
          <div className="doc-header-meta">
            <span><ClockIcon />{readingTime} min read</span>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
            <span><BookIcon />{entry.category}</span>
          </div>

          {/* Rendered Markdown */}
          <article dangerouslySetInnerHTML={{ __html: html }} />

          {/* ════ Footer ════ */}
          <footer className="doc-footer">
            <div className="doc-footer-nav">
              {prevEntry && prevSlug ? (
                <Link href={`/documentation/${prevSlug}`} className="doc-footer-link">
                  <span className="doc-footer-link-label"><ChevronIcon direction="left" /> Previous</span>
                  <span className="doc-footer-link-title">{prevEntry.title}</span>
                </Link>
              ) : <div />}
              {nextEntry && nextSlug ? (
                <Link href={`/documentation/${nextSlug}`} className="doc-footer-link doc-footer-link-next">
                  <span className="doc-footer-link-label">Next <ChevronIcon direction="right" /></span>
                  <span className="doc-footer-link-title">{nextEntry.title}</span>
                </Link>
              ) : <div />}
            </div>

            <div className="doc-feedback">
              <span>Was this page helpful?</span>
              <button className="doc-feedback-btn">Yes</button>
              <button className="doc-feedback-btn">No</button>
            </div>

            {lastUpdated && (
              <p className="doc-last-updated">Last updated {lastUpdated}</p>
            )}
          </footer>
        </main>

        {/* ════ Right Sidebar (Table of Contents) ════ */}
        <aside className="doc-right-sidebar">
          {toc.length > 0 && (
            <div>
              <p className="doc-toc-title">On this page</p>
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`doc-toc-link ${item.level === 3 ? "doc-toc-h3" : ""}`}
                >
                  {item.text}
                </a>
              ))}
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
