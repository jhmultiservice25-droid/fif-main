import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { Analytics } from '@/app/core/analytics';
import { FestivalStore } from '@/app/shared/data-access';
import { FESTIVAL } from '../../data/festival';
import { RegistrationLauncher } from '../../../programme/registration-launcher';

@Component({
  selector: 'hero',
  imports: [MatButtonModule, RouterLink],
  templateUrl: './hero.html'
})
export class Hero {
  private readonly launcher = inject(RegistrationLauncher);
  private readonly analytics = inject(Analytics);
  protected readonly festival = FESTIVAL;
  protected readonly info = inject(FestivalStore).info;

  protected participate(): void {
    this.analytics.track('cta_click', { cta: 'participer', place: 'hero' });
    void this.launcher.open();
  }
  protected readonly heroImages = [
    '/images/gallery/img-2.jpg',
    '/images/gallery/img-3.jpg',
    '/images/gallery/img-4.jpg',
    '/images/gallery/img-5.jpg'
  ] as const;
}
