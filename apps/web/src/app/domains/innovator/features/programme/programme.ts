import { Component } from '@angular/core';
import MyProgramme from '@/app/domains/website/modules/programme/my-programme/my-programme';

@Component({
  imports: [MyProgramme],
  template: `
    <div class="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <div class="mb-6">
        <h1 class="text-3xl font-semibold tracking-tight">Mon programme</h1>
        <p class="mt-1 text-neutral-500">Les sessions du FIF 2026 auxquelles vous participez.</p>
      </div>
      <my-programme class="block" />
    </div>
  `
})
export default class AttendeeProgramme {}
