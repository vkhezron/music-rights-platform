import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LucideAngularModule, CheckCircle, AlertTriangle, Info, X, XCircle } from 'lucide-angular';
import { FeedbackMessage, FeedbackService } from '../../services/feedback.service';

@Component({
  selector: 'app-feedback-toasts',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './feedback-toasts.component.html',
  styleUrl: './feedback-toasts.component.scss',
  host: {
    class: 'feedback-toasts-host'
  }
})
export class FeedbackToastsComponent {
  private readonly feedback = inject(FeedbackService);

  readonly toasts = this.feedback.toasts;

  readonly SuccessIcon = CheckCircle;
  readonly ErrorIcon = XCircle;
  readonly InfoIcon = Info;
  readonly WarningIcon = AlertTriangle;
  readonly CloseIcon = X;

  dismiss(id: string): void {
    this.feedback.remove(id);
  }

  handleAction(toast: FeedbackMessage): void {
    if (!toast.action) {
      return;
    }

    try {
      toast.action.callback?.();
    } finally {
      this.feedback.remove(toast.id);
    }
  }

  iconFor(type: FeedbackMessage['type']): any {
    switch (type) {
      case 'success':
        return this.SuccessIcon;
      case 'warning':
        return this.WarningIcon;
      case 'error':
        return this.ErrorIcon;
      default:
        return this.InfoIcon;
    }
  }
}
