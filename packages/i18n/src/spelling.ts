/**
 * R22.8. British and American spelling, from one catalogue.
 *
 * The catalogue is written one way and converted the other, rather than kept
 * twice. Two copies of two thousand strings drift the moment somebody fixes a
 * typo in one of them, and the difference between the two is a list of about
 * forty words.
 *
 * Only words whose American form is unambiguous are here. "Programme" becomes
 * "program", which is right for a church's order of service and wrong for
 * nothing we write. Anything with a real ambiguity, where the American spelling
 * means something else, is left out: a church reading the wrong word is worse
 * than a church reading a foreign spelling of the right one.
 */

export type Spelling = "british" | "american";

/**
 * British to American, longest first so a prefix cannot win over a longer word
 * that contains it.
 *
 * Written as whole words with word boundaries, because "our" inside "fourth" is
 * not a spelling difference and a substring rule would make it one.
 */
const WORDS: [string, string][] = [
  // -our
  ["colour", "color"],
  ["colours", "colors"],
  ["coloured", "colored"],
  ["colourful", "colorful"],
  ["behaviour", "behavior"],
  ["behaviours", "behaviors"],
  ["favourite", "favorite"],
  ["favourites", "favorites"],
  ["favour", "favor"],
  ["honour", "honor"],
  ["honoured", "honored"],
  ["honouring", "honoring"],
  ["labour", "labor"],
  ["neighbour", "neighbor"],
  ["neighbours", "neighbors"],
  ["rumour", "rumor"],
  ["savour", "savor"],

  // -ise and -yse
  ["organise", "organize"],
  ["organised", "organized"],
  ["organiser", "organizer"],
  ["organisers", "organizers"],
  ["organising", "organizing"],
  ["organisation", "organization"],
  ["organisations", "organizations"],
  ["recognise", "recognize"],
  ["recognised", "recognized"],
  ["recognises", "recognizes"],
  ["apologise", "apologize"],
  ["apologised", "apologized"],
  ["authorise", "authorize"],
  ["authorised", "authorized"],
  ["authorisation", "authorization"],
  ["personalise", "personalize"],
  ["personalised", "personalized"],
  ["customise", "customize"],
  ["customised", "customized"],
  ["prioritise", "prioritize"],
  ["prioritised", "prioritized"],
  ["summarise", "summarize"],
  ["summarised", "summarized"],
  ["analyse", "analyze"],
  ["analysed", "analyzed"],
  ["analysing", "analyzing"],

  // -re
  ["centre", "center"],
  ["centres", "centers"],
  ["centred", "centered"],
  ["theatre", "theater"],
  ["metre", "meter"],
  ["metres", "meters"],
  ["litre", "liter"],
  ["litres", "liters"],

  // -ce and -se
  ["licence", "license"],
  ["licences", "licenses"],
  ["defence", "defense"],
  ["offence", "offense"],
  ["practise", "practice"],
  ["practised", "practiced"],
  ["practising", "practicing"],

  // doubled consonants
  ["cancelled", "canceled"],
  ["cancelling", "canceling"],
  ["travelled", "traveled"],
  ["travelling", "traveling"],
  ["traveller", "traveler"],
  ["travellers", "travelers"],
  ["labelled", "labeled"],
  ["labelling", "labeling"],
  ["modelled", "modeled"],
  ["modelling", "modeling"],
  ["enrol", "enroll"],
  ["enrols", "enrolls"],
  ["enrolment", "enrollment"],
  ["fulfil", "fulfill"],
  ["fulfilment", "fulfillment"],
  ["instalment", "installment"],
  ["instalments", "installments"],
  ["skilful", "skillful"],

  // the rest
  ["cheque", "check"],
  ["cheques", "checks"],
  ["catalogue", "catalog"],
  ["catalogues", "catalogs"],
  ["dialogue", "dialog"],
  ["programme", "program"],
  ["programmes", "programs"],
  ["grey", "gray"],
  ["jewellery", "jewelry"],
  ["pyjamas", "pajamas"],
  ["storey", "story"],
  ["storeys", "stories"],
  ["whilst", "while"],
  ["amongst", "among"],
  ["towards", "toward"],
  ["learnt", "learned"],
  ["spelt", "spelled"],
  ["burnt", "burned"],
  ["ageing", "aging"],
  ["draught", "draft"],
  ["kerb", "curb"],
  ["plough", "plow"],
  ["sceptical", "skeptical"],
  ["speciality", "specialty"],
  ["tyre", "tyre"],
];

/** Longest first, so "colourful" is matched before "colour". */
const SORTED = [...WORDS].sort((a, b) => b[0].length - a[0].length);

const PATTERN = new RegExp(`\\b(${SORTED.map(([from]) => from).join("|")})\\b`, "gi");

const REPLACEMENTS = new Map(SORTED.map(([from, to]) => [from, to]));

/**
 * Keeps the shape of the word that was written.
 *
 * "Colour" at the start of a sentence has to come back as "Color", and "COLOUR"
 * on a heading as "COLOR". Anything else is left as the table has it.
 */
function likeFor(source: string, replacement: string): string {
  if (source === source.toUpperCase() && source !== source.toLowerCase()) {
    return replacement.toUpperCase();
  }
  if (source[0] === source[0]?.toUpperCase()) {
    return replacement[0]!.toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/** Rewrites a string in American spelling. */
export function toAmerican(text: string): string {
  if (!text) return text;
  return text.replace(PATTERN, (word) => {
    const replacement = REPLACEMENTS.get(word.toLowerCase());
    return replacement ? likeFor(word, replacement) : word;
  });
}

/**
 * Which spelling a church reads, from the country on its record.
 *
 * American for the countries that write that way, British everywhere else,
 * which is the spelling the catalogue is already written in. Canada is on the
 * British side because Canadian English keeps "colour" and "centre"; it writes
 * "organize", which this cannot have both ways, and the -our words are the ones
 * anybody notices.
 */
const AMERICAN: ReadonlySet<string> = new Set(["US", "PH", "LR", "PR", "GU", "VI", "AS", "MP"]);

export function spellingFor(country: string | null | undefined): Spelling {
  return country && AMERICAN.has(country.trim().toUpperCase()) ? "american" : "british";
}
