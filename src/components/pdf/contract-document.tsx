"use client";

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { registerPdfFonts } from "./fonts";

registerPdfFonts();

/**
 * The PDF for every document type that is prose rather than a table —
 * proposals, service agreements, SOWs, NDAs, payment reminders.
 *
 * One component for all five, because they differ in their words rather than
 * their shape. A per-type component would mean five places to fix a widow at
 * the foot of a page.
 *
 * Rendered from the stored version snapshot, never from live rows: an
 * agreement signed in March must still print as it did then.
 */

export type ContractPdfData = {
  title: string;
  blocks: { id: string; heading: string | null; text: string }[];
};

/*
 * There is deliberately no signature block here. The templates that need one
 * carry their own `signatures` block in their body, and a payment reminder is
 * a letter with nowhere to sign — rendering one from this component as well
 * would print two sets of signature lines on every agreement.
 */

const styles = StyleSheet.create({
  page: {
    fontFamily: "Noto Sans",
    fontSize: 10.5,
    padding: 56,
    color: "#0f172a",
    lineHeight: 1.6,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 20,
    textAlign: "center",
  },
  block: { marginBottom: 12 },
  heading: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
  text: { textAlign: "justify" },
  watermark: {
    position: "absolute",
    bottom: 40,
    left: 56,
    right: 56,
    fontSize: 8,
    color: "#cbd5e1",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 56,
    right: 56,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
  },
});

export function ContractDocument({
  data,
  watermark = false,
}: {
  data: ContractPdfData;
  watermark?: boolean;
}) {
  return (
    <Document title={data.title}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{data.title}</Text>

        {data.blocks.map((block) => (
          // wrap={false} keeps a short clause from splitting across pages,
          // which in a contract reads as a missing paragraph.
          <View key={block.id} style={styles.block} wrap={block.text.length > 600}>
            {block.heading ? (
              <Text style={styles.heading}>{block.heading}</Text>
            ) : null}
            <Text style={styles.text}>{block.text}</Text>
          </View>
        ))}


        {watermark ? (
          <Text style={styles.watermark} fixed>
            Created with Doqment
          </Text>
        ) : null}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : ""
          }
          fixed
        />
      </Page>
    </Document>
  );
}
