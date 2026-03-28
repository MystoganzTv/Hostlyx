import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy | Hostlyx",
  description: "Privacy Policy for Hostlyx.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="Legal"
      title="Privacy Policy"
      description="This page explains what information Hostlyx collects, how it is used, and how billing and reporting data are handled."
    >
      <section>
        <h2 className="text-xl font-semibold text-slate-100">Information we collect</h2>
        <p className="mt-3">
          Hostlyx stores account details, uploaded booking and expense data, workspace settings, and subscription records needed to run the product. Payment details are processed by Stripe and are not stored directly by Hostlyx.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-100">How data is used</h2>
        <p className="mt-3">
          We use your data to generate dashboards, reports, tax estimates, and subscription access controls. We may also use account-level metadata to maintain security, troubleshoot issues, and improve the product.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-100">Sharing and processors</h2>
        <p className="mt-3">
          Hostlyx relies on third-party infrastructure providers such as Netlify, database services, authentication providers, and Stripe for billing. We only share information with those services when needed to operate the platform.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-100">Retention and deletion</h2>
        <p className="mt-3">
          Your data remains associated with your workspace unless you request deletion or we remove an account for abuse, legal, or operational reasons. Subscription expiration does not automatically delete uploaded business data.
        </p>
      </section>
    </LegalPageShell>
  );
}
