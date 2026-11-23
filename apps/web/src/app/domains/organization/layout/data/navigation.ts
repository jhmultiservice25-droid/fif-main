import { NavigationItem } from '@/app/shared/ui/navigation/navigation.types';

export const ORGANIZATION_NAVIGATION: NavigationItem[] = [
  {
    id: 'organization-space',
    label: 'Organisation',
    description: 'Gérez votre profil et vos fiches de besoin',
    children: [
      {
        id: 'overview',
        label: 'Aperçu',
        icon: 'layout-dashboard',
        route: '/organisation/apercu',
        activeOptions: { exact: true }
      },
      {
        id: 'programme',
        label: 'Mon programme',
        icon: 'calendar-days',
        route: '/organisation/programme',
        activeOptions: { exact: true }
      },
      {
        id: 'profile',
        label: 'Profil',
        icon: 'building-2',
        route: '/organisation/profil',
        activeOptions: { exact: true }
      },
      {
        id: 'needs',
        label: 'Fiches de besoin',
        icon: 'files',
        route: '/organisation/fiches',
        activeOptions: { exact: false }
      }
    ]
  }
];
