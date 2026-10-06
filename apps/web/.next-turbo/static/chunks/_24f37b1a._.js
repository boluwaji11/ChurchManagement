(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/packages/db/src/repo/which-service.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * R8.2. Which of today's services the station opens on.
 *
 * Imported by the browser as well as the server, which is why it has no
 * imports of its own and sits behind its own entry point: pulling the database
 * package into a client bundle pulls node:crypto with it.
 *
 * A church with a 09:00 and an 11:00 has a desk standing in front of both all
 * morning, and the one that matters is whichever is happening. Opening on the
 * first of the day means that at 11:15 a volunteer is writing children into a
 * service that finished two hours ago, and nothing on the screen says so.
 *
 * The one that has started most recently wins, for as long as a service
 * plausibly runs. Before the first one starts, the next one. Outside both, the
 * nearest, because a station on a Tuesday evening should still work.
 */ __turbopack_context__.s([
    "serviceNow",
    ()=>serviceNow
]);
const RUNS_FOR_MINUTES = 150;
const OPENS_BEFORE_MINUTES = 90;
const minutes = (hhmm)=>{
    const [h, m] = hhmm.split(":").map(Number);
    return (h !== null && h !== void 0 ? h : 0) * 60 + (m !== null && m !== void 0 ? m : 0);
};
function serviceNow(services, now) {
    if (services.length === 0) return "";
    const at = minutes(now);
    const sorted = [
        ...services
    ].sort((a, b)=>a.startsAt.localeCompare(b.startsAt));
    const running = sorted.filter((s)=>{
        const start = minutes(s.startsAt);
        return at >= start && at - start <= RUNS_FOR_MINUTES;
    }).pop();
    if (running) return running.id;
    const soon = sorted.find((s)=>{
        const start = minutes(s.startsAt);
        return start > at && start - at <= OPENS_BEFORE_MINUTES;
    });
    if (soon) return soon.id;
    return sorted.map((s)=>({
            id: s.id,
            away: Math.abs(minutes(s.startsAt) - at)
        })).sort((a, b)=>a.away - b.away)[0].id;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/db/src/repo/age.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * The age and room rules, with nothing behind them.
 *
 * A station with no network applies the same rules the server does, so they
 * live in a file that imports nothing and is served to the browser through
 * `@connectapp/db/rules`.
 */ /** What suggesting a room needs to know about one. The repo's Room satisfies it. */ __turbopack_context__.s([
    "ageInMonths",
    ()=>ageInMonths,
    "suggestRoom",
    ()=>suggestRoom
]);
function ageInMonths(dateOfBirth, asOf) {
    const born = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
    const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asOf);
    if (!born || !day) return null;
    const [, by, bm, bd] = born.map(Number);
    const [, ay, am, ad] = day.map(Number);
    let months = (ay - by) * 12 + (am - bm);
    if (ad < bd) months -= 1;
    return months < 0 ? null : months;
}
function suggestRoom(rooms, ageMonths) {
    if (ageMonths === null) return null;
    const fits = rooms.filter((r)=>r.archivedAt === null && (r.minAgeMonths === null || ageMonths >= r.minAgeMonths) && (r.maxAgeMonths === null || ageMonths < r.maxAgeMonths));
    if (fits.length === 0) return null;
    const width = (r)=>r.minAgeMonths === null || r.maxAgeMonths === null ? Number.POSITIVE_INFINITY : r.maxAgeMonths - r.minAgeMonths;
    return fits.sort((a, b)=>width(a) - width(b) || a.position - b.position || a.name.localeCompare(b.name))[0];
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/db/src/repo/match.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * R8.20. The lookup rules, with no database behind them.
 *
 * A station with no network searches the copy of the directory it pulled down
 * before the service, and it has to find the same members in the same order as
 * the server would. So the rules are written once, here, in a file that imports
 * nothing: the SQL in `lookup.ts` is this file's shape expressed in a query, and
 * a test holds the two together.
 */ __turbopack_context__.s([
    "MIN_QUERY",
    ()=>MIN_QUERY,
    "PHONE_DIGITS",
    ()=>PHONE_DIGITS,
    "rank",
    ()=>rank,
    "search",
    ()=>search
]);
const PHONE_DIGITS = 4;
const MIN_QUERY = 2;
const digits = (raw)=>raw.replace(/\D+/g, "");
function rank(query, person) {
    var _person_preferredName;
    const text = query.trim().toLowerCase();
    if (text.length < MIN_QUERY) return null;
    const numeric = digits(text);
    if (numeric.length >= PHONE_DIGITS) {
        return person.phones.some((phone)=>digits(phone).endsWith(numeric)) ? 0 : null;
    }
    const first = person.firstName.toLowerCase();
    const called = (((_person_preferredName = person.preferredName) === null || _person_preferredName === void 0 ? void 0 : _person_preferredName.trim()) || person.firstName).toLowerCase();
    const last = person.lastName.toLowerCase();
    var _person_householdName;
    const household = ((_person_householdName = person.householdName) !== null && _person_householdName !== void 0 ? _person_householdName : "").toLowerCase();
    if (called.startsWith(text)) return 0;
    if (first.startsWith(text)) return 0;
    if (last.startsWith(text)) return 1;
    if ("".concat(first, " ").concat(last).startsWith(text)) return 2;
    if (household.startsWith(text)) return 3;
    return null;
}
function search(members, query) {
    let limit = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 20;
    const scored = [];
    for (const person of members){
        const score = rank(query, person);
        if (score !== null) scored.push({
            person,
            rank: score
        });
    }
    scored.sort((a, b)=>{
        var _a_person_preferredName, _b_person_preferredName;
        return a.rank - b.rank || a.person.lastName.localeCompare(b.person.lastName) || (((_a_person_preferredName = a.person.preferredName) === null || _a_person_preferredName === void 0 ? void 0 : _a_person_preferredName.trim()) || a.person.firstName).localeCompare(((_b_person_preferredName = b.person.preferredName) === null || _b_person_preferredName === void 0 ? void 0 : _b_person_preferredName.trim()) || b.person.firstName);
    });
    return scored.slice(0, limit).map((s)=>s.person);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/db/src/repo/codes.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * R8.6. The security code on a label pair.
 *
 * The code is the thing standing between a child and the wrong adult, so the
 * rules it has to meet are worth stating plainly.
 *
 * It does not count up. A code that is one more than the family before it tells
 * anybody standing in the queue what the next one will be, and somebody who
 * knows the next one can collect a child who is not theirs.
 *
 * The alphabet leaves out every character a tired volunteer reads wrong at
 * 09:58: no O beside 0, no I or L beside 1, no S beside 5. What is on the label
 * is what gets typed.
 *
 * Five characters from twenty-eight is about seventeen million codes, which a
 * church of five hundred would take a thousand years to exhaust. They are
 * unique for a church and are never handed out twice, which is stronger than
 * the twelve months the requirement asks for and simpler to be sure of.
 */ /** No 0, O, 1, I, L, 5 or S. What is printed is what gets typed. */ __turbopack_context__.s([
    "CODE_ATTEMPTS",
    ()=>CODE_ATTEMPTS,
    "CODE_LENGTH",
    ()=>CODE_LENGTH,
    "looksLikeCode",
    ()=>looksLikeCode,
    "newCode",
    ()=>newCode,
    "readCode",
    ()=>readCode
]);
const ALPHABET = "23456789ABCDEFGHJKMNPQRTUVWXYZ";
const CODE_LENGTH = 5;
const CODE_ATTEMPTS = 8;
function newCode() {
    let length = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : CODE_LENGTH;
    const limit = 256 - 256 % ALPHABET.length;
    let out = "";
    while(out.length < length){
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        for (const byte of bytes){
            if (byte >= limit) continue;
            out += ALPHABET[byte % ALPHABET.length];
            if (out.length === length) break;
        }
    }
    return out;
}
function readCode(input) {
    return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function looksLikeCode(input) {
    const code = readCode(input);
    return code.length === CODE_LENGTH && [
        ...code
    ].every((c)=>ALPHABET.includes(c));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/db/src/repo/release-rules.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * R8.7 to R8.9. Whether a child may go, decided with no database behind it.
 *
 * The questions are asked in this order on purpose. A restriction is checked
 * before the code, because a person a court order names should be stopped
 * whether or not they are holding the right label, and the volunteer should
 * have that conversation once.
 *
 * It is pure so that a station with no network reaches the same answer as the
 * server does, rather than a weaker one.
 */ __turbopack_context__.s([
    "releaseBlock",
    ()=>releaseBlock
]);
function releaseBlock(q) {
    var _q_override;
    if (q.collectedBy) {
        var _q_override1, _q_override2;
        if (q.restricted.includes(q.collectedBy) && ((_q_override1 = q.override) === null || _q_override1 === void 0 ? void 0 : _q_override1.kind) !== "restriction") {
            return "restriction";
        }
        if (!q.allowed.includes(q.collectedBy) && ((_q_override2 = q.override) === null || _q_override2 === void 0 ? void 0 : _q_override2.kind) !== "pickup") {
            return "pickup";
        }
    }
    if (q.kind === "adult") return null;
    // A child is released on the code, and a child whose visit carries none is
    // refused until somebody decides otherwise. Silence is not a match.
    const matches = q.expected !== null && q.typed === q.expected;
    if (!matches && ((_q_override = q.override) === null || _q_override === void 0 ? void 0 : _q_override.kind) !== "code") return "code";
    return null;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/db/src/repo/meeting-dates.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * R9.2, R9.5. When a group meets next.
 *
 * Worked out from the pattern rather than stored, because a church that has to
 * create fifty-two rows to say "Tuesdays" will stop saying it. The dates it
 * produces are what a member reads on the group's page: the next few Tuesdays,
 * and nothing anybody has to maintain.
 *
 * Pure, with no database and no imports, so the browser and the server agree.
 */ __turbopack_context__.s([
    "meetingSentence",
    ()=>meetingSentence,
    "upcomingMeetings",
    ()=>upcomingMeetings
]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const iso = (d)=>d.toISOString().slice(0, 10);
function upcomingMeetings(pattern, from) {
    let count = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 3;
    if (!DATE.test(from) || count < 1) return [];
    // A daily group has no weekday, and every other pattern needs one.
    const daily = pattern.frequency === "daily";
    if (pattern.dayOfWeek === null && !daily) return [];
    const [y, m, d] = from.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, d));
    const first = new Date(start);
    if (!daily) {
        var _pattern_dayOfWeek;
        const ahead = (((_pattern_dayOfWeek = pattern.dayOfWeek) !== null && _pattern_dayOfWeek !== void 0 ? _pattern_dayOfWeek : 0) - start.getUTCDay() + 7) % 7;
        first.setUTCDate(first.getUTCDate() + ahead);
    }
    const step = daily ? 1 : pattern.frequency === "fortnightly" ? 14 : pattern.frequency === "monthly" ? 28 : 7;
    const until = pattern.endsOn && DATE.test(pattern.endsOn) ? pattern.endsOn : null;
    const out = [];
    const cursor = new Date(first);
    for(let n = 0; n < count; n += 1){
        const day = iso(cursor);
        if (until && day > until) break;
        out.push(day);
        cursor.setUTCDate(cursor.getUTCDate() + step);
    }
    return out;
}
function meetingSentence(pattern, words) {
    if (pattern.dayOfWeek === null && pattern.frequency !== "daily") return "";
    const span = pattern.startsAt ? pattern.endsAt ? "".concat(words.time(pattern.startsAt), " to ").concat(words.time(pattern.endsAt)) : words.time(pattern.startsAt) : "";
    var _pattern_frequency;
    return words.template({
        frequency: words.frequency((_pattern_frequency = pattern.frequency) !== null && _pattern_frequency !== void 0 ? _pattern_frequency : "weekly"),
        day: pattern.dayOfWeek === null ? "" : words.day(pattern.dayOfWeek),
        span
    });
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/db/src/repo/check-rules.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * R2.10. What a background check says about somebody today.
 *
 * Pure, with nothing behind it, because the same answer is needed on a person's
 * record, on the serving schedule that refuses to roster somebody without one
 * (R10.9, 0.4), and eventually on a station with no network. One implementation
 * of "is this check still good" rather than three that drift.
 */ /** What a church records. "expired" is worked out rather than written down. */ __turbopack_context__.s([
    "CHECK_RESULTS",
    ()=>CHECK_RESULTS,
    "CHECK_STANDINGS",
    ()=>CHECK_STANDINGS,
    "EXPIRY_WARNING_DAYS",
    ()=>EXPIRY_WARNING_DAYS,
    "expiresOn",
    ()=>expiresOn,
    "mayServeWithChildren",
    ()=>mayServeWithChildren,
    "standing",
    ()=>standing
]);
const CHECK_RESULTS = [
    "pending",
    "clear",
    "flagged"
];
const CHECK_STANDINGS = [
    "none",
    "pending",
    "clear",
    "expiring",
    "expired",
    "flagged"
];
const EXPIRY_WARNING_DAYS = 60;
const daysBetween = (from, to)=>Math.round((Date.parse("".concat(to, "T00:00:00Z")) - Date.parse("".concat(from, "T00:00:00Z"))) / 86_400_000);
function standing(checks, today) {
    if (checks.length === 0) return "none";
    const [latest] = [
        ...checks
    ].sort((a, b)=>{
        var _b_completedOn, _a_completedOn;
        return ((_b_completedOn = b.completedOn) !== null && _b_completedOn !== void 0 ? _b_completedOn : "").localeCompare((_a_completedOn = a.completedOn) !== null && _a_completedOn !== void 0 ? _a_completedOn : "");
    });
    if (!latest) return "none";
    if (latest.status === "flagged") return "flagged";
    if (latest.status === "pending") return "pending";
    if (latest.expiresOn === null) return "clear";
    if (latest.expiresOn < today) return "expired";
    return daysBetween(today, latest.expiresOn) <= EXPIRY_WARNING_DAYS ? "expiring" : "clear";
}
function mayServeWithChildren(checks, today) {
    const where = standing(checks, today);
    return where === "clear" || where === "expiring";
}
function expiresOn(checks) {
    const [latest] = [
        ...checks
    ].sort((a, b)=>{
        var _b_completedOn, _a_completedOn;
        return ((_b_completedOn = b.completedOn) !== null && _b_completedOn !== void 0 ? _b_completedOn : "").localeCompare((_a_completedOn = a.completedOn) !== null && _a_completedOn !== void 0 ? _a_completedOn : "");
    });
    var _latest_expiresOn;
    return (_latest_expiresOn = latest === null || latest === void 0 ? void 0 : latest.expiresOn) !== null && _latest_expiresOn !== void 0 ? _latest_expiresOn : null;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/db/src/repo/directory-rules.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * R3.2 to R3.4. What one member may see of another.
 *
 * Pure, because the same answer has to come out on the screen, in the printed
 * directory and in the PDF (R3.5), and a second implementation is how a church
 * ends up publishing an address somebody hid.
 *
 * The defaults are the whole argument. Name only. A church that imports two
 * hundred members has consent from none of them, so everything else stays off
 * until the member turns it on.
 */ __turbopack_context__.s([
    "DEFAULT_VISIBILITY",
    ()=>DEFAULT_VISIBILITY,
    "entryFor",
    ()=>entryFor
]);
const DEFAULT_VISIBILITY = {
    listed: true,
    showEmail: false,
    showPhone: false,
    showAddress: false,
    showBirthday: false,
    showPhoto: false,
    showChildren: false
};
function entryFor(person, own, householdHead) {
    if (person.isChild) {
        const head = householdHead !== null && householdHead !== void 0 ? householdHead : DEFAULT_VISIBILITY;
        if (!head.showChildren || !own.listed) return null;
        return {
            id: person.id,
            name: person.name,
            isChild: true,
            email: null,
            phone: null,
            address: null,
            birthday: null,
            photoKey: head.showPhoto ? person.photoKey : null
        };
    }
    if (!own.listed) return null;
    return {
        id: person.id,
        name: person.name,
        isChild: false,
        email: own.showEmail ? person.email : null,
        phone: own.showPhone ? person.phone : null,
        address: own.showAddress ? person.address : null,
        birthday: own.showBirthday ? person.birthday : null,
        photoKey: own.showPhoto ? person.photoKey : null
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/db/src/repo/contact-rules.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * R2.4. What a contact is, with nothing that cannot be served to a browser.
 *
 * The shapes and the labels live here rather than beside the queries, because
 * the card that draws them runs on the client and importing the query layer
 * there drags the whole database in with it.
 */ __turbopack_context__.s([
    "CONTACT_LABELS",
    ()=>CONTACT_LABELS,
    "LABELS_FOR",
    ()=>LABELS_FOR
]);
const CONTACT_LABELS = [
    "home",
    "mobile",
    "work",
    "other"
];
const LABELS_FOR = {
    email: [
        "home",
        "work",
        "other"
    ],
    phone: [
        "mobile",
        "home",
        "work",
        "other"
    ]
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/db/src/repo/form-rules.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * R4.1, R4.2, R4.9. What a form holds, which parts of it a reader sees, and
 * whether an answer is good enough.
 *
 * Pure: no database, nothing that cannot be served to a browser. The builder
 * previews a form as it is written and the public form checks answers before it
 * sends them, and both run this rather than two versions of it that disagree
 * about whether an empty string is an answer.
 */ /** R4.1. Every kind of question a church can ask, plus the heading between them. */ __turbopack_context__.s([
    "ANSWERABLE",
    ()=>ANSWERABLE,
    "CONDITION_OPS",
    ()=>CONDITION_OPS,
    "CUSTOM_TARGET",
    ()=>CUSTOM_TARGET,
    "FILES_CEILING",
    ()=>FILES_CEILING,
    "FILE_KINDS",
    ()=>FILE_KINDS,
    "FILE_TYPES",
    ()=>FILE_TYPES,
    "FORM_FIELD_KINDS",
    ()=>FORM_FIELD_KINDS,
    "LOOKS_LIKE_EMAIL",
    ()=>LOOKS_LIKE_EMAIL,
    "NEEDS_OPTIONS",
    ()=>NEEDS_OPTIONS,
    "OPS_NEED_VALUE",
    ()=>OPS_NEED_VALUE,
    "PERSON_TARGETS",
    ()=>PERSON_TARGETS,
    "answered",
    ()=>answered,
    "checkAnswer",
    ()=>checkAnswer,
    "checkSubmission",
    ()=>checkSubmission,
    "conditionHolds",
    ()=>conditionHolds,
    "conditionProblem",
    ()=>conditionProblem,
    "formProblems",
    ()=>formProblems,
    "formSlug",
    ()=>formSlug,
    "isUuid",
    ()=>isUuid,
    "prunedAnswers",
    ()=>prunedAnswers,
    "targetAllowed",
    ()=>targetAllowed,
    "targetsFor",
    ()=>targetsFor,
    "visibleFields",
    ()=>visibleFields
]);
const FORM_FIELD_KINDS = [
    "text",
    "long_text",
    "email",
    "phone",
    "number",
    "date",
    "select",
    "multi_select",
    "checkbox",
    "file",
    "section"
];
const FILE_KINDS = [
    "any",
    "images",
    "documents"
];
const FILE_TYPES = {
    images: [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/heic"
    ],
    documents: [
        "application/pdf",
        "text/plain"
    ],
    any: [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/heic",
        "application/pdf",
        "text/plain"
    ]
};
const FILES_CEILING = 10;
const ANSWERABLE = FORM_FIELD_KINDS.filter(_c = (kind)=>kind !== "section");
_c1 = ANSWERABLE;
const NEEDS_OPTIONS = [
    "select",
    "multi_select"
];
const CONDITION_OPS = [
    "is",
    "is_not",
    "answered",
    "blank"
];
const OPS_NEED_VALUE = [
    "is",
    "is_not"
];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const LOOKS_LIKE_EMAIL = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;
/** Seven digits is the shortest number anybody can be called back on. */ const ENOUGH_DIGITS = 7;
function answered(answer) {
    if (answer === null || answer === undefined) return false;
    if (typeof answer === "string") return answer.trim() !== "";
    if (Array.isArray(answer)) return answer.length > 0;
    if (typeof answer === "boolean") return answer;
    return true;
}
function checkAnswer(field, answer) {
    if (field.kind === "section") return null;
    if (!answered(answer)) {
        return field.required ? "form.error.required" : null;
    }
    switch(field.kind){
        case "number":
            {
                const value = typeof answer === "number" ? answer : Number(String(answer).trim());
                return Number.isFinite(value) ? null : "form.error.number";
            }
        case "date":
            return ISO_DATE.test(String(answer)) && !Number.isNaN(Date.parse(String(answer))) ? null : "form.error.date";
        case "select":
            var _field_options;
            return ((_field_options = field.options) !== null && _field_options !== void 0 ? _field_options : []).includes(String(answer)) ? null : "form.error.choice";
        case "multi_select":
            {
                const chosen = Array.isArray(answer) ? answer : [
                    String(answer)
                ];
                var _field_options1;
                const allowed = (_field_options1 = field.options) !== null && _field_options1 !== void 0 ? _field_options1 : [];
                return chosen.every((one)=>allowed.includes(one)) ? null : "form.error.choice";
            }
        case "checkbox":
            return typeof answer === "boolean" ? null : "form.error.checkbox";
        /*
     * R4.1. The answer is the keys of what was uploaded, so the only thing
     * worth checking here is how many. The bytes themselves were checked for
     * type and size on the way in, which is the only place that can be done.
     */ case "file":
            {
                const keys = Array.isArray(answer) ? answer : [
                    String(answer)
                ];
                var _field_maxFiles;
                return keys.length <= ((_field_maxFiles = field.maxFiles) !== null && _field_maxFiles !== void 0 ? _field_maxFiles : 1) ? null : "form.error.tooManyFiles";
            }
        case "email":
            return LOOKS_LIKE_EMAIL.test(String(answer).trim()) ? null : "form.error.email";
        case "phone":
            return String(answer).replace(/\D/g, "").length >= ENOUGH_DIGITS ? null : "form.error.phone";
        case "text":
            return String(answer).length <= 500 ? null : "form.error.long";
        case "long_text":
            return String(answer).length <= 5000 ? null : "form.error.long";
        default:
            return null;
    }
}
function conditionHolds(condition, controller, answer) {
    if (!controller) return true;
    switch(condition.op){
        case "answered":
            return answered(answer);
        case "blank":
            return !answered(answer);
        case "is":
        case "is_not":
            {
                var _condition_value;
                const want = ((_condition_value = condition.value) !== null && _condition_value !== void 0 ? _condition_value : "").trim();
                const hit = Array.isArray(answer) ? answer.includes(want) : typeof answer === "boolean" ? answer === (want === "true" || want.toLowerCase() === "yes") : String(answer !== null && answer !== void 0 ? answer : "").trim() === want;
                return condition.op === "is" ? hit : !hit;
            }
        default:
            return true;
    }
}
function visibleFields(fields, answers) {
    const shown = new Map();
    const out = [];
    for (const field of fields){
        var _field_showWhen;
        const condition = (_field_showWhen = field.showWhen) !== null && _field_showWhen !== void 0 ? _field_showWhen : null;
        let visible = true;
        if (condition) {
            const controller = fields.find((one)=>one.id === condition.fieldId);
            var _shown_get, _answers_condition_fieldId;
            visible = ((_shown_get = shown.get(condition.fieldId)) !== null && _shown_get !== void 0 ? _shown_get : true) && conditionHolds(condition, controller, (_answers_condition_fieldId = answers[condition.fieldId]) !== null && _answers_condition_fieldId !== void 0 ? _answers_condition_fieldId : null);
        }
        shown.set(field.id, visible);
        if (visible) out.push(field);
    }
    return out;
}
function prunedAnswers(fields, answers) {
    const keep = new Set(visibleFields(fields, answers).map((field)=>field.id));
    const out = {};
    for (const [id, answer] of Object.entries(answers)){
        if (keep.has(id)) out[id] = answer;
    }
    return out;
}
function checkSubmission(fields, answers) {
    const out = [];
    for (const field of visibleFields(fields, answers)){
        var _answers_field_id;
        const message = checkAnswer(field, (_answers_field_id = answers[field.id]) !== null && _answers_field_id !== void 0 ? _answers_field_id : null);
        if (message) out.push({
            fieldId: field.id,
            message
        });
    }
    return out;
}
function formProblems(fields) {
    const out = [];
    if (!fields.some((field)=>field.kind !== "section")) {
        out.push("form.problem.noQuestions");
    }
    if (fields.some((f)=>{
        var _f_options;
        return NEEDS_OPTIONS.includes(f.kind) && ((_f_options = f.options) !== null && _f_options !== void 0 ? _f_options : []).length === 0;
    })) {
        out.push("form.problem.noChoices");
    }
    if (fields.some((f)=>conditionProblem(fields, f) !== null)) {
        out.push("form.problem.condition");
    }
    return out;
}
function conditionProblem(fields, field) {
    var _field_showWhen;
    const condition = (_field_showWhen = field.showWhen) !== null && _field_showWhen !== void 0 ? _field_showWhen : null;
    if (!condition) return null;
    const at = fields.findIndex((one)=>one.id === field.id);
    const controllerAt = fields.findIndex((one)=>one.id === condition.fieldId);
    if (controllerAt === -1) return "form.error.conditionField";
    if (controllerAt >= at) return "form.error.conditionOrder";
    const controller = fields[controllerAt];
    if (controller.kind === "section") return "form.error.conditionField";
    if (OPS_NEED_VALUE.includes(condition.op)) {
        var _condition_value;
        const value = ((_condition_value = condition.value) !== null && _condition_value !== void 0 ? _condition_value : "").trim();
        if (!value) return "form.error.conditionValue";
        var _controller_options;
        if (NEEDS_OPTIONS.includes(controller.kind) && !((_controller_options = controller.options) !== null && _controller_options !== void 0 ? _controller_options : []).includes(value)) {
            return "form.error.conditionValue";
        }
    }
    return null;
}
const isUuid = (value)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function formSlug(name) {
    const base = name.toLowerCase().replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
    return base || "form";
}
const PERSON_TARGETS = [
    "first_name",
    "last_name",
    "preferred_name",
    "email",
    "phone",
    "date_of_birth",
    "address_line1",
    "address_line2",
    "city",
    "region",
    "postal_code",
    "country"
];
const CUSTOM_TARGET = "custom:";
function targetsFor(kind) {
    switch(kind){
        case "email":
            return [
                "email"
            ];
        case "phone":
            return [
                "phone"
            ];
        case "date":
            return [
                "date_of_birth"
            ];
        case "text":
            return [
                "first_name",
                "last_name",
                "preferred_name",
                "address_line1",
                "address_line2",
                "city",
                "region",
                "postal_code",
                "country"
            ];
        default:
            return [];
    }
}
function targetAllowed(kind, target) {
    if (!target) return true;
    if (kind === "section") return false;
    if (target.startsWith(CUSTOM_TARGET)) return target.length > CUSTOM_TARGET.length;
    return targetsFor(kind).includes(target);
}
var _c, _c1;
__turbopack_context__.k.register(_c, "ANSWERABLE$FORM_FIELD_KINDS.filter");
__turbopack_context__.k.register(_c1, "ANSWERABLE");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/db/src/repo/form-templates.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FORM_TEMPLATES",
    ()=>FORM_TEMPLATES,
    "templateFor",
    ()=>templateFor
]);
const WHO = [
    {
        kind: "text",
        label: "q.firstName",
        required: true,
        mapsTo: "first_name"
    },
    {
        kind: "text",
        label: "q.lastName",
        required: true,
        mapsTo: "last_name"
    },
    {
        kind: "email",
        label: "q.email",
        mapsTo: "email"
    },
    {
        kind: "phone",
        label: "q.phone",
        mapsTo: "phone"
    }
];
const FORM_TEMPLATES = [
    {
        key: "connection",
        name: "template.connection",
        intro: "template.connection.intro",
        hue: "amber",
        questions: [
            ...WHO,
            {
                kind: "select",
                label: "q.firstTime",
                options: [
                    "q.yes",
                    "q.no"
                ]
            },
            {
                kind: "long_text",
                label: "q.prayerFor"
            }
        ]
    },
    {
        key: "prayer",
        name: "template.prayer",
        intro: "template.prayer.intro",
        hue: "violet",
        questions: [
            {
                kind: "text",
                label: "q.firstName",
                mapsTo: "first_name"
            },
            {
                kind: "text",
                label: "q.lastName",
                mapsTo: "last_name"
            },
            {
                kind: "email",
                label: "q.email",
                mapsTo: "email"
            },
            {
                kind: "long_text",
                label: "q.prayerFor",
                required: true
            },
            {
                kind: "checkbox",
                label: "q.prayerPrivate"
            }
        ]
    },
    {
        key: "membership",
        name: "template.membership",
        intro: "template.membership.intro",
        hue: "indigo",
        questions: [
            ...WHO.map((one)=>one.kind === "email" ? {
                    ...one,
                    required: true
                } : one),
            {
                kind: "text",
                label: "q.startedComing"
            },
            {
                kind: "long_text",
                label: "q.anythingElse"
            }
        ]
    },
    {
        key: "volunteer",
        name: "template.volunteer",
        intro: "template.volunteer.intro",
        hue: "fern",
        questions: [
            ...WHO.map((one)=>one.kind === "email" ? {
                    ...one,
                    required: true
                } : one),
            {
                kind: "multi_select",
                label: "q.serveWhere",
                required: true,
                options: [
                    "q.serve.children",
                    "q.serve.welcome",
                    "q.serve.worship",
                    "q.serve.tech",
                    "q.serve.hospitality",
                    "q.serve.prayer"
                ]
            },
            {
                kind: "long_text",
                label: "q.servedBefore"
            }
        ]
    },
    {
        key: "child",
        name: "template.child",
        intro: "template.child.intro",
        hue: "sky",
        /*
     * The record this writes is the child's, so the child's name and birthday
     * carry targets and the parent's details do not. A guardian's number on a
     * child's record would be the child's number, which is wrong on the one
     * form where being wrong matters most.
     */ questions: [
            {
                kind: "text",
                label: "q.childFirstName",
                required: true,
                mapsTo: "first_name"
            },
            {
                kind: "text",
                label: "q.childLastName",
                required: true,
                mapsTo: "last_name"
            },
            {
                kind: "date",
                label: "q.childBirthday",
                mapsTo: "date_of_birth"
            },
            {
                kind: "text",
                label: "q.guardianName",
                required: true
            },
            {
                kind: "phone",
                label: "q.guardianPhone",
                required: true
            },
            {
                kind: "long_text",
                label: "q.allergies"
            },
            {
                kind: "long_text",
                label: "q.medical"
            }
        ]
    },
    {
        key: "facility",
        name: "template.facility",
        intro: "template.facility.intro",
        hue: "teal",
        questions: [
            {
                kind: "text",
                label: "q.firstName",
                required: true,
                mapsTo: "first_name"
            },
            {
                kind: "text",
                label: "q.lastName",
                required: true,
                mapsTo: "last_name"
            },
            {
                kind: "email",
                label: "q.email",
                required: true,
                mapsTo: "email"
            },
            {
                kind: "phone",
                label: "q.phone",
                mapsTo: "phone"
            },
            {
                kind: "text",
                label: "q.room",
                required: true
            },
            {
                kind: "date",
                label: "q.whichDay",
                required: true
            },
            {
                kind: "number",
                label: "q.howMany"
            },
            {
                kind: "long_text",
                label: "q.whatFor",
                required: true
            }
        ]
    }
];
const templateFor = (key)=>FORM_TEMPLATES.find((one)=>one.key === key);
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/db/src/repo/label-rules.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * R8.11. What goes on a child's label, and the stock it prints on.
 *
 * Pure, because the label a station prints with no network has to be the same
 * label it prints with one.
 */ /** The stock a church loads. Width and height are in inches. */ __turbopack_context__.s([
    "DEFAULT_LABEL_LAYOUT",
    ()=>DEFAULT_LABEL_LAYOUT,
    "LABEL_SIZES",
    ()=>LABEL_SIZES
]);
const LABEL_SIZES = {
    brother_24x11: {
        width: 2.4,
        height: 1.1
    },
    dymo_225x125: {
        width: 2.25,
        height: 1.25
    },
    zebra_2x1: {
        width: 2,
        height: 1
    }
};
const DEFAULT_LABEL_LAYOUT = {
    showRoom: true,
    showAllergies: true,
    showCode: true,
    showService: true,
    parentTag: true,
    size: "brother_24x11"
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/db/src/repo/storage-rules.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * What may be stored and how heavy it is allowed to be.
 *
 * Pure: no database, nothing that cannot be served to a browser. The server
 * enforces these and every upload screen reads the same numbers off them, so a
 * limit cannot be raised in one place and still be written as the old number on
 * five screens.
 */ __turbopack_context__.s([
    "ONE_MIB",
    ()=>ONE_MIB,
    "SUGGESTED_PIXELS",
    ()=>SUGGESTED_PIXELS,
    "UPLOAD_RULES",
    ()=>UPLOAD_RULES
]);
const ONE_MIB = 1024 * 1024;
const UPLOAD_RULES = {
    logo: {
        types: [
            "image/png",
            "image/jpeg",
            "image/webp"
        ],
        maxBytes: 2 * ONE_MIB
    },
    person_photo: {
        types: [
            "image/png",
            "image/jpeg",
            "image/webp"
        ],
        maxBytes: 5 * ONE_MIB
    },
    /**
   * R9.2. A picture of a group, for the card in the finder.
   *
   * The same ceiling as a person's photo. A church with forty groups spends two
   * hundred megabytes at the limit, which is a tenth of its quota and visible
   * on the storage bar before it gets there.
   */ group_photo: {
        types: [
            "image/png",
            "image/jpeg",
            "image/webp"
        ],
        maxBytes: 5 * ONE_MIB
    },
    /**
   * R11.7. What hangs off an item on a service plan: chord charts, a running
   * order as a PDF, a reference track, a slide image, a lyric sheet.
   *
   * No video. Sermon video is a non-goal and a church that uploads one fills
   * its quota in a single file.
   */ /**
   * R4.1. The picture across the top of a form.
   *
   * The same ceiling as a group's, and for the same reason: it is one wide
   * image per form, and a church with twenty forms is well inside its quota.
   */ form_cover: {
        types: [
            "image/png",
            "image/jpeg",
            "image/webp"
        ],
        maxBytes: 5 * ONE_MIB
    },
    /** R14.1. The picture across the top of an event. */ event_cover: {
        types: [
            "image/png",
            "image/jpeg",
            "image/webp"
        ],
        maxBytes: 5 * ONE_MIB
    },
    /**
   * R4.1. What somebody attaches when they answer a form.
   *
   * A photo for a dedication, a signed consent as a PDF, a reference letter.
   * The same ceiling a plan item has, and the question itself says how many
   * files it will take, so a church decides its own exposure rather than the
   * platform guessing.
   */ form_answer: {
        types: [
            "image/png",
            "image/jpeg",
            "image/webp",
            "image/heic",
            "application/pdf",
            "text/plain"
        ],
        maxBytes: 10 * ONE_MIB
    },
    plan_item: {
        types: [
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/webp",
            "audio/mpeg",
            "audio/mp4",
            "audio/ogg",
            "audio/wav",
            "text/plain"
        ],
        maxBytes: 10 * ONE_MIB
    }
};
const SUGGESTED_PIXELS = {
    logo: "512 x 512",
    person_photo: "600 x 600",
    // The card and the detail page both crop a banner to 16 by 9.
    group_photo: "1600 x 900",
    // A cover is a wide band across the top of a page, cropped 6 to 1.
    form_cover: "1800 x 300",
    form_answer: null,
    event_cover: "1600 x 900",
    plan_item: null
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/db/src/repo/report-spec.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * R18.x. What a church is allowed to ask for when it builds its own report.
 *
 * A fixed vocabulary rather than a query language. Three subjects, a known set
 * of fields on each, and operators that come from the kind of field. Nothing
 * here is free text that reaches the database: the builder sends keys, the
 * server looks every key up in this catalogue, and anything it does not
 * recognise is dropped on the floor.
 *
 * That is also what keeps the thing usable. A builder that can express any
 * question is a builder nobody can operate, and the churches this is for have
 * one volunteer with four hours a week. Twenty fields she recognises beat a
 * join picker.
 *
 * Pure on purpose: the builder screen reads this in the browser, and the
 * compiler reads the same copy on the server, so the two can never disagree
 * about what exists.
 */ __turbopack_context__.s([
    "AGGREGATIONS",
    ()=>AGGREGATIONS,
    "AXIS_WAYS",
    ()=>AXIS_WAYS,
    "BARE_OPERATORS",
    ()=>BARE_OPERATORS,
    "CHART_HUES",
    ()=>CHART_HUES,
    "CHART_SORTS",
    ()=>CHART_SORTS,
    "DEFAULT_LOOK",
    ()=>DEFAULT_LOOK,
    "FILE_LIMIT",
    ()=>FILE_LIMIT,
    "GRID_COLUMNS",
    ()=>GRID_COLUMNS,
    "GROUPED_VIEWS",
    ()=>GROUPED_VIEWS,
    "LABEL_KINDS",
    ()=>LABEL_KINDS,
    "LEGEND_SPOTS",
    ()=>LEGEND_SPOTS,
    "LIFECYCLE_CHOICES",
    ()=>LIFECYCLE_CHOICES,
    "OPERATORS",
    ()=>OPERATORS,
    "PAGE_SIZES",
    ()=>PAGE_SIZES,
    "SCREEN_LIMIT",
    ()=>SCREEN_LIMIT,
    "SERIES_LIMIT",
    ()=>SERIES_LIMIT,
    "SPLIT_VIEWS",
    ()=>SPLIT_VIEWS,
    "SUBJECTS",
    ()=>SUBJECTS,
    "SUBJECT_KEYS",
    ()=>SUBJECT_KEYS,
    "VIEWS",
    ()=>VIEWS,
    "VIEW_NEEDS",
    ()=>VIEW_NEEDS,
    "cleanPage",
    ()=>cleanPage,
    "cleanSpec",
    ()=>cleanSpec,
    "fieldOf",
    ()=>fieldOf,
    "viewFits",
    ()=>viewFits,
    "wellLabel",
    ()=>wellLabel
]);
const SUBJECT_KEYS = [
    "members",
    "attendance",
    "followups"
];
const LIFECYCLE_CHOICES = [
    "visitor",
    "regular_attender",
    "member",
    "inactive",
    "deceased"
];
/**
 * The members in the church's records.
 *
 * Nothing sensitive is offered here on purpose. Allergies, medical notes and
 * pastoral notes are readable on the person and at check-in by the members who
 * need them, and an ad-hoc report that can list every child's medical note is a
 * safeguarding problem waiting to be exported to a laptop.
 */ const PEOPLE = {
    key: "members",
    label: "report.subject.members",
    rowLabel: "report.row.members",
    fields: [
        {
            key: "name",
            label: "report.field.name",
            kind: "text"
        },
        {
            key: "status",
            label: "report.field.status",
            kind: "choice",
            choices: LIFECYCLE_CHOICES,
            groupable: true
        },
        {
            key: "age",
            label: "report.field.age",
            kind: "number",
            numeric: true
        },
        {
            key: "birthMonth",
            label: "report.field.birthMonth",
            kind: "number",
            groupable: true
        },
        {
            key: "joinedOn",
            label: "report.field.joinedOn",
            kind: "date",
            groupable: true
        },
        {
            key: "firstVisitOn",
            label: "report.field.firstVisitOn",
            kind: "date",
            groupable: true
        },
        {
            key: "lastSeenOn",
            label: "report.field.lastSeenOn",
            kind: "date",
            groupable: true
        },
        {
            key: "visits",
            label: "report.field.visits",
            kind: "number",
            numeric: true
        },
        {
            key: "household",
            label: "report.field.household",
            kind: "text",
            groupable: true
        },
        {
            key: "inGroup",
            label: "report.field.inGroup",
            kind: "boolean",
            groupable: true
        },
        {
            key: "serving",
            label: "report.field.serving",
            kind: "boolean",
            groupable: true
        },
        {
            key: "hasEmail",
            label: "report.field.hasEmail",
            kind: "boolean",
            groupable: true
        },
        {
            key: "hasPhone",
            label: "report.field.hasPhone",
            kind: "boolean",
            groupable: true
        },
        {
            key: "campus",
            label: "report.field.campus",
            kind: "text",
            groupable: true
        }
    ]
};
/** Every time somebody was marked present. */ const ATTENDANCE = {
    key: "attendance",
    label: "report.subject.attendance",
    rowLabel: "report.row.attendance",
    fields: [
        {
            key: "name",
            label: "report.field.name",
            kind: "text"
        },
        {
            key: "service",
            label: "report.field.service",
            kind: "text",
            groupable: true
        },
        {
            key: "date",
            label: "report.field.date",
            kind: "date",
            groupable: true
        },
        {
            key: "month",
            label: "report.field.month",
            kind: "text",
            groupable: true
        },
        {
            key: "weekday",
            label: "report.field.weekday",
            kind: "number",
            groupable: true
        },
        {
            key: "status",
            label: "report.field.status",
            kind: "choice",
            choices: LIFECYCLE_CHOICES,
            groupable: true
        },
        {
            key: "visitNumber",
            label: "report.field.visitNumber",
            kind: "number",
            numeric: true
        },
        {
            key: "source",
            label: "report.field.source",
            kind: "choice",
            choices: [
                "roster",
                "checkin",
                "import"
            ],
            groupable: true
        }
    ]
};
/** Every follow-up step, answered or waiting. */ const FOLLOWUPS = {
    key: "followups",
    label: "report.subject.followups",
    rowLabel: "report.row.followups",
    fields: [
        {
            key: "name",
            label: "report.field.name",
            kind: "text"
        },
        {
            key: "step",
            label: "report.field.step",
            kind: "text",
            groupable: true
        },
        {
            key: "pipeline",
            label: "report.field.pipeline",
            kind: "text",
            groupable: true
        },
        {
            key: "owner",
            label: "report.field.owner",
            kind: "text",
            groupable: true
        },
        {
            key: "dueOn",
            label: "report.field.dueOn",
            kind: "date",
            groupable: true
        },
        {
            key: "done",
            label: "report.field.done",
            kind: "boolean",
            groupable: true
        },
        {
            key: "overdue",
            label: "report.field.overdue",
            kind: "boolean",
            groupable: true
        },
        {
            key: "daysOpen",
            label: "report.field.daysOpen",
            kind: "number",
            numeric: true
        }
    ]
};
const SUBJECTS = {
    members: PEOPLE,
    attendance: ATTENDANCE,
    followups: FOLLOWUPS
};
const OPERATORS = {
    text: [
        "contains",
        "is",
        "isNot",
        "empty",
        "notEmpty"
    ],
    number: [
        "is",
        "atLeast",
        "atMost"
    ],
    date: [
        "onOrAfter",
        "onOrBefore",
        "lastDays",
        "empty",
        "notEmpty"
    ],
    choice: [
        "is",
        "isNot"
    ],
    boolean: [
        "yes",
        "no"
    ]
};
const BARE_OPERATORS = new Set([
    "empty",
    "notEmpty",
    "yes",
    "no"
]);
const AGGREGATIONS = [
    "sum",
    "average",
    "count",
    "distinct"
];
const VIEWS = [
    "table",
    "number",
    "bar",
    "rows",
    "stacked",
    "donut",
    "line",
    "area"
];
const GROUPED_VIEWS = new Set([
    "bar",
    "rows",
    "stacked",
    "donut",
    "line",
    "area"
]);
function wellLabel(value, rowsLabel) {
    if (!value) return rowsLabel;
    return value.field ? "".concat(value.agg, ":").concat(value.field) : rowsLabel;
}
const CHART_HUES = [
    "indigo",
    "sky",
    "teal",
    "fern",
    "citron",
    "amber",
    "clay",
    "rose",
    "violet"
];
const CHART_SORTS = [
    "value",
    "label"
];
const PAGE_SIZES = [
    10,
    25,
    50,
    100
];
const LEGEND_SPOTS = [
    "top",
    "bottom",
    "left",
    "right"
];
const LABEL_KINDS = [
    "value",
    "percent",
    "both"
];
const AXIS_WAYS = [
    "vertical",
    "horizontal"
];
const SERIES_LIMIT = 12;
const DEFAULT_LOOK = {
    hue: "indigo",
    hues: [],
    labels: false,
    labelKind: "value",
    legend: true,
    legendAt: "top",
    grid: true,
    valueAxis: true,
    categoryAxis: true,
    valueTitle: "",
    categoryTitle: "",
    sort: "value",
    dir: "desc",
    perPage: 10
};
const SCREEN_LIMIT = 500;
const FILE_LIMIT = 5000;
const fieldOf = (subject, key)=>{
    var _SUBJECTS_subject;
    var _SUBJECTS_subject_fields_find;
    return (_SUBJECTS_subject_fields_find = (_SUBJECTS_subject = SUBJECTS[subject]) === null || _SUBJECTS_subject === void 0 ? void 0 : _SUBJECTS_subject.fields.find((one)=>one.key === key)) !== null && _SUBJECTS_subject_fields_find !== void 0 ? _SUBJECTS_subject_fields_find : null;
};
function cleanSpec(raw) {
    var _fieldOf, _fieldOf1, _input_sort, _input_sort1;
    const input = raw !== null && raw !== void 0 ? raw : {};
    const subject = SUBJECT_KEYS.includes(input.subject) ? input.subject : "members";
    const def = SUBJECTS[subject];
    const filters = (Array.isArray(input.filters) ? input.filters : []).map((one)=>{
        var _one_field;
        const field = fieldOf(subject, String((_one_field = one === null || one === void 0 ? void 0 : one.field) !== null && _one_field !== void 0 ? _one_field : ""));
        if (!field) return null;
        var _one_op;
        const op = String((_one_op = one === null || one === void 0 ? void 0 : one.op) !== null && _one_op !== void 0 ? _one_op : "");
        if (!OPERATORS[field.kind].includes(op)) return null;
        var _one_value;
        const value = String((_one_value = one === null || one === void 0 ? void 0 : one.value) !== null && _one_value !== void 0 ? _one_value : "").slice(0, 200);
        if (!BARE_OPERATORS.has(op) && value.trim() === "") return null;
        return {
            field: field.key,
            op,
            value
        };
    }).filter((one)=>one !== null).slice(0, 10);
    const known = new Set(def.fields.map((one)=>one.key));
    const columns = (Array.isArray(input.columns) ? input.columns : []).map(String).filter((one)=>known.has(one)).slice(0, 12);
    const groupBy = input.groupBy && ((_fieldOf = fieldOf(subject, input.groupBy)) === null || _fieldOf === void 0 ? void 0 : _fieldOf.groupable) ? input.groupBy : null;
    // A split with nothing to split is meaningless, and splitting a field by
    // itself is a chart of one series.
    const splitBy = groupBy && input.splitBy && input.splitBy !== groupBy && ((_fieldOf1 = fieldOf(subject, input.splitBy)) === null || _fieldOf1 === void 0 ? void 0 : _fieldOf1.groupable) ? input.splitBy : null;
    const topN = typeof input.topN === "number" && input.topN >= 3 && input.topN <= 50 ? Math.round(input.topN) : null;
    // Reports saved before the well existed carry a measure instead.
    const fromMeasure = ()=>{
        const old = input.measure;
        if (!old) return [];
        if (old.kind === "members") return [
            {
                agg: "distinct"
            }
        ];
        if ((old.kind === "sum" || old.kind === "average") && old.field) {
            var _fieldOf;
            return ((_fieldOf = fieldOf(subject, old.field)) === null || _fieldOf === void 0 ? void 0 : _fieldOf.numeric) ? [
                {
                    agg: old.kind,
                    field: old.field
                }
            ] : [];
        }
        return [];
    };
    const values = (Array.isArray(input.values) ? input.values : fromMeasure()).map((one)=>{
        const agg = AGGREGATIONS.includes(one === null || one === void 0 ? void 0 : one.agg) ? one.agg : "sum";
        if (!(one === null || one === void 0 ? void 0 : one.field)) {
            return {
                agg: agg === "sum" || agg === "average" ? "count" : agg
            };
        }
        const field = fieldOf(subject, one.field);
        if (!field) return null;
        // A name cannot be summed. Counting one is fine.
        const settled = (agg === "sum" || agg === "average") && !field.numeric ? "count" : agg;
        return {
            agg: settled,
            field: field.key
        };
    }).filter((one)=>one !== null).slice(0, 1);
    // A chart of a list is a chart of nothing, so a view that needs a count
    // falls back to the table rather than drawing an empty frame.
    let view = VIEWS.includes(input.view) ? input.view : "table";
    if (!groupBy && GROUPED_VIEWS.has(view)) view = "table";
    const sortField = ((_input_sort = input.sort) === null || _input_sort === void 0 ? void 0 : _input_sort.field) ? fieldOf(subject, input.sort.field) : null;
    const sort = sortField ? {
        field: sortField.key,
        dir: ((_input_sort1 = input.sort) === null || _input_sort1 === void 0 ? void 0 : _input_sort1.dir) === "asc" ? "asc" : "desc"
    } : null;
    var _input_look;
    const asked = (_input_look = input.look) !== null && _input_look !== void 0 ? _input_look : {};
    var _asked_valueTitle, _asked_categoryTitle;
    const look = {
        hue: CHART_HUES.includes(asked.hue) ? asked.hue : DEFAULT_LOOK.hue,
        labels: asked.labels === undefined ? DEFAULT_LOOK.labels : Boolean(asked.labels),
        legend: asked.legend === undefined ? DEFAULT_LOOK.legend : Boolean(asked.legend),
        grid: asked.grid === undefined ? DEFAULT_LOOK.grid : Boolean(asked.grid),
        sort: CHART_SORTS.includes(asked.sort) ? asked.sort : DEFAULT_LOOK.sort,
        dir: asked.dir === "asc" ? "asc" : "desc",
        hues: (Array.isArray(asked.hues) ? asked.hues : []).filter((one)=>CHART_HUES.includes(one)).slice(0, SERIES_LIMIT),
        labelKind: LABEL_KINDS.includes(asked.labelKind) ? asked.labelKind : DEFAULT_LOOK.labelKind,
        legendAt: LEGEND_SPOTS.includes(asked.legendAt) ? asked.legendAt : DEFAULT_LOOK.legendAt,
        valueAxis: asked.valueAxis === undefined ? DEFAULT_LOOK.valueAxis : Boolean(asked.valueAxis),
        categoryAxis: asked.categoryAxis === undefined ? DEFAULT_LOOK.categoryAxis : Boolean(asked.categoryAxis),
        valueTitle: String((_asked_valueTitle = asked.valueTitle) !== null && _asked_valueTitle !== void 0 ? _asked_valueTitle : "").slice(0, 60),
        categoryTitle: String((_asked_categoryTitle = asked.categoryTitle) !== null && _asked_categoryTitle !== void 0 ? _asked_categoryTitle : "").slice(0, 60),
        perPage: asked.perPage === null ? null : PAGE_SIZES.includes(asked.perPage) ? asked.perPage : DEFAULT_LOOK.perPage
    };
    return {
        subject,
        filters,
        join: input.join === "or" ? "or" : "and",
        // A list with no columns is a blank screen, so it falls back to the first few.
        columns: columns.length > 0 ? columns : def.fields.slice(0, 4).map((one)=>one.key),
        groupBy,
        splitBy,
        topN,
        totals: Boolean(input.totals),
        values,
        sort,
        view,
        look
    };
}
const VIEW_NEEDS = {
    table: {
        grouped: false
    },
    number: {
        grouped: false
    },
    bar: {
        grouped: true,
        readableUpTo: 24
    },
    rows: {
        grouped: true,
        readableUpTo: 20
    },
    // A ring of thirty slices is a ring nobody can read, and the answer to that
    // is to say so rather than to draw it.
    // One bar split into its parts. More than a dozen and the thin slices stop
    // being anything anybody can point at.
    stacked: {
        grouped: true,
        readableUpTo: 12
    },
    donut: {
        grouped: true,
        readableUpTo: 9
    },
    line: {
        grouped: true,
        readableUpTo: 60
    },
    area: {
        grouped: true,
        readableUpTo: 60
    }
};
const viewFits = (view, spec)=>!VIEW_NEEDS[view].grouped || Boolean(spec.groupBy);
const SPLIT_VIEWS = new Set([
    "bar",
    "stacked"
]);
const GRID_COLUMNS = 12;
const whole = (value, fallback, low, high)=>{
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.min(high, Math.max(low, n)) : fallback;
};
function cleanPage(raw) {
    const input = raw !== null && raw !== void 0 ? raw : {};
    const list = Array.isArray(input.tiles) ? input.tiles : null;
    if (!list) {
        return {
            tiles: [
                {
                    ...cleanSpec(raw),
                    id: "1",
                    title: "",
                    place: {
                        x: 0,
                        y: 0,
                        w: GRID_COLUMNS,
                        h: 4
                    }
                }
            ]
        };
    }
    return {
        tiles: list.slice(0, 12).map((tile, i)=>{
            var _tile_place, _tile_place1, _tile_place2, _tile_place3;
            const w = whole(tile === null || tile === void 0 ? void 0 : (_tile_place = tile.place) === null || _tile_place === void 0 ? void 0 : _tile_place.w, 6, 2, GRID_COLUMNS);
            var _tile_id, _tile_title;
            return {
                ...cleanSpec(tile),
                id: String((_tile_id = tile === null || tile === void 0 ? void 0 : tile.id) !== null && _tile_id !== void 0 ? _tile_id : i + 1).slice(0, 24),
                title: String((_tile_title = tile === null || tile === void 0 ? void 0 : tile.title) !== null && _tile_title !== void 0 ? _tile_title : "").slice(0, 80),
                place: {
                    w,
                    h: whole(tile === null || tile === void 0 ? void 0 : (_tile_place1 = tile.place) === null || _tile_place1 === void 0 ? void 0 : _tile_place1.h, 4, 2, 12),
                    // A tile cannot start so far right that it hangs off the page.
                    x: whole(tile === null || tile === void 0 ? void 0 : (_tile_place2 = tile.place) === null || _tile_place2 === void 0 ? void 0 : _tile_place2.x, 0, 0, GRID_COLUMNS - w),
                    y: whole(tile === null || tile === void 0 ? void 0 : (_tile_place3 = tile.place) === null || _tile_place3 === void 0 ? void 0 : _tile_place3.y, 0, 0, 200)
                }
            };
        })
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/db/src/rules.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

/**
 * The rules a station carries with it.
 *
 * Everything here is pure: no database, no node built-ins, nothing that cannot
 * be served to a browser. It is what makes an offline station behave the same
 * as an online one, because both run this code rather than two versions of it.
 */ __turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$which$2d$service$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/which-service.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$age$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/age.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$match$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/match.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$codes$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/codes.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$release$2d$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/release-rules.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$meeting$2d$dates$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/meeting-dates.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$check$2d$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/check-rules.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$directory$2d$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/directory-rules.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$contact$2d$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/contact-rules.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$form$2d$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/form-rules.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$form$2d$templates$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/form-templates.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$label$2d$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/label-rules.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$storage$2d$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/storage-rules.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$report$2d$spec$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/report-spec.ts [app-client] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/image-limit.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "imageLimit",
    ()=>imageLimit
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/rules.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$storage$2d$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/storage-rules.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/i18n/src/index.ts [app-client] (ecmascript) <locals>");
;
;
function imageLimit(purpose) {
    const mb = Math.round(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$storage$2d$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["UPLOAD_RULES"][purpose].maxBytes / __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$storage$2d$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ONE_MIB"]);
    const pixels = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$storage$2d$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SUGGESTED_PIXELS"][purpose];
    return pixels ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("image.maxSizeWithPixels", {
        pixels: pixels.replace(" x ", " × "),
        mb
    }) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("image.maxSize", {
        mb
    });
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/phone-input.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PhoneInput",
    ()=>PhoneInput,
    "formatPhone",
    ()=>formatPhone
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.26_@types+node@22.20.4_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.26_@types+node@22.20.4_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/ui/src/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ui/src/components/input.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function formatPhone(raw) {
    // An international number is the typist's business.
    if (raw.trim().startsWith("+")) return raw;
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 0) return "";
    // A leading 1 is the country code, held aside so the ten digits after it
    // group the same way they would on their own.
    const lead = digits.length > 10 && digits.startsWith("1") ? "1 " : "";
    const rest = lead ? digits.slice(1, 11) : digits.slice(0, 10);
    // Anything past eleven digits is not a North American number, so it is left
    // as the digits the typist entered.
    if (digits.length > 11) return raw;
    if (rest.length <= 3) return "".concat(lead).concat(rest);
    if (rest.length <= 6) return "".concat(lead, "(").concat(rest.slice(0, 3), ")").concat(rest.slice(3));
    return "".concat(lead, "(").concat(rest.slice(0, 3), ")").concat(rest.slice(3, 6), "-").concat(rest.slice(6));
}
function PhoneInput(param) {
    let { name, defaultValue, disabled, ...rest } = param;
    _s();
    const [value, setValue] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"]({
        "PhoneInput.useState": ()=>formatPhone(String(defaultValue !== null && defaultValue !== void 0 ? defaultValue : ""))
    }["PhoneInput.useState"]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
        ...rest,
        name: name,
        type: "tel",
        inputMode: "tel",
        autoComplete: "tel",
        disabled: disabled,
        value: value,
        onChange: (e)=>setValue(formatPhone(e.target.value))
    }, void 0, false, {
        fileName: "[project]/apps/web/components/phone-input.tsx",
        lineNumber: 48,
        columnNumber: 5
    }, this);
}
_s(PhoneInput, "3xuY5loh2i68IkDX/kxq68omU6E=");
_c = PhoneInput;
var _c;
__turbopack_context__.k.register(_c, "PhoneInput");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/form-actions.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BackToView",
    ()=>BackToView,
    "FormActions",
    ()=>FormActions,
    "FormBusy",
    ()=>FormBusy,
    "LeaveGuard",
    ()=>LeaveGuard,
    "setFormBusy",
    ()=>setFormBusy,
    "useDirty",
    ()=>useDirty,
    "useReportBusy",
    ()=>useReportBusy
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.26_@types+node@22.20.4_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.26_@types+node@22.20.4_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$dom$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.26_@types+node@22.20.4_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/next/dist/compiled/react-dom-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$469$2e$0_react$40$19$2e$3$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.469.0_react@19.3.0/node_modules/lucide-react/dist/esm/icons/arrow-left.js [app-client] (ecmascript) <export default as ArrowLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/ui/src/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ui/src/components/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ui/src/components/dialog.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$icon$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ui/src/components/icon-button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/i18n/src/index.ts [app-client] (ecmascript) <locals>");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature(), _s4 = __turbopack_context__.k.signature(), _s5 = __turbopack_context__.k.signature(), _s6 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
/**
 * R24.6. The button that commits a form, and the warning that it has not been.
 *
 * It listens to the form by id rather than sharing state with it, because the
 * two are often rendered as siblings by a server component with no client
 * parent between them to hold a context.
 *
 * Save stays dead until something has been touched, so a reader who opened a
 * record to look at it is not offered a save that would do nothing. Once
 * something has been touched, every way out of the form asks first, in the
 * product's own words.
 */ /**
 * R24.6. Which forms are busy, by id.
 *
 * A form's save button is not always rendered inside the component doing the
 * saving: the group pages put it in their header, beside the back link, while
 * the editor that submits lives further down the tree. A small registry lets
 * the one that knows tell the one that draws, without threading a prop through
 * a server component that cannot hold state.
 */ const busy = new Map();
const watchers = new Set();
function setFormBusy(form, on) {
    var _busy_get;
    if (((_busy_get = busy.get(form)) !== null && _busy_get !== void 0 ? _busy_get : false) === on) return;
    busy.set(form, on);
    for (const tell of watchers)tell();
}
function useFormBusy(form) {
    _s();
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"]({
        "useFormBusy.useSyncExternalStore": (tell)=>{
            watchers.add(tell);
            return ({
                "useFormBusy.useSyncExternalStore": ()=>watchers.delete(tell)
            })["useFormBusy.useSyncExternalStore"];
        }
    }["useFormBusy.useSyncExternalStore"], {
        "useFormBusy.useSyncExternalStore": ()=>{
            var _busy_get;
            return (_busy_get = busy.get(form)) !== null && _busy_get !== void 0 ? _busy_get : false;
        }
    }["useFormBusy.useSyncExternalStore"], {
        "useFormBusy.useSyncExternalStore": ()=>false
    }["useFormBusy.useSyncExternalStore"]);
}
_s(useFormBusy, "FpwL93IKMLJZuQQXefVtWynbBPQ=");
function useReportBusy(form, on) {
    _s1();
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useReportBusy.useEffect": ()=>{
            setFormBusy(form, on);
            return ({
                "useReportBusy.useEffect": ()=>setFormBusy(form, false)
            })["useReportBusy.useEffect"];
        }
    }["useReportBusy.useEffect"], [
        form,
        on
    ]);
}
_s1(useReportBusy, "OD7bBpZva5O2jO+Puf00hKivP7c=");
function FormActions(param) {
    let { form, label, pending = false } = param;
    _s2();
    const dirty = useDirty(form);
    // Both hooks run every render. Reading the registry on the right of a `||`
    // skipped the call whenever `pending` was already true, and a hook that is
    // sometimes called is a hook React refuses to line up.
    const registered = useFormBusy(form);
    const working = pending || registered;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-wrap items-center gap-2",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                type: "submit",
                form: form,
                disabled: !dirty || working,
                children: [
                    working ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        "aria-hidden": true,
                        className: "size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/components/form-actions.tsx",
                        lineNumber: 88,
                        columnNumber: 11
                    }, this) : null,
                    working ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("action.saving") : label
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/components/form-actions.tsx",
                lineNumber: 86,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(LeaveGuard, {
                dirty: dirty && !working
            }, void 0, false, {
                fileName: "[project]/apps/web/components/form-actions.tsx",
                lineNumber: 96,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/components/form-actions.tsx",
        lineNumber: 85,
        columnNumber: 5
    }, this);
}
_s2(FormActions, "LU6XPjehDi3DpsG/wnLJBWMOyZI=", false, function() {
    return [
        useDirty,
        useFormBusy
    ];
});
_c = FormActions;
function BackToView(param) {
    let { form, onBack, label } = param;
    _s3();
    const dirty = useDirty(form);
    const [asking, setAsking] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$icon$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["IconButton"], {
                label: label !== null && label !== void 0 ? label : (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("action.back"),
                variant: "ghost",
                onClick: ()=>dirty ? setAsking(true) : onBack(),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$469$2e$0_react$40$19$2e$3$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__["ArrowLeft"], {}, void 0, false, {
                    fileName: "[project]/apps/web/components/form-actions.tsx",
                    lineNumber: 128,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/form-actions.tsx",
                lineNumber: 123,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Dialog"], {
                open: asking,
                onOpenChange: setAsking,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogContent"], {
                    alert: true,
                    title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("unsaved.title"),
                    closeLabel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("common.close"),
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-[length:var(--d-text-body)] text-fg",
                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("unsaved.body")
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/form-actions.tsx",
                            lineNumber: 133,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogFooter"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    type: "button",
                                    variant: "ghost",
                                    onClick: ()=>setAsking(false),
                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("unsaved.stay")
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/form-actions.tsx",
                                    lineNumber: 135,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    type: "button",
                                    variant: "danger",
                                    onClick: ()=>{
                                        setAsking(false);
                                        onBack();
                                    },
                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("unsaved.discard")
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/form-actions.tsx",
                                    lineNumber: 138,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/components/form-actions.tsx",
                            lineNumber: 134,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/components/form-actions.tsx",
                    lineNumber: 132,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/form-actions.tsx",
                lineNumber: 131,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s3(BackToView, "xl98Iulq0Y7fgph1Pd/tn8lmBTk=", false, function() {
    return [
        useDirty
    ];
});
_c1 = BackToView;
/** Every named value in the form, as one comparable string. */ function snapshot(form) {
    const out = [];
    for (const [key, value] of new FormData(form).entries()){
        out.push("".concat(key, "=").concat(typeof value === "string" ? value : value.name));
    }
    // Sorted, because a field that re-renders can change the order without
    // changing a single answer.
    return out.sort().join("\u0000");
}
function useDirty(form) {
    _s4();
    const [dirty, setDirty] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](false);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useDirty.useEffect": ()=>{
            const element = document.getElementById(form);
            if (!(element instanceof HTMLFormElement)) return;
            let opened = snapshot(element);
            const compare = {
                "useDirty.useEffect.compare": ()=>setDirty(snapshot(element) !== opened)
            }["useDirty.useEffect.compare"];
            /*
     * Listened for on the document rather than on the form.
     *
     * A date picker, a combobox and a select all draw their panel in a portal
     * at the end of the body, so the press that chooses an answer happens
     * outside the form and never bubbles to it. Watching the document catches
     * those, and the snapshot is still taken from the form, so nothing outside
     * it can count as a change.
     */ const frames = new Set();
            const later = {
                "useDirty.useEffect.later": ()=>{
                    /*
       * Two frames, because the answer is written into a hidden field by React
       * and setting a value from code fires no event at all. One frame is the
       * state update, the second is the commit that puts the value in the DOM.
       */ frames.add(requestAnimationFrame({
                        "useDirty.useEffect.later": ()=>frames.add(requestAnimationFrame(compare))
                    }["useDirty.useEffect.later"]));
                }
            }["useDirty.useEffect.later"];
            /*
     * What was just saved becomes the new baseline.
     *
     * A form that stays on screen after saving would otherwise go dirty again
     * on the next keystroke, because the comparison was still against what the
     * page opened with rather than what was last committed.
     */ const onSubmit = {
                "useDirty.useEffect.onSubmit": ()=>{
                    opened = snapshot(element);
                    setDirty(false);
                }
            }["useDirty.useEffect.onSubmit"];
            document.addEventListener("input", later);
            document.addEventListener("change", later);
            document.addEventListener("click", later);
            document.addEventListener("keyup", later);
            element.addEventListener("submit", onSubmit);
            return ({
                "useDirty.useEffect": ()=>{
                    for (const frame of frames)cancelAnimationFrame(frame);
                    document.removeEventListener("input", later);
                    document.removeEventListener("change", later);
                    document.removeEventListener("click", later);
                    document.removeEventListener("keyup", later);
                    element.removeEventListener("submit", onSubmit);
                }
            })["useDirty.useEffect"];
        }
    }["useDirty.useEffect"], [
        form
    ]);
    return dirty;
}
_s4(useDirty, "FmrCqqJsTO97iREB6qRTfNeaANA=");
function LeaveGuard(param) {
    let { dirty } = param;
    _s5();
    const [leaving, setLeaving] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](null);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "LeaveGuard.useEffect": ()=>{
            if (!dirty) return;
            const catchLink = {
                "LeaveGuard.useEffect.catchLink": (event)=>{
                    var _closest, _this;
                    // A modified click is the reader opening a second tab, which leaves this
                    // one exactly where it is.
                    if (event.defaultPrevented || event.button !== 0) return;
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    const link = (_this = event.target) === null || _this === void 0 ? void 0 : (_closest = _this.closest) === null || _closest === void 0 ? void 0 : _closest.call(_this, "a");
                    const href = link === null || link === void 0 ? void 0 : link.getAttribute("href");
                    if (!link || !href || link.target === "_blank") return;
                    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
                    const next = new URL(href, window.location.origin);
                    if (next.origin !== window.location.origin) return;
                    if (next.pathname === window.location.pathname) return;
                    event.preventDefault();
                    setLeaving(next.pathname + next.search);
                }
            }["LeaveGuard.useEffect.catchLink"];
            document.addEventListener("click", catchLink, true);
            return ({
                "LeaveGuard.useEffect": ()=>document.removeEventListener("click", catchLink, true)
            })["LeaveGuard.useEffect"];
        }
    }["LeaveGuard.useEffect"], [
        dirty
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Dialog"], {
        open: leaving !== null,
        onOpenChange: (next)=>next ? null : setLeaving(null),
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogContent"], {
            alert: true,
            title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("unsaved.title"),
            closeLabel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("common.close"),
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-[length:var(--d-text-body)] text-fg",
                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("unsaved.body")
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/form-actions.tsx",
                    lineNumber: 277,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogFooter"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                            type: "button",
                            variant: "ghost",
                            onClick: ()=>setLeaving(null),
                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("unsaved.stay")
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/form-actions.tsx",
                            lineNumber: 280,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                            type: "button",
                            variant: "danger",
                            onClick: ()=>{
                                const to = leaving;
                                setLeaving(null);
                                if (to) window.location.href = to;
                            },
                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("unsaved.leave")
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/form-actions.tsx",
                            lineNumber: 283,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/components/form-actions.tsx",
                    lineNumber: 279,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/web/components/form-actions.tsx",
            lineNumber: 276,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/web/components/form-actions.tsx",
        lineNumber: 272,
        columnNumber: 5
    }, this);
}
_s5(LeaveGuard, "FtadN4fW94VxpYAPeggMsWLtKDg=");
_c2 = LeaveGuard;
function FormBusy(param) {
    let { form } = param;
    _s6();
    const { pending } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$dom$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useFormStatus"])();
    useReportBusy(form, pending);
    return null;
}
_s6(FormBusy, "Etha+WdawQ4VqCNOVB/FEk/lU1I=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$dom$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useFormStatus"],
        useReportBusy
    ];
});
_c3 = FormBusy;
var _c, _c1, _c2, _c3;
__turbopack_context__.k.register(_c, "FormActions");
__turbopack_context__.k.register(_c1, "BackToView");
__turbopack_context__.k.register(_c2, "LeaveGuard");
__turbopack_context__.k.register(_c3, "FormBusy");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/lib/dates.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * How a date is written, in one place.
 *
 * Four formats were in use: ISO straight out of the database on a person's
 * record, long dates in the card below it, "en-US" hardcoded on three screens,
 * and the browser's locale everywhere else. A church reading 1983-04-21 on a
 * record and "21 April 1983" two inches below it is reading two products.
 *
 * The locale is the reader's own, except where a format has to match something
 * printed, which says so where it does it.
 */ /** "21 April 1983". For a record, where the year matters. */ __turbopack_context__.s([
    "dayAndMonth",
    ()=>dayAndMonth,
    "longDate",
    ()=>longDate,
    "readableTime",
    ()=>readableTime,
    "shortDate",
    ()=>shortDate
]);
const longDate = (iso)=>new Date("".concat(iso, "T00:00:00")).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
const dayAndMonth = (iso)=>new Date("".concat(iso, "T00:00:00")).toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long"
    });
const shortDate = (iso)=>new Date("".concat(iso, "T00:00:00")).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long"
    });
const readableTime = (hhmm)=>{
    const [h, m] = hhmm.split(":").map(Number);
    const at = new Date();
    at.setHours(h !== null && h !== void 0 ? h : 0, m !== null && m !== void 0 ? m : 0, 0, 0);
    return at.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    }).toLowerCase();
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/address-fields.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AddressFields",
    ()=>AddressFields
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.26_@types+node@22.20.4_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.26_@types+node@22.20.4_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/ui/src/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$combobox$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ui/src/components/combobox.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ui/src/components/field.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ui/src/components/input.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/i18n/src/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$regions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/i18n/src/regions.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function AddressFields(param) {
    let { values } = param;
    _s();
    const [country, setCountry] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](values.country || "US");
    const [region, setRegion] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](values.region);
    const countries = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"]({
        "AddressFields.useMemo[countries]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$regions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["countryList"])()
    }["AddressFields.useMemo[countries]"], []);
    const regions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$regions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["subdivisionsFor"])(country);
    var _REGION_LABEL_country;
    const regionLabel = (_REGION_LABEL_country = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$regions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["REGION_LABEL"][country]) !== null && _REGION_LABEL_country !== void 0 ? _REGION_LABEL_country : (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("church.region");
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                type: "hidden",
                name: "addressCountry",
                value: country
            }, void 0, false, {
                fileName: "[project]/apps/web/components/address-fields.tsx",
                lineNumber: 29,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                type: "hidden",
                name: "addressRegion",
                value: region
            }, void 0, false, {
                fileName: "[project]/apps/web/components/address-fields.tsx",
                lineNumber: 30,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Field"], {
                label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("address.line1"),
                className: "[grid-column:1/-1]",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                    name: "addressLine1",
                    defaultValue: values.line1,
                    autoComplete: "address-line1"
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/address-fields.tsx",
                    lineNumber: 33,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/address-fields.tsx",
                lineNumber: 32,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Field"], {
                label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("address.line2"),
                className: "[grid-column:1/-1]",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                    name: "addressLine2",
                    defaultValue: values.line2,
                    autoComplete: "address-line2"
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/address-fields.tsx",
                    lineNumber: 36,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/address-fields.tsx",
                lineNumber: 35,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Field"], {
                label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("address.country"),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$combobox$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Combobox"], {
                    options: countries.map((c)=>({
                            value: c.code,
                            label: c.name,
                            keywords: c.code
                        })),
                    value: country,
                    onChange: (next)=>{
                        setCountry(next);
                        // A state from the country you just left is wrong everywhere.
                        setRegion("");
                    },
                    placeholder: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("common.chooseOne"),
                    emptyLabel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("common.noMatch"),
                    clearLabel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("date.clear")
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/address-fields.tsx",
                    lineNumber: 40,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/address-fields.tsx",
                lineNumber: 39,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Field"], {
                label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("address.city"),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                    name: "addressCity",
                    defaultValue: values.city,
                    autoComplete: "address-level2"
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/address-fields.tsx",
                    lineNumber: 55,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/address-fields.tsx",
                lineNumber: 54,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Field"], {
                label: regionLabel,
                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$regions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hasSubdivisions"])(country) ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$combobox$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Combobox"], {
                    options: regions.map((r)=>({
                            value: r.code,
                            label: r.name,
                            keywords: r.code
                        })),
                    value: region,
                    onChange: setRegion,
                    placeholder: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("common.chooseOne"),
                    emptyLabel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("common.noMatch"),
                    clearLabel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("date.clear")
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/address-fields.tsx",
                    lineNumber: 60,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                    value: region,
                    onChange: (e)=>setRegion(e.target.value)
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/address-fields.tsx",
                    lineNumber: 69,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/address-fields.tsx",
                lineNumber: 58,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Field"], {
                label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("address.postalCode"),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                    name: "addressPostalCode",
                    defaultValue: values.postalCode,
                    autoComplete: "postal-code"
                }, void 0, false, {
                    fileName: "[project]/apps/web/components/address-fields.tsx",
                    lineNumber: 74,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/components/address-fields.tsx",
                lineNumber: 73,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(AddressFields, "+i+0k6KLJLJodU1TFqVPlFtyhew=");
_c = AddressFields;
var _c;
__turbopack_context__.k.register(_c, "AddressFields");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/picker.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Picker",
    ()=>Picker
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.26_@types+node@22.20.4_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.26_@types+node@22.20.4_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/ui/src/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$combobox$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ui/src/components/combobox.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/i18n/src/index.ts [app-client] (ecmascript) <locals>");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function Picker(param) {
    let { name, defaultValue, options, label, onChange, clearable = true } = param;
    _s();
    const [value, setValue] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](defaultValue !== null && defaultValue !== void 0 ? defaultValue : "");
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                type: "hidden",
                name: name,
                value: value
            }, void 0, false, {
                fileName: "[project]/apps/web/components/picker.tsx",
                lineNumber: 39,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$combobox$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Combobox"], {
                options: options,
                clearable: clearable,
                value: value,
                onChange: (next)=>{
                    setValue(next);
                    onChange === null || onChange === void 0 ? void 0 : onChange(next);
                },
                placeholder: label,
                emptyLabel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("common.noMatch"),
                clearLabel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("date.clear")
            }, void 0, false, {
                fileName: "[project]/apps/web/components/picker.tsx",
                lineNumber: 40,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(Picker, "uQydPq0a6nepUOAk9lIyty59kiM=");
_c = Picker;
var _c;
__turbopack_context__.k.register(_c, "Picker");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/lib/address.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * R2.4. Where somebody lives, in the parts a letter needs.
 *
 * Plain functions in their own module so a server component can shape a stored
 * address without importing the client component that draws it.
 */ __turbopack_context__.s([
    "directionsLink",
    ()=>directionsLink,
    "emptyAddress",
    ()=>emptyAddress,
    "mappable",
    ()=>mappable,
    "mapsHref",
    ()=>mapsHref,
    "oneLineAddress",
    ()=>oneLineAddress,
    "toAddress",
    ()=>toAddress
]);
const emptyAddress = ()=>({
        line1: "",
        line2: "",
        city: "",
        region: "",
        postalCode: "",
        country: "US"
    });
function toAddress(parts) {
    var _parts_line1, _parts_line2, _parts_city, _parts_region, _parts_postalCode;
    return {
        line1: (_parts_line1 = parts === null || parts === void 0 ? void 0 : parts.line1) !== null && _parts_line1 !== void 0 ? _parts_line1 : "",
        line2: (_parts_line2 = parts === null || parts === void 0 ? void 0 : parts.line2) !== null && _parts_line2 !== void 0 ? _parts_line2 : "",
        city: (_parts_city = parts === null || parts === void 0 ? void 0 : parts.city) !== null && _parts_city !== void 0 ? _parts_city : "",
        region: (_parts_region = parts === null || parts === void 0 ? void 0 : parts.region) !== null && _parts_region !== void 0 ? _parts_region : "",
        postalCode: (_parts_postalCode = parts === null || parts === void 0 ? void 0 : parts.postalCode) !== null && _parts_postalCode !== void 0 ? _parts_postalCode : "",
        country: (parts === null || parts === void 0 ? void 0 : parts.country) || "US"
    };
}
const oneLineAddress = function(a) {
    let home = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "US";
    return [
        a.line1,
        a.line2,
        a.city,
        [
            a.region,
            a.postalCode
        ].filter(Boolean).join(" "),
        a.country && a.country !== home ? a.country : ""
    ].map((part)=>part === null || part === void 0 ? void 0 : part.trim()).filter(Boolean).join(", ");
};
const mapsHref = (query)=>"https://www.google.com/maps/dir/?api=1&destination=".concat(encodeURIComponent(query));
const mappable = (a)=>{
    var _a_line1, _a_city, _a_postalCode, _a_region;
    return Boolean((_a_line1 = a.line1) === null || _a_line1 === void 0 ? void 0 : _a_line1.trim()) && Boolean(((_a_city = a.city) === null || _a_city === void 0 ? void 0 : _a_city.trim()) || ((_a_postalCode = a.postalCode) === null || _a_postalCode === void 0 ? void 0 : _a_postalCode.trim()) || ((_a_region = a.region) === null || _a_region === void 0 ? void 0 : _a_region.trim()));
};
function directionsLink(a) {
    if (!mappable(a)) return null;
    return mapsHref(oneLineAddress(a));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/lib/validate.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "check",
    ()=>check,
    "email",
    ()=>email,
    "minLength",
    ()=>minLength,
    "requiredValue",
    ()=>requiredValue
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/i18n/src/index.ts [app-client] (ecmascript) <locals>");
;
const requiredValue = (what)=>(value)=>value.trim() ? undefined : (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("validate.required", {
            what
        });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const email = (value)=>{
    const v = value.trim();
    if (!v) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("validate.email.blank");
    if (!EMAIL.test(v)) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("validate.email.malformed");
    return undefined;
};
const minLength = (count, what)=>(value)=>value.length >= count ? undefined : (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("validate.minLength", {
            what,
            count
        });
const check = function(value) {
    for(var _len = arguments.length, validators = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++){
        validators[_key - 1] = arguments[_key];
    }
    for (const v of validators){
        const message = v(value);
        if (message) return message;
    }
    return undefined;
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/lib/person-input.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HOUSEHOLD_NEW",
    ()=>HOUSEHOLD_NEW,
    "HOUSEHOLD_NONE",
    ()=>HOUSEHOLD_NONE,
    "HOUSEHOLD_ROLE_VALUES",
    ()=>HOUSEHOLD_ROLE_VALUES,
    "LIFECYCLE_VALUES",
    ()=>LIFECYCLE_VALUES,
    "MARITAL_VALUES",
    ()=>MARITAL_VALUES,
    "SCHOOL_VALUES",
    ()=>SCHOOL_VALUES,
    "hasErrors",
    ()=>hasErrors,
    "householdRoleOptions",
    ()=>householdRoleOptions,
    "lifecycleLabel",
    ()=>lifecycleLabel,
    "lifecycleOptions",
    ()=>lifecycleOptions,
    "maritalOptions",
    ()=>maritalOptions,
    "parsePerson",
    ()=>parsePerson,
    "personErrors",
    ()=>personErrors,
    "schoolOptions",
    ()=>schoolOptions
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/i18n/src/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$validate$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/validate.ts [app-client] (ecmascript)");
;
;
const LIFECYCLE_VALUES = [
    "visitor",
    "regular_attender",
    "member",
    "inactive",
    "deceased"
];
const lifecycleOptions = ()=>LIFECYCLE_VALUES.map((value)=>({
            value,
            label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("lifecycle.".concat(value))
        }));
/** Every status the database can hold, including the ones the form does not offer. */ const LIFECYCLE_LABELLED = [
    ...LIFECYCLE_VALUES,
    "archived"
];
const isLabelled = (status)=>LIFECYCLE_LABELLED.includes(status);
const lifecycleLabel = (status)=>isLabelled(status) ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("lifecycle.".concat(status)) : status;
const HOUSEHOLD_ROLE_VALUES = [
    "head",
    "spouse",
    "child",
    "other"
];
const householdRoleOptions = ()=>HOUSEHOLD_ROLE_VALUES.map((value)=>({
            value,
            label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("householdRole.".concat(value))
        }));
const HOUSEHOLD_NEW = "__new";
const HOUSEHOLD_NONE = "__none";
const str = (data, key)=>{
    var _data_get;
    return String((_data_get = data.get(key)) !== null && _data_get !== void 0 ? _data_get : "").trim();
};
/** A picker nobody answered, which comes back as an empty string. */ const pick = (data, key)=>str(data, key) || null;
function parsePerson(data) {
    const householdChoice = str(data, "householdId") || HOUSEHOLD_NONE;
    return {
        firstName: str(data, "firstName"),
        lastName: str(data, "lastName"),
        preferredName: str(data, "preferredName") || null,
        dateOfBirth: str(data, "dateOfBirth") || null,
        lifecycleStatus: str(data, "lifecycleStatus") || "visitor",
        membershipDate: str(data, "membershipDate") || null,
        firstVisitOn: str(data, "firstVisitOn") || null,
        allergies: str(data, "allergies") || null,
        medicalNote: str(data, "medicalNote") || null,
        /*
     * R2.4. Left out where the form did not ask, so an edit cannot clear a
     * list it never showed. The new-person form carries both; the edit form
     * sends somebody to the list on the record instead.
     */ email: data.has("email") ? str(data, "email") || null : undefined,
        phone: data.has("phone") ? str(data, "phone") || null : undefined,
        address: {
            line1: str(data, "addressLine1") || null,
            line2: str(data, "addressLine2") || null,
            city: str(data, "addressCity") || null,
            region: str(data, "addressRegion") || null,
            postalCode: str(data, "addressPostalCode") || null,
            country: str(data, "addressCountry") || "US"
        },
        campusId: str(data, "campusId") || null,
        maritalStatus: pick(data, "maritalStatus"),
        schoolLevel: pick(data, "schoolLevel"),
        householdId: householdChoice === HOUSEHOLD_NEW || householdChoice === HOUSEHOLD_NONE ? null : householdChoice,
        householdName: householdChoice === HOUSEHOLD_NEW ? str(data, "householdName") || null : null,
        householdRole: str(data, "householdRole") || "other",
        householdChoice
    };
}
const today = ()=>new Date().toISOString().slice(0, 10);
/**
 * Dates come from a date input, so the format is already right. What a date input
 * will not stop is 1823 or next Thursday, and a birthday typed as 2026 instead of
 * 1926 is the single most common piece of bad data in a church directory.
 */ function dateProblem(value, what) {
    let allowFuture = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
    if (!value) return undefined;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("validate.date.malformed", {
        what
    });
    if (!allowFuture && value > today()) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("validate.date.future", {
        what
    });
    if (value < "1900-01-01") return (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("validate.date.tooEarly", {
        what
    });
    return undefined;
}
/** Phone numbers are global and messy. Reject only what cannot be a number at all. */ function phoneProblem(value) {
    if (!value) return undefined;
    const digits = value.replace(/\D/g, "");
    if (digits.length < 7) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("validate.phone.short");
    if (!/^[\d\s()+.\-]+$/.test(value)) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("validate.phone.characters");
    return undefined;
}
function personErrors(input) {
    const errors = {};
    const first = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$validate$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["check"])(input.firstName, (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$validate$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requiredValue"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("validate.firstName")));
    if (first) errors.firstName = first;
    const last = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$validate$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["check"])(input.lastName, (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$validate$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requiredValue"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("validate.lastName")));
    if (last) errors.lastName = last;
    // Email is optional here, unlike at sign-in. A child has no email address.
    if (input.email) {
        const problem = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$validate$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["check"])(input.email, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$validate$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["email"]);
        if (problem) errors.email = problem;
    }
    var _input_phone;
    const phone = phoneProblem((_input_phone = input.phone) !== null && _input_phone !== void 0 ? _input_phone : null);
    if (phone) errors.phone = phone;
    var _input_dateOfBirth;
    const dob = dateProblem((_input_dateOfBirth = input.dateOfBirth) !== null && _input_dateOfBirth !== void 0 ? _input_dateOfBirth : null, (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("validate.date.dateOfBirth"));
    if (dob) errors.dateOfBirth = dob;
    var _input_membershipDate;
    const joined = dateProblem((_input_membershipDate = input.membershipDate) !== null && _input_membershipDate !== void 0 ? _input_membershipDate : null, (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("validate.date.membershipDate"));
    if (joined) errors.membershipDate = joined;
    var _input_firstVisitOn;
    const visit = dateProblem((_input_firstVisitOn = input.firstVisitOn) !== null && _input_firstVisitOn !== void 0 ? _input_firstVisitOn : null, (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("validate.date.firstVisit"));
    if (visit) errors.firstVisitOn = visit;
    var _input_householdName;
    if (input.householdChoice === HOUSEHOLD_NEW && !((_input_householdName = input.householdName) !== null && _input_householdName !== void 0 ? _input_householdName : "").trim()) {
        errors.householdName = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("validate.householdName");
    }
    return errors;
}
const hasErrors = (errors)=>Object.values(errors).some(Boolean);
const MARITAL_VALUES = [
    "single",
    "married",
    "engaged",
    "widowed",
    "divorced",
    "separated"
];
const maritalOptions = ()=>MARITAL_VALUES.map((value)=>({
            value,
            label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("marital.".concat(value))
        }));
const SCHOOL_VALUES = [
    "pre_k",
    "kindergarten",
    "grade_1",
    "grade_2",
    "grade_3",
    "grade_4",
    "grade_5",
    "grade_6",
    "grade_7",
    "grade_8",
    "grade_9",
    "grade_10",
    "grade_11",
    "grade_12",
    "college",
    "graduate"
];
const schoolOptions = ()=>SCHOOL_VALUES.map((value)=>({
            value,
            label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("school.".concat(value))
        }));
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/app/settings/profile/data:4eebe7 [app-client] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"40c671dded9d92a763ae05be5d1ab6fc49ddfe4fd6":"saveProfile"},"apps/web/app/settings/profile/actions.ts",""] */ __turbopack_context__.s([
    "saveProfile",
    ()=>saveProfile
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.26_@types+node@22.20.4_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
"use turbopack no side effects";
;
var saveProfile = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("40c671dded9d92a763ae05be5d1ab6fc49ddfe4fd6", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "saveProfile"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYWN0aW9ucy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzZXJ2ZXJcIjtcblxuaW1wb3J0IHsgd2l0aFRlbmFudCwgdXBkYXRlT3duUHJvZmlsZSwgc2V0T3duUGhvdG8sIHNldEFjY291bnROYW1lIH0gZnJvbSBcIkBjb25uZWN0YXBwL2RiXCI7XG5pbXBvcnQgeyBzdXBhYmFzZVNlcnZlciB9IGZyb20gXCJAL2xpYi9zdXBhYmFzZS9zZXJ2ZXJcIjtcbmltcG9ydCB7IHQgfSBmcm9tIFwiQGNvbm5lY3RhcHAvaTE4blwiO1xuaW1wb3J0IHsgZXhwbGFpbiB9IGZyb20gXCJAL2xpYi9leHBsYWluXCI7XG5pbXBvcnQgeyByZXF1aXJlU2Vzc2lvbiB9IGZyb20gXCJAL2xpYi9zZXNzaW9uXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvZmlsZVJlc3VsdCB7XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG5jb25zdCBmaWVsZCA9IChkYXRhOiBGb3JtRGF0YSwgbmFtZTogc3RyaW5nKSA9PiBTdHJpbmcoZGF0YS5nZXQobmFtZSkgPz8gXCJcIikudHJpbSgpO1xuXG4vKiogQSBwaWNrZXIgbm9ib2R5IGFuc3dlcmVkLCB3aGljaCBjb21lcyBiYWNrIGFzIGFuIGVtcHR5IHN0cmluZy4gKi9cbmNvbnN0IHBpY2sgPSAoZGF0YTogRm9ybURhdGEsIG5hbWU6IHN0cmluZyk6IHN0cmluZyB8IG51bGwgPT4gZmllbGQoZGF0YSwgbmFtZSkgfHwgbnVsbDtcblxuLyoqXG4gKiBSMTcuMS4gU2F2aW5nIHlvdXIgb3duIGRldGFpbHMuXG4gKlxuICogTm8gcGVyc29uIGlkIGNyb3NzZXMgdGhlIGJvdW5kYXJ5LiBUaGUgcmVjb3JkIGlzIHRoZSBvbmUgdGllZCB0byB0aGUgc2lnbmVkXG4gKiBpbiBhY2NvdW50LCBzbyBub2JvZHkgY2FuIGVkaXQgc29tZWJvZHkgZWxzZSBieSBjaGFuZ2luZyBhIHZhbHVlIGluIHRoZSBmb3JtLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2F2ZVByb2ZpbGUoZGF0YTogRm9ybURhdGEpOiBQcm9taXNlPFByb2ZpbGVSZXN1bHQ+IHtcbiAgY29uc3Qgc2Vzc2lvbiA9IGF3YWl0IHJlcXVpcmVTZXNzaW9uKGZpZWxkKGRhdGEsIFwiY2h1cmNoXCIpIHx8IHVuZGVmaW5lZCk7XG4gIGNvbnN0IGN0eCA9IHtcbiAgICB0ZW5hbnRJZDogc2Vzc2lvbi50ZW5hbnRJZCxcbiAgICByb2xlOiBzZXNzaW9uLnJvbGUsXG4gICAgdXNlcklkOiBzZXNzaW9uLnVzZXJJZCxcbiAgICBwZXJtaXNzaW9uczogc2Vzc2lvbi5wZXJtaXNzaW9ucyxcbiAgfTtcblxuICB0cnkge1xuICAgIGNvbnN0IHBlcnNvbiA9IGF3YWl0IHdpdGhUZW5hbnQoY3R4LCAodHgpID0+XG4gICAgICB1cGRhdGVPd25Qcm9maWxlKFxuICAgICAgICB0eCxcbiAgICAgICAgeyB0ZW5hbnRJZDogc2Vzc2lvbi50ZW5hbnRJZCwgdXNlcklkOiBzZXNzaW9uLnVzZXJJZCwgZW1haWw6IHNlc3Npb24uZW1haWwgfSxcbiAgICAgICAge1xuICAgICAgICAgIGZpcnN0TmFtZTogZmllbGQoZGF0YSwgXCJmaXJzdE5hbWVcIiksXG4gICAgICAgICAgbGFzdE5hbWU6IGZpZWxkKGRhdGEsIFwibGFzdE5hbWVcIiksXG4gICAgICAgICAgcGhvbmU6IGZpZWxkKGRhdGEsIFwicGhvbmVcIikgfHwgbnVsbCxcbiAgICAgICAgICBkYXRlT2ZCaXJ0aDogZmllbGQoZGF0YSwgXCJkYXRlT2ZCaXJ0aFwiKSB8fCBudWxsLFxuICAgICAgICAgIGFkZHJlc3M6IHtcbiAgICAgICAgICAgIGxpbmUxOiBmaWVsZChkYXRhLCBcImFkZHJlc3NMaW5lMVwiKSB8fCBudWxsLFxuICAgICAgICAgICAgbGluZTI6IGZpZWxkKGRhdGEsIFwiYWRkcmVzc0xpbmUyXCIpIHx8IG51bGwsXG4gICAgICAgICAgICBjaXR5OiBmaWVsZChkYXRhLCBcImFkZHJlc3NDaXR5XCIpIHx8IG51bGwsXG4gICAgICAgICAgICByZWdpb246IGZpZWxkKGRhdGEsIFwiYWRkcmVzc1JlZ2lvblwiKSB8fCBudWxsLFxuICAgICAgICAgICAgcG9zdGFsQ29kZTogZmllbGQoZGF0YSwgXCJhZGRyZXNzUG9zdGFsQ29kZVwiKSB8fCBudWxsLFxuICAgICAgY291bnRyeTogZmllbGQoZGF0YSwgXCJhZGRyZXNzQ291bnRyeVwiKSB8fCBcIlVTXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBhbm5pdmVyc2FyeTogZmllbGQoZGF0YSwgXCJhbm5pdmVyc2FyeVwiKSB8fCBudWxsLFxuICAgICAgICAgIGNhbXB1c0lkOiBwaWNrKGRhdGEsIFwiY2FtcHVzSWRcIiksXG4gICAgICAgICAgbWFyaXRhbFN0YXR1czogcGljayhkYXRhLCBcIm1hcml0YWxTdGF0dXNcIiksXG4gICAgICAgICAgc2Nob29sTGV2ZWw6IHBpY2soZGF0YSwgXCJzY2hvb2xMZXZlbFwiKSxcbiAgICAgICAgfSxcbiAgICAgICksXG4gICAgKTtcbiAgICBpZiAoIXBlcnNvbikgcmV0dXJuIHsgZXJyb3I6IHQoXCJzZXR0aW5ncy5wcm9maWxlLm5vUmVjb3JkXCIpIH07XG5cbiAgICAvKlxuICAgICAqIFRoZSBuYW1lIG9uIHRoZSBhY2NvdW50IGZvbGxvd3MgdGhlIG5hbWUgb24gdGhlIHJlY29yZCwgc28gdGhlIHNpZGViYXJcbiAgICAgKiBhbmQgdGhlIHBlcnNvbidzIG93biBzY3JlZW4gbmV2ZXIgZGlzYWdyZWUgYWJvdXQgd2hhdCB0aGV5IGFyZSBjYWxsZWQuXG4gICAgICogQm90aCBjb3BpZXM6IGFwcF91c2VycyBpcyB3aGF0IHRoZSBjaHVyY2gncyBvd24gc2NyZWVucyByZWFkLCBhbmQgdGhlXG4gICAgICogYXV0aCB1c2VyJ3MgbWV0YWRhdGEgaXMgd2hhdCBidWlsZHMgdGhlIHNlc3Npb24gb24gdGhlIG5leHQgcmVxdWVzdC5cbiAgICAgKi9cbiAgICBjb25zdCBuYW1lID0gYCR7ZmllbGQoZGF0YSwgXCJmaXJzdE5hbWVcIil9ICR7ZmllbGQoZGF0YSwgXCJsYXN0TmFtZVwiKX1gLnRyaW0oKTtcbiAgICBhd2FpdCBzZXRBY2NvdW50TmFtZShzZXNzaW9uLnVzZXJJZCwgbmFtZSk7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIGNvbnN0IHN1cGFiYXNlID0gYXdhaXQgc3VwYWJhc2VTZXJ2ZXIoKTtcbiAgICAgIGF3YWl0IHN1cGFiYXNlLmF1dGgudXBkYXRlVXNlcih7IGRhdGE6IHsgZnVsbF9uYW1lOiBuYW1lIH0gfSk7XG4gICAgfVxuICAgIHJldHVybiB7fTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4geyBlcnJvcjogZXhwbGFpbihlcnJvcikgfTtcbiAgfVxufVxuXG4vKiogUjE3LjEuIFRha2luZyB5b3VyIHBob3RvZ3JhcGggb2ZmIHlvdXIgb3duIHJlY29yZC4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhclBob3RvKGNodXJjaD86IHN0cmluZyk6IFByb21pc2U8UHJvZmlsZVJlc3VsdD4ge1xuICBjb25zdCBzZXNzaW9uID0gYXdhaXQgcmVxdWlyZVNlc3Npb24oY2h1cmNoKTtcbiAgY29uc3QgY3R4ID0ge1xuICAgIHRlbmFudElkOiBzZXNzaW9uLnRlbmFudElkLFxuICAgIHJvbGU6IHNlc3Npb24ucm9sZSxcbiAgICB1c2VySWQ6IHNlc3Npb24udXNlcklkLFxuICAgIHBlcm1pc3Npb25zOiBzZXNzaW9uLnBlcm1pc3Npb25zLFxuICB9O1xuXG4gIHRyeSB7XG4gICAgY29uc3QgcmVtb3ZlZCA9IGF3YWl0IHdpdGhUZW5hbnQoY3R4LCAodHgpID0+XG4gICAgICBzZXRPd25QaG90byh0eCwgeyB1c2VySWQ6IHNlc3Npb24udXNlcklkIH0sIG51bGwpLFxuICAgICk7XG4gICAgaWYgKHJlbW92ZWQucmVtb3ZlZCkge1xuICAgICAgY29uc3Qgc3VwYWJhc2UgPSBhd2FpdCBzdXBhYmFzZVNlcnZlcigpO1xuICAgICAgYXdhaXQgc3VwYWJhc2Uuc3RvcmFnZS5mcm9tKFwiY2h1cmNoXCIpLnJlbW92ZShbcmVtb3ZlZC5yZW1vdmVkXSk7XG4gICAgfVxuICAgIHJldHVybiB7fTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4geyBlcnJvcjogZXhwbGFpbihlcnJvcikgfTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI2U0F1QnNCIn0=
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/app/settings/profile/data:e33486 [app-client] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"40096ec935ab255369040ce06c72b215601e99ada1":"clearPhoto"},"apps/web/app/settings/profile/actions.ts",""] */ __turbopack_context__.s([
    "clearPhoto",
    ()=>clearPhoto
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.26_@types+node@22.20.4_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
"use turbopack no side effects";
;
var clearPhoto = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("40096ec935ab255369040ce06c72b215601e99ada1", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "clearPhoto"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYWN0aW9ucy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzZXJ2ZXJcIjtcblxuaW1wb3J0IHsgd2l0aFRlbmFudCwgdXBkYXRlT3duUHJvZmlsZSwgc2V0T3duUGhvdG8sIHNldEFjY291bnROYW1lIH0gZnJvbSBcIkBjb25uZWN0YXBwL2RiXCI7XG5pbXBvcnQgeyBzdXBhYmFzZVNlcnZlciB9IGZyb20gXCJAL2xpYi9zdXBhYmFzZS9zZXJ2ZXJcIjtcbmltcG9ydCB7IHQgfSBmcm9tIFwiQGNvbm5lY3RhcHAvaTE4blwiO1xuaW1wb3J0IHsgZXhwbGFpbiB9IGZyb20gXCJAL2xpYi9leHBsYWluXCI7XG5pbXBvcnQgeyByZXF1aXJlU2Vzc2lvbiB9IGZyb20gXCJAL2xpYi9zZXNzaW9uXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvZmlsZVJlc3VsdCB7XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG5jb25zdCBmaWVsZCA9IChkYXRhOiBGb3JtRGF0YSwgbmFtZTogc3RyaW5nKSA9PiBTdHJpbmcoZGF0YS5nZXQobmFtZSkgPz8gXCJcIikudHJpbSgpO1xuXG4vKiogQSBwaWNrZXIgbm9ib2R5IGFuc3dlcmVkLCB3aGljaCBjb21lcyBiYWNrIGFzIGFuIGVtcHR5IHN0cmluZy4gKi9cbmNvbnN0IHBpY2sgPSAoZGF0YTogRm9ybURhdGEsIG5hbWU6IHN0cmluZyk6IHN0cmluZyB8IG51bGwgPT4gZmllbGQoZGF0YSwgbmFtZSkgfHwgbnVsbDtcblxuLyoqXG4gKiBSMTcuMS4gU2F2aW5nIHlvdXIgb3duIGRldGFpbHMuXG4gKlxuICogTm8gcGVyc29uIGlkIGNyb3NzZXMgdGhlIGJvdW5kYXJ5LiBUaGUgcmVjb3JkIGlzIHRoZSBvbmUgdGllZCB0byB0aGUgc2lnbmVkXG4gKiBpbiBhY2NvdW50LCBzbyBub2JvZHkgY2FuIGVkaXQgc29tZWJvZHkgZWxzZSBieSBjaGFuZ2luZyBhIHZhbHVlIGluIHRoZSBmb3JtLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2F2ZVByb2ZpbGUoZGF0YTogRm9ybURhdGEpOiBQcm9taXNlPFByb2ZpbGVSZXN1bHQ+IHtcbiAgY29uc3Qgc2Vzc2lvbiA9IGF3YWl0IHJlcXVpcmVTZXNzaW9uKGZpZWxkKGRhdGEsIFwiY2h1cmNoXCIpIHx8IHVuZGVmaW5lZCk7XG4gIGNvbnN0IGN0eCA9IHtcbiAgICB0ZW5hbnRJZDogc2Vzc2lvbi50ZW5hbnRJZCxcbiAgICByb2xlOiBzZXNzaW9uLnJvbGUsXG4gICAgdXNlcklkOiBzZXNzaW9uLnVzZXJJZCxcbiAgICBwZXJtaXNzaW9uczogc2Vzc2lvbi5wZXJtaXNzaW9ucyxcbiAgfTtcblxuICB0cnkge1xuICAgIGNvbnN0IHBlcnNvbiA9IGF3YWl0IHdpdGhUZW5hbnQoY3R4LCAodHgpID0+XG4gICAgICB1cGRhdGVPd25Qcm9maWxlKFxuICAgICAgICB0eCxcbiAgICAgICAgeyB0ZW5hbnRJZDogc2Vzc2lvbi50ZW5hbnRJZCwgdXNlcklkOiBzZXNzaW9uLnVzZXJJZCwgZW1haWw6IHNlc3Npb24uZW1haWwgfSxcbiAgICAgICAge1xuICAgICAgICAgIGZpcnN0TmFtZTogZmllbGQoZGF0YSwgXCJmaXJzdE5hbWVcIiksXG4gICAgICAgICAgbGFzdE5hbWU6IGZpZWxkKGRhdGEsIFwibGFzdE5hbWVcIiksXG4gICAgICAgICAgcGhvbmU6IGZpZWxkKGRhdGEsIFwicGhvbmVcIikgfHwgbnVsbCxcbiAgICAgICAgICBkYXRlT2ZCaXJ0aDogZmllbGQoZGF0YSwgXCJkYXRlT2ZCaXJ0aFwiKSB8fCBudWxsLFxuICAgICAgICAgIGFkZHJlc3M6IHtcbiAgICAgICAgICAgIGxpbmUxOiBmaWVsZChkYXRhLCBcImFkZHJlc3NMaW5lMVwiKSB8fCBudWxsLFxuICAgICAgICAgICAgbGluZTI6IGZpZWxkKGRhdGEsIFwiYWRkcmVzc0xpbmUyXCIpIHx8IG51bGwsXG4gICAgICAgICAgICBjaXR5OiBmaWVsZChkYXRhLCBcImFkZHJlc3NDaXR5XCIpIHx8IG51bGwsXG4gICAgICAgICAgICByZWdpb246IGZpZWxkKGRhdGEsIFwiYWRkcmVzc1JlZ2lvblwiKSB8fCBudWxsLFxuICAgICAgICAgICAgcG9zdGFsQ29kZTogZmllbGQoZGF0YSwgXCJhZGRyZXNzUG9zdGFsQ29kZVwiKSB8fCBudWxsLFxuICAgICAgY291bnRyeTogZmllbGQoZGF0YSwgXCJhZGRyZXNzQ291bnRyeVwiKSB8fCBcIlVTXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBhbm5pdmVyc2FyeTogZmllbGQoZGF0YSwgXCJhbm5pdmVyc2FyeVwiKSB8fCBudWxsLFxuICAgICAgICAgIGNhbXB1c0lkOiBwaWNrKGRhdGEsIFwiY2FtcHVzSWRcIiksXG4gICAgICAgICAgbWFyaXRhbFN0YXR1czogcGljayhkYXRhLCBcIm1hcml0YWxTdGF0dXNcIiksXG4gICAgICAgICAgc2Nob29sTGV2ZWw6IHBpY2soZGF0YSwgXCJzY2hvb2xMZXZlbFwiKSxcbiAgICAgICAgfSxcbiAgICAgICksXG4gICAgKTtcbiAgICBpZiAoIXBlcnNvbikgcmV0dXJuIHsgZXJyb3I6IHQoXCJzZXR0aW5ncy5wcm9maWxlLm5vUmVjb3JkXCIpIH07XG5cbiAgICAvKlxuICAgICAqIFRoZSBuYW1lIG9uIHRoZSBhY2NvdW50IGZvbGxvd3MgdGhlIG5hbWUgb24gdGhlIHJlY29yZCwgc28gdGhlIHNpZGViYXJcbiAgICAgKiBhbmQgdGhlIHBlcnNvbidzIG93biBzY3JlZW4gbmV2ZXIgZGlzYWdyZWUgYWJvdXQgd2hhdCB0aGV5IGFyZSBjYWxsZWQuXG4gICAgICogQm90aCBjb3BpZXM6IGFwcF91c2VycyBpcyB3aGF0IHRoZSBjaHVyY2gncyBvd24gc2NyZWVucyByZWFkLCBhbmQgdGhlXG4gICAgICogYXV0aCB1c2VyJ3MgbWV0YWRhdGEgaXMgd2hhdCBidWlsZHMgdGhlIHNlc3Npb24gb24gdGhlIG5leHQgcmVxdWVzdC5cbiAgICAgKi9cbiAgICBjb25zdCBuYW1lID0gYCR7ZmllbGQoZGF0YSwgXCJmaXJzdE5hbWVcIil9ICR7ZmllbGQoZGF0YSwgXCJsYXN0TmFtZVwiKX1gLnRyaW0oKTtcbiAgICBhd2FpdCBzZXRBY2NvdW50TmFtZShzZXNzaW9uLnVzZXJJZCwgbmFtZSk7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIGNvbnN0IHN1cGFiYXNlID0gYXdhaXQgc3VwYWJhc2VTZXJ2ZXIoKTtcbiAgICAgIGF3YWl0IHN1cGFiYXNlLmF1dGgudXBkYXRlVXNlcih7IGRhdGE6IHsgZnVsbF9uYW1lOiBuYW1lIH0gfSk7XG4gICAgfVxuICAgIHJldHVybiB7fTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4geyBlcnJvcjogZXhwbGFpbihlcnJvcikgfTtcbiAgfVxufVxuXG4vKiogUjE3LjEuIFRha2luZyB5b3VyIHBob3RvZ3JhcGggb2ZmIHlvdXIgb3duIHJlY29yZC4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhclBob3RvKGNodXJjaD86IHN0cmluZyk6IFByb21pc2U8UHJvZmlsZVJlc3VsdD4ge1xuICBjb25zdCBzZXNzaW9uID0gYXdhaXQgcmVxdWlyZVNlc3Npb24oY2h1cmNoKTtcbiAgY29uc3QgY3R4ID0ge1xuICAgIHRlbmFudElkOiBzZXNzaW9uLnRlbmFudElkLFxuICAgIHJvbGU6IHNlc3Npb24ucm9sZSxcbiAgICB1c2VySWQ6IHNlc3Npb24udXNlcklkLFxuICAgIHBlcm1pc3Npb25zOiBzZXNzaW9uLnBlcm1pc3Npb25zLFxuICB9O1xuXG4gIHRyeSB7XG4gICAgY29uc3QgcmVtb3ZlZCA9IGF3YWl0IHdpdGhUZW5hbnQoY3R4LCAodHgpID0+XG4gICAgICBzZXRPd25QaG90byh0eCwgeyB1c2VySWQ6IHNlc3Npb24udXNlcklkIH0sIG51bGwpLFxuICAgICk7XG4gICAgaWYgKHJlbW92ZWQucmVtb3ZlZCkge1xuICAgICAgY29uc3Qgc3VwYWJhc2UgPSBhd2FpdCBzdXBhYmFzZVNlcnZlcigpO1xuICAgICAgYXdhaXQgc3VwYWJhc2Uuc3RvcmFnZS5mcm9tKFwiY2h1cmNoXCIpLnJlbW92ZShbcmVtb3ZlZC5yZW1vdmVkXSk7XG4gICAgfVxuICAgIHJldHVybiB7fTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4geyBlcnJvcjogZXhwbGFpbihlcnJvcikgfTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI0U0E4RXNCIn0=
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/lib/form-error.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useFormError",
    ()=>useFormError
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.26_@types+node@22.20.4_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
function useFormError(open) {
    _s();
    const [error, setError] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"]();
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useFormError.useEffect": ()=>{
            if (open) setError(undefined);
        }
    }["useFormError.useEffect"], [
        open
    ]);
    return [
        error,
        setError
    ];
}
_s(useFormError, "4w26CgyJWZ9C4Q3cISzoMOeyOb0=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/app/settings/profile/profile-form.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProfileForm",
    ()=>ProfileForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.26_@types+node@22.20.4_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.26_@types+node@22.20.4_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.26_@types+node@22.20.4_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$469$2e$0_react$40$19$2e$3$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$camera$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Camera$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.469.0_react@19.3.0/node_modules/lucide-react/dist/esm/icons/camera.js [app-client] (ecmascript) <export default as Camera>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$469$2e$0_react$40$19$2e$3$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pencil$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Pencil$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.469.0_react@19.3.0/node_modules/lucide-react/dist/esm/icons/pencil.js [app-client] (ecmascript) <export default as Pencil>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$469$2e$0_react$40$19$2e$3$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.469.0_react@19.3.0/node_modules/lucide-react/dist/esm/icons/refresh-cw.js [app-client] (ecmascript) <export default as RefreshCw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$469$2e$0_react$40$19$2e$3$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.469.0_react@19.3.0/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-client] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/ui/src/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/ui/src/components/avatar.tsx [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$banner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ui/src/components/banner.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ui/src/components/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$date$2d$picker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ui/src/components/date-picker.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ui/src/components/dialog.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ui/src/components/field.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$icon$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ui/src/components/icon-button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ui/src/components/input.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$feedback$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ui/src/components/feedback.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/i18n/src/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$image$2d$limit$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/image-limit.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$phone$2d$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/phone-input.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$form$2d$actions$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/form-actions.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$dates$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/dates.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$address$2d$fields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/address-fields.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$picker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/picker.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$address$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/address.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$person$2d$input$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/person-input.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$settings$2f$profile$2f$data$3a$4eebe7__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/apps/web/app/settings/profile/data:4eebe7 [app-client] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$settings$2f$profile$2f$data$3a$e33486__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/apps/web/app/settings/profile/data:e33486 [app-client] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$form$2d$error$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/form-error.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
/** The date picker's words, said once rather than at every call. */ const DATE_LABELS = ()=>({
        open: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("date.open"),
        clear: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("date.clear"),
        previousMonth: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("date.previousMonth"),
        nextMonth: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("date.nextMonth"),
        month: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("date.month"),
        year: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("date.year"),
        today: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("date.today")
    });
_c = DATE_LABELS;
/** What a field with nothing in it reads as. */ const EMPTY = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
    "aria-hidden": true,
    className: "inline-block h-px w-3 bg-line-strong align-middle"
}, void 0, false, {
    fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
    lineNumber: 53,
    columnNumber: 15
}, ("TURBOPACK compile-time value", void 0));
function ProfileForm(param) {
    let { church, signedInAs, photoUrl, values, campuses } = param;
    var _campuses_find;
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [editing, setEditing] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$form$2d$error$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useFormError"])(editing);
    const [busy, setBusy] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](false);
    const [dropping, setDropping] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](false);
    const [showing, setShowing] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](false);
    const [birthday, setBirthday] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](values.dateOfBirth);
    const [anniversary, setAnniversary] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](values.anniversary);
    const [saving, startTransition] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTransition"]();
    const file = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"](null);
    const display = "".concat(values.firstName, " ").concat(values.lastName).trim();
    const upload = async (chosen)=>{
        setBusy(true);
        setError(undefined);
        const data = new FormData();
        data.set("church", church);
        data.set("purpose", "person_photo");
        data.set("file", chosen);
        try {
            const response = await fetch("/api/upload", {
                method: "POST",
                body: data
            });
            const body = await response.json();
            var _body_error;
            if (!response.ok) setError((_body_error = body.error) !== null && _body_error !== void 0 ? _body_error : (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("storage.error.failed"));
            else router.refresh();
        } catch (e) {
            setError((0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("storage.error.failed"));
        } finally{
            setBusy(false);
            if (file.current) file.current.value = "";
        }
    };
    var _campuses_find_name;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col gap-5",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$feedback$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Working"], {
                open: busy,
                label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("profile.photo.uploading")
            }, void 0, false, {
                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                lineNumber: 115,
                columnNumber: 7
            }, this),
            error ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$banner$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Banner"], {
                tone: "danger",
                title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("settings.profile.failed"),
                children: error
            }, void 0, false, {
                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                lineNumber: 117,
                columnNumber: 16
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap items-center gap-4",
                children: [
                    editing ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$form$2d$actions$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BackToView"], {
                        form: "profile-form",
                        onBack: ()=>setEditing(false)
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                        lineNumber: 122,
                        columnNumber: 11
                    }, this) : null,
                    photoUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Dialog"], {
                        open: showing,
                        onOpenChange: setShowing,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogTrigger"], {
                                asChild: true,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    "aria-label": (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("profile.photo.title"),
                                    className: "group relative shrink-0 cursor-pointer rounded-full",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                            src: photoUrl,
                                            alt: "",
                                            className: "size-14 rounded-full border border-line object-cover"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                            lineNumber: 138,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "absolute inset-0 grid place-items-center rounded-full bg-fg/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$469$2e$0_react$40$19$2e$3$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$camera$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Camera$3e$__["Camera"], {
                                                className: "size-5 text-surface",
                                                "aria-hidden": true
                                            }, void 0, false, {
                                                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                                lineNumber: 144,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                            lineNumber: 143,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                    lineNumber: 133,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                lineNumber: 132,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogContent"], {
                                title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("profile.photo.title"),
                                hideTitle: true,
                                closeLabel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("common.close"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                        src: photoUrl,
                                        alt: "",
                                        className: "max-h-[60vh] w-full rounded-lg bg-canvas object-contain"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                        lineNumber: 152,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogFooter"], {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "mr-auto text-[12px] text-fg-subtle",
                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$image$2d$limit$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["imageLimit"])("person_photo")
                                            }, void 0, false, {
                                                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                                lineNumber: 160,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$icon$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["IconButton"], {
                                                label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("profile.photo.remove"),
                                                variant: "ghost",
                                                // The photograph stays open behind the question, so the
                                                // thing being removed is still on screen while it is asked
                                                // about.
                                                onClick: ()=>setDropping(true),
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$469$2e$0_react$40$19$2e$3$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {}, void 0, false, {
                                                    fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                                    lineNumber: 171,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                                lineNumber: 163,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$icon$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["IconButton"], {
                                                label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("profile.photo.replace"),
                                                variant: "ghost",
                                                onClick: ()=>{
                                                    var _file_current;
                                                    return (_file_current = file.current) === null || _file_current === void 0 ? void 0 : _file_current.click();
                                                },
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$469$2e$0_react$40$19$2e$3$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__["RefreshCw"], {}, void 0, false, {
                                                    fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                                    lineNumber: 178,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                                lineNumber: 173,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                        lineNumber: 157,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                lineNumber: 151,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                        lineNumber: 131,
                        columnNumber: 11
                    }, this) : /* With no photo the press goes straight to the file picker, so what
             a picture may be is said here rather than in a panel that never
             opens. The caption sits under the initials in a column of its own,
             which leaves the name and the actions beside it where they were. */ /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "flex shrink-0 flex-col items-center gap-1.5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>{
                                    var _file_current;
                                    return (_file_current = file.current) === null || _file_current === void 0 ? void 0 : _file_current.click();
                                },
                                "aria-label": (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("profile.photo.add"),
                                className: "group relative cursor-pointer rounded-full",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Avatar"], {
                                        name: display,
                                        id: values.memberId,
                                        className: "size-14 text-[18px] font-semibold"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                        lineNumber: 195,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "absolute inset-0 grid place-items-center rounded-full bg-fg/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$469$2e$0_react$40$19$2e$3$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$camera$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Camera$3e$__["Camera"], {
                                            className: "size-5 text-surface",
                                            "aria-hidden": true
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                            lineNumber: 197,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                        lineNumber: 196,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                lineNumber: 189,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-center text-[11px] leading-tight text-fg-subtle",
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$image$2d$limit$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["imageLimit"])("person_photo")
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                lineNumber: 200,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                        lineNumber: 188,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Dialog"], {
                        open: dropping,
                        onOpenChange: setDropping,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogContent"], {
                            alert: true,
                            title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("profile.photo.remove"),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[length:var(--d-text-body)] text-fg-muted",
                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("profile.photo.removeBody")
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                    lineNumber: 208,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogFooter"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                            type: "button",
                                            variant: "ghost",
                                            onClick: ()=>setDropping(false),
                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("profile.photo.keep")
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                            lineNumber: 212,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                            type: "button",
                                            variant: "danger",
                                            onClick: ()=>startTransition(async ()=>{
                                                    setDropping(false);
                                                    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$settings$2f$profile$2f$data$3a$e33486__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["clearPhoto"])(church);
                                                    setError(result.error);
                                                    if (!result.error) {
                                                        setShowing(false);
                                                        router.refresh();
                                                    }
                                                }),
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$469$2e$0_react$40$19$2e$3$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {}, void 0, false, {
                                                    fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                                    lineNumber: 229,
                                                    columnNumber: 17
                                                }, this),
                                                " ",
                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("profile.photo.remove")
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                            lineNumber: 215,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                    lineNumber: 211,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                            lineNumber: 207,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                        lineNumber: 206,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        ref: file,
                        type: "file",
                        accept: "image/png,image/jpeg,image/webp",
                        className: "sr-only",
                        onChange: (e)=>{
                            var _e_target_files;
                            const chosen = (_e_target_files = e.target.files) === null || _e_target_files === void 0 ? void 0 : _e_target_files[0];
                            if (chosen) void upload(chosen);
                        }
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                        lineNumber: 235,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "flex min-w-0 flex-1 flex-col leading-5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[17px] font-bold text-fg",
                                children: display
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                lineNumber: 247,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "truncate text-[13px] text-fg-muted",
                                children: signedInAs
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                lineNumber: 248,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                        lineNumber: 246,
                        columnNumber: 9
                    }, this),
                    editing ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$form$2d$actions$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FormActions"], {
                        pending: saving,
                        form: "profile-form",
                        label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("settings.profile.save")
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                        lineNumber: 252,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$icon$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["IconButton"], {
                        label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("settings.profile.edit"),
                        variant: "ghost",
                        onClick: ()=>setEditing(true),
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$469$2e$0_react$40$19$2e$3$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pencil$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Pencil$3e$__["Pencil"], {}, void 0, false, {
                            fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                            lineNumber: 263,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                        lineNumber: 258,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                lineNumber: 119,
                columnNumber: 7
            }, this),
            editing ? null : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dl", {
                className: "grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]",
                children: [
                    // The name is the card's own heading, beside the face.
                    [
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("settings.profile.phone"),
                        values.phone
                    ],
                    [
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("settings.profile.birthday"),
                        values.dateOfBirth ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$dates$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["longDate"])(values.dateOfBirth) : ""
                    ],
                    [
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("person.address"),
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$address$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["oneLineAddress"])(values.address)
                    ],
                    [
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("person.maritalStatus"),
                        values.maritalStatus ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("marital.".concat(values.maritalStatus)) : ""
                    ],
                    [
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("person.anniversary"),
                        values.anniversary ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$dates$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["longDate"])(values.anniversary) : ""
                    ],
                    [
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("person.schoolLevel"),
                        values.schoolLevel ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("school.".concat(values.schoolLevel)) : ""
                    ],
                    ...campuses.length > 1 ? [
                        [
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("person.campus"),
                            (_campuses_find_name = (_campuses_find = campuses.find((one)=>one.id === values.campusId)) === null || _campuses_find === void 0 ? void 0 : _campuses_find.name) !== null && _campuses_find_name !== void 0 ? _campuses_find_name : ""
                        ]
                    ] : []
                ].map((param)=>{
                    let [label, value] = param;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex min-w-0 flex-col gap-0.5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                className: "text-label font-semibold text-fg",
                                children: label
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                lineNumber: 295,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                className: "truncate text-[length:var(--d-text-body)] text-fg",
                                children: (value === null || value === void 0 ? void 0 : value.trim()) ? value : EMPTY
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                lineNumber: 296,
                                columnNumber: 15
                            }, this)
                        ]
                    }, label, true, {
                        fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                        lineNumber: 294,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                lineNumber: 269,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                id: "profile-form",
                noValidate: true,
                action: (data)=>{
                    data.set("church", church);
                    startTransition(async ()=>{
                        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$settings$2f$profile$2f$data$3a$4eebe7__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["saveProfile"])(data);
                        setError(result.error);
                        if (!result.error) {
                            setEditing(false);
                            router.refresh();
                        }
                    });
                },
                className: editing ? "flex flex-col gap-4" : "hidden",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Field"], {
                            label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("settings.profile.firstName"),
                            required: true,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                name: "firstName",
                                defaultValue: values.firstName,
                                autoComplete: "given-name"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                lineNumber: 322,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                            lineNumber: 321,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Field"], {
                            label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("settings.profile.lastName"),
                            required: true,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                name: "lastName",
                                defaultValue: values.lastName,
                                autoComplete: "family-name"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                lineNumber: 325,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                            lineNumber: 324,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Field"], {
                            label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("settings.profile.phone"),
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$phone$2d$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PhoneInput"], {
                                name: "phone",
                                defaultValue: values.phone
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                lineNumber: 328,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                            lineNumber: 327,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Field"], {
                            label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("settings.profile.birthday"),
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$date$2d$picker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DatePicker"], {
                                name: "dateOfBirth",
                                value: birthday,
                                onChange: setBirthday,
                                placeholder: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("date.placeholder"),
                                labels: DATE_LABELS()
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                lineNumber: 331,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                            lineNumber: 330,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$address$2d$fields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AddressFields"], {
                            values: values.address
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                            lineNumber: 340,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Field"], {
                            label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("person.maritalStatus"),
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$picker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Picker"], {
                                name: "maritalStatus",
                                defaultValue: values.maritalStatus,
                                options: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$person$2d$input$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["maritalOptions"])(),
                                label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("person.maritalStatus")
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                lineNumber: 343,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                            lineNumber: 342,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Field"], {
                            label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("person.anniversary"),
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$date$2d$picker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DatePicker"], {
                                name: "anniversary",
                                value: anniversary,
                                onChange: setAnniversary,
                                placeholder: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("date.placeholder"),
                                labels: DATE_LABELS()
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                lineNumber: 352,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                            lineNumber: 351,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Field"], {
                            label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("person.schoolLevel"),
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$picker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Picker"], {
                                name: "schoolLevel",
                                defaultValue: values.schoolLevel,
                                options: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$person$2d$input$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["schoolOptions"])(),
                                label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("person.schoolLevel")
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                lineNumber: 362,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                            lineNumber: 361,
                            columnNumber: 11
                        }, this),
                        campuses.length > 1 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$components$2f$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Field"], {
                            label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("person.campus"),
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$picker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Picker"], {
                                name: "campusId",
                                defaultValue: values.campusId,
                                options: campuses.map((one)=>({
                                        value: one.id,
                                        label: one.name
                                    })),
                                label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("person.campus")
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                                lineNumber: 372,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                            lineNumber: 371,
                            columnNumber: 13
                        }, this) : null
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                    lineNumber: 320,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
                lineNumber: 304,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/app/settings/profile/profile-form.tsx",
        lineNumber: 114,
        columnNumber: 5
    }, this);
}
_s(ProfileForm, "T7C/Hp4l9jZI29fl5KbcWg1G/vM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$form$2d$error$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useFormError"]
    ];
});
_c1 = ProfileForm;
var _c, _c1;
__turbopack_context__.k.register(_c, "DATE_LABELS");
__turbopack_context__.k.register(_c1, "ProfileForm");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/app/settings/data:71068a [app-client] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"401281d0a3f508651cb67c8a65ccdd6d0bfb0864f9":"setTheme"},"apps/web/app/settings/theme-actions.ts",""] */ __turbopack_context__.s([
    "setTheme",
    ()=>setTheme
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.26_@types+node@22.20.4_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
"use turbopack no side effects";
;
var setTheme = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("401281d0a3f508651cb67c8a65ccdd6d0bfb0864f9", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "setTheme"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vdGhlbWUtYWN0aW9ucy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzZXJ2ZXJcIjtcblxuaW1wb3J0IHsgY29va2llcyB9IGZyb20gXCJuZXh0L2hlYWRlcnNcIjtcblxuZXhwb3J0IHR5cGUgVGhlbWUgPSBcInN5c3RlbVwiIHwgXCJsaWdodFwiIHwgXCJkYXJrXCI7XG5cbi8qKiBSMjQueC4gS2VwdCBpbiBhIGNvb2tpZSBzbyB0aGUgc2VydmVyIHJlbmRlcnMgdGhlIHJpZ2h0IG9uZSBvbiBmaXJzdCBwYWludC4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZXRUaGVtZSh0aGVtZTogVGhlbWUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgamFyID0gYXdhaXQgY29va2llcygpO1xuICBpZiAodGhlbWUgPT09IFwic3lzdGVtXCIpIHtcbiAgICBqYXIuZGVsZXRlKFwiY29ubmVjdGFwcC10aGVtZVwiKTtcbiAgICByZXR1cm47XG4gIH1cbiAgamFyLnNldChcImNvbm5lY3RhcHAtdGhlbWVcIiwgdGhlbWUsIHtcbiAgICBodHRwT25seTogZmFsc2UsXG4gICAgc2FtZVNpdGU6IFwibGF4XCIsXG4gICAgcGF0aDogXCIvXCIsXG4gICAgbWF4QWdlOiA2MCAqIDYwICogMjQgKiAzNjUsXG4gIH0pO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJ3U0FPc0IifQ==
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/app/settings/theme.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThemeChoice",
    ()=>ThemeChoice
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.26_@types+node@22.20.4_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.26_@types+node@22.20.4_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.26_@types+node@22.20.4_react-dom@19.3.0_react@19.3.0__react@19.3.0/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$469$2e$0_react$40$19$2e$3$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$monitor$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Monitor$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.469.0_react@19.3.0/node_modules/lucide-react/dist/esm/icons/monitor.js [app-client] (ecmascript) <export default as Monitor>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$469$2e$0_react$40$19$2e$3$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sun$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sun$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.469.0_react@19.3.0/node_modules/lucide-react/dist/esm/icons/sun.js [app-client] (ecmascript) <export default as Sun>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$469$2e$0_react$40$19$2e$3$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$moon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Moon$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/lucide-react@0.469.0_react@19.3.0/node_modules/lucide-react/dist/esm/icons/moon.js [app-client] (ecmascript) <export default as Moon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/ui/src/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$lib$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ui/src/lib/cn.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/i18n/src/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$settings$2f$data$3a$71068a__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/apps/web/app/settings/data:71068a [app-client] (ecmascript) <text/javascript>");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
/** The default leads, then the two that override it. */ const CHOICES = [
    {
        value: "system",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$469$2e$0_react$40$19$2e$3$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$monitor$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Monitor$3e$__["Monitor"]
    },
    {
        value: "light",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$469$2e$0_react$40$19$2e$3$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sun$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sun$3e$__["Sun"]
    },
    {
        value: "dark",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$469$2e$0_react$40$19$2e$3$2e$0$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$moon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Moon$3e$__["Moon"]
    }
];
function ThemeChoice(param) {
    let { current } = param;
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [chosen, setChosen] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](current);
    const [pending, startTransition] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTransition"]();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-wrap gap-2",
        role: "group",
        "aria-label": (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("theme.title"),
        children: CHOICES.map((param)=>{
            let { value, icon: Icon } = param;
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                "aria-pressed": chosen === value,
                disabled: pending,
                onClick: ()=>{
                    setChosen(value);
                    startTransition(async ()=>{
                        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$settings$2f$data$3a$71068a__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["setTheme"])(value);
                        router.refresh();
                    });
                },
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ui$2f$src$2f$lib$2f$cn$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(// Three small choices, sized to their words rather than stretched
                // across whatever room the card has.
                "flex cursor-pointer items-center gap-2 rounded-[10px] bg-surface px-3.5 py-2.5 text-left text-[length:var(--d-text-label)] font-medium", chosen === value ? "border-[1.5px] border-primary text-fg" : "border border-line text-fg-muted hover:bg-sunken hover:text-fg"),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                        className: "size-4",
                        "aria-hidden": true
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/settings/theme.tsx",
                        lineNumber: 47,
                        columnNumber: 11
                    }, this),
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("theme.".concat(value))
                ]
            }, value, true, {
                fileName: "[project]/apps/web/app/settings/theme.tsx",
                lineNumber: 26,
                columnNumber: 9
            }, this);
        })
    }, void 0, false, {
        fileName: "[project]/apps/web/app/settings/theme.tsx",
        lineNumber: 24,
        columnNumber: 5
    }, this);
}
_s(ThemeChoice, "A+pYj5W6WyYmKxaU55g+Vvcsq4w=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$26_$40$types$2b$node$40$22$2e$20$2e$4_react$2d$dom$40$19$2e$3$2e$0_react$40$19$2e$3$2e$0_$5f$react$40$19$2e$3$2e$0$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = ThemeChoice;
var _c;
__turbopack_context__.k.register(_c, "ThemeChoice");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_24f37b1a._.js.map