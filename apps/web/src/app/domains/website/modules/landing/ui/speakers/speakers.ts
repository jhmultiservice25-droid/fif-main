import { httpResource } from '@angular/common/http';
import { Component, computed, ElementRef, inject, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { apiAssetUrl } from '@/app/shared/helpers';
import { FestivalStore } from '@/app/shared/data-access';
import { IApiSuccess, ISpeaker } from '@/app/shared/interfaces';

/** Home page speakers strip: one horizontal, swipeable row instead of a separate page. Hidden while empty. */
@Component({
  selector: 'speakers',
  imports: [MatIconModule],
  templateUrl: './speakers.html'
})
export class Speakers {
  private readonly track = viewChild<ElementRef<HTMLElement>>('track');
  private readonly days = inject(FestivalStore).days;

  protected readonly resource = httpResource<IApiSuccess<ISpeaker[]>>(() => '/speakers');
  protected readonly speakers = computed(() => (this.resource.hasValue() ? this.resource.value().data : []));
  protected readonly assetUrl = apiAssetUrl;

  protected dayLabels(speaker: ISpeaker): string {
    return this.days()
      .map((day, index) => (speaker.days.includes(day.date) ? `J${index + 1}` : null))
      .filter(Boolean)
      .join(' · ');
  }

  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  protected scroll(direction: 1 | -1): void {
    const element = this.track()?.nativeElement;
    element?.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: 'smooth' });
  }
}
