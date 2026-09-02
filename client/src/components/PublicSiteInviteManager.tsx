import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Link2, Loader2, ShieldCheck, UserPlus, XCircle } from "lucide-react";
import { toast } from "sonner";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function PublicSiteInviteManager() {
  const [email, setEmail] = useState("");
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const invitesQuery = trpc.publicSiteAccess.listInvites.useQuery(undefined, { retry: false });
  const createInvite = trpc.publicSiteAccess.createInvite.useMutation({
    onSuccess: (result) => {
      setLatestInviteUrl(`${window.location.origin}/?invite=${encodeURIComponent(result.token)}`);
      setEmail("");
      void utils.publicSiteAccess.listInvites.invalidate();
      toast.success("Private website invitation created. Copy the link and send it to the invited user.");
    },
    onError: (error) => toast.error(error.message),
  });
  const revokeInvite = trpc.publicSiteAccess.revokeInvite.useMutation({
    onSuccess: () => {
      void utils.publicSiteAccess.listInvites.invalidate();
      toast.success("Website invitation revoked.");
    },
    onError: (error) => toast.error(error.message),
  });

  const copyInvite = async () => {
    if (!latestInviteUrl) return;
    try {
      await navigator.clipboard.writeText(latestInviteUrl);
      toast.success("Invitation link copied.");
    } catch {
      toast.error("The link could not be copied. Select and copy it manually.");
    }
  };

  return (
    <Card id="private-site-access" className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-primary" /> Private public-site access</CardTitle>
        <CardDescription>
          Issue access to the first-time-homebuyer website while it is under development. Invitation tokens are shown only when created and are not stored in the database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            if (!email.trim()) return;
            createInvite.mutate({ invitedEmail: email });
          }}
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="private-site-invite-email">Invited user email</Label>
            <Input id="private-site-invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="loanofficer@example.com" required />
          </div>
          <Button type="submit" disabled={createInvite.isPending}>
            {createInvite.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Create invitation
          </Button>
        </form>

        {latestInviteUrl && (
          <div className="space-y-2 rounded-xl border border-primary/25 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><Link2 className="h-4 w-4 text-primary" /> New invitation link</div>
            <p className="text-xs leading-5 text-muted-foreground">Send this link to the invited user. They must sign in with the same email address before accepting.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input aria-label="New private website invitation link" readOnly value={latestInviteUrl} className="min-w-0 text-xs" />
              <Button type="button" variant="outline" onClick={copyInvite}><Copy className="mr-2 h-4 w-4" /> Copy link</Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="text-sm font-semibold">Invitation history</div>
          {invitesQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading invitations…</div>
          ) : invitesQuery.data?.length ? (
            <div className="space-y-2">
              {invitesQuery.data.map((invite) => (
                <div key={invite.id} className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{invite.invitedEmail}</div>
                    <div className="text-xs text-muted-foreground">{invite.statusLabel} · Created {formatDate(invite.createdAt)} · Expires {formatDate(invite.expiresAt)}</div>
                  </div>
                  {(invite.status === "pending" || invite.status === "accepted") && (
                    <Button type="button" variant="ghost" size="sm" className="self-start text-destructive hover:text-destructive sm:self-auto" onClick={() => revokeInvite.mutate({ id: invite.id })} disabled={revokeInvite.isPending}>
                      <XCircle className="mr-2 h-4 w-4" /> Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No private-site invitations have been created.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
