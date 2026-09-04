"use client";

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { formatDecimal } from "@/lib/invoice/money";

import { registerPdfFonts } from "./fonts";

registerPdfFonts();

/**
 * The invoice PDF.
 *
 * Rendered from the stored `document_versions.data_json`, not from live
 * database rows. An invoice sent last March must still print exactly as it did
 * then, even after the client's address or the user's business name changes —
 * so this component takes a snapshot and never reaches for anything else.
 */

export type InvoicePdfData = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  notes: string | null;
  lineItems: {
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
  }[];
  discount: string;
  subtotal: string;
  tax: {
    components: { label: string; rateBasisPoints: number; amount: string }[];
    total: string;
    note: string | null;
  };
  total: string;
  supplier: {
    name: string | null;
    taxId: string | null;
    address: unknown;
  };
  client: {
    name: string;
    company: string | null;
    taxId: string | null;
    country: string;
    address: unknown;
  } | null;
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Noto Sans",
    fontSize: 10,
    padding: 40,
    color: "#0f172a",
    lineHeight: 1.5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  logo: { maxHeight: 44, maxWidth: 150, marginBottom: 8, objectFit: "contain" },
  /*
   * The heading needs its own line box. Noto Sans is registered as a variable
   * font (see ./fonts.ts) and react-pdf mis-measures its metrics, so at 22pt
   * the inherited line height left a box shorter than the glyphs — the invoice
   * number below printed on top of the word "Invoice" on every PDF a client
   * received. An explicit height on the heading is what keeps them apart.
   */
  title: { fontSize: 22, fontWeight: 700, lineHeight: 1.2, marginBottom: 6 },
  invoiceNumber: { fontSize: 10, color: "#475569" },
  parties: { flexDirection: "row", gap: 32, marginBottom: 24 },
  party: { flex: 1 },
  partyLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#64748b",
    marginBottom: 4,
  },
  partyName: { fontWeight: 700 },
  meta: { flexDirection: "row", gap: 32, marginBottom: 20 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#0f172a",
    paddingBottom: 6,
    marginBottom: 6,
    fontWeight: 700,
    fontSize: 9,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
  },
  colDescription: { flex: 3 },
  colQuantity: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.2, textAlign: "right" },
  colAmount: { flex: 1.4, textAlign: "right" },
  totals: { marginTop: 16, marginLeft: "auto", width: 220 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#0f172a",
    marginTop: 6,
    paddingTop: 6,
    fontSize: 12,
    fontWeight: 700,
  },
  note: { marginTop: 10, fontSize: 9, color: "#475569" },
  notes: { marginTop: 28 },
  sectionLabel: { fontWeight: 700, marginBottom: 3 },
  watermark: {
    position: "absolute",
    bottom: 46,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#cbd5e1",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
  },
});

function formatAddress(address: unknown): string[] {
  if (!address || typeof address !== "object") return [];
  const lines = (address as { lines?: unknown }).lines;
  return Array.isArray(lines) ? lines.filter((l) => typeof l === "string") : [];
}

/**
 * The same formatting the app shows.
 *
 * This printed "INR 118000.00" — a database row rather than money — on the one
 * document a client actually sees, while every in-app view of the same figure
 * read "₹1,18,000.00". Noto Sans is registered precisely so the rupee sign
 * renders here.
 */
function money(amount: string, currency: string): string {
  return formatDecimal(amount, currency);
}

export function InvoiceDocument({
  data,
  watermark = false,
  logoUrl,
}: {
  data: InvoicePdfData;
  watermark?: boolean;
  /**
   * Passed in rather than read from the snapshot: the logo lives in a private
   * bucket behind a URL that expires, so a link stored in data_json would be
   * dead by the time anyone reprinted the invoice. The path is the stable
   * reference; the URL is minted per render.
   */
  logoUrl?: string | null;
}) {
  const supplierAddress = formatAddress(data.supplier.address);
  const clientAddress = formatAddress(data.client?.address);

  const isTaxInvoice = data.tax.components.length > 0;

  return (
    <Document
      title={data.invoiceNumber}
      author={data.supplier.name ?? undefined}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image
                takes no alt; a PDF has no alternative-text channel here. */}
            {logoUrl ? <Image style={styles.logo} src={logoUrl} /> : null}

            {/* "Tax Invoice" is the required heading under Indian GST rules
                when tax is charged; a zero-rated export is just an invoice. */}
            <Text style={styles.title}>
              {isTaxInvoice ? "Tax Invoice" : "Invoice"}
            </Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
          </View>
          <View>
            <Text style={styles.partyName}>
              {data.supplier.name ?? "—"}
            </Text>
            {supplierAddress.map((line, i) => (
              <Text key={i}>{line}</Text>
            ))}
            {data.supplier.taxId ? <Text>{data.supplier.taxId}</Text> : null}
          </View>
        </View>

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>Billed to</Text>
            <Text style={styles.partyName}>{data.client?.name ?? "—"}</Text>
            {data.client?.company ? <Text>{data.client.company}</Text> : null}
            {clientAddress.map((line, i) => (
              <Text key={i}>{line}</Text>
            ))}
            {data.client?.taxId ? <Text>{data.client.taxId}</Text> : null}
          </View>

          <View style={styles.party}>
            <Text style={styles.partyLabel}>Issued</Text>
            <Text>{data.issueDate}</Text>
            {data.dueDate ? (
              <>
                <Text style={[styles.partyLabel, { marginTop: 8 }]}>Due</Text>
                <Text>{data.dueDate}</Text>
              </>
            ) : null}
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colDescription}>Description</Text>
          <Text style={styles.colQuantity}>Qty</Text>
          <Text style={styles.colPrice}>Rate</Text>
          <Text style={styles.colAmount}>Amount</Text>
        </View>

        {data.lineItems.map((item, index) => (
          <View key={index} style={styles.row} wrap={false}>
            <Text style={styles.colDescription}>{item.description}</Text>
            <Text style={styles.colQuantity}>{item.quantity}</Text>
            <Text style={styles.colPrice}>
              {money(item.unitPrice, data.currency)}
            </Text>
            <Text style={styles.colAmount}>
              {money(item.amount, data.currency)}
            </Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{money(data.subtotal, data.currency)}</Text>
          </View>

          {data.discount !== "0.00" && data.discount !== "0" ? (
            <View style={styles.totalRow}>
              <Text>Discount</Text>
              <Text>− {money(data.discount, data.currency)}</Text>
            </View>
          ) : null}

          {data.tax.components.map((component) => (
            <View key={component.label} style={styles.totalRow}>
              <Text>
                {component.label} ({component.rateBasisPoints / 100}%)
              </Text>
              <Text>{money(component.amount, data.currency)}</Text>
            </View>
          ))}

          <View style={styles.grandTotal}>
            <Text>Total</Text>
            <Text>{money(data.total, data.currency)}</Text>
          </View>
        </View>

        {data.tax.note ? (
          <Text style={styles.note}>{data.tax.note}</Text>
        ) : null}

        {data.notes ? (
          <View style={styles.notes}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text>{data.notes}</Text>
          </View>
        ) : null}

        {/* Free-plan mark. Deliberately small and at the foot of the page:
            it should make the user want to upgrade, not make the invoice
            embarrassing to send to a paying client. */}
        {watermark ? (
          <Text style={styles.watermark} fixed>
            Created with Doqment
          </Text>
        ) : null}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            totalPages > 1
              ? `${data.invoiceNumber} — page ${pageNumber} of ${totalPages}`
              : data.invoiceNumber
          }
          fixed
        />
      </Page>
    </Document>
  );
}
