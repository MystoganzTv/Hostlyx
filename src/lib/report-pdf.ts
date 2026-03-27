import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { DashboardView } from "@/lib/types";

type ShareReportPdfInput = {
  businessName: string;
  generatedAt: string;
  latestImportFileName?: string | null;
  view: DashboardView;
};

const pageWidth = 841.89;
const pageHeight = 595.28;
const pageMargin = 24;
const sheetInset = 14;
const sheetWidth = pageWidth - pageMargin * 2;
const sheetHeight = pageHeight - pageMargin * 2;
const contentX = pageMargin + sheetInset;
const contentY = pageMargin + sheetInset;
const contentWidth = sheetWidth - sheetInset * 2;
const contentTop = pageHeight - pageMargin - sheetInset;

function drawRect(
  page: PDFPage,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    fill: ReturnType<typeof rgb>;
    border?: ReturnType<typeof rgb>;
    borderWidth?: number;
  },
) {
  page.drawRectangle({
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    color: options.fill,
    borderColor: options.border,
    borderWidth: options.borderWidth ?? 0,
  });
}

function drawTextBlock(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  topY: number,
  maxWidth: number,
  size: number,
  color: ReturnType<typeof rgb>,
  lineHeight = size * 1.35,
  maxLines = 2,
) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    current = word;

    if (lines.length === maxLines - 1) {
      break;
    }
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    lines.length = maxLines;
  }

  if (words.length > 0 && lines.length === maxLines) {
    const consumed = lines.join(" ").split(/\s+/).filter(Boolean).length;

    if (consumed < words.length) {
      let lastLine = lines[maxLines - 1] ?? "";

      while (lastLine.length > 0 && font.widthOfTextAtSize(`${lastLine}...`, size) > maxWidth) {
        lastLine = lastLine.slice(0, -1).trimEnd();
      }

      lines[maxLines - 1] = `${lastLine}...`;
    }
  }

  for (const [index, line] of lines.entries()) {
    page.drawText(line, {
      x,
      y: topY - size - index * lineHeight,
      size,
      font,
      color,
    });
  }
}

function drawLabel(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  topY: number,
  color: ReturnType<typeof rgb>,
) {
  page.drawText(text.toUpperCase(), {
    x,
    y: topY - 10,
    size: 9,
    font,
    color,
  });
}

function drawMetricCard(
  page: PDFPage,
  fonts: { regular: PDFFont; semibold: PDFFont },
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    value: string;
    helper: string;
    emphasis?: boolean;
  },
) {
  const fill = options.emphasis ? rgb(0.93, 0.99, 0.97) : rgb(1, 1, 1);
  const border = options.emphasis ? rgb(0.76, 0.92, 0.86) : rgb(0.87, 0.9, 0.94);
  const labelColor = rgb(0.44, 0.5, 0.61);
  const valueColor = rgb(0.03, 0.07, 0.15);
  const helperColor = rgb(0.4, 0.45, 0.53);
  const top = options.y + options.height - 18;

  drawRect(page, {
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    fill,
    border,
    borderWidth: 1,
  });

  drawLabel(page, fonts.semibold, options.label, options.x + 16, top, labelColor);
  page.drawText(options.value, {
    x: options.x + 16,
    y: options.y + (options.emphasis ? options.height - 82 : options.height - 60),
    size: options.emphasis ? 33 : 22,
    font: fonts.semibold,
    color: valueColor,
  });

  drawTextBlock(
    page,
    fonts.regular,
    options.helper,
    options.x + 16,
    options.y + (options.emphasis ? 58 : 44),
    options.width - 32,
    10.5,
    helperColor,
    14,
    options.emphasis ? 2 : 2,
  );
}

function drawDetailCard(
  page: PDFPage,
  fonts: { regular: PDFFont; semibold: PDFFont },
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    rows: Array<{ label: string; sublabel: string; value: string }>;
  },
) {
  drawRect(page, {
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    fill: rgb(1, 1, 1),
    border: rgb(0.87, 0.9, 0.94),
    borderWidth: 1,
  });

  drawLabel(page, fonts.semibold, options.title, options.x + 16, options.y + options.height - 18, rgb(0.44, 0.5, 0.61));

  let cursorY = options.y + options.height - 44;

  for (const [index, row] of options.rows.entries()) {
    page.drawText(row.label, {
      x: options.x + 16,
      y: cursorY - 12,
      size: 11.5,
      font: fonts.semibold,
      color: rgb(0.08, 0.12, 0.2),
    });
    page.drawText(row.value, {
      x: options.x + options.width - 16 - fonts.semibold.widthOfTextAtSize(row.value, 11.5),
      y: cursorY - 12,
      size: 11.5,
      font: fonts.semibold,
      color: rgb(0.08, 0.12, 0.2),
    });
    drawTextBlock(
      page,
      fonts.regular,
      row.sublabel,
      options.x + 16,
      cursorY - 18,
      options.width - 32,
      9.5,
      rgb(0.44, 0.5, 0.61),
      12.5,
      1,
    );

    cursorY -= 42;

    if (index < options.rows.length - 1) {
      page.drawLine({
        start: { x: options.x + 16, y: cursorY + 6 },
        end: { x: options.x + options.width - 16, y: cursorY + 6 },
        thickness: 1,
        color: rgb(0.93, 0.95, 0.97),
      });
    }
  }
}

function truncateMiddle(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  const start = value.slice(0, Math.max(0, maxLength - 12));
  const end = value.slice(-9);
  return `${start}...${end}`;
}

export async function generateShareReportPdf(input: ShareReportPdfInput) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([pageWidth, pageHeight]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const semibold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const fonts = { regular, semibold };
  const topExpenseCategories = input.view.expensesByCategory.slice(0, 3);
  const totalExpenses = input.view.expensesByCategory.reduce((sum, item) => sum + item.value, 0);
  const topChannels = input.view.revenueByChannel
    .slice()
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 3);

  drawRect(page, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    fill: rgb(0.94, 0.96, 0.98),
  });

  drawRect(page, {
    x: pageMargin,
    y: pageMargin,
    width: sheetWidth,
    height: sheetHeight,
    fill: rgb(0.99, 0.995, 1),
    border: rgb(0.88, 0.91, 0.95),
    borderWidth: 1,
  });

  const headerLeftWidth = 470;
  const metaCardWidth = contentWidth - headerLeftWidth - 20;
  const metaCardHeight = 55;
  const metaGap = 10;

  drawLabel(page, semibold, "Hostlyx Financial Summary", contentX, contentTop - 2, rgb(0.44, 0.5, 0.61));
  page.drawText(input.businessName, {
    x: contentX,
    y: contentTop - 55,
    size: 27,
    font: semibold,
    color: rgb(0.03, 0.07, 0.15),
  });

  drawTextBlock(
    page,
    regular,
    "A clean snapshot of revenue, costs, profit, and what the business keeps after estimated taxes. Prepared for accountant, partner, or investor review.",
    contentX,
    contentTop - 80,
    headerLeftWidth - 20,
    11,
    rgb(0.4, 0.45, 0.53),
    14,
    3,
  );

  const metaX = contentX + headerLeftWidth + 20;
  const metaTop = contentTop - 4;
  const metaRows = [
    { label: "Reporting period", value: input.view.rangeLabel },
    { label: "Generated", value: input.generatedAt },
    { label: "Source file", value: input.latestImportFileName ? truncateMiddle(input.latestImportFileName, 38) : "No file attached" },
  ];

  metaRows.forEach((row, index) => {
    const y = metaTop - (index + 1) * metaCardHeight - index * metaGap;
    drawRect(page, {
      x: metaX,
      y,
      width: metaCardWidth,
      height: metaCardHeight,
      fill: rgb(1, 1, 1),
      border: rgb(0.87, 0.9, 0.94),
      borderWidth: 1,
    });
    drawLabel(page, semibold, row.label, metaX + 14, y + metaCardHeight - 12, rgb(0.44, 0.5, 0.61));
    drawTextBlock(
      page,
      row.label === "Source file" ? regular : semibold,
      row.value,
      metaX + 14,
      y + metaCardHeight - 26,
      metaCardWidth - 28,
      row.label === "Source file" ? 10 : 11.5,
      rgb(0.08, 0.12, 0.2),
      13,
      row.label === "Source file" ? 2 : 1,
    );
  });

  const dividerY = contentTop - 151;
  page.drawLine({
    start: { x: contentX, y: dividerY },
    end: { x: contentX + contentWidth, y: dividerY },
    thickness: 1,
    color: rgb(0.9, 0.93, 0.96),
  });

  const summaryTop = dividerY - 12;
  const heroHeight = 120;
  const sideWidth = 206;
  const heroWidth = contentWidth - sideWidth - 16;
  const heroY = summaryTop - heroHeight;
  const stackedHeight = (heroHeight - 10) / 2;
  const sideX = contentX + heroWidth + 16;

  drawMetricCard(page, fonts, {
    x: contentX,
    y: heroY,
    width: heroWidth,
    height: heroHeight,
    label: "You Keep",
    value: formatCurrency(input.view.metrics.profitAfterTax, false, input.view.displayCurrencyCode),
    helper: "This is roughly what remains after setting aside estimated taxes.",
    emphasis: true,
  });

  drawMetricCard(page, fonts, {
    x: sideX,
    y: heroY + stackedHeight + 10,
    width: sideWidth,
    height: stackedHeight,
    label: "Set Aside",
    value: formatCurrency(input.view.metrics.estimatedTaxes, false, input.view.displayCurrencyCode),
    helper: "Estimated tax reserve.",
  });

  drawMetricCard(page, fonts, {
    x: sideX,
    y: heroY,
    width: sideWidth,
    height: stackedHeight,
    label: "Net Profit",
    value: formatCurrency(input.view.metrics.netProfit, false, input.view.displayCurrencyCode),
    helper: "Profit before taxes.",
  });

  const metricTop = heroY - 14;
  const metricHeight = 78;
  const metricGap = 12;
  const smallMetricWidth = (contentWidth - metricGap * 3) / 4;
  const smallMetricY = metricTop - metricHeight;
  const smallMetrics = [
    {
      label: "Revenue",
      value: formatCurrency(input.view.metrics.totalRevenue, false, input.view.displayCurrencyCode),
      helper: "Gross revenue.",
    },
    {
      label: "Expenses",
      value: formatCurrency(input.view.metrics.totalExpenses, false, input.view.displayCurrencyCode),
      helper: "Operating costs.",
    },
    {
      label: "Bookings",
      value: formatNumber(input.view.metrics.bookingsCount),
      helper: "Imported stays.",
    },
    {
      label: "Profit Margin",
      value: formatPercent(input.view.metrics.profitMargin),
      helper: "Profit before tax.",
    },
  ];

  smallMetrics.forEach((metric, index) => {
    drawMetricCard(page, fonts, {
      x: contentX + index * (smallMetricWidth + metricGap),
      y: smallMetricY,
      width: smallMetricWidth,
      height: metricHeight,
      ...metric,
    });
  });

  const detailTop = smallMetricY - 14;
  const detailHeight = 122;
  const detailGap = 14;
  const detailWidth = (contentWidth - detailGap) / 2;
  const detailY = detailTop - detailHeight;

  drawDetailCard(page, fonts, {
    x: contentX,
    y: detailY,
    width: detailWidth,
    height: detailHeight,
    title: "Revenue by channel",
    rows: topChannels.map((channel) => ({
      label: channel.label,
      sublabel: `${formatNumber(channel.bookings)} bookings`,
      value: formatCurrency(channel.revenue, false, input.view.displayCurrencyCode),
    })),
  });

  drawDetailCard(page, fonts, {
    x: contentX + detailWidth + detailGap,
    y: detailY,
    width: detailWidth,
    height: detailHeight,
    title: "Expense structure",
    rows: topExpenseCategories.map((item) => ({
      label: item.label,
      sublabel: `${formatPercent(totalExpenses > 0 ? item.value / totalExpenses : 0)} of total expenses`,
      value: formatCurrency(item.value, false, input.view.displayCurrencyCode),
    })),
  });

  const footerText = [
    "Report generated by Hostlyx from imported bookings and expenses.",
    input.latestImportFileName ? `Latest source: ${truncateMiddle(input.latestImportFileName, 58)}.` : "",
    input.view.monthlySummary[0]?.label && input.view.monthlySummary.at(-1)?.label
      ? `Coverage: ${input.view.monthlySummary[0].label} to ${input.view.monthlySummary.at(-1)?.label}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  page.drawLine({
    start: { x: contentX, y: contentY + 34 },
    end: { x: contentX + contentWidth, y: contentY + 34 },
    thickness: 1,
    color: rgb(0.9, 0.93, 0.96),
  });

  drawTextBlock(
    page,
    regular,
    footerText,
    contentX,
    contentY + 24,
    contentWidth,
    9.5,
    rgb(0.44, 0.5, 0.61),
    12,
    2,
  );

  return pdf.save();
}
