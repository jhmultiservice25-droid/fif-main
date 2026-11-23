import { Component, computed, ElementRef, inject, signal, viewChildren } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { environment } from '@/environments/environment';
import { NAVIGATION } from '../data/navigation';

interface IPaletteItem {
  id: string;
  label: string;
  group: string;
  icon: string;
  route?: string;
  href?: string;
  keywords?: string;
}

const ACTIONS: IPaletteItem[] = [
  { id: 'scan', label: 'Scanner un badge', group: 'Actions', icon: 'scan-line', route: '/checkin', keywords: 'qr entree accueil checkin' },
  { id: 'programme-requests', label: 'Traiter les demandes de participation', group: 'Actions', icon: 'inbox', route: '/programme/demandes', keywords: 'validation sessions' },
  { id: 'speaker', label: 'Ajouter un speaker', group: 'Actions', icon: 'user-plus', route: '/speakers/nouveau', keywords: 'intervenant nouveau' },
  { id: 'broadcast', label: 'Rédiger une diffusion e-mail', group: 'Actions', icon: 'megaphone', route: '/diffusion', keywords: 'email mail message' },
  { id: 'site', label: 'Ouvrir le site public', group: 'Actions', icon: 'external-link', href: environment.websiteUrl, keywords: 'website accueil' }
];

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** ⌘K / Ctrl+K quick switcher: every console page plus the most frequent actions. */
@Component({
  selector: 'command-palette',
  imports: [MatIconModule],
  templateUrl: './command-palette.html',
  host: { class: 'block' }
})
export class CommandPalette {
  private readonly dialogRef = inject(MatDialogRef<CommandPalette>);
  private readonly router = inject(Router);
  private readonly options = viewChildren<ElementRef<HTMLElement>>('option');

  private readonly items: IPaletteItem[] = [
    ...NAVIGATION.flatMap((section) =>
      (section.children ?? []).map((item) => ({
        id: item.id,
        label: item.label,
        group: section.label,
        icon: item.icon ?? 'arrow-right',
        route: item.route
      }))
    ),
    ...ACTIONS
  ];

  protected readonly query = signal('');
  protected readonly active = signal(0);
  protected readonly results = computed(() => {
    const terms = normalize(this.query()).split(/\s+/).filter(Boolean);
    if (!terms.length) return this.items;
    return this.items.filter((item) => {
      const haystack = normalize(`${item.label} ${item.group} ${item.keywords ?? ''}`);
      return terms.every((term) => haystack.includes(term));
    });
  });
  protected readonly groups = computed(() => {
    const groups = new Map<string, { item: IPaletteItem; index: number }[]>();
    this.results().forEach((item, index) => {
      groups.set(item.group, [...(groups.get(item.group) ?? []), { item, index }]);
    });
    return [...groups.entries()].map(([label, entries]) => ({ label, entries }));
  });

  protected onInput(value: string): void {
    this.query.set(value);
    this.active.set(0);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.results().length;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!count) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.active.set((this.active() + step + count) % count);
      this.options()[this.active()]?.nativeElement.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = this.results()[this.active()];
      if (item) this.select(item);
    }
  }

  protected select(item: IPaletteItem): void {
    this.dialogRef.close();
    if (item.href) {
      window.open(item.href, '_blank', 'noopener');
    } else if (item.route) {
      void this.router.navigateByUrl(item.route);
    }
  }
}
