import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ImagePlus, Loader2, MessageSquareText, Paperclip, Save, Send, ShieldCheck, Smartphone, Users, X } from "lucide-react";
import { toast } from "sonner";

type Recipient = {
  sourceType: "roadmap" | "chat";
  sourceLeadId: number;
  name: string;
  phone: string;
  email: string | null;
  consentedAt: Date | null;
  createdAt: Date;
};

type UploadedAttachment = {
  storageKey: string;
  url: string;
  fileName: string;
  mimeType: "image/jpeg";
  sizeBytes: number;
};

const recipientKey = (recipient: Pick<Recipient, "sourceType" | "sourceLeadId">) => `${recipient.sourceType}:${recipient.sourceLeadId}`;

function formatDate(value: Date | null) {
  return value ? new Date(value).toLocaleDateString() : "Recorded";
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The JPG could not be read."));
    reader.onload = () => {
      const result = String(reader.result || "");
      const marker = ",";
      resolve(result.includes(marker) ? result.slice(result.indexOf(marker) + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

export default function TextingWorkspace() {
  const utils = trpc.useUtils();
  const statusQuery = trpc.texting.status.useQuery();
  const recipientsQuery = trpc.texting.recipients.useQuery();
  const draftsQuery = trpc.texting.listDrafts.useQuery();
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<"all" | "roadmap" | "chat">("all");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const uploadJpg = trpc.texting.uploadJpg.useMutation({
    onError: (error) => toast.error(error.message || "Unable to upload the JPG attachment."),
  });
  const saveDraft = trpc.texting.saveDraft.useMutation({
    onSuccess: async () => {
      await utils.texting.listDrafts.invalidate();
      setBody("");
      setAttachments([]);
      setSelectedKeys(new Set());
      toast.success("Text draft saved. It was not sent because no provider is configured.");
    },
    onError: (error) => toast.error(error.message || "Unable to save the text draft."),
  });

  const recipients = (recipientsQuery.data ?? []) as Recipient[];
  const filteredRecipients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return recipients.filter((recipient) => {
      const sourceMatches = source === "all" || recipient.sourceType === source;
      const textMatches = !query || `${recipient.name} ${recipient.phone} ${recipient.email ?? ""}`.toLowerCase().includes(query);
      return sourceMatches && textMatches;
    });
  }, [recipients, search, source]);
  const selectedRecipients = useMemo(
    () => recipients.filter((recipient) => selectedKeys.has(recipientKey(recipient))),
    [recipients, selectedKeys]
  );
  const selectedVisible = filteredRecipients.length > 0 && filteredRecipients.every((recipient) => selectedKeys.has(recipientKey(recipient)));

  const toggleRecipient = (recipient: Recipient) => {
    const key = recipientKey(recipient);
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const toggleVisible = () => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (selectedVisible) filteredRecipients.forEach((recipient) => next.delete(recipientKey(recipient)));
      else filteredRecipients.forEach((recipient) => next.add(recipientKey(recipient)));
      return next;
    });
  };
  const handleAttachment = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== "image/jpeg") {
      toast.error("Attach a JPG or JPEG image only.");
      return;
    }
    if (file.size > 4_000_000) {
      toast.error("JPG attachments must be 4MB or smaller.");
      return;
    }
    if (attachments.length >= 3) {
      toast.error("Attach up to three JPG files per draft.");
      return;
    }
    try {
      const dataBase64 = await readFileAsBase64(file);
      const uploaded = await uploadJpg.mutateAsync({ fileName: file.name, dataBase64 });
      setAttachments((current) => [...current, uploaded]);
      toast.success("JPG attached to this draft.");
    } catch (error) {
      if (error instanceof Error) toast.error(error.message);
    }
  };
  const save = () => {
    saveDraft.mutate({
      body,
      recipients: selectedRecipients.map(({ sourceType, sourceLeadId }) => ({ sourceType, sourceLeadId })),
      attachments,
    });
  };

  return (
    <section className="mt-10 rounded-xl border border-primary/20 bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="flex items-center gap-2.5 font-display text-xl font-semibold text-foreground"><MessageSquareText className="h-5 w-5 text-primary" /> Texting Workspace</h2>
            <Badge className="border-amber-600/30 bg-amber-600/10 text-amber-800 hover:bg-amber-600/10">Draft mode</Badge>
          </div>
          <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">Choose one lead or many text-ready leads. Each selected recipient is saved as an independent one-to-one message—not a shared group thread.</p>
        </div>
        <div className="rounded-lg border border-amber-600/25 bg-amber-600/5 px-3 py-2 text-xs text-amber-900">
          <div className="flex items-center gap-1.5 font-semibold"><ShieldCheck className="h-3.5 w-3.5" /> Provider setup required</div>
          <p className="mt-0.5 max-w-xs text-amber-900/75">Drafts and JPG attachments are saved now. Sending stays disabled until an SMS/MMS provider is configured.</p>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="min-w-0 rounded-lg border border-border bg-background/40">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Text-ready leads</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Valid phone number plus affirmative recorded SMS consent.</p>
            </div>
            <Badge variant="outline" className="w-fit border-emerald-600/30 bg-emerald-600/10 text-emerald-700"><Smartphone className="mr-1 h-3.5 w-3.5" /> {recipients.length} ready</Badge>
          </div>
          <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone, or email…" className="bg-card" />
            <div className="flex gap-1 rounded-md border border-border bg-card p-1">
              {(["all", "roadmap", "chat"] as const).map((value) => <Button key={value} size="sm" variant={source === value ? "default" : "ghost"} onClick={() => setSource(value)} className="capitalize">{value === "all" ? "All" : value}</Button>)}
            </div>
          </div>
          <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-xs text-muted-foreground">
            <Checkbox id="select-text-visible" checked={selectedVisible} onCheckedChange={toggleVisible} aria-label="Select all visible text-ready leads" />
            <label htmlFor="select-text-visible" className="cursor-pointer">Select visible</label>
            <span className="ml-auto font-medium text-foreground">{selectedRecipients.length} selected</span>
          </div>
          <div className="max-h-[25rem] divide-y divide-border overflow-y-auto overscroll-contain">
            {recipientsQuery.isLoading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading text-ready leads…</div> : filteredRecipients.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No text-ready leads match this view. Chat leads appear here after they choose Yes to the SMS consent question.</div> : filteredRecipients.map((recipient) => {
              const key = recipientKey(recipient);
              return <label key={key} className="flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-muted/40">
                <Checkbox checked={selectedKeys.has(key)} onCheckedChange={() => toggleRecipient(recipient)} aria-label={`Select ${recipient.name} for a text draft`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-medium text-foreground">{recipient.name}</span><Badge variant="outline" className={recipient.sourceType === "roadmap" ? "border-primary/25 bg-primary/5 text-primary" : "border-violet-600/25 bg-violet-600/5 text-violet-700"}>{recipient.sourceType === "roadmap" ? "Roadmap" : "Chat"}</Badge></div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{recipient.phone}{recipient.email ? ` · ${recipient.email}` : ""}</div>
                  <div className="mt-1 text-[11px] text-emerald-700">SMS permission recorded {formatDate(recipient.consentedAt)}</div>
                </div>
              </label>;
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background/40 p-4">
          <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-foreground">Compose draft</h3><span className="text-xs text-muted-foreground">{body.length}/1600</span></div>
          <p className="mt-1 text-xs text-muted-foreground">This will save an individual recipient record for each selected lead. No text is sent in draft mode.</p>
          <Textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={1600} placeholder="Write your custom message…" className="mt-4 min-h-36 resize-y bg-card" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-primary/40 bg-card px-3 py-2 text-xs font-medium text-primary transition hover:bg-primary/5">
              {uploadJpg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Attach JPG
              <input type="file" accept="image/jpeg,.jpg,.jpeg" className="sr-only" disabled={uploadJpg.isPending || attachments.length >= 3} onChange={(event) => { void handleAttachment(event.target.files?.[0]); event.currentTarget.value = ""; }} />
            </label>
            <span className="text-xs text-muted-foreground">Up to 3 JPG files · 4MB each</span>
          </div>
          {attachments.length > 0 && <div className="mt-3 space-y-2">{attachments.map((attachment) => <div key={attachment.storageKey} className="flex items-center gap-2 rounded-md border border-border bg-card p-2"><img src={attachment.url} alt="Attached JPG preview" className="h-10 w-10 rounded object-cover" /><span className="min-w-0 flex-1 truncate text-xs text-foreground">{attachment.fileName}</span><Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAttachments((current) => current.filter((candidate) => candidate.storageKey !== attachment.storageKey))} aria-label={`Remove ${attachment.fileName}`}><X className="h-3.5 w-3.5" /></Button></div>)}</div>}
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button onClick={save} disabled={!body.trim() || selectedRecipients.length === 0 || saveDraft.isPending || uploadJpg.isPending}><Save className="mr-1.5 h-4 w-4" /> {saveDraft.isPending ? "Saving…" : "Save draft"}</Button>
            <Button variant="outline" onClick={() => toast.info("Sending is safely disabled until an SMS/MMS provider and approved sending number are configured.")}><Send className="mr-1.5 h-4 w-4" /> Send when connected</Button>
          </div>
          {selectedRecipients.length > 0 && <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground"><Users className="mt-0.5 h-3.5 w-3.5 shrink-0" /> This draft will prepare {selectedRecipients.length} separate one-to-one message{selectedRecipients.length === 1 ? "" : "s"}.</p>}
        </div>
      </div>

      <div className="border-t border-border p-5 sm:p-6">
        <div className="flex items-center gap-2"><Paperclip className="h-4 w-4 text-muted-foreground" /><h3 className="font-semibold text-foreground">Saved draft history</h3></div>
        {draftsQuery.isLoading ? <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading drafts…</div> : (draftsQuery.data ?? []).length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No text drafts saved yet.</p> : <div className="mt-4 grid gap-3 lg:grid-cols-2">{(draftsQuery.data ?? []).slice(0, 8).map((draft) => <article key={draft.id} className="rounded-lg border border-border bg-background/40 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><Badge className="border-amber-600/30 bg-amber-600/10 text-amber-800 hover:bg-amber-600/10">Provider setup required</Badge><span className="text-xs text-muted-foreground">{new Date(draft.createdAt).toLocaleString()}</span></div><p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-foreground">{draft.body}</p><div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground"><span>{draft.recipients.length} recipient{draft.recipients.length === 1 ? "" : "s"}</span><span>{draft.attachments.length} JPG attachment{draft.attachments.length === 1 ? "" : "s"}</span></div></article>)}</div>}
      </div>
    </section>
  );
}
