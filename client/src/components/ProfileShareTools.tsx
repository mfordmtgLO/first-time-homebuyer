import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, QrCode, Share2 } from "lucide-react";
import { toast } from "sonner";

type ProfileShareToolsProps = {
  url: string;
  label: string;
};

export default function ProfileShareTools({ url, label }: ProfileShareToolsProps) {
  const [qrOpen, setQrOpen] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Copied! Link is ready to share.");
    } catch {
      toast.error("Copy failed — select and copy the URL shown instead.");
    }
  };

  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button variant="outline" size="sm" onClick={copyLink} title={`Copy ${url}`}>
        <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
      </Button>
      <Button variant="outline" size="sm" onClick={() => setQrOpen(true)} title={`Show QR code for ${label}`}>
        <QrCode className="mr-1.5 h-3.5 w-3.5" /> QR code
      </Button>
      <Button asChild variant="outline" size="sm" title={`Share ${label} on LinkedIn`}>
        <a href={linkedinUrl} target="_blank" rel="noreferrer"><Share2 className="mr-1.5 h-3.5 w-3.5" /> LinkedIn</a>
      </Button>
      <Button asChild variant="outline" size="sm" title={`Share ${label} on Facebook`}>
        <a href={facebookUrl} target="_blank" rel="noreferrer"><Share2 className="mr-1.5 h-3.5 w-3.5" /> Facebook</a>
      </Button>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{label} QR code</DialogTitle>
            <DialogDescription>Scan this code to open the shareable lead-capture page on a mobile device.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="rounded-xl border border-border bg-white p-3 shadow-sm"><QRCodeSVG value={url} size={188} level="M" includeMargin /></div>
            <a href={url} target="_blank" rel="noreferrer" className="w-full break-all text-center text-xs font-medium text-primary underline decoration-primary/40 underline-offset-2">{url}</a>
            <div className="flex flex-wrap justify-center gap-2"><Button variant="outline" size="sm" onClick={copyLink}><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link</Button><Button asChild variant="outline" size="sm"><a href={linkedinUrl} target="_blank" rel="noreferrer">LinkedIn</a></Button><Button asChild variant="outline" size="sm"><a href={facebookUrl} target="_blank" rel="noreferrer">Facebook</a></Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
