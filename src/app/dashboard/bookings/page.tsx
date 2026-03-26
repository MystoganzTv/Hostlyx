import { redirect } from "next/navigation";
import { BookOpenText, Home } from "lucide-react";
import { BookingsManager } from "@/components/bookings-manager";
import { SectionCard } from "@/components/section-card";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getAuthSession } from "@/lib/auth";
import {
  getBookings,
  getLatestImport,
  getPropertyDefinitions,
  getUserSettings,
} from "@/lib/db";
import { formatNumber } from "@/lib/format";

export const runtime = "nodejs";

export default async function BookingsPage() {
  const session = await getAuthSession();
  const ownerEmail = session?.user?.email?.toLowerCase();

  if (!session?.user?.email || !ownerEmail) {
    redirect("/login");
  }

  const userName = session.user.name ?? session.user.email ?? "Host";
  const [bookings, latestImport, userSettings, properties] = await Promise.all([
    getBookings(ownerEmail),
    getLatestImport(ownerEmail),
    getUserSettings(ownerEmail, userName),
    getPropertyDefinitions(ownerEmail),
  ]);

  const propertyCount = new Set(bookings.map((booking) => booking.propertyName)).size;

  return (
    <WorkspaceShell
      activePage="bookings"
      pageTitle="Bookings"
      pageSubtitle="Review guest stays, payouts, and property assignments."
      businessName={userSettings.businessName}
      userName={userName}
      userEmail={ownerEmail}
      currencyCode={userSettings.currencyCode}
      latestImport={latestImport}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <SectionCard title="Total bookings">
            <div className="flex items-center gap-3">
              <div className="workspace-icon-chip rounded-2xl p-3">
                <BookOpenText className="h-5 w-5" />
              </div>
              <p className="text-2xl font-semibold text-[var(--workspace-text)]">
                {formatNumber(bookings.length)}
              </p>
            </div>
          </SectionCard>
          <SectionCard title="Properties used">
            <div className="flex items-center gap-3">
              <div className="workspace-icon-chip rounded-2xl p-3">
                <Home className="h-5 w-5" />
              </div>
              <p className="text-2xl font-semibold text-[var(--workspace-text)]">
                {formatNumber(propertyCount)}
              </p>
            </div>
          </SectionCard>
          <SectionCard title="Editing">
            <p className="text-sm leading-6 text-[var(--workspace-muted)]">
              Use this page to correct guest data, move bookings between properties or units, and clean imports without touching the spreadsheet.
            </p>
          </SectionCard>
        </div>

        <SectionCard
          title="All Bookings"
          subtitle="Every booking in this business account. Edit and delete actions only affect your own workspace."
        >
          <BookingsManager
            bookings={bookings}
            currencyCode={userSettings.currencyCode}
            properties={properties}
          />
        </SectionCard>
      </div>
    </WorkspaceShell>
  );
}
