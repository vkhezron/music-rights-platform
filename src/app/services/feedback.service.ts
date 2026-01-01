import { Injectable, computed, signal } from '@angular/core';

export type FeedbackType = 'success' | 'error' | 'info' | 'warning';

export interface FeedbackAction {
  label: string;
  callback?: () => void;
}

export interface FeedbackMessage {
  id: string;
  type: FeedbackType;
  title?: string;
  message: string;
  detail?: string;
  duration: number;
  action?: FeedbackAction;
  createdAt: number;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly messages = signal<FeedbackMessage[]>([]);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly toasts = computed(() => this.messages());

  show(options: {
    type: FeedbackType;
    message: string;
    title?: string;
    detail?: string;
    duration?: number;
    action?: FeedbackAction;
  }): string {
    const id = this.generateId();
    const duration = Math.max(options.duration ?? this.defaultDuration(options.type), 2000);
    const toast: FeedbackMessage = {
      id,
      type: options.type,
      title: options.title,
      message: options.message,
      detail: options.detail,
      duration,
      action: options.action,
      createdAt: Date.now(),
    };

    this.messages.update(queue => [...queue, toast]);

    const timer = setTimeout(() => this.remove(id), duration);
    this.timers.set(id, timer);

    return id;
  }

  success(message: string, options?: { title?: string; detail?: string; duration?: number; action?: FeedbackAction }): string {
    return this.show({ type: 'success', message, ...options });
  }

  error(message: string, options?: { title?: string; detail?: string; duration?: number; action?: FeedbackAction }): string {
    return this.show({ type: 'error', message, ...options });
  }

  info(message: string, options?: { title?: string; detail?: string; duration?: number; action?: FeedbackAction }): string {
    return this.show({ type: 'info', message, ...options });
  }

  warning(message: string, options?: { title?: string; detail?: string; duration?: number; action?: FeedbackAction }): string {
    return this.show({ type: 'warning', message, ...options });
  }

  remove(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this.messages.update(queue => queue.filter(item => item.id !== id));
  }

  clear(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.messages.set([]);
  }

  handleError(error: unknown, fallbackMessage: string): string {
    const message = this.parseError(error) ?? fallbackMessage;
    this.error(message, { detail: this.extractDetail(error) });
    return message;
  }

  private parseError(error: unknown): string | null {
    if (!error) {
      return null;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      return error.message || null;
    }

    if (typeof error === 'object') {
      const withMessage = error as { message?: string; error_description?: string; description?: string };
      return withMessage.message || withMessage.error_description || withMessage.description || null;
    }

    return null;
  }

  private extractDetail(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const detailSource = error as { detail?: string; status?: number; code?: string };
    const detailParts: string[] = [];

    if (detailSource.code) {
      detailParts.push(`Code: ${detailSource.code}`);
    }

    if (detailSource.status) {
      detailParts.push(`Status: ${detailSource.status}`);
    }

    if (detailSource.detail) {
      detailParts.push(detailSource.detail);
    }

    return detailParts.length ? detailParts.join(' · ') : undefined;
  }

  private defaultDuration(type: FeedbackType): number {
    switch (type) {
      case 'error':
        return 8000;
      case 'warning':
        return 6000;
      default:
        return 4500;
    }
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `toast-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }
}
