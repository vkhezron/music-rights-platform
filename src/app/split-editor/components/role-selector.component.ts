import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NeighbouringFunctionsService } from '../../services/neighbouring-functions.service';

@Component({
  selector: 'app-role-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './role-selector.component.html',
  styleUrls: ['./role-selector.component.scss'],
})
export class RoleSelectorComponent {
  private functionsService = inject(NeighbouringFunctionsService);

  selectedRoles = input<string[]>([]);
  rolesChange = output<string[]>();

  private query = signal('');

  protected allRoles = signal<string[]>([]);

  protected filteredRoles = computed(() => {
    const term = this.query().toLowerCase();
    if (!term) return this.allRoles();
    return this.allRoles().filter(role => role.toLowerCase().includes(term));
  });

  constructor() {
    this.loadRoles();
  }

  private async loadRoles(): Promise<void> {
    try {
      const groups = await this.functionsService.getGrouped();
      const roles = groups.flatMap(group => group.functions.map(fn => fn.function_name));
      this.allRoles.set(roles.sort((a, b) => a.localeCompare(b)));
    } catch (error) {
      console.error('Failed to load neighbouring roles', error);
      this.allRoles.set([]);
    }
  }

  onQueryChange(value: string): void {
    this.query.set(value);
  }

  toggleRole(role: string, checked: boolean): void {
    const current = new Set(this.selectedRoles());
    if (checked) {
      current.add(role);
    } else {
      current.delete(role);
    }
    this.rolesChange.emit(Array.from(current));
  }
}
