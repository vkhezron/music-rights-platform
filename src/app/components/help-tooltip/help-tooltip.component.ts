import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, input, signal } from '@angular/core';
import { LucideAngularModule, Info } from 'lucide-angular';

@Component({
  selector: 'app-help-tooltip',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './help-tooltip.component.html',
  styleUrls: ['./help-tooltip.component.scss'],
})
export class HelpTooltipComponent {
  private static nextId = 0;

  protected readonly Info = Info;
  protected readonly tooltipId = `help-tooltip-${HelpTooltipComponent.nextId++}`;

  label = input('More information');
  heading = input<string | null>(null);
  text = input<string | null>(null);

  protected readonly isOpen = signal(false);

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  toggle(): void {
    this.isOpen.update(open => !open);
  }

  show(): void {
    this.isOpen.set(true);
  }

  hide(): void {
    this.isOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.hide();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (!this.host.nativeElement.contains(target)) {
      this.hide();
    }
  }

  onBlur(event: FocusEvent): void {
    const related = event.relatedTarget as HTMLElement | null;
    if (!related || !this.host.nativeElement.contains(related)) {
      this.hide();
    }
  }
}
