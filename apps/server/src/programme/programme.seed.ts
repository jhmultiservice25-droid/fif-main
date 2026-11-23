/**
 * Default FIF 2026 programme, inserted once when the programme is empty (ADR-003).
 * Codes match the activity ids participants picked before the programme moved to the database,
 * so earlier registrations can be converted. Times are Kinshasa local time (UTC+1, no DST).
 */

/** Dates of the first import only: admins change them from the console afterwards (FestivalService). */
export const FESTIVAL_DAYS = [
  { date: "2026-11-25", label: "Jour 1", theme: "Inspirer • Découvrir • Connecter" },
  { date: "2026-11-26", label: "Jour 2", theme: "Apprendre • Construire • Expérimenter" },
  { date: "2026-11-27", label: "Jour 3", theme: "Pitcher • S'engager • Célébrer" },
] as const;

export const DEFAULT_ROOMS = [
  { key: "main", name: "Grande salle", color: "#006da4", order: 0 },
  { key: "village", name: "Village FIKIRI", color: "#059669", order: 1 },
  { key: "b2b", name: "Espace B2B", color: "#d97706", order: 2 },
] as const;

type RoomKey = (typeof DEFAULT_ROOMS)[number]["key"];

interface ISeedSession {
  code: string;
  day: string;
  start: string;
  end: string;
  title: string;
  description: string;
  type: string;
  admission: "NONE" | "OPEN" | "APPROVAL";
  room?: RoomKey;
}

const academy = (code: string, topic: string, description: string): ISeedSession => ({
  code,
  day: "2026-11-26",
  start: "10:00",
  end: "12:30",
  title: `FIKIRI Academy — ${topic}`,
  description,
  type: "MASTERCLASS",
  admission: "OPEN",
});

export const DEFAULT_SESSIONS: ISeedSession[] = [
  { code: "d1-accueil-experience", day: "2026-11-25", start: "08:00", end: "09:00", title: "Accueil & FIKIRI Experience", description: "Village, stands, démonstrations technologiques, plateformes FIKIRI et médias.", type: "VILLAGE", admission: "NONE", room: "village" },
  { code: "d1-ouverture", day: "2026-11-25", start: "09:00", end: "10:15", title: "Grande plénière d'ouverture", description: "Génération FIKIRI : la jeunesse qui construit la RDC de demain + FIKIRI Impact 2023–2026.", type: "PLENARY", admission: "OPEN", room: "main" },
  { code: "d1-talks", day: "2026-11-25", start: "10:15", end: "10:45", title: "FIKIRI Talks", description: "5 intervenants × 5 minutes : startup, IA, innovation frugale et territoires.", type: "TALK", admission: "OPEN", room: "main" },
  { code: "d1-village", day: "2026-11-25", start: "10:45", end: "11:15", title: "Pause & visite du Village", description: "Rencontre directe entre autorités, visiteurs et innovateurs.", type: "BREAK", admission: "NONE", room: "village" },
  { code: "d1-paralleles", day: "2026-11-25", start: "11:15", end: "13:00", title: "Activités en parallèle", description: "IA • Entrepreneuriat • Financement • Métiers numériques • FIKIRI Lab • Village.", type: "WORKSHOP", admission: "OPEN" },
  { code: "d1-networking", day: "2026-11-25", start: "13:00", end: "14:00", title: "Déjeuner & networking", description: "Networking Challenge et rencontres.", type: "NETWORKING", admission: "NONE", room: "b2b" },
  { code: "d1-pleniere-2030", day: "2026-11-25", start: "14:00", end: "15:00", title: "Grande plénière", description: "Quelle RDC numérique voulons-nous en 2030 ?", type: "PLENARY", admission: "OPEN", room: "main" },
  { code: "d1-challenges", day: "2026-11-25", start: "15:00", end: "17:00", title: "FIKIRI Challenges", description: "AI • GovTech • Green Innovation • Women & Girls in Tech • Territorial Innovation.", type: "PITCH", admission: "OPEN", room: "main" },

  { code: "d2-morning", day: "2026-11-26", start: "08:30", end: "09:00", title: "FIKIRI Morning", description: "Animation, musique et récapitulatif du Jour 1.", type: "SOCIAL", admission: "NONE", room: "main" },
  { code: "d2-pleniere-createur", day: "2026-11-26", start: "09:00", end: "10:00", title: "Grande plénière", description: "De consommateur de technologie à créateur de solutions.", type: "PLENARY", admission: "OPEN", room: "main" },
  academy("d2-academy", "Startup", "Session pratique dédiée à la création et au développement d'une startup."),
  academy("d2-academy-ia", "IA générative", "Masterclass pratique sur les usages et opportunités de l'IA générative."),
  academy("d2-academy-cyber", "Cybersécurité", "Fondamentaux et pratiques de cybersécurité."),
  academy("d2-academy-mvp", "MVP", "Transformer une idée en produit minimum viable."),
  academy("d2-academy-pitch", "Pitch", "Structurer et présenter efficacement une solution ou un projet."),
  academy("d2-academy-financement", "Financement", "Comprendre les voies de financement d'un projet ou d'une entreprise."),
  academy("d2-academy-marque", "Marque personnelle", "Développer sa visibilité et son positionnement professionnel."),
  academy("d2-academy-data-langues", "Data & langues congolaises", "Usages de la donnée et des technologies linguistiques adaptées au contexte congolais."),
  { code: "d2-permanentes", day: "2026-11-26", start: "10:00", end: "12:30", title: "Activités permanentes", description: "Village • Career Corner • Mentoring Corner • Investors Corner • FIKIRI Studio.", type: "VILLAGE", admission: "NONE", room: "village" },
  { code: "d2-pause", day: "2026-11-26", start: "12:30", end: "13:30", title: "Pause", description: "Networking et visites.", type: "BREAK", admission: "NONE", room: "village" },
  { code: "d2-demo-show", day: "2026-11-26", start: "13:30", end: "15:00", title: "FIKIRI Demo Show", description: "Pitch de 3 minutes + 2 minutes de questions, avec vote du public.", type: "PITCH", admission: "OPEN", room: "main" },
  { code: "d2-b2b", day: "2026-11-26", start: "15:00", end: "17:00", title: "Rencontres B2B & activités permanentes", description: "Mise en relation entre besoins, solutions, talents, partenaires et investisseurs.", type: "NETWORKING", admission: "OPEN", room: "b2b" },
  { code: "d2-after-party", day: "2026-11-26", start: "18:00", end: "21:00", title: "FIKIRI After Party", description: "DJ • networking • animations • Talent Show.", type: "SOCIAL", admission: "OPEN" },

  { code: "d3-morning", day: "2026-11-27", start: "08:30", end: "09:00", title: "FIKIRI Morning", description: "Accueil et synthèse des temps forts des deux premiers jours.", type: "SOCIAL", admission: "NONE", room: "main" },
  { code: "d3-village-rencontres", day: "2026-11-27", start: "09:00", end: "12:30", title: "Village & rencontres", description: "Career Corner • Mentoring Corner • Investors Corner • FIKIRI Studio • échanges B2B.", type: "VILLAGE", admission: "NONE", room: "village" },
  { code: "d3-pause", day: "2026-11-27", start: "12:30", end: "13:30", title: "Pause", description: "Networking et visites.", type: "BREAK", admission: "NONE", room: "village" },
  { code: "d3-grand-pitch", day: "2026-11-27", start: "13:30", end: "15:00", title: "FIKIRI Grand Pitch", description: "10 à 15 innovations finalistes devant Gouvernement, PNUD, entreprises, investisseurs, universités et experts.", type: "PITCH", admission: "OPEN", room: "main" },
  { code: "d3-session-2000-idees", day: "2026-11-27", start: "15:00", end: "16:00", title: "Session spéciale", description: "2 000 jeunes, 2 000 idées pour transformer la RDC.", type: "PLENARY", admission: "OPEN", room: "main" },
  { code: "d3-cloture", day: "2026-11-27", start: "16:00", end: "17:00", title: "Grande clôture", description: "Déclaration FIKIRI 2026 • Awards • annonces • photo officielle.", type: "PLENARY", admission: "OPEN", room: "main" },
  { code: "d3-innovators-night", day: "2026-11-27", start: "18:30", end: "22:00", title: "FIKIRI Innovators Night", description: "Dîner VIP • networking • témoignages • awards • rencontres investisseurs/innovateurs.", type: "SOCIAL", admission: "APPROVAL" },
];

export const kinshasaTime = (day: string, time: string) => new Date(`${day}T${time}:00+01:00`);

/** YYYY-MM-DD of an instant in Kinshasa time. */
export const kinshasaDay = (date: Date) => new Date(date.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);
