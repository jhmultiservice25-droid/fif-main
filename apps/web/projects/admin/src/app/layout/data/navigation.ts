import { NavigationItem } from '@/app/shared/ui/navigation/navigation.types';

export const NAVIGATION: NavigationItem[] = [
  {
    id: 'overview',
    label: '',
    children: [
      {
        id: 'stats',
        label: "Vue d'ensemble",
        icon: 'layout-dashboard',
        route: '/',
        activeOptions: { exact: true }
      },
      {
        id: 'audience',
        label: 'Audience',
        icon: 'chart-no-axes-combined',
        route: '/audience',
        activeOptions: { exact: true }
      }
    ]
  },
  {
    id: 'festival',
    label: 'Festival',
    children: [
      { id: 'festival-settings', label: 'Dates et identité', icon: 'calendar-days', route: '/festival', activeOptions: { exact: true } }
    ]
  },
  {
    id: 'programme',
    label: 'Programme',
    children: [
      {
        id: 'programme-calendar',
        label: 'Calendrier',
        icon: 'calendar-days',
        route: '/programme',
        activeOptions: { exact: true }
      },
      {
        id: 'programme-requests',
        label: 'Demandes',
        icon: 'inbox',
        route: '/programme/demandes',
        activeOptions: { exact: true }
      },
      {
        id: 'programme-rooms',
        label: 'Salles',
        icon: 'door-open',
        route: '/programme/salles',
        activeOptions: { exact: true }
      }
    ]
  },
  {
    id: 'showcase',
    label: 'Solutions',
    children: [
      { id: 'showcase-solutions', label: 'Solutions FIF', icon: 'presentation', route: '/solutions', activeOptions: { exact: true } },
      { id: 'contact-messages', label: 'Mises en relation', icon: 'messages-square', route: '/mises-en-relation', activeOptions: { exact: true } }
    ]
  },
  {
    id: 'recruitment',
    label: 'Inscriptions',
    description: 'Candidatures et participants',
    children: [
      {
        id: 'applications',
        label: 'Candidatures',
        icon: 'files',
        route: '/applications',
        activeOptions: { exact: false }
      },
      {
        id: 'participants',
        label: 'Participants',
        icon: 'ticket',
        route: '/participants',
        activeOptions: { exact: false }
      }
    ]
  },
  {
    id: 'inbox',
    label: 'Communication',
    description: 'E-mails aux participants',
    children: [
      {
        id: 'broadcast',
        label: 'Diffusion e-mail',
        icon: 'megaphone',
        route: '/diffusion',
        activeOptions: { exact: false }
      }
    ]
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    description: 'Besoins et projets',
    children: [
      {
        id: 'needs',
        label: 'Fiches de besoin',
        icon: 'files',
        route: '/besoins',
        activeOptions: { exact: false }
      },
      {
        id: 'innovators',
        label: 'Innovateurs',
        icon: 'users',
        route: '/innovateurs',
        activeOptions: { exact: false }
      },
      {
        id: 'projects',
        label: 'Projets',
        icon: 'lightbulb',
        route: '/projets',
        activeOptions: { exact: false }
      }
    ]
  },
  {
    id: 'content',
    label: 'Contenu du site',
    description: 'Gérez le contenu public',
    children: [
      {
        id: 'speakers',
        label: 'Speakers',
        icon: 'mic',
        route: '/speakers',
        activeOptions: { exact: false }
      }
    ]
  },
  {
    id: 'onsite',
    label: 'Sur place',
    description: "Contrôle des entrées à l'événement",
    children: [
      {
        id: 'checkin',
        label: "Contrôle d'accès",
        icon: 'scan-line',
        route: '/checkin',
        activeOptions: { exact: false }
      }
    ]
  }
];
