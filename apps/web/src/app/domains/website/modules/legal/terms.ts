import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Conditions d'utilisation. Required alongside the privacy policy to publish the OAuth consent screen. */
@Component({
  imports: [RouterLink],
  templateUrl: './terms.html'
})
export default class Terms {
  protected readonly contactEmail = 'contact@fikiri.co';
  protected readonly updatedAt = '9 octobre 2026';
}
