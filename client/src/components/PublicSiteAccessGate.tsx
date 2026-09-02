import type { ReactNode } from "react";
import { useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LockKeyhole, MailCheck, ShieldAlert } from "lucide-react";

function getInviteToken() {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("invite") || undefined;
}

export default function PublicSiteAccessGate({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated, user, logout } = useAuth();
  const inviteToken = useMemo(getInviteToken, []);
  const accessQuery = trpc.publicSiteAccess.status.useQuery(
    { token: inviteToken },
    { enabled: Boolean(isAuthenticated), retry: false },
  );
  const acceptInvite = trpc.publicSiteAccess.accept.useMutation({
    onSuccess: () => accessQuery.refetch(),
  });

  if (loading || (isAuthenticated && accessQuery.isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking private-site access…
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <LockKeyhole className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
            <CardTitle className="mt-2 font-display text-2xl">Private development site</CardTitle>
            <CardDescription>
              This first-time-homebuyer website is temporarily private while it is being developed. Sign in with an invited account to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => startLogin()}>Sign in with Manus</Button>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Access is granted only after the signed-in email accepts an administrator-issued invitation.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const access = accessQuery.data;
  if (access?.access === "admin" || access?.access === "accepted") return <>{children}</>;

  if (access?.access === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <MailCheck className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
            <CardTitle className="mt-2 font-display text-2xl">Accept your website invitation</CardTitle>
            <CardDescription>
              This signed-in email has a pending invitation. Accept it to open the private first-time-homebuyer website.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => acceptInvite.mutate({ token: inviteToken })} disabled={acceptInvite.isPending}>
              {acceptInvite.isPending ? "Accepting invitation…" : "Accept invitation"}
            </Button>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">Signed in as {user?.email || user?.name || "the invited account"}.</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => logout()}>Use a different account</Button>
            {acceptInvite.error && <p className="mt-3 text-sm text-destructive">{acceptInvite.error.message}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  const message = access?.access === "revoked"
    ? "This website invitation has been revoked by the administrator."
    : access?.access === "expired"
      ? "This website invitation has expired. Ask the administrator for a new invitation."
      : "This email does not have an accepted invitation for the private website.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <ShieldAlert className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
          <CardTitle className="mt-2 font-display text-2xl">Website access not available</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs leading-5 text-muted-foreground">Signed in as {user?.email || user?.name || "the current account"}.</p>
          <Button variant="outline" className="mt-4" onClick={() => logout()}>Sign out</Button>
        </CardContent>
      </Card>
    </div>
  );
}
