import { Injectable } from '@angular/core';
import type { Work } from '../../models/work.model';
import type { RightsHolder } from './rights-holder';
import type { WorkSplitRow } from '../split-editor/split-editor';

/**
 * PDF Generation Service
 * Creates professional split sheet PDFs for legal documentation
 */
@Injectable({
  providedIn: 'root'
})
export class PdfGeneratorService {
  /**
   * Generate split sheet PDF document
   * Uses canvas-based approach for maximum compatibility
   */
  async generateSplitSheetPDF(
    work: Work,
    ipSplits: WorkSplitRow[],
    neighboringSplits: WorkSplitRow[]
  ): Promise<Blob> {
    const { jsPDF } = await import('jspdf');

    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 40;
        const lineHeight = 18;

        let y = margin;

        const ensureSpace = (height: number) => {
          if (y + height > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
        };

        const drawHeader = () => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(22);
          doc.text('Music Rights Split Sheet', margin, y);
          y += lineHeight * 2;

          doc.setDrawColor('#e0e0e0');
          doc.setFillColor('#f5f5f5');
          doc.rect(margin, y, pageWidth - margin * 2, 90, 'F');

          doc.setFontSize(12);
          doc.setTextColor('#1a1a1a');

          const infoLines: Array<[string, string]> = [
            ['Work Title', work.work_title || 'Untitled'],
            ['ISRC', work.isrc || 'N/A'],
            ['ISWC', work.iswc || 'N/A'],
          ];

          infoLines.forEach((line, index) => {
            const [label, value] = line;
            const offsetY = y + 25 + index * 22;
            doc.setFont('helvetica', 'bold');
            doc.text(`${label}:`, margin + 12, offsetY);
            doc.setFont('helvetica', 'normal');
            doc.text(String(value), margin + 120, offsetY, { maxWidth: pageWidth - margin * 2 - 140 });
          });

          y += 110;
        };

        const drawTable = (
          title: string,
          rows: WorkSplitRow[],
          totalLabel: string
        ) => {
          ensureSpace(120);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.setTextColor('#667eea');
          doc.text(title, margin, y);
          y += lineHeight * 1.3;

          const columnWidths = [220, 120, 80, pageWidth - margin * 2 - 420];
          const headers = ['Rights Holder', 'Split Type', 'Percentage', 'Notes'];

          doc.setFillColor('#f5f5f5');
          doc.setTextColor('#1a1a1a');
          doc.rect(margin, y - lineHeight + 6, pageWidth - margin * 2, lineHeight + 4, 'F');
          doc.setFontSize(11);
          headers.reduce((x, header, index) => {
            doc.text(header, x + 10, y + 2);
            return x + columnWidths[index];
          }, margin);

          y += lineHeight + 6;

          doc.setFont('helvetica', 'normal');
          rows.forEach((split, index) => {
            ensureSpace(lineHeight * 1.4);
            if (index % 2 === 0) {
              doc.setFillColor('#fafafa');
              doc.rect(margin, y - lineHeight + 4, pageWidth - margin * 2, lineHeight + 4, 'F');
            }

            const holderName = this.getRightsHolderName(split.rights_holder);
            const splitType = this.formatSplitType(split.split_type);
            const percentage = (split.ownership_percentage ?? split.percentage ?? 0).toFixed(2) + '%';
            const notes = (split.notes || '').slice(0, 60);

            const rowValues = [holderName, splitType, percentage, notes];

            rowValues.reduce((x, value, colIndex) => {
              doc.text(String(value), x + 10, y + 2, {
                maxWidth: columnWidths[colIndex] - 20,
              });
              return x + columnWidths[colIndex];
            }, margin);

            y += lineHeight + 4;
          });

          const total = rows.reduce((sum, split) => sum + (split.ownership_percentage ?? split.percentage ?? 0), 0);
          ensureSpace(lineHeight * 1.5);

          doc.setFillColor('#667eea');
          doc.setTextColor('#ffffff');
          doc.rect(margin, y - lineHeight + 6, pageWidth - margin * 2, lineHeight + 4, 'F');
          doc.text(totalLabel, margin + 10, y + 2);
          doc.text(total.toFixed(2) + '%', margin + columnWidths[0] + columnWidths[1] + 10, y + 2);

          doc.setTextColor('#1a1a1a');
          y += lineHeight * 1.8;
        };

        const drawSignatures = () => {
          doc.addPage();
          y = margin;

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(16);
          doc.setTextColor('#1a1a1a');
          doc.text('Signatures', margin, y);
          y += lineHeight * 1.8;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          doc.text('This split sheet confirms the ownership percentages listed above.', margin, y);
          y += lineHeight * 1.5;

          const allHolders = [
            ...ipSplits.map(s => s.rights_holder).filter(Boolean),
            ...neighboringSplits.map(s => s.rights_holder).filter(Boolean),
          ] as RightsHolder[];

          const unique = Array.from(new Map(allHolders.map(holder => [holder.id, holder])).values());

          doc.setDrawColor('#d0d0d0');
          unique.slice(0, 6).forEach(holder => {
            ensureSpace(lineHeight * 4);

            const holderName = this.getRightsHolderName(holder);
            doc.line(margin, y, margin + 250, y);
            doc.line(margin + 300, y, margin + 520, y);

            doc.setFont('helvetica', 'bold');
            doc.text('Signature', margin, y + lineHeight);
            doc.text('Date', margin + 300, y + lineHeight);

            doc.setFont('helvetica', 'normal');
            doc.text(holderName, margin, y + lineHeight * 2);

            y += lineHeight * 3;
          });
        };

        drawHeader();
        drawTable('Intellectual Property Rights', ipSplits, 'Total IP Rights');
        drawTable('Neighboring Rights', neighboringSplits, 'Total Neighboring Rights');
        drawSignatures();

        doc.setFontSize(9);
        doc.setTextColor('#777777');
        doc.text(
          `Generated by Music Rights Platform · ${new Date().toLocaleDateString()}`,
          margin,
          pageHeight - margin / 2
        );

      return doc.output('blob');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Download PDF as file
   */
  async downloadSplitSheet(
    filename: string,
    work: Work,
    ipSplits: WorkSplitRow[],
    neighboringSplits: WorkSplitRow[]
  ): Promise<void> {
    try {
      const pdfBlob = await this.generateSplitSheetPDF(work, ipSplits, neighboringSplits);

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `split-sheet-${work.work_title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading split sheet:', error);
      throw error;
    }
  }

  /**
   * Helper: Get rights holder display name
   */
  private getRightsHolderName(holder: any): string {
    if (!holder) return 'Unknown';
    const nickname = holder.nickname ? this.ensureNicknamePrefix(holder.nickname) : null;
    if (nickname) return nickname;

    if (holder.display_name) {
      return holder.display_name;
    }

    if (holder.type === 'person') {
      const legacy = `${holder.first_name || ''} ${holder.last_name || ''}`.trim();
      if (legacy) return legacy;
    }

    return holder.organization_name || holder.company_name || 'Unknown rights holder';
  }

  /**
   * Helper: Format split type for display
   */
  private formatSplitType(type: string): string {
    const typeMap: { [key: string]: string } = {
      lyrics: 'Lyrics',
      music: 'Music',
      publishing: 'Publishing',
      performance: 'Performance',
      master_recording: 'Master Recording',
      neighboring_rights: 'Neighboring Rights',
      neighboring: 'Neighboring Rights',
    };
    return typeMap[type] || type;
  }

  private ensureNicknamePrefix(nickname: string): string {
    if (!nickname) return nickname;
    return nickname.startsWith('@') ? nickname : `@${nickname}`;
  }
}
