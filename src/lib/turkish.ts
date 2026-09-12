// Case suffixes for proper nouns such as dog names. Turkish spelling joins them with an
// apostrophe, takes the vowel from the name's last vowel (vowel harmony), and adds a buffer
// consonant after a final vowel: Pamuk'u, Luna'yı, Zeytin'in, Mia'nın.

const VOWELS = 'aeıioöuüâîû';

function lastVowel(name: string) {
  // Names like "Toby" or "Lucky" end in a y that is spoken as i.
  const spoken = name.toLocaleLowerCase('tr').replace(/([^aeıioöuü])y$/, '$1i');
  const vowels = [...spoken].filter((ch) => VOWELS.includes(ch));
  const lastChar = spoken[spoken.length - 1];
  return {
    vowel: vowels[vowels.length - 1] ?? 'e',
    endsInVowel: lastChar !== undefined && VOWELS.includes(lastChar),
  };
}

// Four-way harmony used by the accusative and genitive: a/ı → ı, e/i → i, o/u → u, ö/ü → ü.
function highVowel(vowel: string) {
  if ('aıâ'.includes(vowel)) return 'ı';
  if ('eiî'.includes(vowel)) return 'i';
  if ('ouû'.includes(vowel)) return 'u';
  return 'ü';
}

/** Belirtme hâli: Pamuk'u, Luna'yı, Zeytin'i, Toby'yi */
export function accusative(name: string) {
  const trimmed = name.trim();
  const { vowel, endsInVowel } = lastVowel(trimmed);
  return `${trimmed}'${endsInVowel ? 'y' : ''}${highVowel(vowel)}`;
}

/** Tamlayan hâli: Pamuk'un, Luna'nın, Zeytin'in, Toby'nin */
export function genitive(name: string) {
  const trimmed = name.trim();
  const { vowel, endsInVowel } = lastVowel(trimmed);
  return `${trimmed}'${endsInVowel ? 'n' : ''}${highVowel(vowel)}n`;
}
