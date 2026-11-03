// Jogiño dresses up for the time of year: a costume on his own, or the one the person picks.
// Dates are Spain's: Reyes on 6 January, Carnaval moving with Easter.

export const COSTUMES = ['halloween', 'navidad', 'finDeAno', 'reyes', 'sanValentin', 'carnaval', 'primavera', 'cumple', 'verano', 'otono'] as const;
export type Costume = (typeof COSTUMES)[number];
/** What's saved: follow the calendar, never dress up, or always wear one costume. */
export type CostumeChoice = 'auto' | 'ninguno' | Costume;

export const COSTUME_INFO: Record<Costume, { label: string; greeting: string }> = {
  halloween: { label: 'Halloween', greeting: '¡Truco o trato! Soy Jogiño.' },
  navidad: { label: 'Navidad', greeting: '¡Feliz Navidad! Soy Jogiño.' },
  finDeAno: { label: 'Fin de año', greeting: '¡Feliz año nuevo! Soy Jogiño.' },
  reyes: { label: 'Reyes', greeting: '¡Felices Reyes! ¿Os han traído algún juego?' },
  sanValentin: { label: 'San Valentín', greeting: '¡Feliz San Valentín! ¿Un juego para dos?' },
  carnaval: { label: 'Carnaval', greeting: '¡Feliz Carnaval! ¿A que no me reconoces?' },
  primavera: { label: 'Primavera', greeting: '¡Hola, soy Jogiño! Ya es primavera.' },
  cumple: { label: 'Su cumpleaños', greeting: '¡Hoy es mi cumpleaños! ¿Lo celebramos con una partida?' },
  verano: { label: 'Verano', greeting: '¡Hola, soy Jogiño! ¿Una partida a la sombra?' },
  otono: { label: 'Otoño', greeting: '¡Hola, soy Jogiño! Tarde de otoño, tarde de juegos.' },
};

export const isCostumeChoice = (value: unknown): value is CostumeChoice =>
  value === 'auto' || value === 'ninguno' || (COSTUMES as readonly string[]).includes(value as string);

/** Easter Sunday (Gregorian, the anonymous algorithm), as month (1–12) and day. */
export function easter(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const g = Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3);
  const h = (19 * a + b - Math.floor(b / 4) - g + 15) % 30;
  const l = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - h - (c % 4)) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return { month: Math.floor(n / 31), day: (n % 31) + 1 };
}

const DAY = 86_400_000;
const dayOf = (year: number, month: number, day: number) => Date.UTC(year, month - 1, day) / DAY;

/** The costume the calendar asks for on that day, or none. Special days win over seasons. */
export function seasonFor(date: Date): Costume | null {
  const year = date.getFullYear();
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  const today = dayOf(year, date.getMonth() + 1, date.getDate());
  const { month, day } = easter(year);
  // Carnaval: from jueves lardero to the burial of the sardine (Carnival Tuesday is Easter − 47).
  const carnivalTuesday = dayOf(year, month, day) - 47;

  if (md >= 1231 || md <= 101) return 'finDeAno';
  if (md >= 105 && md <= 106) return 'reyes';
  if (md >= 1201 || md <= 104) return 'navidad';
  if (md >= 1020 && md <= 1102) return 'halloween';
  // When Carnaval and San Valentín overlap, the 14th itself stays San Valentín.
  if (md === 214) return 'sanValentin';
  if (today >= carnivalTuesday - 5 && today <= carnivalTuesday + 1) return 'carnaval';
  if (md >= 210 && md <= 214) return 'sanValentin';
  if (md === 531) return 'cumple'; // Jogiño's birthday
  if (md >= 621 && md <= 915) return 'verano';
  if (md >= 321 && md <= 620) return 'primavera';
  if (md >= 916 && md <= 1130) return 'otono';
  return null;
}

/** What he wears: the chosen costume, or the calendar's when following it. */
export function wornCostume(choice: CostumeChoice, date: Date): Costume | null {
  if (choice === 'ninguno') return null;
  return choice === 'auto' ? seasonFor(date) : choice;
}

/** The first line of his bubble follows the calendar, whatever he's wearing. */
export const greetingFor = (date: Date) => {
  const season = seasonFor(date);
  return season ? COSTUME_INFO[season].greeting : '¡Hola, soy Jogiño!';
};
