import { NavigationItem } from '@/app/shared/ui/navigation/navigation.types';

export const INNOVATOR_NAVIGATION: NavigationItem[] = [
  {
    id: 'innovator-space',
    label: 'Innovateur',
    description: 'Gérez votre profil et vos projets',
    children: [
      {
        id: 'overview',
        label: 'Aperçu',
        icon: 'layout-dashboard',
        route: '/innovateur/apercu',
        activeOptions: { exact: true }
      },
      {
        id: 'presentations',
        label: 'Mes présentations',
        icon: 'presentation',
        route: '/innovateur/presentations',
        activeOptions: { exact: true }
      },
      {
        id: 'programme',
        label: 'Mon programme',
        icon: 'calendar-days',
        route: '/innovateur/programme',
        activeOptions: { exact: true }
      },
      {
        id: 'profile',
        label: 'Profil',
        icon: 'user',
        route: '/innovateur/profil',
        activeOptions: { exact: true }
      },
      {
        id: 'projects',
        label: 'Projets',
        icon: 'lightbulb',
        route: '/innovateur/projets',
        activeOptions: { exact: false }
      }
    ]
  }
];
