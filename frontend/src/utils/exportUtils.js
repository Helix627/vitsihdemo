import jsPDF from "jspdf";

/**
 * Downloads arbitrary object data as a formatted JSON file.
 */
export function exportToJson(data, filename) {
  const exportPayload = {
    _metadata: {
      platform: "Darknet Cross-Marketplace Identity Resolution Platform",
      classification: "LAW ENFORCEMENT SENSITIVE // CTI FORENSIC DOSSIER",
      generated_at: new Date().toISOString(),
      format_version: "2.0-JSON",
    },
    intelligence_payload: data,
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a formal forensic CTI PDF intelligence report.
 */
export function exportToPdf(report, filename) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header Banner
  doc.setFillColor(15, 23, 42); // Dark slate
  doc.rect(0, 0, pageWidth, 26, "F");

  doc.setTextColor(56, 189, 248); // Cyan
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("DARKNET THREAT INTELLIGENCE DOSSIER", 14, 11);

  doc.setTextColor(148, 163, 184); // Slate 400
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("CROSS-MARKETPLACE ENTITY RESOLUTION & FORENSIC ATTRIBUTION REPORT", 14, 17);
  doc.text(`GENERATED: ${new Date().toUTCString()} | CLASSIFICATION: CTI // INVESTIGATIVE`, 14, 22);

  y = 34;

  // Title / Subject
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`SUBJECT: ${(report.title || "Intelligence Report").toUpperCase()}`, 14, y);
  y += 7;

  // Key Value Summary Grid
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);

  doc.text(`Target Persona: ${report.actorHandle || "Unknown / Unspecified"}`, 18, y + 6);
  doc.text(`Cluster Reference: #${report.clusterId || "Pending Allocation"}`, 18, y + 13);
  doc.text(`Source Dataset: ${report.sourceDataset || "Live Intelligence Stream"}`, 18, y + 19);

  if (report.confidence !== undefined) {
    const confText = `${(report.confidence * (report.confidence > 1 ? 1 : 100)).toFixed(1)}%`;
    doc.text(`Resolution Confidence: ${confText}`, 110, y + 6);
    doc.text(`Decision Action: ${report.resolution || "EVALUATING"}`, 110, y + 13);
  }
  y += 28;

  // Extracted Cryptographic & Digital Infrastructure
  if (report.extractedEntities) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("1. EXTRACTED DIGITAL INFRASTRUCTURE & CRYPTOGRAPHIC ASSETS", 14, y);
    y += 5;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);

    const { bitcoin_wallets, monero_wallets, pgp_fingerprints, emails, telegram_handles, discord_handles } = report.extractedEntities;

    if (bitcoin_wallets && bitcoin_wallets.length > 0) {
      doc.text(`• Bitcoin Deposit Addresses: ${bitcoin_wallets.join(", ")}`, 18, y);
      y += 5;
    }
    if (monero_wallets && monero_wallets.length > 0) {
      doc.text(`• Monero Stealth Wallets: ${monero_wallets.join(", ")}`, 18, y);
      y += 5;
    }
    if (pgp_fingerprints && pgp_fingerprints.length > 0) {
      doc.text(`• PGP Key Fingerprints: ${pgp_fingerprints.join(", ")}`, 18, y);
      y += 5;
    }
    if (emails && emails.length > 0) {
      doc.text(`• Associated Contact Emails: ${emails.join(", ")}`, 18, y);
      y += 5;
    }
    if (telegram_handles && telegram_handles.length > 0) {
      doc.text(`• Drop Messaging (Telegram): ${telegram_handles.join(", ")}`, 18, y);
      y += 5;
    }
    if (discord_handles && discord_handles.length > 0) {
      doc.text(`• Drop Messaging (Discord): ${discord_handles.join(", ")}`, 18, y);
      y += 5;
    }
    y += 4;
  }

  // Stylometric Linguistic Features
  if (report.stylometricFeatures && Object.keys(report.stylometricFeatures).length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("2. 11-DIMENSIONAL STYLOMETRIC LINGUISTIC PROFILING", 14, y);
    y += 5;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);

    const sf = report.stylometricFeatures;
    const col1 = [
      `• Vocabulary Richness (TTR): ${sf.vocabulary_richness !== undefined ? sf.vocabulary_richness.toFixed(3) : "N/A"}`,
      `• Avg Sentence Length: ${sf.avg_sentence_len !== undefined ? sf.avg_sentence_len.toFixed(1) + " words" : "N/A"}`,
      `• Avg Word Length: ${sf.avg_word_len !== undefined ? sf.avg_word_len.toFixed(1) + " chars" : "N/A"}`,
      `• Uppercase Ratio: ${sf.upper_ratio !== undefined ? (sf.upper_ratio * 100).toFixed(1) + "%" : "N/A"}`,
    ];
    const col2 = [
      `• Digit Ratio: ${sf.digit_ratio !== undefined ? (sf.digit_ratio * 100).toFixed(1) + "%" : "N/A"}`,
      `• Punctuation Density: ${sf.punct_ratio !== undefined ? (sf.punct_ratio * 100).toFixed(1) + "%" : "N/A"}`,
      `• Darknet Slang Frequency: ${sf.slang_freq !== undefined ? (sf.slang_freq * 100).toFixed(1) + "%" : "N/A"}`,
      `• OpSec Keyword Density: ${sf.opsec_freq !== undefined ? (sf.opsec_freq * 100).toFixed(1) + "%" : "N/A"}`,
    ];

    col1.forEach((text, i) => {
      doc.text(text, 18, y + i * 4.5);
    });
    col2.forEach((text, i) => {
      doc.text(text, 110, y + i * 4.5);
    });
    y += Math.max(col1.length, col2.length) * 4.5 + 4;
  }

  // Heuristic Resolution & Forensic Breakdown
  if (report.heuristicReason) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("3. RESOLUTION EVIDENCE & FORENSIC JUSTIFICATION", 14, y);
    y += 5;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);

    const splitReason = doc.splitTextToSize(`Forensic Analysis: ${report.heuristicReason}`, pageWidth - 28);
    doc.text(splitReason, 18, y);
    y += splitReason.length * 4 + 4;
  }

  // Bulk Preview Summary
  if (report.recordsPreview && report.recordsPreview.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`4. BATCH INGESTION SUMMARY (${report.recordsPreview.length} RECORDS)`, 14, y);
    y += 5;

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);

    report.recordsPreview.slice(0, 10).forEach((rec, idx) => {
      const line = `#${idx + 1} Handle: ${rec.handle || rec.username} | Action: ${rec.resolution || rec.linking_forecast?.action || "NEW"} | Conf: ${((rec.confidence || rec.linking_forecast?.confidence_percentage || 0) * (rec.confidence ? 100 : 1)).toFixed(1)}% | ${rec.details || rec.linking_forecast?.explanation || ""}`;
      const splitLine = doc.splitTextToSize(line, pageWidth - 28);
      doc.text(splitLine, 18, y);
      y += splitLine.length * 3.8;
      if (y > 270) {
        doc.addPage();
        y = 15;
      }
    });
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("CONFIDENTIAL // LAW ENFORCEMENT & INVESTIGATIVE FORENSICS ONLY // GENERATED BY ANTIGRAVITY DARKNET PLATFORM", 14, 287);

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
