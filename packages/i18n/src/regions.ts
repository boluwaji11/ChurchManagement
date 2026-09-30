/**
 * Countries, and the subdivisions of the ones that use them.
 *
 * Only the codes are stored. The names come from Intl at read time, so the list
 * arrives in the reader's language without us shipping a translation of it, and
 * it stays current without us maintaining one.
 */

/** ISO 3166-1 alpha-2. */
export const COUNTRY_CODES = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ",
  "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ",
  "CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ",
  "DE","DJ","DK","DM","DO","DZ",
  "EC","EE","EG","EH","ER","ES","ET",
  "FI","FJ","FK","FM","FO","FR",
  "GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY",
  "HK","HM","HN","HR","HT","HU",
  "ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT",
  "JE","JM","JO","JP",
  "KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ",
  "LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY",
  "MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ",
  "NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ",
  "OM",
  "PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY",
  "QA",
  "RE","RO","RS","RU","RW",
  "SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ",
  "TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ",
  "UA","UG","UM","US","UY","UZ",
  "VA","VC","VE","VG","VI","VN","VU",
  "WF","WS",
  "YE","YT",
  "ZA","ZM","ZW",
] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

export const isCountryCode = (value: string): value is CountryCode =>
  (COUNTRY_CODES as readonly string[]).includes(value);

/**
 * The subdivisions a postal address actually needs, for the countries this is
 * built for first. Everywhere else takes a text field, which is the honest
 * answer: half-listing the regions of a country is worse than asking.
 */
export const SUBDIVISIONS: Record<string, { code: string; name: string }[]> = {
  US: [
    ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],
    ["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["DC","District of Columbia"],
    ["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],
    ["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],
    ["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],
    ["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],
    ["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],
    ["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],
    ["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],
    ["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],
    ["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],
    ["AS","American Samoa"],["GU","Guam"],["MP","Northern Mariana Islands"],["PR","Puerto Rico"],
    ["VI","U.S. Virgin Islands"],["AA","Armed Forces Americas"],["AE","Armed Forces Europe"],
    ["AP","Armed Forces Pacific"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  CA: [
    ["AB","Alberta"],["BC","British Columbia"],["MB","Manitoba"],["NB","New Brunswick"],
    ["NL","Newfoundland and Labrador"],["NS","Nova Scotia"],["NT","Northwest Territories"],
    ["NU","Nunavut"],["ON","Ontario"],["PE","Prince Edward Island"],["QC","Quebec"],
    ["SK","Saskatchewan"],["YT","Yukon"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  AU: [
    ["ACT","Australian Capital Territory"],["NSW","New South Wales"],["NT","Northern Territory"],
    ["QLD","Queensland"],["SA","South Australia"],["TAS","Tasmania"],["VIC","Victoria"],
    ["WA","Western Australia"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
};

export const hasSubdivisions = (country: string): boolean => country in SUBDIVISIONS;

export const subdivisionsFor = (country: string) => SUBDIVISIONS[country] ?? [];

/** The country's name, in the reader's language. Falls back to the code. */
export function countryName(code: string, locale?: string): string {
  try {
    const names = new Intl.DisplayNames(locale ? [locale] : undefined, { type: "region" });
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Every country, named and sorted the way the reader's language sorts. */
export function countryList(locale?: string): { code: string; name: string }[] {
  return COUNTRY_CODES.map((code) => ({ code, name: countryName(code, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

/** What a country calls the line under the city. */
export const REGION_LABEL: Record<string, string> = {
  US: "State", CA: "Province", AU: "State", GB: "County", IE: "County",
};
