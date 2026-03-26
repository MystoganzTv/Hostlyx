import { redirect } from "next/navigation";
import { BookOpenText, Home } from "lucide-react";
import { BookingsManager } from "@/components/bookings-manager";
import { SectionCard } from "@/components/section-card";
import { WorkspaceHeader } from "@/components/workspace-header";
import { getAuthSession } from "@/lib/auth";
import { getBookings, getLatestImport, getUserSettings } from "@/lib/db";
import { formatNumber } from "@/lib/format";

export const runtime = "nodejs";

export default async function BookingsPage() {
  const session = await getAuthSession();
  const ownerEmail = session?.user?.email?.toLowerCase();

  if (!session?.user?.email || !ownerEmail) {
    redirect("/login");
  }

  const userName = session.user.name ?? session.user.email ?? "Host";
  const [bookings, latestImport, userSettings] = await Promise.all([
    getBookings(ownerEmail),
    getLatestImport(ownerEmail),
    getUserSettings(ownerEmail, userName),
  ]);

  const propertyCount = new Set(bookings.map((booking) => booking.propertyName)).size;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-6 px-4 py-5 sm:px-6 sm:py-8 xl:px-8">
      <WorkspaceHeader
        activePage="bookings"
        businessName={userSettings.businessName}
        userName={userName}
        userEmail={ownerEmail}
        currencyCode={userSettings.currencyCode}
        latestImport={latestImport}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard title="Total bookings">
          <div className="flex items-center gap-3">
            <BookOpenText className="h-5 w-5 text-[var(--accent-text)]" />
            <p className="text-2xl font-semibold text-white">{formatNumber(bookings.length)}</p>
          </div>
        </SectionCard>
        <SectionCard title="Properties used">
          <div className="flex items-center gap-3">
            <Home className="h-5 w-5 text-[var(--accent-text)]" />
            <p className="text-2xl font-semibold text-white">{formatNumber(propertyCount)}</p>
          </div>
        </SectionCard>
        <SectionCard title="Editing">
          <p className="text-sm leading-6 text-slate-400">
            Use this page to correct guest data, move bookings between properties or units, and clean imports without touching the spreadsheet.
          </p>
        </SectionCard>
      </div>

      <SectionCard
        title="All Bookings"
        subtitle="Every booking in this business account. Edit and delete actions only affect your own workspace."
      >
        <BookingsManager bookings={bookings} currencyCode={userSettings.currencyCode} />
      </SectionCard>
    </main>
  );
}
