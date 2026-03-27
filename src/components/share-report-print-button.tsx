"use client";

export function ShareReportPrintButton({
  className,
}: {
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={className}
    >
      Export PDF
    </button>
  );
}
