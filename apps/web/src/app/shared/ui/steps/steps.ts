import { Component, input, model } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Horizontal progress header for multi-step forms. Completed steps are clickable to go back. */
@Component({
  selector: 'app-steps',
  imports: [MatIconModule],
  template: `
    <ol class="flex items-center gap-3">
      @for (label of steps(); track label; let index = $index, last = $last) {
        <li class="flex items-center gap-3" [class.flex-auto]="!last">
          <button
            type="button"
            class="flex items-center gap-2.5 text-left disabled:cursor-default"
            [disabled]="index >= current()"
            [attr.aria-current]="index === current() ? 'step' : null"
            (click)="current.set(index)">
            <span
              class="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors"
              [class]="
                index < current()
                  ? 'bg-primary-600 text-white'
                  : index === current()
                    ? 'bg-primary-50 text-primary-700 ring-2 ring-primary-600'
                    : 'bg-gray-100 text-gray-500'
              ">
              @if (index < current()) {
                <mat-icon class="size-4" svgIcon="check" />
              } @else {
                {{ index + 1 }}
              }
            </span>
            <span
              class="hidden text-sm font-medium sm:block"
              [class]="index <= current() ? 'text-gray-950' : 'text-gray-500'">
              {{ label }}
            </span>
          </button>
          @if (!last) {
            <span class="h-px flex-auto" [class]="index < current() ? 'bg-primary-600' : 'bg-gray-200'"></span>
          }
        </li>
      }
    </ol>
    <p class="mt-3 text-sm text-neutral-500 sm:hidden">
      Étape {{ current() + 1 }} sur {{ steps().length }} — {{ steps()[current()] }}
    </p>
  `
})
export class Steps {
  readonly steps = input.required<string[]>();
  readonly current = model(0);
}
