import { useRef, useState } from "react";
import { Bold, Eye, FileUp, Italic, Link2, Underline } from "lucide-react";
import mammoth from "mammoth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { EmailTemplateAiAssistant, type EmailTemplateAiWorkflow } from "@/components/EmailTemplateAiAssistant";

export type EmailTemplateWorkflow = Exclude<EmailTemplateAiWorkflow, "platform_lead" | "platform_agent">;
type MergeField = { token: string; label: string };
const MERGE_FIELDS: Record<EmailTemplateWorkflow, MergeField[]> = {
  listing_agent: [],
  property_list: [],
  property_page_agent: [],
  property_page_buyer: [{ token: "{{client_name}}", label: "Client name" }, { token: "{{property_address}}", label: "Property address" }, { token: "{{property_url}}", label: "Property link" }, { token: "{{loan_officer_signature}}", label: "Loan officer signature" }, { token: "{{agent_signature}}", label: "Agent signature" }],
  oregon_outreach: [{ token: "{{recipient_name}}", label: "Recipient first name" }, { token: "{{brokerage}}", label: "Brokerage" }, { token: "{{recipient_type}}", label: "Recipient type" }, { token: "{{recipient_count}}", label: "Recipient count" }],
  agent_directory: [{ token: "{{recipient_first_name}}", label: "Recipient first name" }, { token: "{{recipient_name}}", label: "Recipient full name" }, { token: "{{company_name}}", label: "Company name" }, { token: "{{recipient_role}}", label: "Recipient role" }],
  loan_officer_directory: [{ token: "{{recipient_first_name}}", label: "Recipient first name" }, { token: "{{recipient_name}}", label: "Recipient full name" }, { token: "{{company_name}}", label: "Company name" }, { token: "{{recipient_role}}", label: "Recipient role" }],
};
export function getEmailTemplateMergeFields(workflow: EmailTemplateWorkflow) { return MERGE_FIELDS[workflow]; }
type Props = { id: string; value: string; onChange: (value: string) => void; workflow: EmailTemplateWorkflow; subjectValue?: string; onSubjectChange?: (value: string) => void; placeholder?: string; maxLength?: number; className?: string };

export function sanitizeEmailTemplateHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const allowed = new Set(["A", "B", "STRONG", "I", "EM", "U", "BR", "P", "DIV", "UL", "OL", "LI", "SPAN"]);
  doc.body.querySelectorAll("*").forEach((node) => {
    if (!allowed.has(node.tagName)) { node.replaceWith(...Array.from(node.childNodes)); return; }
    Array.from(node.attributes).forEach((attribute) => {
      if (node.tagName === "A" && attribute.name === "href" && /^(https?:|mailto:)/i.test(attribute.value)) return;
      node.removeAttribute(attribute.name);
    });
  });
  return doc.body.innerHTML.replace(/<div><br><\/div>/g, "<br>").trim();
}

export function htmlToEmailText(value: string) {
  const doc = new DOMParser().parseFromString(value, "text/html");
  doc.querySelectorAll("a").forEach((anchor) => anchor.append(` (${anchor.href})`));
  return (doc.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

export function UniversalEmailTemplateEditor({ id, value, onChange, workflow, subjectValue, onSubjectChange, placeholder, maxLength = 8000, className = "" }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const mergeFields = getEmailTemplateMergeFields(workflow);
  const commit = () => onChange(sanitizeEmailTemplateHtml(editorRef.current?.innerHTML ?? ""));
  const format = (command: "bold" | "italic" | "underline") => { editorRef.current?.focus(); document.execCommand(command); commit(); };
  const addLink = () => {
    const href = window.prompt("Paste a full https:// or mailto: link");
    if (!href || !/^(https?:|mailto:)/i.test(href)) { if (href) toast.error("Use an https:// or mailto: link."); return; }
    editorRef.current?.focus(); document.execCommand("createLink", false, href); commit();
  };
  const importWord = async (file: File) => {
    if (!/\.docx$/i.test(file.name)) { toast.error("Please save legacy .doc files as .docx before importing."); return; }
    setImporting(true);
    try { const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }); onChange(sanitizeEmailTemplateHtml(result.value)); toast.success(`Imported ${file.name}.`); }
    catch { toast.error("This Word file could not be imported."); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  return <div className={`rounded-md border border-input bg-background ${className}`}>
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 p-1.5">
      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Bold" onClick={() => format("bold")}><Bold className="h-3.5 w-3.5" /></Button>
      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Italic" onClick={() => format("italic")}><Italic className="h-3.5 w-3.5" /></Button>
      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Underline" onClick={() => format("underline")}><Underline className="h-3.5 w-3.5" /></Button>
      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Insert link" onClick={addLink}><Link2 className="h-3.5 w-3.5" /></Button>
      <select aria-label="Insert merge field" defaultValue="" disabled={!mergeFields.length} className="h-7 max-w-52 rounded border border-input bg-background px-2 text-xs disabled:cursor-not-allowed disabled:opacity-60" onChange={(event) => { const token = event.target.value; if (token) { editorRef.current?.focus(); document.execCommand("insertText", false, token); commit(); event.currentTarget.value = ""; } }}>
        <option value="" disabled>{mergeFields.length ? "Insert merge field" : "Signature and details added automatically"}</option>{mergeFields.map((field) => <option key={field.token} value={field.token}>{field.label}</option>)}
      </select>
      <input ref={fileRef} className="hidden" type="file" accept=".doc,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importWord(file); }} />
      <Button type="button" size="sm" variant="ghost" disabled={importing} onClick={() => fileRef.current?.click()}><FileUp className="mr-1.5 h-3.5 w-3.5" />{importing ? "Importing…" : "Import Word"}</Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setShowPreview((current) => !current)}><Eye className="mr-1.5 h-3.5 w-3.5" />{showPreview ? "Hide preview" : "HTML preview"}</Button>
    </div>
    <div className="p-2"><EmailTemplateAiAssistant workflow={workflow} currentSubject={subjectValue} currentBody={value} onApply={(draft) => { const html = sanitizeEmailTemplateHtml(draft.body.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replace(/\n/g, "<br>")); if (editorRef.current) editorRef.current.innerHTML = html; onChange(html); onSubjectChange?.(draft.subject); }} /></div>
    <div id={id} ref={editorRef} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" data-placeholder={placeholder} onBlur={commit} onInput={commit} className="min-h-44 border-t border-border px-3 py-2 text-sm leading-6 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground" dangerouslySetInnerHTML={{ __html: sanitizeEmailTemplateHtml(value) }} />
    {showPreview ? <section aria-label="HTML email preview" className="border-t border-border bg-muted/20 p-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email preview</p><div className="prose prose-sm max-w-none break-words text-foreground prose-a:text-primary" dangerouslySetInnerHTML={{ __html: sanitizeEmailTemplateHtml(value) }} /></section> : null}
    <p className="border-t border-border px-3 py-1.5 text-right text-xs text-muted-foreground">{htmlToEmailText(value).length}/{maxLength} characters · Word imports accept .docx</p>
  </div>;
}
