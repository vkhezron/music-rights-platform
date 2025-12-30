import { Injectable } from '@angular/core';
import { Work } from '../../models/work.model';
import { RightsHolder } from './rights-holder';
import { WorkSplitRow } from '../split-editor/split-editor';

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
    return new Promise((resolve, reject) => {
      try {
        // Create canvas for PDF rendering
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        // Set canvas size (A4 at 96 DPI: 794 x 1123)
        const pageWidth = 794;
        const pageHeight = 1123;
        canvas.width = pageWidth;
        canvas.height = pageHeight * 2; // Two pages

        // Colors
        const darkGray = '#1a1a1a';
        const lightGray = '#f5f5f5';
        const accentColor = '#667eea';
        const borderColor = '#e0e0e0';

        // Fonts
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = darkGray;

        let y = 40;

        // ===== HEADER =====
        ctx.fillText('MUSIC RIGHTS SPLIT SHEET', 40, y);
        y += 40;

        // Work info box
        ctx.fillStyle = lightGray;
        ctx.fillRect(40, y, pageWidth - 80, 100);
        
        ctx.fillStyle = darkGray;
        ctx.font = 'bold 14px Arial';
        ctx.fillText('Work Title:', 50, y + 25);
        
        ctx.font = '14px Arial';
        ctx.fillText(work.work_title, 150, y + 25);
        
        ctx.font = 'bold 14px Arial';
        ctx.fillText('ISRC:', 50, y + 50);
        
        ctx.font = '14px Arial';
        ctx.fillText(work.isrc || 'N/A', 150, y + 50);
        
        ctx.font = 'bold 14px Arial';
        ctx.fillText('ISWC:', 50, y + 75);
        
        ctx.font = '14px Arial';
        ctx.fillText(work.iswc || 'N/A', 150, y + 75);

        y += 120;

        // ===== IP RIGHTS SECTION =====
        ctx.fillStyle = accentColor;
        ctx.font = 'bold 16px Arial';
        ctx.fillText('INTELLECTUAL PROPERTY RIGHTS', 40, y);
        y += 30;

        // IP table header
        ctx.fillStyle = lightGray;
        ctx.fillRect(40, y, pageWidth - 80, 30);
        
        ctx.fillStyle = darkGray;
        ctx.font = 'bold 12px Arial';
        ctx.fillText('Rights Holder Name', 50, y + 20);
        ctx.fillText('Split Type', 350, y + 20);
        ctx.fillText('Percentage', 500, y + 20);
        ctx.fillText('Notes', 600, y + 20);

        y += 40;

        // IP table rows
        ctx.font = '12px Arial';
        ipSplits.forEach((split, index) => {
          if (index % 2 === 0) {
            ctx.fillStyle = '#fafafa';
            ctx.fillRect(40, y - 5, pageWidth - 80, 25);
          }
          
          ctx.fillStyle = darkGray;
          const holderName = this.getRightsHolderName(split.rights_holder);
          const splitType = this.formatSplitType(split.split_type);
          const percentage = split.percentage.toFixed(2) + '%';
          const notes = split.notes || '';

          ctx.fillText(holderName, 50, y + 15);
          ctx.fillText(splitType, 350, y + 15);
          ctx.fillText(percentage, 500, y + 15);
          ctx.fillText(notes.substring(0, 30), 600, y + 15);

          y += 25;
        });

        // IP total
        ctx.fillStyle = accentColor;
        ctx.fillRect(40, y, pageWidth - 80, 25);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('TOTAL IP RIGHTS:', 50, y + 15);
        const ipTotal = ipSplits.reduce((sum, s) => sum + s.percentage, 0);
        ctx.fillText(ipTotal.toFixed(2) + '%', 500, y + 15);

        y += 45;

        // ===== NEIGHBORING RIGHTS SECTION =====
        ctx.fillStyle = accentColor;
        ctx.font = 'bold 16px Arial';
        ctx.fillText('NEIGHBORING RIGHTS', 40, y);
        y += 30;

        // Neighboring table header
        ctx.fillStyle = lightGray;
        ctx.fillRect(40, y, pageWidth - 80, 30);
        
        ctx.fillStyle = darkGray;
        ctx.font = 'bold 12px Arial';
        ctx.fillText('Rights Holder Name', 50, y + 20);
        ctx.fillText('Split Type', 350, y + 20);
        ctx.fillText('Percentage', 500, y + 20);
        ctx.fillText('Notes', 600, y + 20);

        y += 40;

        // Neighboring table rows
        ctx.font = '12px Arial';
        neighboringSplits.forEach((split, index) => {
          if (index % 2 === 0) {
            ctx.fillStyle = '#fafafa';
            ctx.fillRect(40, y - 5, pageWidth - 80, 25);
          }
          
          ctx.fillStyle = darkGray;
          const holderName = this.getRightsHolderName(split.rights_holder);
          const splitType = this.formatSplitType(split.split_type);
          const percentage = split.percentage.toFixed(2) + '%';
          const notes = split.notes || '';

          ctx.fillText(holderName, 50, y + 15);
          ctx.fillText(splitType, 350, y + 15);
          ctx.fillText(percentage, 500, y + 15);
          ctx.fillText(notes.substring(0, 30), 600, y + 15);

          y += 25;
        });

        // Neighboring total
        ctx.fillStyle = accentColor;
        ctx.fillRect(40, y, pageWidth - 80, 25);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('TOTAL NEIGHBORING RIGHTS:', 50, y + 15);
        const neighboringTotal = neighboringSplits.reduce((sum, s) => sum + s.percentage, 0);
        ctx.fillText(neighboringTotal.toFixed(2) + '%', 500, y + 15);

        y += 50;

        // ===== SIGNATURE LINES (Page 2) =====
        y = pageHeight + 40;
        
        ctx.fillStyle = darkGray;
        ctx.font = 'bold 16px Arial';
        ctx.fillText('SIGNATURES', 40, y);
        y += 40;

        ctx.font = 'bold 12px Arial';
        ctx.fillText('This split sheet confirms the ownership percentages listed above.', 40, y);
        y += 30;

        // Signature lines for each rights holder
        const allHolders = [
          ...ipSplits.map(s => s.rights_holder).filter(Boolean),
          ...neighboringSplits.map(s => s.rights_holder).filter(Boolean)
        ];

        const uniqueHolders = Array.from(
          new Map(allHolders.map(h => [h!.id, h])).values()
        );

        ctx.font = '12px Arial';
        uniqueHolders.slice(0, 4).forEach((holder, index) => {
          const lineY = y + index * 60;
          const holderName = this.getRightsHolderName(holder);
          
          // Signature line
          ctx.fillStyle = borderColor;
          ctx.fillRect(40, lineY, 250, 1);
          
          // Name label
          ctx.fillStyle = darkGray;
          ctx.font = 'bold 11px Arial';
          ctx.fillText('Signature', 40, lineY + 20);
          
          // Name
          ctx.font = '11px Arial';
          ctx.fillText(holderName, 40, lineY + 40);
          
          // Date line
          ctx.fillStyle = borderColor;
          ctx.fillRect(350, lineY, 250, 1);
          
          ctx.fillStyle = darkGray;
          ctx.font = 'bold 11px Arial';
          ctx.fillText('Date', 350, lineY + 20);
        });

        y += 280;

        // ===== FOOTER =====
        ctx.fillStyle = '#999';
        ctx.font = '10px Arial';
        ctx.fillText('Generated by Music Rights Platform - ' + new Date().toLocaleDateString(), 40, pageHeight - 20);

        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Could not generate PDF blob'));
          }
        }, 'image/png');

      } catch (error) {
        reject(error);
      }
    });
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
      const blob = await this.generateSplitSheetPDF(work, ipSplits, neighboringSplits);
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `split-sheet-${work.work_title}.png`;
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
    if (holder.type === 'person') {
      return `${holder.first_name || ''} ${holder.last_name || ''}`.trim();
    }
    return holder.company_name || 'Unknown';
  }

  /**
   * Helper: Format split type for display
   */
  private formatSplitType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'lyric': 'Lyric',
      'music': 'Music',
      'publishing': 'Publishing',
      'performance': 'Performance',
      'master': 'Master Recording',
      'neighboring': 'Neighboring Rights'
    };
    return typeMap[type] || type;
  }
}
