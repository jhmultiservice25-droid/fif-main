export interface INavigationLink {
  readonly name: string;
  readonly path: string;
  readonly icon: string;
  readonly fragment?: string;
  /** Opens the registration modal instead of navigating. */
  readonly action?: 'participate';
  /** One-line explanation shown in the menus. */
  readonly description?: string;
  /** Hidden once signed in (replaced by "Se déconnecter"). */
  readonly guestOnly?: boolean;
}

export interface INavigationGroup {
  readonly id: string;
  readonly label: string;
  readonly items: readonly INavigationLink[];
}
