import { auth, signOut } from "@/auth";
import { listLeads } from "@/lib/leads";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function statusVariant(status: string) {
  if (status === "paid") return "default" as const;
  if (status === "unlocked") return "secondary" as const;
  return "secondary" as const;
}

export default async function DashboardPage() {
  // Defense-in-depth: proxy.ts already redirects unauthenticated requests,
  // but this page (and any server action it calls) must not trust that
  // alone — re-verify the session here too.
  const session = await auth();
  if (!session) return null;

  const leads = listLeads();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">Leads</h1>
          <p className="text-sm text-zinc-500">
            Signed in as {session.user?.email}
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button variant="outline" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Ban Reason</th>
              <th className="px-4 py-3 font-medium">Violation</th>
              <th className="px-4 py-3 font-medium">Probability</th>
              <th className="px-4 py-3 font-medium">Screenshot</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No leads yet.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-zinc-900 last:border-0">
                <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                  {new Date(lead.createdAt).toLocaleString()}
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-zinc-200" title={lead.banReason}>
                  {lead.banReason}
                </td>
                <td className="px-4 py-3 text-zinc-200">{lead.analysis.violation_name}</td>
                <td className="px-4 py-3 text-zinc-200">{lead.analysis.probability}%</td>
                <td className="px-4 py-3 text-zinc-400">{lead.hasScreenshot ? "Yes" : "No"}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(lead.status)}>{lead.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
