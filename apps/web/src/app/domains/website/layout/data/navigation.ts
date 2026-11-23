import { INavigationGroup, INavigationLink } from '../interfaces/navigation.interface';

/** Top-level links kept beside the two menus (PRD-003 §4). */
export const NAVIGATION_LINKS: readonly INavigationLink[] = [
  { name: 'Programme', path: '/', fragment: 'programme', icon: 'calendar-days' },
  { name: 'Speakers', path: '/', fragment: 'speakers', icon: 'mic' }
];

export const NAVIGATION_GROUPS: readonly INavigationGroup[] = [
  {
    id: 'opportunities',
    label: 'Opportunités',
    items: [
      { name: 'Devenir volontaire', description: 'Accueil, logistique, badges… rejoignez l’équipe terrain.', path: '/applications/volunteer', icon: 'hand-heart' },
      { name: 'Rejoindre le comité', description: 'Postes d’organisation du festival.', path: '/applications/committee', icon: 'users' },
      { name: 'Soumettre une solution', description: 'Innovateur : présentez votre projet aux partenaires.', path: '/rejoindre/innovateur', icon: 'lightbulb' },
      { name: 'Publier un besoin', description: 'Organisation : décrivez un défi à relever.', path: '/rejoindre/organisation', icon: 'building-2' },
      { name: 'Parcourir les projets et solutions', description: 'Bailleurs, institutions, entreprises : découvrez et contactez.', path: '/projets', icon: 'search' }
    ]
  },
  {
    id: 'participate',
    label: 'Participer',
    items: [
      { name: 'S’inscrire à une activité', description: 'Choisissez vos sessions, jour par jour.', path: '/', icon: 'ticket', action: 'participate' },
      { name: 'Mon espace', description: 'Votre programme, votre badge, vos projets.', path: '/mon-espace', icon: 'circle-user' },
      { name: 'Connexion', description: 'Avec votre adresse e-mail.', path: '/connexion', icon: 'log-in', guestOnly: true }
    ]
  }
];
