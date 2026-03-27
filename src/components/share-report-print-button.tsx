export function ShareReportPrintButton({
  className,
  href,
}: {
  className: string;
  href: string;
}) {
  return (
    <a href={href} className={className}>
      Export PDF
    </a>
  );
}
