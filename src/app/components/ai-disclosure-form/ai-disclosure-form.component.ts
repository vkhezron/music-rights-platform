import { CommonModule } from '@angular/common';
import { Component, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  WorkCreationDeclarationDraft,
  WorkCreationDeclarationMap,
  WorkCreationSection,
  WorkCreationType,
  createDefaultWorkCreationDeclarationMap,
} from '../../models/work-creation-declaration.model';
import { input, output } from '@angular/core';

interface DisclosureSectionMeta {
  key: WorkCreationSection;
  label: string;
}

@Component({
  selector: 'app-ai-disclosure-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ai-disclosure-form">
      <h3 class="form-title">AI Disclosure (Legal Requirement)</h3>
      <p class="form-hint">
        Let collaborators and collecting societies know where AI assisted the creative process.
      </p>

      @for (section of sections; track section.key) {
        <section class="disclosure-section">
          <header class="section-header">
            <h4>{{ section.label }}</h4>
          </header>

          <div class="option-grid">
            <label class="option-card">
              <input
                type="radio"
                [name]="'ai-' + section.key"
                [value]="'human'"
                [ngModel]="disclosures()[section.key].creation_type"
                (ngModelChange)="setCreationType(section.key, $event)"
              />
              <span class="option-content">
                <span class="emoji">✍️</span>
                <span class="label">100% Human</span>
              </span>
            </label>

            <label class="option-card">
              <input
                type="radio"
                [name]="'ai-' + section.key"
                [value]="'ai_assisted'"
                [ngModel]="disclosures()[section.key].creation_type"
                (ngModelChange)="setCreationType(section.key, $event)"
              />
              <span class="option-content">
                <span class="emoji">⚡</span>
                <span class="label">AI Assisted</span>
              </span>
            </label>

            <label class="option-card">
              <input
                type="radio"
                [name]="'ai-' + section.key"
                [value]="'ai_generated'"
                [ngModel]="disclosures()[section.key].creation_type"
                (ngModelChange)="setCreationType(section.key, $event)"
              />
              <span class="option-content">
                <span class="emoji">🤖</span>
                <span class="label">AI Generated</span>
              </span>
            </label>
          </div>

          @if (disclosures()[section.key].creation_type !== 'human') {
            <div class="ai-details">
              <label class="field-label">
                AI tool
                <input
                  type="text"
                  class="text-input"
                  placeholder="e.g. Suno, Stable Audio, Midjourney"
                  [ngModel]="disclosures()[section.key].ai_tool ?? ''"
                  (ngModelChange)="setAiTool(section.key, $event)"
                />
              </label>

              <label class="field-label">
                Notes (optional)
                <textarea
                  rows="2"
                  class="textarea"
                  placeholder="Context for collaborators, clearance notes, prompts..."
                  [ngModel]="disclosures()[section.key].notes ?? ''"
                  (ngModelChange)="setNotes(section.key, $event)"
                ></textarea>
              </label>
            </div>
          }
        </section>
      }

      <section class="summary">
        <h4>Summary</h4>
        <ul>
          @for (section of sections; track section.key) {
            <li>
              <strong>{{ section.label }}:</strong>
              {{ describe(disclosures()[section.key]) }}
            </li>
          }
        </ul>
      </section>

      @if (validationErrors().length) {
        <section class="validation">
          <h4>Update required</h4>
          <ul>
            @for (error of validationErrors(); track error) {
              <li>{{ error }}</li>
            }
          </ul>
        </section>
      }
    </div>
  `,
  styles: [
    `
      .ai-disclosure-form {
        background: var(--card-bg, #ffffff);
        border: 1px solid var(--border-color, #dee2e6);
        border-radius: 12px;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .form-title {
        margin: 0;
        font-size: 20px;
      }

      .form-hint {
        margin: 0;
        color: var(--text-muted, #6c757d);
        font-size: 14px;
      }

      .disclosure-section {
        border: 1px solid var(--border-color, #dee2e6);
        border-radius: 10px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .section-header h4 {
        margin: 0;
        font-size: 16px;
      }

      .option-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
      }

      .option-card {
        display: flex;
        align-items: center;
        gap: 12px;
        border: 1px solid var(--border-color, #dee2e6);
        border-radius: 8px;
        padding: 12px;
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s;
      }

      .option-card input[type='radio'] {
        margin: 0;
      }

      .option-card:hover,
      .option-card:has(input:checked) {
        border-color: var(--primary-color, #0d6efd);
        background: var(--primary-surface, #f0f6ff);
      }

      .option-content {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
      }

      .emoji {
        font-size: 18px;
      }

      .ai-details {
        background: var(--warning-surface, #fff8e6);
        border-radius: 8px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .field-label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 14px;
        font-weight: 600;
      }

      .text-input,
      .textarea {
        width: 100%;
        border: 1px solid var(--border-color, #dee2e6);
        border-radius: 6px;
        padding: 10px 12px;
        font: inherit;
        resize: vertical;
      }

      .text-input:focus,
      .textarea:focus {
        outline: none;
        border-color: var(--primary-color, #0d6efd);
        box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.15);
      }

      .summary {
        border-top: 1px dashed var(--border-color, #dee2e6);
        padding-top: 16px;
      }

      .summary h4 {
        margin: 0 0 12px 0;
      }

      .summary ul {
        margin: 0;
        padding-left: 18px;
      }

      .validation {
        background: var(--danger-surface, #fdecea);
        border: 1px solid var(--danger-color, #dc3545);
        border-radius: 8px;
        padding: 16px;
      }

      .validation h4 {
        margin: 0 0 8px 0;
        color: var(--danger-color, #dc3545);
      }

      .validation ul {
        margin: 0;
        padding-left: 18px;
      }

      @media (max-width: 640px) {
        .ai-disclosure-form {
          padding: 16px;
        }

        .option-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AIDisclosureFormComponent {
  readonly sections: DisclosureSectionMeta[] = [
    { key: 'ip', label: 'Composition & Lyrics' },
    { key: 'mixing', label: 'Mixing' },
    { key: 'mastering', label: 'Mastering' },
    { key: 'session_musicians', label: 'Session Musicians' },
    { key: 'visuals', label: 'Artwork & Visuals' },
  ];

  initialDisclosures = input<WorkCreationDeclarationMap>(createDefaultWorkCreationDeclarationMap());
  disclosuresChange = output<WorkCreationDeclarationMap>();
  validChange = output<boolean>();

  protected disclosures = signal<WorkCreationDeclarationMap>(createDefaultWorkCreationDeclarationMap());
  protected validationErrors = computed(() => this.calculateValidationErrors());

  constructor() {
    effect(() => {
      const incoming = this.initialDisclosures();
      this.disclosures.set(structuredClone(incoming));
    });

    effect(() => {
      this.validChange.emit(!this.validationErrors().length);
    });
  }

  setCreationType(section: WorkCreationSection, value: WorkCreationType): void {
    this.disclosures.update(current => ({
      ...current,
      [section]: {
        ...current[section],
        creation_type: value,
        ai_tool: value === 'human' ? null : current[section].ai_tool ?? '',
      },
    }));
    this.emitChanges();
  }

  setAiTool(section: WorkCreationSection, value: string): void {
    this.disclosures.update(current => ({
      ...current,
      [section]: {
        ...current[section],
        ai_tool: value.trim() ? value.trim() : null,
      },
    }));
    this.emitChanges();
  }

  setNotes(section: WorkCreationSection, value: string): void {
    this.disclosures.update(current => ({
      ...current,
      [section]: {
        ...current[section],
        notes: value.trim() ? value.trim() : null,
      },
    }));
    this.emitChanges();
  }

  describe(disclosure: WorkCreationDeclarationDraft): string {
    switch (disclosure.creation_type) {
      case 'human':
        return 'Created entirely by people';
      case 'ai_assisted':
        return disclosure.ai_tool
          ? `Assisted by ${disclosure.ai_tool}`
          : 'Assisted by AI tool';
      case 'ai_generated':
        return disclosure.ai_tool
          ? `Generated with ${disclosure.ai_tool}`
          : 'Generated with an AI tool';
      default:
        return 'Unknown';
    }
  }

  private emitChanges(): void {
    const snapshot = structuredClone(this.disclosures());
    this.disclosuresChange.emit(snapshot);
  }

  private calculateValidationErrors(): string[] {
    const errors: string[] = [];
    const snapshot = this.disclosures();

    for (const meta of this.sections) {
      const disclosure = snapshot[meta.key];
      if (disclosure.creation_type !== 'human' && !disclosure.ai_tool) {
        errors.push(`${meta.label}: specify the AI tool used.`);
      }
    }

    return errors;
  }
}
