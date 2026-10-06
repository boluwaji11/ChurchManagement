module.exports = [
"[project]/packages/db/src/env.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "loadEnv",
    ()=>loadEnv,
    "required",
    ()=>required
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
;
;
/** Load .env.local from the repo root if present. Never committed. */ let loaded = false;
function loadEnv() {
    if (loaded) return;
    loaded = true;
    for (const candidate of [
        ".env.local",
        "../../.env.local",
        "../../../.env.local"
    ]){
        const path = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["resolve"])(process.cwd(), candidate);
        if ((0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["existsSync"])(path)) {
            process.loadEnvFile(path);
            return;
        }
    }
}
function required(name) {
    loadEnv();
    const value = process.env[name];
    if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env.local and fill it in.`);
    return value;
}
}),
"[project]/packages/db/src/client.ts [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "appDb",
    ()=>appDb,
    "closeConnections",
    ()=>closeConnections,
    "owner",
    ()=>owner,
    "withTenant",
    ()=>withTenant
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$postgres$40$3$2e$4$2e$9$2f$node_modules$2f$postgres$2f$src$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$postgres$2d$js$2f$driver$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/postgres-js/driver.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/sql/sql.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/schema/index.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/index.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$env$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/env.ts [app-rsc] (ecmascript)");
;
;
;
;
;
let ownerSql;
let appSql;
let appDrizzle;
/**
 * TLS is required everywhere except a database on this machine.
 *
 * The exception is written as "the host is loopback" rather than as a flag,
 * because a flag is something that gets set in the wrong environment once and
 * then never noticed. A remote host cannot reach this branch, so there is no
 * configuration that turns encryption off against a real database.
 */ function isLoopback(url) {
    try {
        const host = new URL(url).hostname;
        return host === "localhost" || host === "127.0.0.1" || host === "::1";
    } catch  {
        return false;
    }
}
/**
 * Supabase's direct database host, db.<ref>.supabase.co, publishes an AAAA
 * record and no A record. On a network without IPv6 it fails as ENOTFOUND, which
 * reads like a typo in the hostname and sent a whole afternoon in the wrong
 * direction once already.
 *
 * Warned rather than refused, because the direct host is correct on a network
 * that has IPv6, and on Supabase's own infrastructure. The pooler is the answer
 * everywhere else.
 */ let warnedAboutDirectHost = false;
function warnIfDirectHost(url) {
    if (warnedAboutDirectHost) return;
    try {
        const host = new URL(url).hostname;
        if (!/^db\..+\.supabase\.co$/.test(host)) return;
        warnedAboutDirectHost = true;
        console.warn(`[connectapp/db] ${host} resolves over IPv6 only. On a network without IPv6 this fails as ` + "ENOTFOUND. Use the Supabase connection pooler instead: " + "postgresql://<role>.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres");
    } catch  {
    // An unparseable URL is a different problem, and postgres will say so.
    }
}
const connect = (url)=>{
    warnIfDirectHost(url);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$postgres$40$3$2e$4$2e$9$2f$node_modules$2f$postgres$2f$src$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"])(url, {
        max: 8,
        idle_timeout: 20,
        connect_timeout: 30,
        prepare: false,
        ssl: isLoopback(url) ? false : "require"
    });
};
function owner() {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$env$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadEnv"])();
    ownerSql ??= connect((0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$env$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["required"])("DATABASE_URL"));
    return ownerSql;
}
function appDb() {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$env$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadEnv"])();
    appSql ??= connect((0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$env$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["required"])("APP_DATABASE_URL"));
    appDrizzle ??= (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$postgres$2d$js$2f$driver$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["drizzle"])(appSql, {
        schema: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
    });
    return appDrizzle;
}
async function withTenant(ctx, work) {
    return appDb().transaction(async (tx)=>{
        /*
     * One statement for all four settings. The database is a continent away, so
     * a round trip costs about 20ms, and four statements spent 60ms of every
     * transaction saying things that fit in one. Measured in docs/performance.md.
     */ await tx.execute(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`select
      set_config('app.tenant_id', ${ctx.tenantId}, true),
      set_config('app.role', ${ctx.role}, true),
      set_config('app.user_id', ${ctx.userId ?? ""}, true),
      set_config('app.ip', ${ctx.ip ?? ""}, true)`);
        return work(tx);
    });
}
async function closeConnections() {
    await Promise.all([
        ownerSql?.end({
            timeout: 5
        }),
        appSql?.end({
            timeout: 5
        })
    ]);
    ownerSql = undefined;
    appSql = undefined;
    appDrizzle = undefined;
}
;
}),
"[project]/packages/db/src/permissions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * R1.6. The permission matrix.
 *
 * Every authorisation decision in the product comes from this table. A role is
 * a named set of permissions and nothing else, so `canEditPeople` is no longer
 * a list of roles somebody remembered to update: it is a lookup of
 * `members.edit` against whatever set this member's role holds.
 *
 * The nine built-in roles (R1.4) are rows in the table like any other. They are
 * written here rather than in the database so a fresh church has working
 * permissions before anything is seeded, and so a church that has never touched
 * roles keeps getting ours as we correct them.
 *
 * Pure data and pure functions. No database, no i18n, so a station can answer
 * "may this volunteer do this" offline.
 */ /** R1.4. The built-in roles, widest reach first. */ __turbopack_context__.s([
    "PERMISSIONS",
    ()=>PERMISSIONS,
    "PERMISSION_GROUPS",
    ()=>PERMISSION_GROUPS,
    "ROLE_PERMISSIONS",
    ()=>ROLE_PERMISSIONS,
    "TENANT_ROLES",
    ()=>TENANT_ROLES,
    "can",
    ()=>can,
    "rolesWith",
    ()=>rolesWith
]);
const TENANT_ROLES = [
    "owner",
    "admin",
    "staff",
    "finance",
    "pastoral",
    "group_leader",
    "team_leader",
    "checkin_volunteer",
    "member"
];
const PERMISSIONS = [
    // R2.x. The members records.
    "members.edit",
    "members.archive",
    "members.households",
    "members.notes.confidential",
    // R13.x. Money. The permission exists now so the rule is not invented later.
    "giving.amounts",
    // R1.x. The church itself.
    "church.manage",
    "church.fields",
    "church.tags",
    // R8.x. Check-in, which is safety-critical.
    "checkin.rooms",
    "checkin.stations",
    "checkin.run",
    "checkin.supervise",
    "checkin.incidents",
    "checkin.checks",
    // R5.x, R9.x, R7.x, R10.x. The week's work.
    "followups.manage",
    "groups.manage",
    "services.manage",
    // R14.x. What the church is putting on, and who has a place at it.
    "events.manage",
    "teams.manage",
    "teams.lead"
];
const PERMISSION_GROUPS = [
    {
        key: "members",
        permissions: [
            "members.edit",
            "members.archive",
            "members.households",
            "members.notes.confidential"
        ]
    },
    {
        key: "checkin",
        permissions: [
            "checkin.run",
            "checkin.supervise",
            "checkin.rooms",
            "checkin.stations",
            "checkin.incidents",
            "checkin.checks"
        ]
    },
    {
        key: "week",
        permissions: [
            "services.manage",
            "teams.manage",
            "teams.lead",
            "groups.manage",
            "events.manage",
            "followups.manage"
        ]
    },
    {
        key: "church",
        permissions: [
            "church.manage",
            "church.fields",
            "church.tags"
        ]
    },
    {
        key: "money",
        permissions: [
            "giving.amounts"
        ]
    }
];
/**
 * The matrix.
 *
 * Owner holds everything by construction rather than by listing, because a
 * permission added above must never silently leave the Owner unable to run
 * their own church.
 */ const GRANTS = {
    admin: [
        "members.edit",
        "members.archive",
        "members.households",
        "church.manage",
        "church.fields",
        "church.tags",
        "checkin.rooms",
        "checkin.stations",
        "checkin.run",
        "checkin.supervise",
        "checkin.incidents",
        "checkin.checks",
        "followups.manage",
        "groups.manage",
        "services.manage",
        "events.manage",
        "teams.manage",
        "teams.lead"
    ],
    staff: [
        "members.edit",
        "members.households",
        "checkin.run",
        "checkin.supervise",
        "followups.manage",
        "groups.manage",
        "services.manage",
        "events.manage",
        "teams.manage",
        "teams.lead"
    ],
    finance: [
        "giving.amounts"
    ],
    pastoral: [
        "members.notes.confidential",
        "checkin.incidents",
        "checkin.checks",
        "followups.manage",
        "groups.manage"
    ],
    group_leader: [],
    team_leader: [
        "teams.lead"
    ],
    checkin_volunteer: [
        "checkin.run",
        "checkin.supervise"
    ],
    member: []
};
const ROLE_PERMISSIONS = {
    owner: PERMISSIONS,
    ...GRANTS
};
function can(who, permission) {
    if (typeof who === "string") return ROLE_PERMISSIONS[who].includes(permission);
    if (who.permissions) return who.permissions.includes(permission);
    return ROLE_PERMISSIONS[who.role].includes(permission);
}
function rolesWith(permission) {
    return TENANT_ROLES.filter((role)=>can(role, permission));
}
}),
"[project]/packages/db/src/roles.ts [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CAN_ARCHIVE_PEOPLE",
    ()=>CAN_ARCHIVE_PEOPLE,
    "CAN_EDIT_PEOPLE",
    ()=>CAN_EDIT_PEOPLE,
    "CAN_MANAGE_HOUSEHOLDS",
    ()=>CAN_MANAGE_HOUSEHOLDS,
    "CAN_READ_CONFIDENTIAL_NOTES",
    ()=>CAN_READ_CONFIDENTIAL_NOTES,
    "CAN_READ_GIVING_AMOUNTS",
    ()=>CAN_READ_GIVING_AMOUNTS,
    "PermissionError",
    ()=>PermissionError,
    "canArchivePeople",
    ()=>canArchivePeople,
    "canEditPeople",
    ()=>canEditPeople,
    "canManageHouseholds",
    ()=>canManageHouseholds,
    "canReadConfidentialNotes",
    ()=>canReadConfidentialNotes,
    "canReadGivingAmounts",
    ()=>canReadGivingAmounts
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/i18n/src/index.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/permissions.ts [app-rsc] (ecmascript)");
;
;
;
const CAN_READ_CONFIDENTIAL_NOTES = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rolesWith"])("members.notes.confidential");
const CAN_READ_GIVING_AMOUNTS = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rolesWith"])("giving.amounts");
const canReadConfidentialNotes = (role)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["can"])(role, "members.notes.confidential");
const canReadGivingAmounts = (role)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["can"])(role, "giving.amounts");
const CAN_EDIT_PEOPLE = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rolesWith"])("members.edit");
const CAN_ARCHIVE_PEOPLE = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rolesWith"])("members.archive");
const CAN_MANAGE_HOUSEHOLDS = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rolesWith"])("members.households");
const canEditPeople = (role)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["can"])(role, "members.edit");
const canArchivePeople = (role)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["can"])(role, "members.archive");
const canManageHouseholds = (role)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$permissions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["can"])(role, "members.households");
class PermissionError extends Error {
    role;
    /** The catalogue key naming the refused action, such as "archivePerson". */ action;
    constructor(role, action){
        super((0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])("error.permission", {
            role,
            action: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])(`error.permission.${action}`)
        }));
        this.name = "PermissionError";
        this.role = role;
        this.action = action;
    }
}
}),
"[project]/packages/db/src/errors.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "InvalidInputError",
    ()=>InvalidInputError,
    "NameTakenError",
    ()=>NameTakenError
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/i18n/src/index.ts [app-rsc] (ecmascript) <locals>");
;
class InvalidInputError extends Error {
    key;
    params;
    constructor(key, params){
        super((0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])(key, params));
        this.name = "InvalidInputError";
        this.key = key;
        this.params = params;
    }
}
class NameTakenError extends Error {
    key;
    params;
    existingId;
    constructor(key, name, existingId){
        super((0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$i18n$2f$src$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["t"])(key, {
            name
        }));
        this.name = "NameTakenError";
        this.key = key;
        this.params = {
            name
        };
        this.existingId = existingId;
    }
}
}),
"[project]/packages/db/src/crypto.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "decryptNote",
    ()=>decryptNote,
    "encryptNote",
    ()=>encryptNote
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$env$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/env.ts [app-rsc] (ecmascript)");
;
;
/**
 * Application-level encryption for confidential pastoral notes (R21.3).
 *
 * The database never sees the key, so a confidential note row can be listed
 * without its content being readable. That is what makes R6.2 structural rather
 * than a filter someone can forget to apply.
 *
 * AES-256-GCM. Payload is v1.<iv>.<tag>.<ciphertext>, all base64url.
 */ const VERSION = "v1";
const key = (name)=>{
    const raw = Buffer.from((0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$env$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["required"])(name), "base64");
    if (raw.length !== 32) {
        throw new Error(`${name} must be 32 bytes, base64 encoded. Generate: openssl rand -base64 32`);
    }
    return raw;
};
function seal(plaintext, name) {
    const iv = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["randomBytes"])(12);
    const cipher = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createCipheriv"])("aes-256-gcm", key(name), iv);
    const body = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final()
    ]);
    return [
        VERSION,
        iv.toString("base64url"),
        cipher.getAuthTag().toString("base64url"),
        body.toString("base64url")
    ].join(".");
}
function open(payload, name) {
    const [version, ivPart, tagPart, bodyPart] = payload.split(".");
    if (version !== VERSION || !ivPart || !tagPart || !bodyPart) {
        throw new Error("Unrecognised encrypted payload.");
    }
    const decipher = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createDecipheriv"])("aes-256-gcm", key(name), Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([
        decipher.update(Buffer.from(bodyPart, "base64url")),
        decipher.final()
    ]).toString("utf8");
}
const encryptNote = (plaintext)=>seal(plaintext, "NOTE_ENCRYPTION_KEY");
const decryptNote = (payload)=>open(payload, "NOTE_ENCRYPTION_KEY");
}),
"[project]/packages/db/src/import/match.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildMatchIndex",
    ()=>buildMatchIndex,
    "findMatches",
    ()=>findMatches,
    "indexNewPerson",
    ()=>indexNewPerson,
    "indexPeople",
    ()=>indexPeople,
    "normaliseEmail",
    ()=>normaliseEmail,
    "normaliseName",
    ()=>normaliseName,
    "normalisePhone",
    ()=>normalisePhone
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/sql/expressions/conditions.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/members.ts [app-rsc] (ecmascript)");
;
;
const normaliseName = (value)=>value.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const normaliseEmail = (value)=>value.trim().toLowerCase();
const normalisePhone = (value)=>{
    const digits = value.replace(/\D/g, "");
    return digits.length > 10 ? digits.slice(-10) : digits;
};
const nameKey = (first, last)=>`${normaliseName(first)}|${normaliseName(last)}`;
async function buildMatchIndex(db) {
    const rows = await db.select({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id,
        firstName: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].firstName,
        lastName: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].lastName,
        preferredName: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].preferredName,
        dateOfBirth: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].dateOfBirth
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isNull"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].archivedAt));
    // Two plain queries rather than an aggregate subquery. array_agg came back
    // from the driver as the literal string "{a,b}", and a string is iterable, so
    // the index filled up with single characters and matched nothing. Two queries
    // and a join in memory cannot do that.
    const contacts = await db.select({
        memberId: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["contactMethods"].memberId,
        kind: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["contactMethods"].kind,
        value: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["contactMethods"].value
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["contactMethods"]);
    const emails = new Map();
    const phones = new Map();
    for (const c of contacts){
        const into = c.kind === "email" ? emails : phones;
        const list = into.get(c.memberId);
        if (list) list.push(c.value);
        else into.set(c.memberId, [
            c.value
        ]);
    }
    return indexPeople(rows.map((r)=>({
            ...r,
            emails: emails.get(r.id) ?? [],
            phones: phones.get(r.id) ?? []
        })));
}
function indexPeople(rows) {
    const index = {
        byEmail: new Map(),
        byPhone: new Map(),
        byName: new Map(),
        all: []
    };
    for (const person of rows){
        index.all.push(person);
        for (const e of person.emails)push(index.byEmail, normaliseEmail(e), person);
        for (const p of person.phones)push(index.byPhone, normalisePhone(p), person);
        push(index.byName, nameKey(person.firstName, person.lastName), person);
        if (person.preferredName) push(index.byName, nameKey(person.preferredName, person.lastName), person);
    }
    return index;
}
function push(map, key, value) {
    if (!key) return;
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [
        value
    ]);
}
const display = (p)=>`${p.preferredName ?? p.firstName} ${p.lastName}`;
function findMatches(index, candidate) {
    const found = new Map();
    const add = (person, confidence, reason)=>{
        const existing = found.get(person.id);
        const rank = {
            certain: 3,
            likely: 2,
            possible: 1
        };
        if (existing && rank[existing.confidence] >= rank[confidence]) return;
        found.set(person.id, {
            memberId: person.id,
            displayName: display(person),
            confidence,
            reason
        });
    };
    const first = (candidate.firstName ?? "").trim();
    const last = (candidate.lastName ?? "").trim();
    if (candidate.email) {
        for (const p of index.byEmail.get(normaliseEmail(candidate.email)) ?? []){
            add(p, "certain", "import.match.email");
        }
    }
    if (first && last) {
        const sameName = index.byName.get(nameKey(first, last)) ?? [];
        for (const p of sameName){
            if (candidate.dateOfBirth && p.dateOfBirth === candidate.dateOfBirth) {
                add(p, "certain", "import.match.nameAndBirth");
            } else if (candidate.phone && p.phones.some((x)=>normalisePhone(x) === normalisePhone(candidate.phone))) {
                add(p, "certain", "import.match.nameAndPhone");
            } else if (candidate.dateOfBirth && p.dateOfBirth && p.dateOfBirth !== candidate.dateOfBirth) {
            // Same name, different birthday. Two members, not one.
            } else {
                add(p, "possible", "import.match.name");
            }
        }
    }
    if (candidate.phone) {
        const key = normalisePhone(candidate.phone);
        if (key.length >= 7) {
            for (const p of index.byPhone.get(key) ?? []){
                // A shared household line is common, so a phone plus a matching surname
                // is a person and a phone on its own is a household.
                const sameSurname = last && normaliseName(p.lastName) === normaliseName(last);
                add(p, sameSurname ? "likely" : "possible", sameSurname ? "import.match.phoneAndSurname" : "import.match.phone");
            }
        }
    }
    const rank = {
        certain: 3,
        likely: 2,
        possible: 1
    };
    return [
        ...found.values()
    ].sort((a, b)=>rank[b.confidence] - rank[a.confidence]);
}
function indexNewPerson(index, person) {
    const entry = {
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        preferredName: null,
        dateOfBirth: person.dateOfBirth ?? null,
        emails: person.email ? [
            person.email
        ] : [],
        phones: person.phone ? [
            person.phone
        ] : []
    };
    index.all.push(entry);
    if (person.email) push(index.byEmail, normaliseEmail(person.email), entry);
    if (person.phone) push(index.byPhone, normalisePhone(person.phone), entry);
    push(index.byName, nameKey(person.firstName, person.lastName), entry);
}
}),
"[project]/packages/db/src/import/csv.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * A CSV reader, written rather than installed.
 *
 * CSV is small enough to do correctly and the details are the whole job: quoted
 * fields containing commas and newlines, doubled quotes inside quoted fields, a
 * byte order mark that Excel puts on every file it exports, and CRLF. A parser
 * that splits on commas works on the demo file and fails on a real church's
 * directory, where somebody has an address with a comma in it.
 *
 * Tab separated files are the same grammar with a different delimiter, and they
 * are what you get when a spreadsheet is pasted, so they are read too.
 */ __turbopack_context__.s([
    "detectDelimiter",
    ()=>detectDelimiter,
    "parseDelimited",
    ()=>parseDelimited,
    "readImportFile",
    ()=>readImportFile,
    "readSheet",
    ()=>readSheet
]);
function detectDelimiter(text) {
    const firstLine = text.slice(0, text.indexOf("\n") === -1 ? text.length : text.indexOf("\n"));
    const counts = [
        ",",
        "\t",
        ";",
        "|"
    ].map((d)=>[
            d,
            firstLine.split(d).length - 1
        ]);
    const best = counts.reduce((a, b)=>b[1] > a[1] ? b : a);
    return best[1] > 0 ? best[0] : ",";
}
function parseDelimited(text, delimiter) {
    // Excel writes a byte order mark. Left in, it becomes part of the first header,
    // and the mapping silently fails to recognise a column called "First name".
    const input = text.replace(/^﻿/, "");
    const d = delimiter ?? detectDelimiter(input);
    const cells = [];
    const lines = [];
    let row = [];
    let field = "";
    let quoted = false;
    let line = 1;
    let rowStartedAt = 1;
    let started = false;
    const endField = ()=>{
        row.push(field);
        field = "";
    };
    const endRow = ()=>{
        endField();
        cells.push(row);
        lines.push(rowStartedAt);
        row = [];
        started = false;
    };
    for(let i = 0; i < input.length; i++){
        const c = input[i];
        if (!started) {
            rowStartedAt = line;
            started = true;
        }
        if (quoted) {
            if (c === '"') {
                // A doubled quote inside a quoted field is one literal quote.
                if (input[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    quoted = false;
                }
            } else {
                if (c === "\n") line++;
                field += c;
            }
            continue;
        }
        if (c === '"' && field === "") {
            quoted = true;
        } else if (c === d) {
            endField();
        } else if (c === "\r") {
        // Part of CRLF. The \n that follows ends the row.
        } else if (c === "\n") {
            line++;
            endRow();
        } else {
            field += c;
        }
    }
    // A file that does not end in a newline still has a last row.
    if (started || field !== "" || row.length > 0) endRow();
    return {
        cells,
        lines
    };
}
/** Removes rows that are entirely blank, which trailing newlines and Excel both produce. */ const isBlank = (row)=>row.every((c)=>c.trim() === "");
function readSheet(text, delimiter) {
    const { cells, lines } = parseDelimited(text, delimiter);
    const body = cells.filter((r)=>!isBlank(r));
    const bodyLines = lines.filter((_, i)=>!isBlank(cells[i]));
    if (body.length === 0) return {
        headers: [],
        rows: [],
        lineNumbers: []
    };
    const seen = new Map();
    const headers = body[0].map((h, i)=>{
        const name = h.trim() || `Column ${i + 1}`;
        const count = seen.get(name.toLowerCase()) ?? 0;
        seen.set(name.toLowerCase(), count + 1);
        return count === 0 ? name : `${name} (${count + 1})`;
    });
    const rows = body.slice(1).map((cells)=>{
        const row = {};
        headers.forEach((h, i)=>{
            row[h] = (cells[i] ?? "").trim();
        });
        return row;
    });
    return {
        headers,
        rows,
        lineNumbers: bodyLines.slice(1)
    };
}
async function readImportFile(input) {
    const { isWorkbookName, readWorkbook } = await __turbopack_context__.A("[project]/packages/db/src/import/xlsx.ts [app-rsc] (ecmascript, async loader)");
    if (input.bytes && isWorkbookName(input.filename)) return readWorkbook(input.bytes);
    if (input.text !== undefined) return readSheet(input.text);
    if (input.bytes) return readSheet(Buffer.from(input.bytes).toString("utf8"));
    return {
        headers: [],
        rows: [],
        lineNumbers: []
    };
}
}),
"[project]/packages/db/src/import/columns.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "IGNORE",
    ()=>IGNORE,
    "PERSON_FIELDS",
    ()=>PERSON_FIELDS,
    "guessMapping",
    ()=>guessMapping,
    "parseHouseholdRole",
    ()=>parseHouseholdRole,
    "parseImportedDate",
    ()=>parseImportedDate,
    "parseLifecycle",
    ()=>parseLifecycle,
    "parseMarital",
    ()=>parseMarital,
    "parseSchoolLevel",
    ()=>parseSchoolLevel,
    "splitValues",
    ()=>splitValues
]);
const PERSON_FIELDS = [
    {
        key: "firstName",
        label: "personForm.firstName",
        required: true,
        aliases: [
            "first name",
            "firstname",
            "given name",
            "givenname",
            "first",
            "forename",
            "fname"
        ]
    },
    {
        key: "lastName",
        label: "personForm.lastName",
        required: true,
        aliases: [
            "last name",
            "lastname",
            "surname",
            "family name",
            "familyname",
            "last",
            "lname"
        ]
    },
    {
        key: "preferredName",
        label: "personForm.preferredName",
        aliases: [
            "preferred name",
            "nickname",
            "goes by",
            "known as",
            "display name",
            "middle name"
        ]
    },
    {
        key: "email",
        label: "personForm.email",
        aliases: [
            "email",
            "email address",
            "e mail",
            "primary email",
            "home email",
            "personal email"
        ]
    },
    {
        key: "phone",
        label: "personForm.phone",
        aliases: [
            "phone",
            "phone number",
            "mobile",
            "mobile phone",
            "cell",
            "cell phone",
            "telephone",
            "home phone"
        ]
    },
    {
        key: "dateOfBirth",
        label: "personForm.dateOfBirth",
        aliases: [
            "date of birth",
            "dob",
            "birthday",
            "birth date",
            "birthdate",
            "born"
        ]
    },
    {
        key: "lifecycleStatus",
        label: "personForm.status",
        aliases: [
            "status",
            "membership status",
            "member status",
            "lifecycle",
            "type",
            "person type"
        ]
    },
    {
        key: "membershipDate",
        label: "personForm.membershipDate",
        aliases: [
            "membership date",
            "member since",
            "date joined",
            "joined",
            "join date"
        ]
    },
    {
        key: "firstVisitOn",
        label: "personForm.firstVisit",
        aliases: [
            "first visit",
            "first attended",
            "first visit date",
            "visitor date"
        ]
    },
    {
        key: "householdName",
        label: "personForm.household",
        aliases: [
            "household",
            "household name",
            "family",
            "family name",
            "family id"
        ]
    },
    {
        key: "householdRole",
        label: "personForm.householdRole",
        aliases: [
            "household role",
            "family role",
            "relationship",
            "role in family",
            "family position"
        ]
    },
    {
        key: "address",
        label: "personForm.address",
        aliases: [
            "address",
            "home address",
            "street address",
            "street",
            "address line 1",
            "address 1",
            "mailing address"
        ]
    },
    {
        key: "addressLine2",
        label: "address.line2",
        aliases: [
            "address line 2",
            "address 2",
            "apartment",
            "unit",
            "suite"
        ]
    },
    {
        key: "city",
        label: "address.city",
        aliases: [
            "city",
            "town",
            "suburb"
        ]
    },
    {
        key: "region",
        label: "address.region",
        aliases: [
            "state",
            "province",
            "county",
            "region"
        ]
    },
    {
        key: "postalCode",
        label: "address.postalCode",
        aliases: [
            "zip",
            "zip code",
            "postcode",
            "postal code",
            "post code"
        ]
    },
    {
        key: "maritalStatus",
        label: "person.maritalStatus",
        aliases: [
            "marital status",
            "marital",
            "married",
            "relationship status"
        ]
    },
    {
        key: "schoolLevel",
        label: "person.schoolLevel",
        aliases: [
            "school level",
            "grade",
            "school grade",
            "grade level",
            "year group",
            "school year"
        ]
    },
    {
        key: "allergies",
        label: "personForm.allergies",
        aliases: [
            "allergies",
            "allergy",
            "allergen",
            "allergens"
        ]
    },
    {
        key: "medicalNote",
        label: "personForm.medicalNote",
        aliases: [
            "medical",
            "medical note",
            "medical notes",
            "medical information",
            "conditions"
        ]
    },
    {
        key: "tags",
        label: "tags.title",
        aliases: [
            "tags",
            "tag",
            "labels",
            "label",
            "attributes"
        ]
    }
];
const IGNORE = "";
const normalise = (header)=>header.toLowerCase().replace(/[_\-.]+/g, " ").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
function guessMapping(headers, custom = []) {
    const targets = [
        ...PERSON_FIELDS,
        ...custom.map((f)=>({
                key: `cf:${f.id}`,
                label: f.label,
                aliases: [
                    normalise(f.label)
                ]
            }))
    ];
    const mapping = {};
    const claimed = new Set();
    const claim = (header, key)=>{
        mapping[header] = key;
        claimed.add(key);
    };
    for (const header of headers){
        const n = normalise(header);
        const exact = targets.find((t)=>!claimed.has(t.key) && t.aliases.includes(n));
        if (exact) claim(header, exact.key);
    }
    for (const header of headers){
        if (mapping[header]) continue;
        const n = normalise(header);
        const loose = targets.find((t)=>!claimed.has(t.key) && t.aliases.some((a)=>n === a || n.includes(` ${a}`) || n.startsWith(`${a} `) || n.endsWith(` ${a}`)));
        if (loose) claim(header, loose.key);
    }
    for (const header of headers)mapping[header] ??= IGNORE;
    return mapping;
}
function parseImportedDate(raw) {
    const v = raw.trim();
    if (!v) return {
        value: ""
    };
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    if (iso) return valid(iso[1], iso[2], iso[3]);
    const slash = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(v);
    if (slash) {
        const month = slash[1];
        const day = slash[2];
        let year = slash[3];
        if (year.length === 2) {
            // A two digit year in a church directory is a birthday far more often
            // than a future date, so the window leans backwards.
            const n = Number(year);
            year = String(n > 30 ? 1900 + n : 2000 + n);
        }
        return valid(year, month.padStart(2, "0"), day.padStart(2, "0"));
    }
    // "12 March 1990" and "March 12, 1990" both land here.
    const parsed = Date.parse(v);
    if (!Number.isNaN(parsed) && /[a-z]{3}/i.test(v)) {
        const d = new Date(parsed);
        return valid(String(d.getUTCFullYear()), String(d.getUTCMonth() + 1).padStart(2, "0"), String(d.getUTCDate()).padStart(2, "0"));
    }
    return {
        error: "malformed"
    };
}
function valid(y, m, d) {
    const month = Number(m);
    const day = Number(d);
    const year = Number(y);
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2200) {
        return {
            error: "malformed"
        };
    }
    const iso = `${y}-${m}-${d}`;
    const check = new Date(`${iso}T00:00:00Z`);
    // Catches 31 February, which passes the range test and is not a date.
    if (Number.isNaN(check.getTime()) || check.getUTCDate() !== day) return {
        error: "malformed"
    };
    return {
        value: iso
    };
}
function parseLifecycle(raw) {
    const n = normalise(raw);
    if (!n) return "visitor";
    if (/(^|\s)(member|active member|full member|covenant)/.test(n)) return "member";
    if (/regular|attender|attendee|adherent/.test(n)) return "regular_attender";
    if (/inactive|lapsed|former|moved/.test(n)) return "inactive";
    if (/deceased|died|deceased member/.test(n)) return "deceased";
    return "visitor";
}
function parseHouseholdRole(raw) {
    const n = normalise(raw);
    if (/head|primary|self|adult male|husband/.test(n)) return "head";
    if (/spouse|wife|partner|husband/.test(n)) return "spouse";
    if (/child|son|daughter|dependent|kid/.test(n)) return "child";
    return "other";
}
function parseMarital(raw) {
    const n = normalise(raw);
    if (!n) return null;
    if (/^(m|married)$/.test(n) || n.includes("married")) return "married";
    if (n.includes("engaged")) return "engaged";
    if (n.includes("widow")) return "widowed";
    if (n.includes("divorc")) return "divorced";
    if (n.includes("separat")) return "separated";
    if (/^(s|single)$/.test(n) || n.includes("single") || n.includes("unmarried")) return "single";
    return null;
}
function parseSchoolLevel(raw) {
    const n = normalise(raw);
    if (!n) return null;
    if (/pre k|prek|preschool|pre school|nursery/.test(n)) return "pre_k";
    if (/kinder|^k$/.test(n)) return "kindergarten";
    if (/graduate|grad school|masters|phd/.test(n)) return "graduate";
    if (/college|university|undergrad/.test(n)) return "college";
    const grade = /(\d{1,2})/.exec(n);
    if (grade) {
        const year = Number(grade[1]);
        if (year >= 1 && year <= 12) return `grade_${year}`;
    }
    return null;
}
function splitValues(raw) {
    return raw.split(/[;,|]/).map((v)=>v.trim()).filter(Boolean);
}
}),
"[project]/packages/db/src/import/group-columns.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * R19.5. A file whose rows are memberships rather than members.
 *
 * Planning Center, Breeze and ChurchTrac all export group membership the same
 * shape: one line per person per group, with the group's name repeated down the
 * column. So this needs no per-system mapping the way members files do. The
 * aliases below cover what all three call these six things.
 */ __turbopack_context__.s([
    "GROUP_FIELDS",
    ()=>GROUP_FIELDS,
    "guessGroupMapping",
    ()=>guessGroupMapping,
    "isGroupSheet",
    ()=>isGroupSheet,
    "parseGroupRole",
    ()=>parseGroupRole
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/import/columns.ts [app-rsc] (ecmascript)");
;
const GROUP_FIELDS = [
    {
        key: "groupName",
        label: "import.group.name",
        required: true,
        aliases: [
            "group",
            "group name",
            "groupname",
            "team",
            "team name",
            "class",
            "class name",
            "small group",
            "ministry",
            "event name"
        ]
    },
    {
        key: "groupType",
        label: "import.group.type",
        aliases: [
            "group type",
            "grouptype",
            "type",
            "category",
            "group category"
        ]
    },
    {
        key: "firstName",
        label: "personForm.firstName",
        aliases: [
            "first name",
            "firstname",
            "given name",
            "givenname",
            "first",
            "forename",
            "fname"
        ]
    },
    {
        key: "lastName",
        label: "personForm.lastName",
        aliases: [
            "last name",
            "lastname",
            "surname",
            "family name",
            "familyname",
            "last",
            "lname"
        ]
    },
    {
        key: "email",
        label: "personForm.email",
        aliases: [
            "email",
            "email address",
            "e mail",
            "primary email",
            "home email",
            "personal email"
        ]
    },
    {
        key: "phone",
        label: "personForm.phone",
        aliases: [
            "phone",
            "phone number",
            "mobile",
            "mobile phone",
            "cell",
            "cell phone",
            "cellphone"
        ]
    },
    {
        key: "role",
        label: "import.group.role",
        aliases: [
            "role",
            "group role",
            "grouprole",
            "position",
            "member type",
            "membership role",
            "team role",
            "leader"
        ]
    },
    {
        key: "joinedOn",
        label: "import.group.joined",
        aliases: [
            "joined",
            "joined on",
            "joined at",
            "joined date",
            "date joined",
            "start date",
            "member since",
            "added on"
        ]
    }
];
const normalise = (header)=>header.toLowerCase().replace(/[_\-.]+/g, " ").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const NAME_ALIASES = new Set(GROUP_FIELDS.find((f)=>f.key === "groupName").aliases);
const PERSON_ALIASES = new Set([
    ...GROUP_FIELDS.find((f)=>f.key === "email").aliases,
    ...GROUP_FIELDS.find((f)=>f.key === "lastName").aliases
]);
function isGroupSheet(headers) {
    const seen = headers.map(normalise);
    const tight = seen.map((h)=>h.replace(/\s/g, ""));
    const has = (set)=>seen.some((h)=>set.has(h)) || tight.some((h)=>[
                ...set
            ].some((alias)=>alias.replace(/\s/g, "") === h));
    return has(NAME_ALIASES) && has(PERSON_ALIASES);
}
function guessGroupMapping(headers) {
    const mapping = {};
    const claimed = new Set();
    const claim = (header, key)=>{
        mapping[header] = key;
        claimed.add(key);
    };
    for (const header of headers){
        const n = normalise(header);
        const tight = n.replace(/\s/g, "");
        const exact = GROUP_FIELDS.find((f)=>!claimed.has(f.key) && (f.aliases.includes(n) || f.aliases.some((a)=>a.replace(/\s/g, "") === tight)));
        if (exact) claim(header, exact.key);
    }
    for (const header of headers){
        if (mapping[header]) continue;
        const n = normalise(header);
        const loose = GROUP_FIELDS.find((f)=>!claimed.has(f.key) && f.aliases.some((a)=>n.includes(` ${a}`) || n.startsWith(`${a} `) || n.endsWith(` ${a}`)));
        if (loose) claim(header, loose.key);
    }
    for (const header of headers)mapping[header] ??= __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IGNORE"];
    return mapping;
}
function parseGroupRole(raw) {
    const n = normalise(raw);
    if (!n) return "member";
    if (/co leader|coleader|assistant|deputy|apprentice|second/.test(n)) return "coleader";
    if (/leader|host|facilitator|teacher|coach|captain|director|^lead$/.test(n)) return "leader";
    if (/^(y|yes|true|1)$/.test(n)) return "leader";
    return "member";
}
}),
"[project]/packages/db/src/import/run-groups.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * R19.5, R9.5. Bringing a church's groups across with its members.
 *
 * A group file is one line per person per group, which is how all three of
 * Planning Center, Breeze and ChurchTrac export them. So a row here is a
 * membership: it names a group, names a person, and the import's job is to find
 * that person among the members already imported.
 *
 * Finding them is the whole difficulty, and it uses the same matcher the members
 * import uses to spot duplicates. A row whose person cannot be found with
 * certainty fails rather than guessing, because putting the wrong Sarah into a
 * small group is a mistake a church will not notice and cannot see.
 *
 * As with members, `plan()` decides and `commit()` carries out exactly what it
 * was given, so the preview cannot disagree with the write.
 */ __turbopack_context__.s([
    "commitGroups",
    ()=>commitGroups,
    "planGroups",
    ()=>planGroups,
    "rollbackGroupImport",
    ()=>rollbackGroupImport
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/sql/expressions/conditions.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/sql/sql.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/imports.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/groups.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/groups.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/roles.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/import/columns.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$group$2d$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/import/group-columns.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$match$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/import/match.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
const value = (row, mapping, key)=>{
    for (const [header, target] of Object.entries(mapping)){
        if (target === key) return (row[header] ?? "").trim();
    }
    return "";
};
const fold = (name)=>name.trim().toLowerCase().replace(/\s+/g, " ");
async function planGroups(db, input) {
    const sheet = input.sheet;
    const index = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$match$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["buildMatchIndex"])(db);
    const existing = await db.select({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groups"].id,
        name: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groups"].name
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groups"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isNull"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groups"].archivedAt));
    const byName = new Map(existing.map((row)=>[
            fold(row.name),
            row.id
        ]));
    const members = await db.select({
        groupId: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupMemberships"].groupId,
        memberId: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupMemberships"].memberId,
        role: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupMemberships"].role
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupMemberships"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isNull"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupMemberships"].leftOn));
    const already = new Map(members.map((row)=>[
            `${row.groupId}:${row.memberId}`,
            row.role
        ]));
    const planned = new Set();
    const newGroups = [];
    const rows = [];
    for (const [i, raw] of sheet.rows.entries()){
        const lineNumber = i + 2;
        const groupName = value(raw, input.mapping, "groupName");
        const firstName = value(raw, input.mapping, "firstName");
        const lastName = value(raw, input.mapping, "lastName");
        const email = value(raw, input.mapping, "email");
        const phone = value(raw, input.mapping, "phone");
        const role = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$group$2d$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["parseGroupRole"])(value(raw, input.mapping, "role"));
        const typeName = value(raw, input.mapping, "groupType");
        const personName = [
            firstName,
            lastName
        ].filter(Boolean).join(" ") || email || "";
        const base = {
            lineNumber,
            groupName,
            personName,
            role,
            source: raw,
            typeName: typeName || undefined
        };
        if (!groupName) {
            rows.push({
                ...base,
                outcome: "fail",
                reason: "import.group.noName"
            });
            continue;
        }
        if (!firstName && !lastName && !email && !phone) {
            rows.push({
                ...base,
                outcome: "fail",
                reason: "import.group.noPerson"
            });
            continue;
        }
        const joined = value(raw, input.mapping, "joinedOn");
        let joinedOn;
        if (joined) {
            const parsed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["parseImportedDate"])(joined);
            if ("error" in parsed) {
                rows.push({
                    ...base,
                    outcome: "fail",
                    reason: "import.group.badDate",
                    reasonParams: {
                        value: joined
                    }
                });
                continue;
            }
            joinedOn = parsed.value;
        }
        const matches = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$match$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["findMatches"])(index, {
            firstName,
            lastName,
            email,
            phone
        });
        const certain = matches.filter((match)=>match.confidence === "certain");
        // Nothing short of certain is acted on. Two members of one name and no
        // address between them is exactly the row a church cannot check afterwards.
        if (certain.length !== 1) {
            const reason = certain.length > 1 || matches.length > 1 ? "import.group.ambiguous" : matches.length === 1 ? "import.group.unsure" : "import.group.noMatch";
            rows.push({
                ...base,
                joinedOn,
                outcome: "fail",
                reason,
                reasonParams: {
                    name: personName
                }
            });
            continue;
        }
        const memberId = certain[0].memberId;
        const key = fold(groupName);
        const groupId = byName.get(key);
        // The group is made by the first row that names it, and every later row in
        // the file joins the same one.
        let makesGroup = false;
        if (!groupId && !planned.has(key)) {
            planned.add(key);
            newGroups.push(groupName.trim());
            makesGroup = true;
        }
        if (groupId && already.get(`${groupId}:${memberId}`) === role) {
            rows.push({
                ...base,
                groupId,
                memberId,
                joinedOn,
                outcome: "skip",
                reason: "import.group.alreadyIn",
                reasonParams: {
                    name: personName
                }
            });
            continue;
        }
        rows.push({
            ...base,
            groupId,
            memberId,
            joinedOn,
            makesGroup,
            outcome: "create"
        });
    }
    const totals = {
        create: 0,
        skip: 0,
        fail: 0
    };
    for (const row of rows)totals[row.outcome]++;
    return {
        filename: input.filename,
        headers: sheet.headers,
        mapping: input.mapping,
        rows,
        totals,
        newGroups
    };
}
async function commitGroups(db, actor, plan) {
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["canManageGroups"])(actor)) throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["PermissionError"](actor.role, "manageGroups");
    const [batch] = await db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importBatches"]).values({
        tenantId: actor.tenantId,
        filename: plan.filename,
        kind: "groups",
        status: "committed",
        mapping: plan.mapping,
        duplicateStrategy: "skip",
        rowsTotal: plan.rows.length,
        startedByUserId: actor.userId ?? null,
        committedAt: new Date()
    }).returning({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importBatches"].id
    });
    if (!batch) throw new Error("Import batch insert returned no row.");
    const types = await db.select({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupTypes"].id,
        name: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupTypes"].name
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupTypes"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isNull"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupTypes"].archivedAt));
    const typeByName = new Map(types.map((row)=>[
            fold(row.name),
            row.id
        ]));
    // Read again here rather than trusting the plan. A group name is unique in a
    // church, so a group created between the preview and this would make the
    // whole import fail on a constraint.
    const here = await db.select({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groups"].id,
        name: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groups"].name
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groups"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isNull"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groups"].archivedAt));
    const made = new Map(here.map((row)=>[
            fold(row.name),
            row.id
        ]));
    const result = {
        batchId: batch.id,
        joined: 0,
        groupsCreated: 0,
        skipped: 0,
        failed: 0
    };
    for (const row of plan.rows){
        if (row.outcome !== "create") {
            await record(db, actor, batch.id, row, null, false);
            if (row.outcome === "fail") result.failed++;
            else result.skipped++;
            continue;
        }
        const key = fold(row.groupName);
        let groupId = made.get(key) ?? row.groupId;
        let created = false;
        if (!groupId) {
            const group = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createGroup"])(db, {
                tenantId: actor.tenantId,
                role: actor.role
            }, {
                name: row.groupName.trim(),
                typeId: row.typeName ? typeByName.get(fold(row.typeName)) ?? null : null
            });
            groupId = group.id;
            made.set(key, groupId);
            created = true;
            result.groupsCreated++;
        }
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addToGroup"])(db, {
            tenantId: actor.tenantId,
            role: actor.role
        }, {
            groupId,
            memberId: row.memberId,
            role: row.role,
            ...row.joinedOn ? {
                joinedOn: row.joinedOn
            } : {}
        });
        await record(db, actor, batch.id, {
            ...row,
            groupId
        }, groupId, created);
        result.joined++;
    }
    await db.update(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importBatches"]).set({
        rowsCreated: result.joined,
        // The groups it brought into existence, which is the number a church
        // reads before deciding to undo it.
        rowsUpdated: result.groupsCreated,
        rowsSkipped: result.skipped,
        rowsFailed: result.failed
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importBatches"].id, batch.id));
    return result;
}
async function record(db, actor, batchId, row, groupId, groupCreated) {
    await db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importRows"]).values({
        tenantId: actor.tenantId,
        batchId,
        lineNumber: row.lineNumber,
        outcome: row.outcome,
        memberId: row.memberId ?? null,
        groupId: groupId ?? row.groupId ?? null,
        groupCreated,
        reason: row.reason ?? null,
        source: row.source
    });
}
async function rollbackGroupImport(db, actor, batchId) {
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["canManageGroups"])(actor)) throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["PermissionError"](actor.role, "manageGroups");
    const rows = await db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importRows"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importRows"].batchId, batchId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importRows"].outcome, "create")));
    const result = {
        left: 0,
        groupsArchived: 0,
        groupsKept: 0
    };
    const touched = new Set();
    for (const row of rows){
        if (!row.groupId || !row.memberId) continue;
        const done = await db.update(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupMemberships"]).set({
            leftOn: new Date().toISOString().slice(0, 10),
            updatedAt: new Date()
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupMemberships"].groupId, row.groupId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupMemberships"].memberId, row.memberId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isNull"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupMemberships"].leftOn))).returning({
            id: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupMemberships"].id
        });
        if (done.length > 0) result.left++;
        if (row.groupCreated) touched.add(row.groupId);
    }
    for (const groupId of touched){
        const [remaining] = await db.select({
            count: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`count(*)::int`
        }).from(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupMemberships"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupMemberships"].groupId, groupId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isNull"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupMemberships"].leftOn)));
        if ((remaining?.count ?? 0) > 0) {
            result.groupsKept++;
            continue;
        }
        await db.update(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groups"]).set({
            archivedAt: new Date(),
            updatedAt: new Date()
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groups"].id, groupId));
        result.groupsArchived++;
    }
    await db.update(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importBatches"]).set({
        status: "rolled_back",
        rolledBackAt: new Date()
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importBatches"].id, batchId));
    return result;
}
}),
"[project]/packages/db/src/import/sources.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "IMPORT_SOURCES",
    ()=>IMPORT_SOURCES,
    "SOURCE_KEYS",
    ()=>SOURCE_KEYS,
    "detectSource",
    ()=>detectSource,
    "sourceMapping",
    ()=>sourceMapping
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/import/columns.ts [app-rsc] (ecmascript)");
;
const SOURCE_KEYS = [
    "planning_center",
    "breeze",
    "churchtrac",
    "other"
];
const normalise = (header)=>header.toLowerCase().replace(/[_\-.]+/g, " ").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const IMPORT_SOURCES = [
    {
        key: "planning_center",
        label: "import.source.planning_center",
        // Their export is the only one of the three that ships a "Child" column and
        // names the household column "Household".
        signature: [
            "household",
            "membership"
        ],
        columns: {
            "first name": "firstName",
            "last name": "lastName",
            nickname: "preferredName",
            birthdate: "dateOfBirth",
            // Membership is the one that says member or visitor. Status is active or
            // inactive, which is a different question, so it is left out rather than
            // turning every inactive person into a visitor.
            membership: "lifecycleStatus",
            email: "email",
            "mobile phone": "phone",
            household: "householdName",
            "household name": "householdName",
            "created at": __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IGNORE"]
        }
    },
    {
        key: "breeze",
        label: "import.source.breeze",
        signature: [
            "family",
            "family role"
        ],
        columns: {
            "first name": "firstName",
            "last name": "lastName",
            nickname: "preferredName",
            birthdate: "dateOfBirth",
            status: "lifecycleStatus",
            email: "email",
            mobile: "phone",
            family: "householdName",
            "family role": "householdRole",
            "joined date": "membershipDate",
            "breeze id": __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IGNORE"]
        }
    },
    {
        key: "churchtrac",
        label: "import.source.churchtrac",
        signature: [
            "familyname",
            "memberstatus"
        ],
        columns: {
            firstname: "firstName",
            lastname: "lastName",
            nickname: "preferredName",
            birthdate: "dateOfBirth",
            memberstatus: "lifecycleStatus",
            email: "email",
            cellphone: "phone",
            familyname: "householdName",
            familyposition: "householdRole",
            membershipdate: "membershipDate"
        }
    }
];
function detectSource(headers) {
    const seen = new Set(headers.map(normalise));
    const seenTight = new Set(headers.map((header)=>normalise(header).replace(/\s/g, "")));
    for (const source of IMPORT_SOURCES){
        const matches = source.signature.every((header)=>seen.has(header) || seenTight.has(header.replace(/\s/g, "")));
        if (matches) return source.key;
    }
    return null;
}
function sourceMapping(source, headers, guessed) {
    const known = IMPORT_SOURCES.find((row)=>row.key === source);
    if (!known) return guessed;
    const mapping = {
        ...guessed
    };
    const fields = new Set(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PERSON_FIELDS"].map((field)=>field.key));
    const claimed = new Set();
    for (const header of headers){
        const n = normalise(header);
        const tight = n.replace(/\s/g, "");
        const target = known.columns[n] ?? known.columns[tight];
        if (target === undefined) continue;
        if (target !== __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IGNORE"] && !fields.has(target)) continue;
        if (target !== __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IGNORE"] && claimed.has(target)) continue;
        mapping[header] = target;
        if (target !== __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IGNORE"]) claimed.add(target);
    }
    // A field the system's own mapping claimed must not also be held by a column
    // the generic guess picked up, or two columns write to one field.
    for (const header of headers){
        const n = normalise(header);
        const tight = n.replace(/\s/g, "");
        const named = known.columns[n] ?? known.columns[tight];
        if (named !== undefined) continue;
        if (mapping[header] && claimed.has(mapping[header])) mapping[header] = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IGNORE"];
    }
    return mapping;
}
}),
"[project]/packages/db/src/import/xlsx.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isWorkbookName",
    ()=>isWorkbookName,
    "readWorkbook",
    ()=>readWorkbook
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$exceljs$40$4$2e$4$2e$0$2f$node_modules$2f$exceljs$2f$excel$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/exceljs@4.4.0/node_modules/exceljs/excel.js [app-rsc] (ecmascript)");
;
/**
 * R19.1. Reading a real .xlsx workbook.
 *
 * Unlike CSV, this is not written by hand. An xlsx file is a zip of XML where a
 * date is stored as a number and the only way to know it is a date is to follow
 * the cell's style to a number format. Get that wrong and every birthday in a
 * church directory lands in 1900. That is not a detail worth being clever about,
 * so the parsing is delegated and only the interpretation lives here.
 */ /** A cell, as the text the rest of the import pipeline expects. */ function cellText(cell) {
    const value = cell.value;
    if (value === null || value === undefined) return "";
    if (value instanceof Date) {
        // Excel holds a date as a number and a format. ExcelJS hands back a Date in
        // UTC, and the import pipeline speaks ISO, so the conversion happens once,
        // here, rather than in six places downstream.
        return value.toISOString().slice(0, 10);
    }
    if (typeof value === "object") {
        // A formula cell carries its last computed result. A church's export often
        // has a "Full name" column that is a formula, and the result is what they
        // see on screen and what they mean.
        if ("result" in value && value.result !== undefined && value.result !== null) {
            const r = value.result;
            if (r instanceof Date) return r.toISOString().slice(0, 10);
            if (typeof r === "object" && r !== null && "error" in r) return "";
            return String(r).trim();
        }
        // Rich text: one string broken into runs because somebody bolded a word.
        if ("richText" in value && Array.isArray(value.richText)) {
            return value.richText.map((r)=>r.text).join("").trim();
        }
        if ("text" in value && typeof value.text === "string") return value.text.trim();
        if ("hyperlink" in value && typeof value.text === "string") return String(value.text).trim();
        return "";
    }
    if (typeof value === "number") {
        // Long decimals come back from a stored float. A phone number typed into a
        // numeric cell must not become 5.12555e9.
        return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(10)));
    }
    if (typeof value === "boolean") return value ? "true" : "false";
    return String(value).trim();
}
async function readWorkbook(data) {
    const workbook = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$exceljs$40$4$2e$4$2e$0$2f$node_modules$2f$exceljs$2f$excel$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].Workbook();
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(new Uint8Array(data));
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets.find((w)=>w.state !== "hidden") ?? workbook.worksheets[0];
    if (!worksheet) return {
        headers: [],
        rows: [],
        lineNumbers: []
    };
    const table = [];
    worksheet.eachRow({
        includeEmpty: false
    }, (row, rowNumber)=>{
        const cells = [];
        // eachCell skips gaps, so the row is walked by position instead. A blank
        // column in the middle must not shift every value to its left.
        const width = Math.max(row.cellCount, worksheet.columnCount);
        for(let c = 1; c <= width; c++)cells.push(cellText(row.getCell(c)));
        if (cells.some((v)=>v !== "")) table.push({
            cells,
            line: rowNumber
        });
    });
    if (table.length === 0) return {
        headers: [],
        rows: [],
        lineNumbers: []
    };
    const seen = new Map();
    const headers = table[0].cells.map((h, i)=>{
        const name = h.trim() || `Column ${i + 1}`;
        const count = seen.get(name.toLowerCase()) ?? 0;
        seen.set(name.toLowerCase(), count + 1);
        return count === 0 ? name : `${name} (${count + 1})`;
    });
    // Trailing empty header columns are Excel's, not the church's.
    while(headers.length > 0 && /^Column \d+$/.test(headers[headers.length - 1])){
        const index = headers.length - 1;
        if (table.some((r)=>(r.cells[index] ?? "") !== "")) break;
        headers.pop();
    }
    const rows = table.slice(1).map((r)=>{
        const row = {};
        headers.forEach((h, i)=>{
            row[h] = (r.cells[i] ?? "").trim();
        });
        return row;
    });
    return {
        headers,
        rows,
        lineNumbers: table.slice(1).map((r)=>r.line)
    };
}
const isWorkbookName = (filename)=>/\.xlsx?$/i.test(filename);
}),
"[project]/packages/db/src/import/run.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "commit",
    ()=>commit,
    "plan",
    ()=>plan
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/sql/expressions/conditions.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/imports.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/roles.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/members.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$custom$2d$fields$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/custom-fields.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$tags$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/tags.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$provisional$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/provisional.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/import/columns.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$match$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/import/match.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
;
/** Marks an id that only exists in this plan, not in the database. */ const PLANNED = "planned:";
const value = (row, mapping, key)=>{
    for (const [header, target] of Object.entries(mapping)){
        if (target === key) return (row[header] ?? "").trim();
    }
    return "";
};
async function plan(db, input) {
    const sheet = input.sheet;
    const custom = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$custom$2d$fields$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["listCustomFields"])(db, "person");
    const customById = new Map(custom.map((f)=>[
            f.id,
            f
        ]));
    const index = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$match$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["buildMatchIndex"])(db);
    // Rows planned as creates are added to the index as they go, so the same
    // person appearing twice in one file is caught. A church's export often has a
    // row per household member per group, and without this an import of 500 rows
    // creates the same family four times.
    /*
   * R1.1. A church still being reviewed holds 25 members.
   *
   * The rows past that become skips here, in the plan, rather than an error
   * thrown halfway through the write. The person then sees on the Check step
   * exactly how many of their file goes in now, and the rest is a second import
   * once the church is approved, against a file they still have.
   */ const standing = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$provisional$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["churchStanding"])(db, input.tenantId);
    let room = standing.remaining ?? Number.POSITIVE_INFINITY;
    const rows = [];
    sheet.rows.forEach((row, i)=>{
        const planned = planRow(row, sheet.lineNumbers[i] ?? i + 2, input.mapping, input.strategy, index, customById);
        if (planned.outcome === "create" && room <= 0) {
            rows.push({
                ...planned,
                outcome: "skip",
                reason: "import.skip.capped",
                reasonParams: {
                    limit: String(standing.limit)
                }
            });
            return;
        }
        rows.push(planned);
        if (planned.outcome === "create") {
            room -= 1;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$match$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["indexNewPerson"])(index, {
                id: `${PLANNED}${planned.lineNumber}`,
                firstName: planned.person.firstName,
                lastName: planned.person.lastName,
                dateOfBirth: planned.person.dateOfBirth,
                email: planned.person.email,
                phone: planned.person.phone
            });
        }
    });
    const totals = {
        create: 0,
        update: 0,
        skip: 0,
        fail: 0
    };
    for (const r of rows)totals[r.outcome]++;
    return {
        filename: input.filename,
        headers: sheet.headers,
        mapping: input.mapping,
        strategy: input.strategy,
        rows,
        totals,
        cap: standing.approved ? undefined : {
            limit: standing.limit,
            room: standing.remaining ?? 0,
            held: standing.members
        }
    };
}
function planRow(source, lineNumber, mapping, strategy, index, custom) {
    const get = (key)=>value(source, mapping, key);
    const firstName = get("firstName");
    const lastName = get("lastName");
    const fail = (reason, params)=>({
            lineNumber,
            outcome: "fail",
            reason,
            reasonParams: params,
            person: {
                firstName,
                lastName,
                lifecycleStatus: "visitor"
            },
            tags: [],
            custom: {},
            matches: [],
            source
        });
    // A row with no name is not a person. Everything else can be filled in later.
    if (!firstName || !lastName) return fail("import.error.noName");
    const dates = {};
    for (const key of [
        "dateOfBirth",
        "membershipDate",
        "firstVisitOn"
    ]){
        const raw = get(key);
        if (!raw) continue;
        const parsed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["parseImportedDate"])(raw);
        if ("error" in parsed) {
            const field = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PERSON_FIELDS"].find((f)=>f.key === key);
            return fail("import.error.badDate", {
                field: field.label,
                value: raw
            });
        }
        dates[key] = parsed.value;
    }
    /*
   * R2.4. The address, from one column or from five.
   *
   * A Planning Center export carries the street, the city, the state and the
   * zip as their own columns; a spreadsheet a church typed itself usually has
   * one line. Both arrive here, and anything with no street at all is left off
   * rather than written as a city on its own.
   */ const line1 = get("address");
    const city = get("city");
    const region = get("region");
    const postalCode = get("postalCode");
    const line2 = get("addressLine2");
    const address = line1 && (city || region || postalCode || line2) ? {
        line1,
        line2: line2 || null,
        city: city || null,
        region: region || null,
        postalCode: postalCode || null
    } : line1 || null;
    const person = {
        firstName,
        lastName,
        preferredName: get("preferredName") || null,
        email: get("email") || null,
        phone: get("phone") || null,
        dateOfBirth: dates["dateOfBirth"] || null,
        membershipDate: dates["membershipDate"] || null,
        firstVisitOn: dates["firstVisitOn"] || null,
        lifecycleStatus: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["parseLifecycle"])(get("lifecycleStatus")),
        householdName: get("householdName") || null,
        householdRole: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["parseHouseholdRole"])(get("householdRole")),
        address,
        maritalStatus: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["parseMarital"])(get("maritalStatus")),
        schoolLevel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["parseSchoolLevel"])(get("schoolLevel")),
        allergies: get("allergies") || null,
        medicalNote: get("medicalNote") || null
    };
    const tagNames = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["splitValues"])(get("tags"));
    const customValues = {};
    for (const [header, target] of Object.entries(mapping)){
        if (!target.startsWith("cf:")) continue;
        const field = custom.get(target.slice(3));
        if (!field) continue;
        const raw = (source[header] ?? "").trim();
        const coerced = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$custom$2d$fields$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["coerceCustomValue"])(field, field.type === "multi_select" ? splitList(raw) : raw);
        if ("error" in coerced) return fail("import.error.badValue", {
            field: field.label,
            value: raw
        });
        customValues[field.id] = coerced.value;
    }
    const matches = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$match$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["findMatches"])(index, person);
    const strongest = matches[0];
    // A match against a row earlier in the same file. There is nothing to update,
    // because the person does not exist yet, so the only honest outcomes are skip
    // or create. The reason names the line so they can go and look at it.
    if (strongest?.memberId.startsWith(PLANNED) && strategy !== "create") {
        return {
            lineNumber,
            outcome: "skip",
            reason: "import.skip.duplicateInFile",
            reasonParams: {
                line: strongest.memberId.slice(PLANNED.length)
            },
            person,
            tags: tagNames,
            custom: customValues,
            matches: [],
            source
        };
    }
    if (strongest && !strongest.memberId.startsWith(PLANNED)) {
        if (strategy === "skip") {
            return {
                lineNumber,
                outcome: "skip",
                reason: "import.skip.duplicate",
                person,
                tags: tagNames,
                custom: customValues,
                matches,
                targetId: strongest.memberId,
                source
            };
        }
        if (strategy === "update") {
            // Only a match somebody could defend is written over. A shared surname or
            // a household phone is not enough to overwrite a record.
            if (strongest.confidence === "certain") {
                return {
                    lineNumber,
                    outcome: "update",
                    person,
                    tags: tagNames,
                    custom: customValues,
                    matches,
                    targetId: strongest.memberId,
                    source
                };
            }
            return {
                lineNumber,
                outcome: "skip",
                reason: "import.skip.unsure",
                person,
                tags: tagNames,
                custom: customValues,
                matches,
                targetId: strongest.memberId,
                source
            };
        }
    }
    return {
        lineNumber,
        outcome: "create",
        person,
        tags: tagNames,
        custom: customValues,
        matches,
        source
    };
}
/** "Vegetarian; Gluten free" and "Vegetarian, Gluten free" are both a list. */ const splitList = (raw)=>raw.split(/[;,|]/).map((v)=>v.trim()).filter(Boolean);
async function commit(db, actor, plan) {
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["canEditPeople"])(actor)) throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["PermissionError"](actor.role, "addPerson");
    const [batch] = await db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importBatches"]).values({
        tenantId: actor.tenantId,
        filename: plan.filename,
        status: "committed",
        mapping: plan.mapping,
        duplicateStrategy: plan.strategy,
        rowsTotal: plan.rows.length,
        startedByUserId: actor.userId ?? null,
        committedAt: new Date()
    }).returning({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importBatches"].id
    });
    if (!batch) throw new Error("Import batch insert returned no row.");
    const result = {
        batchId: batch.id,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0
    };
    for (const row of plan.rows){
        if (row.outcome === "fail" || row.outcome === "skip") {
            await record(db, actor, batch.id, row, null, null);
            if (row.outcome === "fail") result.failed++;
            else result.skipped++;
            continue;
        }
        if (row.outcome === "update" && row.targetId) {
            const before = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getPersonForEdit"])(db, row.targetId);
            // The plan was made against the church as it was. If the person has gone
            // since, the row becomes a skip rather than an error.
            if (!before) {
                await record(db, actor, batch.id, {
                    ...row,
                    outcome: "skip",
                    reason: "import.skip.vanished"
                }, null, null);
                result.skipped++;
                continue;
            }
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["updatePerson"])(db, actor, row.targetId, merged(before, row.person));
            await writeCustom(db, actor, row.targetId, row.custom);
            await writeTags(db, actor, row.targetId, row.tags);
            await record(db, actor, batch.id, row, row.targetId, before);
            result.updated++;
            continue;
        }
        const created = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createPerson"])(db, actor, row.person);
        await writeCustom(db, actor, created.id, row.custom);
        await writeTags(db, actor, created.id, row.tags);
        await record(db, actor, batch.id, row, created.id, null);
        result.created++;
    }
    await db.update(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importBatches"]).set({
        rowsCreated: result.created,
        rowsUpdated: result.updated,
        rowsSkipped: result.skipped,
        rowsFailed: result.failed
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importBatches"].id, batch.id));
    return result;
}
/**
 * An update fills gaps, it does not blank fields.
 *
 * A file with an empty phone column means "this file does not carry phone
 * numbers", not "delete every phone number". The second reading loses data the
 * church typed in by hand, and there is no way to tell the two apart from the
 * file, so the safe reading is the only one on offer.
 */ function merged(before, incoming) {
    const keep = (next, current)=>next === null || next === undefined || next === "" ? current ?? null : next;
    return {
        firstName: incoming.firstName || before.firstName,
        lastName: incoming.lastName || before.lastName,
        preferredName: keep(incoming.preferredName, before.preferredName),
        email: keep(incoming.email, before.email),
        phone: keep(incoming.phone, before.phone),
        dateOfBirth: keep(incoming.dateOfBirth, before.dateOfBirth),
        membershipDate: keep(incoming.membershipDate, before.membershipDate),
        firstVisitOn: keep(incoming.firstVisitOn, before.firstVisitOn),
        lifecycleStatus: incoming.lifecycleStatus,
        householdId: incoming.householdName ? null : before.householdId,
        householdName: incoming.householdName ?? null,
        householdRole: incoming.householdRole ?? before.householdRole
    };
}
/**
 * R2.3. The tags a row carries, applied to the person.
 *
 * Adding only. A file that does not mention a tag is a file that does not
 * mention it, and reading that as "take it off" loses what the church put on by
 * hand.
 */ async function writeTags(db, actor, memberId, names) {
    for (const name of names){
        const tag = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$tags$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureTag"])(db, actor, name);
        if (tag) await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$tags$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["setPersonTag"])(db, actor, memberId, tag.id, true);
    }
}
async function writeCustom(db, actor, memberId, values) {
    if (Object.keys(values).length === 0) return;
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$custom$2d$fields$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["setCustomValues"])(db, actor, "person", memberId, values);
}
async function record(db, actor, batchId, row, memberId, before) {
    await db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importRows"]).values({
        tenantId: actor.tenantId,
        batchId,
        lineNumber: row.lineNumber,
        outcome: row.outcome,
        memberId,
        reason: row.reason ?? null,
        before: before ?? null,
        source: row.source
    });
}
}),
"[project]/packages/db/src/import/rollback.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ROLLBACK_WINDOW_DAYS",
    ()=>ROLLBACK_WINDOW_DAYS,
    "listImports",
    ()=>listImports,
    "rollbackImport",
    ()=>rollbackImport
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/sql/expressions/conditions.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/sql/expressions/select.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/sql/sql.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/imports.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/members.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/roles.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/errors.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/members.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
const ROLLBACK_WINDOW_DAYS = 30;
const withinWindow = (committedAt)=>{
    if (!committedAt) return false;
    const age = Date.now() - committedAt.getTime();
    return age <= ROLLBACK_WINDOW_DAYS * 24 * 60 * 60 * 1000;
};
async function listImports(db) {
    const rows = await db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importBatches"]).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importBatches"].createdAt)).limit(50);
    return rows.map((b)=>({
            id: b.id,
            filename: b.filename,
            kind: b.kind,
            status: b.status,
            rowsCreated: b.rowsCreated,
            rowsUpdated: b.rowsUpdated,
            rowsSkipped: b.rowsSkipped,
            rowsFailed: b.rowsFailed,
            committedAt: b.committedAt,
            rolledBackAt: b.rolledBackAt,
            canRollBack: b.status === "committed" && withinWindow(b.committedAt)
        }));
}
/**
 * Undoes an import.
 *
 * A person the import created is removed. That is the one place in the product
 * where a person row is deleted outside a data subject request, and it is
 * deliberate: the row is not a record of somebody the church knows, it is a
 * record of a mistake, and archiving would leave four hundred of them sitting in
 * the archived view forever. The audit log and the import's own rows still hold
 * everything that was written, so nothing becomes unknowable.
 *
 * Unless somebody has touched them since. A person who was created by the import
 * and then edited, tagged, or written a note about has become real to the
 * church, so they are archived instead and counted separately. Deleting them
 * would throw away work that was not part of the mistake.
 *
 * A person the import updated is put back to the values recorded before it ran.
 */ /**
 * Has anybody worked on this person since the import created them?
 *
 * Compared against their own creation rather than against the batch's clock. A
 * row created and never edited has updated_at equal to created_at, exactly,
 * because Postgres gives both the same transaction timestamp. Comparing to the
 * batch instead needs a tolerance, and a tolerance is a guess.
 *
 * A note or a tag counts too. Neither touches the person row, and both mean
 * somebody has decided this person is real.
 */ async function touchedSince(db, person) {
    if (person.updatedAt.getTime() !== person.createdAt.getTime()) return true;
    const [{ n } = {
        n: 0
    }] = await db.execute(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`
    select (
      (select count(*) from notes where member_id = ${person.id}) +
      (select count(*) from member_tags where member_id = ${person.id})
    )::int as n`);
    return Number(n) > 0;
}
async function rollbackImport(db, actor, batchId) {
    // Rolling back can remove hundreds of members at once, so it sits with the
    // roles that may archive rather than with the roles that may edit.
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["canArchivePeople"])(actor)) throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["PermissionError"](actor.role, "rollbackImport");
    const [batch] = await db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importBatches"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importBatches"].id, batchId)).limit(1);
    if (!batch) throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["InvalidInputError"]("error.notFound.import");
    if (batch.kind === "groups") throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["InvalidInputError"]("import.rollback.wrongKind");
    if (batch.status !== "committed") throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["InvalidInputError"]("import.rollback.alreadyDone");
    if (!withinWindow(batch.committedAt)) throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["InvalidInputError"]("import.rollback.tooOld");
    const rows = await db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importRows"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importRows"].batchId, batchId), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`${__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importRows"].memberId} is not null`));
    const result = {
        removed: 0,
        restored: 0,
        archived: 0
    };
    for (const row of rows){
        if (!row.memberId) continue;
        if (row.outcome === "create") {
            const [current] = await db.select({
                id: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id,
                createdAt: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].createdAt,
                updatedAt: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].updatedAt
            }).from(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, row.memberId)).limit(1);
            if (!current) continue;
            if (await touchedSince(db, current)) {
                await db.update(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"]).set({
                    archivedAt: new Date(),
                    updatedAt: new Date()
                }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, row.memberId));
                result.archived++;
            } else {
                await db.delete(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, row.memberId));
                result.removed++;
            }
            continue;
        }
        if (row.outcome === "update" && row.before) {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["updatePerson"])(db, actor, row.memberId, row.before);
            result.restored++;
        }
    }
    await db.update(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importBatches"]).set({
        status: "rolled_back",
        rolledBackAt: new Date()
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importBatches"].id, batchId));
    return result;
}
}),
"[project]/packages/db/src/demo/members.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * R19.7. The demo church.
 *
 * Realistic rather than tidy, because a church looking at a product needs to
 * see what their own list will look like: a household with a missing phone
 * number, a visitor nobody has followed up, a widower on his own, a student who
 * comes home in the summer. A demo of perfect records teaches nothing.
 *
 * American names and a Texas area code, since this ships in the US first.
 */ __turbopack_context__.s([
    "DEMO_PEOPLE",
    ()=>DEMO_PEOPLE,
    "DEMO_TAGS",
    ()=>DEMO_TAGS
]);
const DEMO_TAGS = [
    {
        name: "Choir",
        hue: "violet"
    },
    {
        name: "Greeter",
        hue: "amber"
    },
    {
        name: "Needs a ride",
        hue: "rose"
    },
    {
        name: "Nursery volunteer",
        hue: "teal"
    },
    {
        name: "Small group leader",
        hue: "fern"
    }
];
const DEMO_PEOPLE = [
    {
        firstName: "Daniel",
        lastName: "Harrison",
        dateOfBirth: "1979-03-14",
        status: "member",
        membershipDate: "2011-09-04",
        email: "daniel.harrison@example.org",
        phone: "(512) 555 0142",
        household: "Harrison",
        householdRole: "head",
        tags: [
            "Small group leader"
        ],
        milestones: [
            {
                kind: "baptism",
                on: "2011-06-12"
            },
            {
                kind: "membership_class",
                on: "2011-08-21"
            }
        ]
    },
    {
        firstName: "Rebecca",
        lastName: "Harrison",
        dateOfBirth: "1981-07-02",
        status: "member",
        membershipDate: "2011-09-04",
        email: "rebecca.harrison@example.org",
        phone: "(512) 555 0143",
        household: "Harrison",
        householdRole: "spouse",
        tags: [
            "Choir"
        ],
        relationships: [
            {
                to: "Daniel Harrison",
                kind: "spouse"
            }
        ]
    },
    {
        firstName: "Caleb",
        lastName: "Harrison",
        dateOfBirth: "2012-11-08",
        status: "member",
        household: "Harrison",
        householdRole: "child",
        milestones: [
            {
                kind: "child_dedication",
                on: "2013-03-10"
            }
        ],
        relationships: [
            {
                to: "Daniel Harrison",
                kind: "parent"
            },
            {
                to: "Rebecca Harrison",
                kind: "parent"
            }
        ]
    },
    {
        firstName: "Hannah",
        lastName: "Harrison",
        dateOfBirth: "2015-02-19",
        status: "member",
        household: "Harrison",
        householdRole: "child",
        relationships: [
            {
                to: "Daniel Harrison",
                kind: "parent"
            },
            {
                to: "Rebecca Harrison",
                kind: "parent"
            }
        ]
    },
    {
        firstName: "Micah",
        lastName: "Harrison",
        dateOfBirth: "2019-06-30",
        status: "member",
        household: "Harrison",
        householdRole: "child",
        relationships: [
            {
                to: "Rebecca Harrison",
                kind: "parent"
            }
        ]
    },
    {
        firstName: "Angela",
        lastName: "Whitfield",
        dateOfBirth: "1986-01-25",
        status: "member",
        membershipDate: "2018-02-11",
        email: "angela.whitfield@example.org",
        phone: "(512) 555 0188",
        household: "Whitfield",
        householdRole: "head",
        tags: [
            "Nursery volunteer"
        ]
    },
    {
        firstName: "Jonah",
        lastName: "Whitfield",
        dateOfBirth: "2014-09-12",
        status: "member",
        household: "Whitfield",
        householdRole: "child",
        relationships: [
            {
                to: "Angela Whitfield",
                kind: "parent"
            }
        ]
    },
    {
        firstName: "Dorothy",
        lastName: "Whitfield",
        preferredName: "Dot",
        dateOfBirth: "1944-05-03",
        status: "member",
        membershipDate: "1998-04-05",
        phone: "(512) 555 0190",
        household: "Whitfield (Dorothy)",
        householdRole: "head",
        tags: [
            "Needs a ride"
        ],
        relationships: [
            {
                to: "Angela Whitfield",
                kind: "child"
            }
        ]
    },
    {
        firstName: "Marcus",
        lastName: "Flores",
        dateOfBirth: "1990-10-17",
        status: "member",
        membershipDate: "2025-03-16",
        email: "marcus.flores@example.org",
        phone: "(512) 555 0211",
        household: "Flores",
        householdRole: "head",
        tags: [
            "Greeter"
        ],
        milestones: [
            {
                kind: "baptism",
                on: "2025-02-09"
            }
        ]
    },
    {
        firstName: "Priya",
        lastName: "Flores",
        dateOfBirth: "1992-04-08",
        status: "member",
        membershipDate: "2025-03-16",
        email: "priya.flores@example.org",
        household: "Flores",
        householdRole: "spouse",
        tags: [
            "Greeter"
        ],
        relationships: [
            {
                to: "Marcus Flores",
                kind: "spouse"
            }
        ]
    },
    {
        firstName: "Thomas",
        lastName: "Brennan",
        dateOfBirth: "1968-12-01",
        status: "regular_attender",
        firstVisitOn: "2022-01-09",
        email: "tbrennan@example.org",
        phone: "(512) 555 0164",
        household: "Brennan",
        householdRole: "head"
    },
    {
        firstName: "Susan",
        lastName: "Brennan",
        dateOfBirth: "1970-08-23",
        status: "regular_attender",
        firstVisitOn: "2022-01-09",
        household: "Brennan",
        householdRole: "spouse",
        tags: [
            "Choir"
        ],
        relationships: [
            {
                to: "Thomas Brennan",
                kind: "spouse"
            }
        ]
    },
    {
        firstName: "Elena",
        lastName: "Reyes",
        dateOfBirth: "1977-06-15",
        status: "member",
        membershipDate: "2009-10-11",
        email: "elena.reyes@example.org",
        phone: "(512) 555 0175",
        household: "Reyes",
        householdRole: "head"
    },
    {
        firstName: "Olivia",
        lastName: "Reyes",
        dateOfBirth: "2005-03-27",
        status: "member",
        membershipDate: "2021-05-23",
        email: "olivia.reyes@example.org",
        household: "Reyes",
        householdRole: "child",
        tags: [
            "Choir"
        ],
        milestones: [
            {
                kind: "confirmation",
                on: "2021-05-23"
            }
        ],
        relationships: [
            {
                to: "Elena Reyes",
                kind: "parent"
            }
        ]
    },
    {
        firstName: "Nathan",
        lastName: "Pruitt",
        status: "visitor",
        firstVisitOn: "2026-09-13",
        email: "nathan.pruitt@example.org"
    },
    {
        firstName: "Kayla",
        lastName: "Osborne",
        status: "visitor",
        firstVisitOn: "2026-09-20",
        phone: "(512) 555 0233"
    },
    {
        firstName: "Gregory",
        lastName: "Tanaka",
        status: "visitor",
        firstVisitOn: "2026-09-27",
        email: "greg.tanaka@example.org",
        phone: "(512) 555 0247"
    },
    {
        firstName: "Vincent",
        lastName: "Doyle",
        dateOfBirth: "1983-02-11",
        status: "inactive",
        membershipDate: "2016-06-05",
        email: "vdoyle@example.org"
    },
    {
        firstName: "Charlotte",
        lastName: "Mercer",
        dateOfBirth: "1958-09-09",
        status: "inactive",
        membershipDate: "2004-01-18",
        phone: "(512) 555 0119"
    },
    {
        firstName: "Raymond",
        lastName: "Kessler",
        dateOfBirth: "1949-11-22",
        status: "member",
        membershipDate: "1995-03-12",
        phone: "(512) 555 0126",
        household: "Kessler",
        householdRole: "head",
        tags: [
            "Needs a ride"
        ]
    },
    {
        firstName: "Joan",
        lastName: "Kessler",
        dateOfBirth: "1951-04-30",
        status: "inactive",
        membershipDate: "1995-03-12",
        household: "Kessler",
        householdRole: "spouse",
        milestones: [
            {
                kind: "death",
                on: "2025-11-04"
            }
        ],
        relationships: [
            {
                to: "Raymond Kessler",
                kind: "spouse"
            }
        ]
    }
];
}),
"[project]/packages/db/src/demo/load.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "demoState",
    ()=>demoState,
    "loadDemoData",
    ()=>loadDemoData,
    "removeDemoData",
    ()=>removeDemoData
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/sql/expressions/conditions.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/sql/sql.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$gatherings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/gatherings.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$checkin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/checkin.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/groups.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/members.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/members.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$tags$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/tags.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$milestones$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/milestones.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$relationships$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/relationships.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$church$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/church.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$services$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/services.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$attendance$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/attendance.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$rooms$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/repo/rooms.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$age$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/age.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$stations$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/stations.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$checkin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/checkin.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/groups.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$followups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/followups.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$serving$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/serving.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/roles.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/errors.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$demo$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/demo/members.ts [app-rsc] (ecmascript)");
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
;
;
;
;
;
;
;
async function demoState(db) {
    const [row] = await db.select({
        n: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`count(*) filter (where ${__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["demoRecords"].entity} = 'person')`
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["demoRecords"]);
    const count = Number(row?.n ?? 0);
    return {
        loaded: count > 0,
        members: count
    };
}
async function loadDemoData(db, actor) {
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$church$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["canManageChurch"])(actor)) throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["PermissionError"](actor.role, "manageDemoData");
    if ((await demoState(db)).loaded) throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["InvalidInputError"]("demo.error.alreadyLoaded");
    const remember = async (entity, recordId)=>{
        await db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["demoRecords"]).values({
            tenantId: actor.tenantId,
            entity,
            recordId
        });
    };
    // Before any person, because recording a baptism enters that person into the
    // baptism pipeline and the pipeline has to be there to enter.
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$followups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["seedPipelines"])(db, actor);
    const tagIds = new Map();
    for (const tag of __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$demo$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["DEMO_TAGS"]){
        const created = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$tags$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createTag"])(db, actor, {
            name: tag.name,
            hue: tag.hue
        });
        tagIds.set(tag.name, created.id);
        await remember("tag", created.id);
    }
    // Households are created by name on the first person who lives in one, so the
    // second person in a household has to be given the id rather than the name.
    const householdIds = new Map();
    const personIds = new Map();
    for (const person of __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$demo$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["DEMO_PEOPLE"]){
        const existing = person.household ? householdIds.get(person.household) : undefined;
        const created = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createPerson"])(db, actor, {
            firstName: person.firstName,
            lastName: person.lastName,
            preferredName: person.preferredName ?? null,
            dateOfBirth: person.dateOfBirth ?? null,
            lifecycleStatus: person.status,
            membershipDate: person.membershipDate ?? null,
            firstVisitOn: person.firstVisitOn ?? null,
            email: person.email ?? null,
            phone: person.phone ?? null,
            householdId: existing ?? null,
            householdName: existing ? null : person.household ?? null,
            householdRole: person.householdRole ?? "other"
        });
        personIds.set(`${person.firstName} ${person.lastName}`, created.id);
        await remember("person", created.id);
        if (person.household && !existing) {
            const [row] = await db.select({
                id: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["households"].id
            }).from(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["households"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["households"].name, person.household)).limit(1);
            if (row) {
                householdIds.set(person.household, row.id);
                await remember("household", row.id);
            }
        }
        for (const name of person.tags ?? []){
            const tagId = tagIds.get(name);
            if (tagId) await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$tags$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["setPersonTag"])(db, actor, created.id, tagId, true);
        }
        for (const milestone of person.milestones ?? []){
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$milestones$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addMilestone"])(db, actor, {
                memberId: created.id,
                kind: milestone.kind,
                occurredOn: milestone.on
            });
        }
    }
    // Relationships last, because both members have to exist first.
    for (const person of __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$demo$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["DEMO_PEOPLE"]){
        const id = personIds.get(`${person.firstName} ${person.lastName}`);
        if (!id) continue;
        for (const relation of person.relationships ?? []){
            const other = personIds.get(relation.to);
            if (!other) continue;
            try {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$relationships$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addRelationship"])(db, actor, {
                    memberId: id,
                    relatedMemberId: other,
                    kind: relation.kind
                });
            } catch (error) {
                // The inverse of a relationship already written is a duplicate, which
                // is the right answer rather than a failure.
                if (!(error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["InvalidInputError"])) throw error;
            }
        }
    }
    await loadServices(db, actor, remember, [
        ...personIds.values()
    ]);
    return demoState(db);
}
/** A weekday, as an ISO date, counting back from today. */ const daysAgo = (n)=>{
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
};
/**
 * The rest of what an owner sees: a calendar, attendance against it, the rooms
 * children are checked into, and a station.
 *
 * A demo that is a directory beside four empty screens shows a church nothing
 * about whether the product suits them. Everything here is written through the
 * same functions the product uses, so a demo cannot drift into showing
 * something the church would not get.
 */ async function loadServices(db, actor, remember, members) {
    const pattern = [
        {
            name: "First service",
            dayOfWeek: 0,
            startsAt: "09:00"
        },
        {
            name: "Second service",
            dayOfWeek: 0,
            startsAt: "11:00"
        },
        {
            name: "Midweek",
            dayOfWeek: 3,
            startsAt: "19:00"
        }
    ];
    for (const time of pattern){
        const created = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$church$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addServiceTime"])(db, actor, time);
        await remember("serviceTime", created.id);
    }
    // Ten weeks back and four forward, so the page opens on a month with both a
    // history to read and something still to come.
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$services$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["generateOccurrences"])(db, actor, {
        from: daysAgo(70),
        to: daysAgo(-28)
    });
    const held = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$services$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["listOccurrences"])(db, {
        from: daysAgo(70),
        to: daysAgo(1)
    })).sort((a, b)=>a.occursOn.localeCompare(b.occursOn));
    for (const [index, occurrence] of held.entries()){
        const midweek = occurrence.startsAt >= "18:00";
        // A visitor is waiting while this runs, and every service written is
        // another round trip. Four weeks of records is enough to read.
        if (occurrence.occursOn < daysAgo(28)) continue;
        // Names at the main service, a headcount midweek, which is how a church this size
        // actually records the two.
        if (!midweek) {
            // A different two thirds each week, rather than the same list every
            // time.
            const present = members.filter((_, i)=>(i + index) % 3 !== 0);
            if (present.length) await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$attendance$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["setPresentMany"])(db, actor, occurrence.id, present, true);
        }
        if (midweek) {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$services$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["setHeadcount"])(db, actor, occurrence.id, {
                adults: 40 + index % 7 * 3,
                children: 12 + index % 4,
                visitors: index % 3,
                note: null
            });
        }
    }
    const rooms = [
        {
            name: "Nursery",
            hue: "amber",
            minAgeMonths: 0,
            maxAgeMonths: 24,
            capacity: 12,
            ratio: 4
        },
        {
            name: "Toddlers",
            hue: "fern",
            minAgeMonths: 24,
            maxAgeMonths: 48,
            capacity: 16,
            ratio: 5
        },
        {
            name: "Kids",
            hue: "sky",
            minAgeMonths: 48,
            maxAgeMonths: 144,
            capacity: 30,
            ratio: 8
        },
        {
            name: "Youth",
            hue: "violet",
            minAgeMonths: 144,
            maxAgeMonths: 216,
            capacity: 25,
            ratio: 10
        }
    ];
    const roomIds = [];
    for (const room of rooms){
        const created = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$rooms$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["addRoom"])(db, actor, room);
        roomIds.push(created.id);
        await remember("room", created.id);
    }
    const station = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$stations$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addStation"])(db, actor, {
        name: "Foyer desk",
        mode: "desk",
        printer: "paper",
        roomIds: [],
        serviceTimeIds: []
    });
    await remember("station", station.id);
    await loadTodaysService(db, actor, remember, station.id, roomIds, members);
    await loadGroups(db, actor, remember, members);
    await loadServing(db, actor, members);
}
/**
 * R10.1. People on the teams the church already has.
 *
 * The teams themselves come with the church, so nothing here is remembered as
 * a demo record: emptying the demo takes the roster off and leaves the teams,
 * which is what a church wants, since they will use them.
 */ async function loadServing(db, actor, everyone) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$serving$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["seedTeams"])(db, actor);
    const wanted = [
        "Worship",
        "Production",
        "Welcome"
    ];
    const teams = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$serving$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["listTeams"])(db)).filter((t)=>wanted.includes(t.name));
    let at = 0;
    for (const summary of teams){
        const team = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$serving$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getTeam"])(db, summary.id);
        if (!team) continue;
        // Three a team, the first of them leading it, each playing one position.
        for(let i = 0; i < 3 && at < everyone.length; i += 1, at += 1){
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$serving$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addToTeam"])(db, actor, {
                teamId: team.id,
                memberId: everyone[at],
                role: i === 0 ? "leader" : "member",
                positionIds: team.positions[i] ? [
                    team.positions[i].id
                ] : []
            });
        }
    }
}
/**
 * R9.1 to R9.4. Two groups, with the members who are in them.
 *
 * Two rather than ten, because a demo full of groups nobody can read teaches a
 * church less than two they can open and understand.
 */ async function loadGroups(db, actor, remember, everyone) {
    const types = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["seedGroupTypes"])(db, actor);
    const small = types.find((t)=>t.name === "Small group") ?? types[0];
    const team = types.find((t)=>t.name === "Ministry team") ?? types[0];
    const tuesday = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createGroup"])(db, actor, {
        name: "Tuesday night",
        description: "A small group that meets in the Hall.",
        typeId: small?.id ?? null,
        dayOfWeek: 2,
        startsAt: "19:30",
        frequency: "weekly",
        location: "The Hall",
        capacity: 14
    });
    await remember("group", tuesday.id);
    const welcome = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createGroup"])(db, actor, {
        name: "Welcome team",
        description: "On the door before each service.",
        typeId: team?.id ?? null,
        dayOfWeek: 0,
        startsAt: "08:30",
        frequency: "weekly",
        location: "The foyer"
    });
    await remember("group", welcome.id);
    for (const [index, memberId] of everyone.slice(0, 9).entries()){
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addToGroup"])(db, actor, {
            groupId: index % 2 === 0 ? tuesday.id : welcome.id,
            memberId,
            role: index < 2 ? "leader" : "member"
        });
    }
}
/**
 * A service happening today, with children in rooms.
 *
 * Without it a visitor arriving on a Tuesday opens check-in and the supervisor
 * board and sees two empty screens with nothing wrong, which reads as the
 * product not working. The service is written through the same functions a
 * church uses, so what the demo shows is what a church would get.
 */ async function loadTodaysService(db, actor, remember, stationId, roomIds, everyone) {
    const today = daysAgo(0);
    const occurrence = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$services$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addSpecialService"])(db, actor, {
        name: "Morning gathering",
        occursOn: today,
        startsAt: "09:00",
        note: null
    });
    await remember("occurrence", occurrence.id);
    const rows = await db.select({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id,
        dateOfBirth: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`${__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].dateOfBirth}::text`
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, everyone));
    const months = (dob)=>dob ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$age$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ageInMonths"])(dob, today) : null;
    const children = rows.filter((r)=>{
        const age = months(r.dateOfBirth);
        return age !== null && age < 18 * 12;
    });
    const adults = rows.filter((r)=>{
        const age = months(r.dateOfBirth);
        return age === null || age >= 18 * 12;
    });
    const roomFor = (index)=>roomIds[index % roomIds.length] ?? null;
    const entries = [
        ...children.slice(0, 8).map((child, i)=>({
                memberId: child.id,
                roomId: roomFor(i),
                child: true
            })),
        // Adults on the attendance, wearing a name badge, in no class.
        ...adults.slice(0, 3).map((adult)=>({
                memberId: adult.id,
                roomId: null,
                child: false
            }))
    ];
    if (entries.length > 0) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$checkin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["checkInFamily"])(db, actor, {
            occurrenceId: occurrence.id,
            stationId,
            entries
        });
    }
}
async function removeDemoData(db, actor) {
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$church$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["canManageChurch"])(actor)) throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["PermissionError"](actor.role, "manageDemoData");
    const rows = await db.select({
        entity: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["demoRecords"].entity,
        recordId: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["demoRecords"].recordId
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["demoRecords"]);
    const ids = (entity)=>rows.filter((r)=>r.entity === entity).map((r)=>r.recordId);
    const personIds = ids("person");
    const householdIds = ids("household");
    const tagIds = ids("tag");
    const serviceTimeIds = ids("serviceTime");
    const occurrenceIds = ids("occurrence");
    const groupIds = ids("group");
    const roomIds = ids("room");
    const stationIds = ids("station");
    // People first. Their contacts, tags, milestones, relationships and notes go
    // with them through the foreign keys.
    const gonePeople = personIds.length ? await db.delete(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, personIds)).returning({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id
    }) : [];
    const goneTags = tagIds.length ? await db.delete(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tags"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tags"].id, tagIds)).returning({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tags"].id
    }) : [];
    const goneHouseholds = householdIds.length ? await db.delete(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["households"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["households"].id, householdIds)).returning({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["households"].id
    }) : [];
    // The calendar and the rooms. Occurrences and attendance go with the service
    // time through the foreign keys, and so do a station's rooms and services.
    // A one-off service has no service time behind it, so it is named here, and
    // the check-in visits against it go with it.
    if (occurrenceIds.length) {
        await db.delete(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$gatherings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["serviceOccurrences"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$gatherings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["serviceOccurrences"].id, occurrenceIds));
    }
    if (groupIds.length) {
        await db.delete(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groups"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groups"].id, groupIds));
    }
    if (stationIds.length) {
        await db.delete(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$checkin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["checkinStations"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$checkin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["checkinStations"].id, stationIds));
    }
    if (roomIds.length) {
        await db.delete(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$checkin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["checkinRooms"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$checkin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["checkinRooms"].id, roomIds));
    }
    if (serviceTimeIds.length) {
        await db.delete(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$gatherings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["serviceOccurrences"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$gatherings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["serviceOccurrences"].serviceTimeId, serviceTimeIds));
        await db.delete(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["serviceTimes"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["serviceTimes"].id, serviceTimeIds));
    }
    await db.delete(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["demoRecords"]);
    return {
        members: gonePeople.length,
        households: goneHouseholds.length,
        tags: goneTags.length
    };
}
}),
"[project]/packages/db/src/demo/church.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEMO_LIFETIME_HOURS",
    ()=>DEMO_LIFETIME_HOURS,
    "DEMO_POOL_TARGET",
    ()=>DEMO_POOL_TARGET,
    "createDemoChurch",
    ()=>createDemoChurch,
    "demoChurchInfo",
    ()=>demoChurchInfo,
    "demoMembership",
    ()=>demoMembership,
    "sweepExpiredDemos",
    ()=>sweepExpiredDemos,
    "topUpDemoPool",
    ()=>topUpDemoPool
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$client$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/client.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$maintenance$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/maintenance.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$demo$2f$load$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/demo/load.ts [app-rsc] (ecmascript)");
;
;
;
const DEMO_LIFETIME_HOURS = 24;
const DEMO_POOL_TARGET = 2;
/** How long an unclaimed church waits before the sweep takes it. */ const POOL_LIFETIME_HOURS = 24 * 7;
const suffix = ()=>Math.random().toString(36).slice(2, 8);
/**
 * Builds a demo church for one visitor and fills it.
 *
 * Runs as the owner connection rather than through createChurch, because the
 * visitor has no verified email address and never will: an anonymous sign-in is
 * the whole point. The Owner role they get is over a church that holds nothing
 * but invented members and disappears tomorrow.
 */ const DEMO_NAME = "Grace Community Church";
/**
 * Builds one demo church and leaves it unclaimed.
 *
 * Runs as the owner connection rather than through createChurch, because a demo
 * visitor has no verified email address and never will: an anonymous sign-in is
 * the whole point. The Owner role they are given is over a church that holds
 * invented members and disappears tomorrow.
 */ async function buildDemoChurch() {
    const slug = `demo-${suffix()}`;
    const sql = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$client$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["owner"])();
    const [tenant] = await sql`
    insert into tenants (slug, name, timezone, demo_expires_at)
    values (
      ${slug}, ${DEMO_NAME}, 'America/Chicago',
      ${new Date(Date.now() + POOL_LIFETIME_HOURS * 60 * 60 * 1000)}
    )
    returning id`;
    const tenantId = tenant.id;
    await sql`
    insert into campuses (tenant_id, name, is_primary)
    values (${tenantId}, ${DEMO_NAME}, true)`;
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$client$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["withTenant"])({
        tenantId,
        role: "owner"
    }, (db)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$demo$2f$load$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadDemoData"])(db, {
            tenantId,
            role: "owner"
        }));
    return {
        tenantId,
        slug
    };
}
async function createDemoChurch(userId) {
    await sweepExpiredDemos();
    const expiresAt = new Date(Date.now() + DEMO_LIFETIME_HOURS * 60 * 60 * 1000);
    const sql = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$client$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["owner"])();
    const taken = await sql.begin(async (tx)=>{
        const [waiting] = await tx`
      select id, slug from tenants
       where demo_expires_at is not null
         and demo_claimed_at is null
       order by created_at
       limit 1
         for update skip locked`;
        if (!waiting) return null;
        await tx`
      update tenants
         set demo_claimed_at = now(), demo_expires_at = ${expiresAt}
       where id = ${waiting.id}`;
        await tx`
      insert into app_users (id, email, full_name)
      values (${userId}, ${`${waiting.slug}@demo.invalid`}, 'Demo visitor')
      on conflict (id) do nothing`;
        await tx`
      insert into tenant_members (tenant_id, user_id, role)
      values (${waiting.id}, ${userId}, 'owner')`;
        return waiting;
    });
    if (taken) {
        return {
            tenantId: taken.id,
            slug: taken.slug,
            name: DEMO_NAME,
            expiresAt
        };
    }
    const built = await buildDemoChurch();
    await sql.begin(async (tx)=>{
        await tx`
      update tenants
         set demo_claimed_at = now(), demo_expires_at = ${expiresAt}
       where id = ${built.tenantId}`;
        await tx`
      insert into app_users (id, email, full_name)
      values (${userId}, ${`${built.slug}@demo.invalid`}, 'Demo visitor')
      on conflict (id) do nothing`;
        await tx`
      insert into tenant_members (tenant_id, user_id, role)
      values (${built.tenantId}, ${userId}, 'owner')`;
    });
    return {
        tenantId: built.tenantId,
        slug: built.slug,
        name: DEMO_NAME,
        expiresAt
    };
}
async function topUpDemoPool(target = DEMO_POOL_TARGET) {
    const [row] = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$client$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["owner"])()`
    select count(*) as n from tenants
     where demo_expires_at is not null and demo_claimed_at is null`;
    let built = 0;
    for(let waiting = Number(row?.n ?? 0); waiting < target; waiting += 1){
        await buildDemoChurch();
        built += 1;
    }
    return built;
}
async function demoChurchInfo(tenantId) {
    const rows = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$client$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["owner"])()`
    select demo_expires_at from tenants where id = ${tenantId}`;
    const expiresAt = rows[0]?.demo_expires_at ?? null;
    return {
        isDemo: expiresAt !== null,
        expiresAt
    };
}
async function sweepExpiredDemos() {
    // Asked before anything is disabled. Taking the triggers off locks every
    // audited table, and the answer is almost always that there is nothing to
    // sweep, so paying that on every visitor is paying it for nothing.
    const [row] = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$client$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["owner"])()`
    select count(*) as n from tenants
     where demo_expires_at is not null and demo_expires_at < now()`;
    if (Number(row?.n ?? 0) === 0) return 0;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$maintenance$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["withAuditTriggersOff"])(async (sql)=>{
        const gone = await sql`
      delete from tenants
      where demo_expires_at is not null and demo_expires_at < now()
      returning id`;
        return gone.length;
    });
}
async function demoMembership(tenantId, userId) {
    const rows = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$client$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["owner"])()`
    select t.id, t.slug, t.name, t.demo_expires_at
    from tenants t
    join tenant_members m on m.tenant_id = t.id and m.user_id = ${userId}
    where t.id = ${tenantId}
      and t.demo_expires_at is not null
      and t.demo_expires_at > now()
    limit 1`;
    const row = rows[0];
    if (!row) return null;
    return {
        tenantId: row.id,
        slug: row.slug,
        name: row.name,
        expiresAt: row.demo_expires_at
    };
}
}),
"[project]/packages/db/src/maintenance.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "deleteTenants",
    ()=>deleteTenants,
    "deleteTenantsLike",
    ()=>deleteTenantsLike,
    "withAuditTriggersOff",
    ()=>withAuditTriggersOff
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$client$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/client.ts [app-rsc] (ecmascript) <locals>");
;
async function withAuditTriggersOff(work) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$client$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["owner"])().begin(async (tx)=>{
        await tx`select set_config('app.audit_off', '1', true)`;
        return work(tx);
    });
}
async function deleteTenants(slugs) {
    if (slugs.length === 0) return;
    await withAuditTriggersOff(async (sql)=>{
        await sql`delete from tenants where slug in ${sql(slugs)}`;
    });
}
async function deleteTenantsLike(prefix) {
    await withAuditTriggersOff(async (sql)=>{
        await sql`delete from tenants where slug like ${prefix + "%"}`;
    });
}
}),
"[project]/packages/db/src/export/csv.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Writing CSV, which is the other half of reading it.
 *
 * Excel opens a UTF-8 file as the local codepage unless it finds a byte order
 * mark, so a church in Texas exporting a member called Zoë gets Zoë back. The
 * BOM is three bytes and removes an entire category of support email.
 */ /** Quoted when the value carries a delimiter, a quote, a newline, or edge space. */ __turbopack_context__.s([
    "CSV_BOM",
    ()=>CSV_BOM,
    "toCsv",
    ()=>toCsv
]);
const needsQuoting = (value)=>/[",\n\r]/.test(value) || value !== value.trim();
const escape = (value)=>{
    if (value === null || value === undefined) return "";
    const raw = value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value);
    // A cell beginning with one of these is treated as a formula by Excel, Numbers
    // and Sheets. Prefixing with an apostrophe keeps it a string. A church's own
    // data should never execute when they open their own export.
    const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return needsQuoting(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const CSV_BOM = "﻿";
function toCsv(rows, columns) {
    const headers = columns ?? [
        ...new Set(rows.flatMap((r)=>Object.keys(r)))
    ];
    if (headers.length === 0) return CSV_BOM;
    const lines = [
        headers.map(escape).join(",")
    ];
    for (const row of rows)lines.push(headers.map((h)=>escape(row[h])).join(","));
    // CRLF, because that is what every spreadsheet writes and some still expect.
    return CSV_BOM + lines.join("\r\n") + "\r\n";
}
}),
"[project]/packages/db/src/export/archive.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ARCHIVE_FORMAT",
    ()=>ARCHIVE_FORMAT,
    "EXPORT_TABLES",
    ()=>TABLES,
    "buildArchive",
    ()=>buildArchive
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/sql/sql.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/roles.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$crypto$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/crypto.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$export$2f$csv$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/export/csv.ts [app-rsc] (ecmascript)");
;
;
;
;
/**
 * R19.8. A complete export of everything, one click, always available.
 *
 * This is not a feature, it is the trust mechanism. The whole free-forever
 * argument rests on a church being able to leave whenever they want, and a
 * promise they cannot test is not worth anything. So: no plan gate, no support
 * ticket, no delay, and open formats a spreadsheet can open.
 *
 * Written so that what comes out could be read back in. Every table carries its
 * own ids, so the relationships survive the round trip rather than being flattened
 * into something only a human can interpret.
 */ /** Every table that holds this church's data. Order is the order it is written. */ const TABLES = [
    "tenants",
    "campuses",
    "locations",
    "rooms",
    "service_times",
    "service_occurrences",
    "attendance_records",
    "checkin_rooms",
    "checkin_stations",
    "checkin_station_rooms",
    "checkin_station_services",
    "checkin_visits",
    "checkin_overrides",
    "checkin_codes",
    "checkin_offline_events",
    "incident_reports",
    "group_types",
    "groups",
    "group_memberships",
    "group_meetings",
    "group_attendance",
    "group_join_requests",
    "pipelines",
    "pipeline_steps",
    "pipeline_entries",
    "follow_ups",
    "directory_preferences",
    "saved_lists",
    "saved_list_members",
    "teams",
    "team_positions",
    "team_members",
    "team_member_positions",
    "serving_assignments",
    "blockout_dates",
    "serving_preferences",
    "service_plans",
    "plan_items",
    "plan_item_notes",
    "plan_item_files",
    "plan_templates",
    "plan_template_items",
    "forms",
    "form_fields",
    "form_submissions",
    "stored_files",
    "demo_records",
    "tenant_members",
    "invitations",
    "households",
    "members",
    "household_memberships",
    "contact_methods",
    "addresses",
    "relationships",
    "milestones",
    "background_checks",
    "tags",
    "member_tags",
    "custom_fields",
    "custom_field_values",
    "notes",
    "import_batches",
    "import_rows",
    "person_merges",
    "tenant_roles",
    "notifications",
    "audit_entries"
];
const ARCHIVE_FORMAT = 1;
async function buildArchive(db, actor, church) {
    // Exporting hands over every record the church holds in one file. That is the
    // point, and it is also why it is not something any role can do unprompted.
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["canArchivePeople"])(actor)) throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["PermissionError"](actor.role, "exportEverything");
    const data = {};
    const counts = {};
    const withheld = [];
    for (const table of TABLES){
        // No tenant predicate. Row-level security supplies it, so a table added
        // later is scoped by the policy rather than by remembering to filter here.
        const rows = await db.execute(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`select * from ${__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"].identifier(table)}`);
        const cleaned = rows.map((row)=>clean(table, row, actor.role, withheld));
        data[table] = cleaned;
        counts[table] = cleaned.length;
    }
    const csv = {};
    for (const [table, rows] of Object.entries(data))csv[table] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$export$2f$csv$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toCsv"])(rows);
    return {
        data,
        csv,
        meta: {
            exportedAt: new Date().toISOString(),
            church: church.name,
            format: ARCHIVE_FORMAT,
            counts,
            withheld: [
                ...new Set(withheld)
            ]
        }
    };
}
/**
 * Field-level permissions apply to an export exactly as they apply to a screen
 * (R1.5, R21.2). An export is the easiest place in any product to leak a
 * restricted field, because it is one query and nobody is looking at the output.
 *
 * A confidential note is decrypted for a role that may read it, because it is
 * the church's own data and ciphertext they cannot open is not an export. For
 * every other role the body is absent, and the withholding is declared in the
 * archive's metadata rather than left to be noticed.
 */ function clean(table, row, role, withheld) {
    if (table !== "notes") return row;
    const out = {
        ...row
    };
    const encrypted = out["body_encrypted"];
    delete out["body_encrypted"];
    if (out["classification"] !== "confidential") return out;
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["canReadConfidentialNotes"])(role)) {
        out["body"] = typeof encrypted === "string" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$crypto$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["decryptNote"])(encrypted) : out["body"];
        return out;
    }
    delete out["body"];
    out["restricted"] = true;
    withheld.push("notes.body");
    return out;
}
;
}),
"[project]/packages/db/src/export/views.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EXPORT_VIEWS",
    ()=>EXPORT_VIEWS,
    "buildView",
    ()=>buildView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/sql/sql.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/roles.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$export$2f$csv$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/export/csv.ts [app-rsc] (ecmascript)");
;
;
;
const VIEWS = [
    {
        key: "members",
        columns: [
            "name",
            "first_name",
            "last_name",
            "preferred_name",
            "status",
            "household",
            "household_role",
            "email",
            "phone",
            "address",
            "date_of_birth",
            "gender",
            "marital_status",
            "member_since",
            "first_visit",
            "campus",
            "tags",
            "custom_fields",
            "archived"
        ],
        query: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`
      select btrim(coalesce(p.preferred_name, p.first_name) || ' ' || coalesce(p.last_name, '')) as name,
             p.first_name, p.last_name, p.preferred_name,
             p.lifecycle_status as status,
             h.name as household,
             hm.role::text as household_role,
             (select value from contact_methods c
               where c.member_id = p.id and c.kind = 'email'
               order by c.is_primary desc limit 1) as email,
             (select value from contact_methods c
               where c.member_id = p.id and c.kind = 'phone'
               order by c.is_primary desc limit 1) as phone,
             (select concat_ws(', ', nullif(a.line1, ''), nullif(a.line2, ''), nullif(a.city, ''),
                                     nullif(a.region, ''), nullif(a.postal_code, ''))
                from addresses a
               where a.member_id = p.id or a.household_id = hm.household_id
               order by (a.member_id = p.id) desc, a.is_primary desc limit 1) as address,
             p.date_of_birth, p.gender, p.marital_status,
             p.membership_date as member_since,
             p.first_visit_on as first_visit,
             cam.name as campus,
             (select string_agg(t.name, ', ' order by t.name)
                from member_tags pt join tags t on t.id = pt.tag_id
               where pt.member_id = p.id) as tags,
             (select string_agg(f.label || ': ' || v.value, '; ' order by f.label)
                from custom_field_values v join custom_fields f on f.id = v.field_id
               where v.entity_id = p.id and f.entity = 'person') as custom_fields,
             case when p.archived_at is null then 'no' else 'yes' end as archived
        from members p
        left join household_memberships hm on hm.member_id = p.id and hm.ended_on is null
        left join households h on h.id = hm.household_id
        left join campuses cam on cam.id = p.campus_id
       order by p.last_name, p.first_name`
    },
    {
        key: "households",
        columns: [
            "household",
            "person",
            "role",
            "email",
            "phone",
            "address",
            "joined",
            "archived"
        ],
        query: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`
      select h.name as household,
             btrim(coalesce(p.preferred_name, p.first_name) || ' ' || coalesce(p.last_name, '')) as person,
             hm.role::text as role,
             (select value from contact_methods c
               where c.member_id = p.id and c.kind = 'email'
               order by c.is_primary desc limit 1) as email,
             (select value from contact_methods c
               where c.member_id = p.id and c.kind = 'phone'
               order by c.is_primary desc limit 1) as phone,
             (select concat_ws(', ', nullif(a.line1, ''), nullif(a.city, ''),
                                     nullif(a.region, ''), nullif(a.postal_code, ''))
                from addresses a where a.household_id = h.id
               order by a.is_primary desc limit 1) as address,
             hm.started_on as joined,
             case when h.archived_at is null then 'no' else 'yes' end as archived
        from households h
        left join household_memberships hm on hm.household_id = h.id and hm.ended_on is null
        left join members p on p.id = hm.member_id
       order by h.name, hm.role, p.last_name`
    },
    {
        key: "attendance",
        columns: [
            "date",
            "kind",
            "what",
            "person",
            "how"
        ],
        query: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`
      select o.occurs_on as date, 'Service' as kind,
             coalesce(o.name, st.name) as what,
             btrim(coalesce(pe.preferred_name, pe.first_name) || ' ' || coalesce(pe.last_name, '')) as person,
             ar.source::text as how
        from attendance_records ar
        join service_occurrences o on o.id = ar.occurrence_id
        left join service_times st on st.id = o.service_time_id
        join members pe on pe.id = ar.member_id
      union all
      select m.met_on as date, 'Group' as kind, g.name as what,
             btrim(coalesce(pe.preferred_name, pe.first_name) || ' ' || coalesce(pe.last_name, '')) as person,
             'group' as how
        from group_attendance ga
        join group_meetings m on m.id = ga.meeting_id
        join groups g on g.id = m.group_id
        join members pe on pe.id = ga.member_id
      union all
      select o.occurs_on as date, 'Check-in' as kind, r.name as what,
             btrim(coalesce(pe.preferred_name, pe.first_name) || ' ' || coalesce(pe.last_name, '')) as person,
             v.kind::text as how
        from checkin_visits v
        join service_occurrences o on o.id = v.occurrence_id
        left join checkin_rooms r on r.id = v.room_id
        join members pe on pe.id = v.member_id
       order by 1 desc, 4`
    },
    {
        key: "checkin",
        columns: [
            "date",
            "service",
            "person",
            "room",
            "code",
            "checked_in",
            "checked_out",
            "collected_by"
        ],
        query: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`
      select o.occurs_on as date,
             coalesce(o.name, st.name) as service,
             btrim(coalesce(pe.preferred_name, pe.first_name) || ' ' || coalesce(pe.last_name, '')) as person,
             r.name as room,
             v.code,
             v.checked_in_at as checked_in,
             v.checked_out_at as checked_out,
             (select btrim(coalesce(g.preferred_name, g.first_name) || ' ' || coalesce(g.last_name, ''))
                from members g where g.id = v.checked_out_to) as collected_by
        from checkin_visits v
        join service_occurrences o on o.id = v.occurrence_id
        left join service_times st on st.id = o.service_time_id
        join members pe on pe.id = v.member_id
        left join checkin_rooms r on r.id = v.room_id
       order by o.occurs_on desc, pe.last_name`
    },
    {
        key: "groups",
        columns: [
            "group",
            "type",
            "meets",
            "where",
            "person",
            "role",
            "joined"
        ],
        query: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`
      select g.name as "group",
             gt.name as type,
             g.frequency::text as meets,
             coalesce(nullif(g.location, ''), case when g.online then 'Online' else null end) as "where",
             btrim(coalesce(pe.preferred_name, pe.first_name) || ' ' || coalesce(pe.last_name, '')) as person,
             gm.role::text as role,
             gm.joined_on as joined
        from groups g
        left join group_types gt on gt.id = g.type_id
        left join group_memberships gm on gm.group_id = g.id and gm.left_on is null
        left join members pe on pe.id = gm.member_id
       order by g.name, gm.role, pe.last_name`
    },
    {
        key: "teams",
        columns: [
            "team",
            "person",
            "role",
            "positions",
            "joined"
        ],
        query: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`
      select t.name as team,
             btrim(coalesce(pe.preferred_name, pe.first_name) || ' ' || coalesce(pe.last_name, '')) as person,
             tm.role::text as role,
             (select string_agg(tp.name, ', ' order by tp.position)
                from team_member_positions tmp
                join team_positions tp on tp.id = tmp.position_id
               where tmp.member_id = tm.id) as positions,
             tm.joined_on as joined
        from teams t
        left join team_members tm on tm.team_id = t.id and tm.left_on is null
        left join members pe on pe.id = tm.member_id
       order by t.name, pe.last_name`
    },
    {
        key: "serving",
        columns: [
            "date",
            "service",
            "team",
            "position",
            "person",
            "answer"
        ],
        query: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`
      select o.occurs_on as date,
             coalesce(o.name, st.name) as service,
             t.name as team,
             tp.name as position,
             btrim(coalesce(pe.preferred_name, pe.first_name) || ' ' || coalesce(pe.last_name, '')) as person,
             sa.status::text as answer
        from serving_assignments sa
        join service_occurrences o on o.id = sa.occurrence_id
        left join service_times st on st.id = o.service_time_id
        join teams t on t.id = sa.team_id
        left join team_positions tp on tp.id = sa.position_id
        join members pe on pe.id = sa.member_id
       order by o.occurs_on desc, t.name, tp.position`
    },
    {
        key: "followups",
        columns: [
            "stage",
            "person",
            "step",
            "due",
            "done",
            "outcome",
            "entered",
            "status"
        ],
        query: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`
      select pl.name as stage,
             btrim(coalesce(pe.preferred_name, pe.first_name) || ' ' || coalesce(pe.last_name, '')) as person,
             f.title as step,
             f.due_on as due,
             f.done_at as done,
             f.outcome,
             en.started_on as entered,
             en.status::text as status
        from follow_ups f
        join pipeline_entries en on en.id = f.entry_id
        join pipelines pl on pl.id = en.pipeline_id
        join members pe on pe.id = f.member_id
       order by en.started_on desc, pl.name, f.position`
    },
    {
        key: "milestones",
        columns: [
            "person",
            "milestone",
            "date",
            "notes"
        ],
        query: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`
      select btrim(coalesce(pe.preferred_name, pe.first_name) || ' ' || coalesce(pe.last_name, '')) as person,
             m.kind::text as milestone,
             m.occurred_on as date,
             m.notes
        from milestones m
        join members pe on pe.id = m.member_id
       order by m.occurred_on desc, pe.last_name`
    },
    {
        key: "checks",
        columns: [
            "person",
            "provider",
            "status",
            "completed",
            "expires"
        ],
        query: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`
      select btrim(coalesce(pe.preferred_name, pe.first_name) || ' ' || coalesce(pe.last_name, '')) as person,
             b.provider, b.status::text as status,
             b.completed_on as completed,
             b.expires_on as expires
        from background_checks b
        join members pe on pe.id = b.member_id
       order by b.expires_on nulls last, pe.last_name`
    },
    {
        key: "forms",
        columns: [
            "form",
            "submitted",
            "answers"
        ],
        query: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`
      select fo.name as form,
             s.created_at as submitted,
             (select string_agg(ff.label || ': ' || coalesce(s.answers ->> ff.id::text, ''), '; '
                                order by ff.position)
                from form_fields ff where ff.form_id = fo.id) as answers
        from form_submissions s
        join forms fo on fo.id = s.form_id
       order by s.created_at desc`
    }
];
const EXPORT_VIEWS = VIEWS.map((one)=>one.key);
async function buildView(db, actor, key) {
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["canArchivePeople"])(actor)) throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["PermissionError"](actor.role, "exportEverything");
    const view = VIEWS.find((one)=>one.key === key);
    if (!view) return null;
    const rows = await db.execute(view.query);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$export$2f$csv$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toCsv"])(rows, view.columns);
}
}),
"[project]/packages/db/src/export/zip.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "zipArchive",
    ()=>zipArchive
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$jszip$40$3$2e$10$2e$2$2f$node_modules$2f$jszip$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/jszip@3.10.2/node_modules/jszip/lib/index.js [app-rsc] (ecmascript)");
;
async function zipArchive(archive) {
    const zip = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$jszip$40$3$2e$10$2e$2$2f$node_modules$2f$jszip$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"]();
    zip.file("connectapp-export.json", JSON.stringify({
        meta: archive.meta,
        data: archive.data
    }, null, 2));
    const csv = zip.folder("csv");
    for (const [table, content] of Object.entries(archive.csv)){
        csv?.file(`${table}.csv`, content);
    }
    zip.file("README.txt", readme(archive));
    return zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: {
            level: 6
        }
    });
}
function readme(archive) {
    const counts = Object.entries(archive.meta.counts).filter(([, n])=>n > 0).map(([table, n])=>`  ${table}: ${n}`).join("\n");
    const withheld = archive.meta.withheld.length ? `\nWithheld from this export, because the role that ran it may not read them:\n${archive.meta.withheld.map((w)=>`  ${w}`).join("\n")}\n` : "";
    return `${archive.meta.church}
Exported ${archive.meta.exportedAt}
ConnectApp archive format ${archive.meta.format}

This is everything. There is no other copy held back, no paid tier that would
have given you more, and nothing here needs ConnectApp to read it.

csv/
  One file per table, UTF-8 with a byte order mark so Excel opens it correctly.
  Ids are kept, so the files join back together: members.csv has an id, and
  contact_methods.csv has a member_id pointing at it.

connectapp-export.json
  The same data, with types and nesting intact. This is the file to use if you
  are moving to another system or reading it with a program.

What is in it:
${counts}
${withheld}
Licence: ConnectApp is AGPL-3.0. Your data is yours.
`;
}
}),
"[project]/packages/db/src/index.ts [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/schema/index.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$client$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/client.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/roles.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$tenant$2d$roles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/tenant-roles.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$households$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/households.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$errors$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/errors.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$crypto$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/crypto.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/members.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$reports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/reports.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$report$2d$spec$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/report-spec.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$report$2d$compiler$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/report-compiler.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$saved$2d$reports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/saved-reports.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$contacts$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/repo/contacts.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$tags$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/tags.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$custom$2d$fields$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/custom-fields.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$merge$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/merge.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$relationships$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/relationships.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$milestones$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/milestones.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$church$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/church.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$label$2d$layout$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/repo/label-layout.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$campuses$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/campuses.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$provisional$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/provisional.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$public$2d$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/public-groups.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$public$2d$forms$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/public-forms.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$form$2d$matching$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/form-matching.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$public$2d$events$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/public-events.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$forms$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/repo/forms.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$form$2d$templates$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/form-templates.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$events$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/events.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$services$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/services.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$attendance$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/attendance.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$rooms$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/repo/rooms.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$stations$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/stations.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$lookup$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/lookup.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$checkin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/checkin.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$offline$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/offline.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$roster$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/roster.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$supervisor$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/supervisor.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$incidents$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/incidents.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$checkin$2d$mine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/checkin-mine.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$domains$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/domains.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$push$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/push.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$push$2d$send$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/push-send.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/groups.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$followups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/followups.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$checks$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/checks.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$celebrations$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/celebrations.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$serving$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/serving.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$schedule$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/schedule.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$respond$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/respond.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$plans$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/plans.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$plan$2d$templates$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/plan-templates.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$live$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/live.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$plan$2d$history$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/plan-history.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$directory$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/directory.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$setup$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/setup.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$value$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/value.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$directory$2d$rules$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/directory-rules.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$check$2d$rules$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/check-rules.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$scope$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/scope.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$group$2d$attendance$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/group-attendance.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$group$2d$finder$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/group-finder.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$meeting$2d$dates$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/meeting-dates.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$match$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/match.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$checkout$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/checkout.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$which$2d$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/which-service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$storage$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/repo/storage.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$demo$2f$load$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/demo/load.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$demo$2f$church$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/demo/church.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$demo$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/demo/members.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$notes$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/notes.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$timeline$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/timeline.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$lists$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/lists.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$membership$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/repo/membership.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$joining$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/joining.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$csv$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/import/csv.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$group$2d$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/import/group-columns.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$run$2d$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/import/run-groups.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$sources$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/import/sources.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$xlsx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/import/xlsx.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$columns$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/import/columns.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$match$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/import/match.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$run$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/import/run.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$import$2f$rollback$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/import/rollback.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$export$2f$archive$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/export/archive.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$export$2f$views$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/export/views.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$export$2f$zip$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/export/zip.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$export$2f$csv$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/export/csv.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$maintenance$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/maintenance.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$env$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/env.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$notifications$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/notifications.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$platform$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/platform.ts [app-rsc] (ecmascript)");
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
;
;
}),
"[project]/packages/db/src/rules.ts [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

/**
 * The rules a station carries with it.
 *
 * Everything here is pure: no database, no node built-ins, nothing that cannot
 * be served to a browser. It is what makes an offline station behave the same
 * as an online one, because both run this code rather than two versions of it.
 */ __turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$which$2d$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/which-service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$age$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/age.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$match$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/match.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$codes$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/codes.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$release$2d$rules$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/release-rules.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$meeting$2d$dates$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/meeting-dates.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$check$2d$rules$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/check-rules.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$directory$2d$rules$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/directory-rules.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$contact$2d$rules$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/contact-rules.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$form$2d$rules$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/form-rules.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$form$2d$templates$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/form-templates.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$label$2d$rules$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/label-rules.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$storage$2d$rules$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/storage-rules.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$repo$2f$report$2d$spec$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/repo/report-spec.ts [app-rsc] (ecmascript)");
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
}),
];

//# sourceMappingURL=packages_db_src_85130767._.js.map