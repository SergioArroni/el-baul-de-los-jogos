// Official expansions of the games in the library, each with its own cover in public/covers/.
// `base` is the library slug of the game it expands. The first name is the one shown (the
// Spanish edition's when there is one); the others help recognise it however it was typed.
// Games not listed here can still get expansions added by hand (they show the base cover).

export interface ExpansionEntry {
  slug: string;
  base: string;
  names: string[];
}

export const EXPANSIONS: ExpansionEntry[] = [
  { slug: 'scythe-invasores', base: 'scythe', names: ['Invasores de tierras lejanas', 'Invaders from Afar'] },
  { slug: 'scythe-fenris', base: 'scythe', names: ['El auge de Fenris', 'The Rise of Fenris'] },
  { slug: 'scythe-wind-gambit', base: 'scythe', names: ['The Wind Gambit', 'El viento de la guerra'] },
  { slug: 'scythe-encuentros', base: 'scythe', names: ['Encuentros', 'Encounters'] },

  { slug: 'dominion-intriga', base: 'dominion', names: ['Intriga', 'Intrigue'] },
  { slug: 'dominion-terramar', base: 'dominion', names: ['Terramar', 'Seaside'] },
  { slug: 'dominion-prosperidad', base: 'dominion', names: ['Prosperidad', 'Prosperity'] },
  { slug: 'dominion-edad-oscura', base: 'dominion', names: ['Edad Oscura', 'Dark Ages'] },
  { slug: 'dominion-aventuras', base: 'dominion', names: ['Aventuras', 'Adventures'] },

  { slug: 'carcassonne-posadas', base: 'carcassonne', names: ['Posadas y catedrales', 'Inns & Cathedrals'] },
  { slug: 'carcassonne-constructores', base: 'carcassonne', names: ['Constructores y comerciantes', 'Traders & Builders'] },
  { slug: 'carcassonne-princesa', base: 'carcassonne', names: ['La princesa y el dragón', 'The Princess & the Dragon'] },

  { slug: '7-wonders-leaders', base: '7-wonders', names: ['Leaders'] },
  { slug: '7-wonders-cities', base: '7-wonders', names: ['Cities'] },
  { slug: '7-wonders-armada', base: '7-wonders', names: ['Armada'] },

  { slug: 'cities-of-splendor', base: 'splendor', names: ['Las ciudades de Splendor', 'Cities of Splendor', 'Ciudades de Splendor'] },

  { slug: 'mysterium-secretos', base: 'mysterium', names: ['Secretos y mentiras', 'Secrets & Lies'] },
  { slug: 'mysterium-senales', base: 'mysterium', names: ['Señales ocultas', 'Hidden Signs'] },

  { slug: 'munchkin-2', base: 'munchkin', names: ['Munchkin 2: Hacha descomunal', 'Unnatural Axe', 'Hacha descomunal'] },
  { slug: 'munchkin-3', base: 'munchkin', names: ['Munchkin 3: Pifias clericales', 'Clerical Errors', 'Pifias clericales'] },

  { slug: 'virus-2', base: 'virus', names: ['Virus! 2 Evolution', 'Evolution'] },

  { slug: 'mansiones-umbral', base: 'mansiones-locura', names: ['Más allá del umbral', 'Beyond the Threshold'] },
  { slug: 'mansiones-santuario', base: 'mansiones-locura', names: ['Santuario del crepúsculo', 'Sanctum of Twilight'] },

  { slug: 'dead-of-winter-colonias', base: 'dead-of-winter', names: ['Colonias en guerra', 'Warring Colonies'] },
];
