import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'admin-root',
  imports: [RouterOutlet],
  host: {
    class: 'flex min-h-full w-full flex-auto flex-col'
  },
  template: `<router-outlet />`
})
export class AdminApp {}
