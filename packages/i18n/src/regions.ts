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
 * The subdivisions a postal address actually needs.
 *
 * The countries Hearth is built for first, plus the ones churches using it are
 * most likely to be in. Everywhere else takes a text field, which is the honest
 * answer: half-listing the regions of a country is worse than asking.
 *
 * Codes are ISO 3166-2 without the country prefix, so "MO" is Missouri under US
 * and Mayo under IE. The name is English and is not translated, because an
 * address is written the way the post office reads it.
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
  NZ: [
    ["AUK","Auckland"],["BOP","Bay of Plenty"],["CAN","Canterbury"],["CIT","Chatham Islands"],
    ["GIS","Gisborne"],["HKB","Hawke's Bay"],["MBH","Marlborough"],["MWT","Manawatu-Whanganui"],
    ["NSN","Nelson"],["NTL","Northland"],["OTA","Otago"],["STL","Southland"],["TAS","Tasman"],
    ["TKI","Taranaki"],["WGN","Wellington"],["WKO","Waikato"],["WTC","West Coast"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  IE: [
    ["CW","Carlow"],["CN","Cavan"],["CE","Clare"],["CO","Cork"],["DL","Donegal"],["D","Dublin"],
    ["G","Galway"],["KY","Kerry"],["KE","Kildare"],["KK","Kilkenny"],["LS","Laois"],
    ["LM","Leitrim"],["LK","Limerick"],["LD","Longford"],["LH","Louth"],["MO","Mayo"],
    ["MH","Meath"],["MN","Monaghan"],["OY","Offaly"],["RN","Roscommon"],["SO","Sligo"],
    ["TA","Tipperary"],["WD","Waterford"],["WH","Westmeath"],["WX","Wexford"],["WW","Wicklow"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  GB: [
    ["ENG","England"],["NIR","Northern Ireland"],["SCT","Scotland"],["WLS","Wales"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  NG: [
    ["AB","Abia"],["AD","Adamawa"],["AK","Akwa Ibom"],["AN","Anambra"],["BA","Bauchi"],
    ["BY","Bayelsa"],["BE","Benue"],["BO","Borno"],["CR","Cross River"],["DE","Delta"],
    ["EB","Ebonyi"],["ED","Edo"],["EK","Ekiti"],["EN","Enugu"],["FC","Federal Capital Territory"],
    ["GO","Gombe"],["IM","Imo"],["JI","Jigawa"],["KD","Kaduna"],["KN","Kano"],["KT","Katsina"],
    ["KE","Kebbi"],["KO","Kogi"],["KW","Kwara"],["LA","Lagos"],["NA","Nasarawa"],["NI","Niger"],
    ["OG","Ogun"],["ON","Ondo"],["OS","Osun"],["OY","Oyo"],["PL","Plateau"],["RI","Rivers"],
    ["SO","Sokoto"],["TA","Taraba"],["YO","Yobe"],["ZA","Zamfara"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  KE: [
    ["01","Baringo"],["02","Bomet"],["03","Bungoma"],["04","Busia"],["05","Elgeyo-Marakwet"],
    ["06","Embu"],["07","Garissa"],["08","Homa Bay"],["09","Isiolo"],["10","Kajiado"],
    ["11","Kakamega"],["12","Kericho"],["13","Kiambu"],["14","Kilifi"],["15","Kirinyaga"],
    ["16","Kisii"],["17","Kisumu"],["18","Kitui"],["19","Kwale"],["20","Laikipia"],["21","Lamu"],
    ["22","Machakos"],["23","Makueni"],["24","Mandera"],["25","Marsabit"],["26","Meru"],
    ["27","Migori"],["28","Mombasa"],["29","Murang'a"],["30","Nairobi"],["31","Nakuru"],
    ["32","Nandi"],["33","Narok"],["34","Nyamira"],["35","Nyandarua"],["36","Nyeri"],
    ["37","Samburu"],["38","Siaya"],["39","Taita-Taveta"],["40","Tana River"],
    ["41","Tharaka-Nithi"],["42","Trans Nzoia"],["43","Turkana"],["44","Uasin Gishu"],
    ["45","Vihiga"],["46","Wajir"],["47","West Pokot"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  GH: [
    ["AF","Ahafo"],["AH","Ashanti"],["BO","Bono"],["BE","Bono East"],["CP","Central"],
    ["EP","Eastern"],["AA","Greater Accra"],["NE","North East"],["NP","Northern"],
    ["OT","Oti"],["SV","Savannah"],["UE","Upper East"],["UW","Upper West"],["TV","Volta"],
    ["WP","Western"],["WN","Western North"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  ZA: [
    ["EC","Eastern Cape"],["FS","Free State"],["GP","Gauteng"],["KZN","KwaZulu-Natal"],
    ["LP","Limpopo"],["MP","Mpumalanga"],["NC","Northern Cape"],["NW","North West"],
    ["WC","Western Cape"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  IN: [
    ["AN","Andaman and Nicobar Islands"],["AP","Andhra Pradesh"],["AR","Arunachal Pradesh"],
    ["AS","Assam"],["BR","Bihar"],["CH","Chandigarh"],["CT","Chhattisgarh"],
    ["DH","Dadra and Nagar Haveli and Daman and Diu"],["DL","Delhi"],["GA","Goa"],
    ["GJ","Gujarat"],["HR","Haryana"],["HP","Himachal Pradesh"],["JK","Jammu and Kashmir"],
    ["JH","Jharkhand"],["KA","Karnataka"],["KL","Kerala"],["LA","Ladakh"],["LD","Lakshadweep"],
    ["MP","Madhya Pradesh"],["MH","Maharashtra"],["MN","Manipur"],["ML","Meghalaya"],
    ["MZ","Mizoram"],["NL","Nagaland"],["OR","Odisha"],["PY","Puducherry"],["PB","Punjab"],
    ["RJ","Rajasthan"],["SK","Sikkim"],["TN","Tamil Nadu"],["TG","Telangana"],["TR","Tripura"],
    ["UP","Uttar Pradesh"],["UT","Uttarakhand"],["WB","West Bengal"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  MX: [
    ["AGU","Aguascalientes"],["BCN","Baja California"],["BCS","Baja California Sur"],
    ["CAM","Campeche"],["CHP","Chiapas"],["CHH","Chihuahua"],["CMX","Ciudad de Mexico"],
    ["COA","Coahuila"],["COL","Colima"],["DUR","Durango"],["GUA","Guanajuato"],["GRO","Guerrero"],
    ["HID","Hidalgo"],["JAL","Jalisco"],["MEX","Mexico"],["MIC","Michoacan"],["MOR","Morelos"],
    ["NAY","Nayarit"],["NLE","Nuevo Leon"],["OAX","Oaxaca"],["PUE","Puebla"],["QUE","Queretaro"],
    ["ROO","Quintana Roo"],["SLP","San Luis Potosi"],["SIN","Sinaloa"],["SON","Sonora"],
    ["TAB","Tabasco"],["TAM","Tamaulipas"],["TLA","Tlaxcala"],["VER","Veracruz"],
    ["YUC","Yucatan"],["ZAC","Zacatecas"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  BR: [
    ["AC","Acre"],["AL","Alagoas"],["AP","Amapa"],["AM","Amazonas"],["BA","Bahia"],
    ["CE","Ceara"],["DF","Distrito Federal"],["ES","Espirito Santo"],["GO","Goias"],
    ["MA","Maranhao"],["MT","Mato Grosso"],["MS","Mato Grosso do Sul"],["MG","Minas Gerais"],
    ["PA","Para"],["PB","Paraiba"],["PR","Parana"],["PE","Pernambuco"],["PI","Piaui"],
    ["RJ","Rio de Janeiro"],["RN","Rio Grande do Norte"],["RS","Rio Grande do Sul"],
    ["RO","Rondonia"],["RR","Roraima"],["SC","Santa Catarina"],["SP","Sao Paulo"],
    ["SE","Sergipe"],["TO","Tocantins"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  DE: [
    ["BW","Baden-Wurttemberg"],["BY","Bavaria"],["BE","Berlin"],["BB","Brandenburg"],
    ["HB","Bremen"],["HH","Hamburg"],["HE","Hesse"],["MV","Mecklenburg-Vorpommern"],
    ["NI","Lower Saxony"],["NW","North Rhine-Westphalia"],["RP","Rhineland-Palatinate"],
    ["SL","Saarland"],["SN","Saxony"],["ST","Saxony-Anhalt"],["SH","Schleswig-Holstein"],
    ["TH","Thuringia"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  FR: [
    ["ARA","Auvergne-Rhone-Alpes"],["BFC","Bourgogne-Franche-Comte"],["BRE","Brittany"],
    ["CVL","Centre-Val de Loire"],["COR","Corsica"],["GES","Grand Est"],
    ["HDF","Hauts-de-France"],["IDF","Ile-de-France"],["NOR","Normandy"],
    ["NAQ","Nouvelle-Aquitaine"],["OCC","Occitanie"],["PDL","Pays de la Loire"],
    ["PAC","Provence-Alpes-Cote d'Azur"],["GP","Guadeloupe"],["GF","French Guiana"],
    ["MQ","Martinique"],["YT","Mayotte"],["RE","Reunion"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  ES: [
    ["AN","Andalusia"],["AR","Aragon"],["AS","Asturias"],["IB","Balearic Islands"],
    ["PV","Basque Country"],["CN","Canary Islands"],["CB","Cantabria"],["CL","Castile and Leon"],
    ["CM","Castile-La Mancha"],["CT","Catalonia"],["CE","Ceuta"],["EX","Extremadura"],
    ["GA","Galicia"],["RI","La Rioja"],["MD","Madrid"],["ML","Melilla"],["MC","Murcia"],
    ["NC","Navarre"],["VC","Valencia"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  IT: [
    ["65","Abruzzo"],["77","Basilicata"],["78","Calabria"],["72","Campania"],
    ["45","Emilia-Romagna"],["36","Friuli Venezia Giulia"],["62","Lazio"],["42","Liguria"],
    ["25","Lombardy"],["57","Marche"],["67","Molise"],["21","Piedmont"],["75","Apulia"],
    ["88","Sardinia"],["82","Sicily"],["52","Tuscany"],["32","Trentino-South Tyrol"],
    ["55","Umbria"],["23","Aosta Valley"],["34","Veneto"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  NL: [
    ["DR","Drenthe"],["FL","Flevoland"],["FR","Friesland"],["GE","Gelderland"],
    ["GR","Groningen"],["LI","Limburg"],["NB","North Brabant"],["NH","North Holland"],
    ["OV","Overijssel"],["UT","Utrecht"],["ZE","Zeeland"],["ZH","South Holland"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  JP: [
    ["01","Hokkaido"],["02","Aomori"],["03","Iwate"],["04","Miyagi"],["05","Akita"],
    ["06","Yamagata"],["07","Fukushima"],["08","Ibaraki"],["09","Tochigi"],["10","Gunma"],
    ["11","Saitama"],["12","Chiba"],["13","Tokyo"],["14","Kanagawa"],["15","Niigata"],
    ["16","Toyama"],["17","Ishikawa"],["18","Fukui"],["19","Yamanashi"],["20","Nagano"],
    ["21","Gifu"],["22","Shizuoka"],["23","Aichi"],["24","Mie"],["25","Shiga"],["26","Kyoto"],
    ["27","Osaka"],["28","Hyogo"],["29","Nara"],["30","Wakayama"],["31","Tottori"],
    ["32","Shimane"],["33","Okayama"],["34","Hiroshima"],["35","Yamaguchi"],["36","Tokushima"],
    ["37","Kagawa"],["38","Ehime"],["39","Kochi"],["40","Fukuoka"],["41","Saga"],
    ["42","Nagasaki"],["43","Kumamoto"],["44","Oita"],["45","Miyazaki"],["46","Kagoshima"],
    ["47","Okinawa"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  KR: [
    ["11","Seoul"],["26","Busan"],["27","Daegu"],["28","Incheon"],["29","Gwangju"],
    ["30","Daejeon"],["31","Ulsan"],["50","Sejong"],["41","Gyeonggi"],["42","Gangwon"],
    ["43","North Chungcheong"],["44","South Chungcheong"],["45","North Jeolla"],
    ["46","South Jeolla"],["47","North Gyeongsang"],["48","South Gyeongsang"],["49","Jeju"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  MY: [
    ["01","Johor"],["02","Kedah"],["03","Kelantan"],["04","Melaka"],["05","Negeri Sembilan"],
    ["06","Pahang"],["07","Pulau Pinang"],["08","Perak"],["09","Perlis"],["10","Selangor"],
    ["11","Terengganu"],["12","Sabah"],["13","Sarawak"],["14","Kuala Lumpur"],
    ["15","Labuan"],["16","Putrajaya"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  PH: [
    ["14","Cordillera Administrative Region"],["05","Bicol"],["02","Cagayan Valley"],
    ["40","Calabarzon"],["13","Caraga"],["03","Central Luzon"],["07","Central Visayas"],
    ["11","Davao"],["08","Eastern Visayas"],["01","Ilocos"],["00","Metro Manila"],
    ["15","Bangsamoro"],["10","Northern Mindanao"],["12","Soccsksargen"],["41","Mimaropa"],
    ["06","Western Visayas"],["09","Zamboanga Peninsula"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  ID: [
    ["AC","Aceh"],["BA","Bali"],["BB","Bangka Belitung Islands"],["BT","Banten"],
    ["BE","Bengkulu"],["JK","Jakarta"],["GO","Gorontalo"],["JA","Jambi"],["JB","West Java"],
    ["JT","Central Java"],["JI","East Java"],["KB","West Kalimantan"],
    ["KS","South Kalimantan"],["KT","Central Kalimantan"],["KI","East Kalimantan"],
    ["KU","North Kalimantan"],["KR","Riau Islands"],["LA","Lampung"],["MA","Maluku"],
    ["MU","North Maluku"],["NB","West Nusa Tenggara"],["NT","East Nusa Tenggara"],
    ["PA","Papua"],["PB","West Papua"],["RI","Riau"],["SR","West Sulawesi"],
    ["SN","South Sulawesi"],["ST","Central Sulawesi"],["SG","Southeast Sulawesi"],
    ["SA","North Sulawesi"],["SB","West Sumatra"],["SS","South Sumatra"],
    ["SU","North Sumatra"],["YO","Yogyakarta"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  PK: [
    ["BA","Balochistan"],["GB","Gilgit-Baltistan"],["IS","Islamabad"],["JK","Azad Kashmir"],
    ["KP","Khyber Pakhtunkhwa"],["PB","Punjab"],["SD","Sindh"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  BD: [
    ["A","Barisal"],["B","Chittagong"],["C","Dhaka"],["D","Khulna"],["E","Rajshahi"],
    ["F","Rangpur"],["G","Sylhet"],["H","Mymensingh"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  AR: [
    ["C","Buenos Aires City"],["B","Buenos Aires Province"],["K","Catamarca"],["H","Chaco"],
    ["U","Chubut"],["X","Cordoba"],["W","Corrientes"],["E","Entre Rios"],["P","Formosa"],
    ["Y","Jujuy"],["L","La Pampa"],["F","La Rioja"],["M","Mendoza"],["N","Misiones"],
    ["Q","Neuquen"],["R","Rio Negro"],["A","Salta"],["J","San Juan"],["D","San Luis"],
    ["Z","Santa Cruz"],["S","Santa Fe"],["G","Santiago del Estero"],
    ["V","Tierra del Fuego"],["T","Tucuman"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  CL: [
    ["AI","Aysen"],["AN","Antofagasta"],["AP","Arica y Parinacota"],["AR","Araucania"],
    ["AT","Atacama"],["BI","Biobio"],["CO","Coquimbo"],["LI","O'Higgins"],["LL","Los Lagos"],
    ["LR","Los Rios"],["MA","Magallanes"],["ML","Maule"],["NB","Nuble"],["RM","Santiago"],
    ["TA","Tarapaca"],["VS","Valparaiso"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  TZ: [
    ["01","Arusha"],["02","Dar es Salaam"],["03","Dodoma"],["04","Iringa"],["05","Kagera"],
    ["06","Pemba North"],["07","Zanzibar North"],["08","Kigoma"],["09","Kilimanjaro"],
    ["10","Pemba South"],["11","Zanzibar South"],["12","Lindi"],["13","Mara"],["14","Mbeya"],
    ["15","Zanzibar West"],["16","Morogoro"],["17","Mtwara"],["18","Mwanza"],["19","Pwani"],
    ["20","Rukwa"],["21","Ruvuma"],["22","Shinyanga"],["23","Singida"],["24","Tabora"],
    ["25","Tanga"],["26","Manyara"],["27","Geita"],["28","Katavi"],["29","Njombe"],
    ["30","Simiyu"],["31","Songwe"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  UG: [
    ["C","Central"],["E","Eastern"],["N","Northern"],["W","Western"],
  ].map(([code, name]) => ({ code: code!, name: name! })),
  ET: [
    ["AA","Addis Ababa"],["AF","Afar"],["AM","Amhara"],["BE","Benishangul-Gumuz"],
    ["DD","Dire Dawa"],["GA","Gambela"],["HA","Harari"],["OR","Oromia"],["SI","Sidama"],
    ["SO","Somali"],["SW","South West Ethiopia"],["SN","Southern Nations"],["TI","Tigray"],
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
  US: "State", AU: "State", BR: "State", MX: "State", MY: "State", NG: "State",
  IN: "State", DE: "State",
  CA: "Province", ZA: "Province", NL: "Province", PK: "Province", ID: "Province",
  AR: "Province", CL: "Region", FR: "Region", IT: "Region", ES: "Region",
  NZ: "Region", PH: "Region", TZ: "Region", UG: "Region", ET: "Region",
  GB: "Country", IE: "County", KE: "County", GH: "Region",
  JP: "Prefecture", KR: "Province", BD: "Division",
};
