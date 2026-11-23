import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Analytics } from '@/app/core/analytics';

/**
 * Politique de confidentialité. Required by Google before an external OAuth consent screen can be
 * published, and it doubles as the page the consent sheet and the e-mail footer point to.
 */
@Component({
  imports: [RouterLink],
  templateUrl: './privacy.html'
})
export default class Privacy {
  protected readonly analytics = inject(Analytics);
  protected readonly contactEmail = 'contact@fikiri.co';
  protected readonly updatedAt = '9 octobre 2026';
}
