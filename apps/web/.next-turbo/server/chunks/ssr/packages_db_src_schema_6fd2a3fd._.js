module.exports = [
"[project]/packages/db/src/schema/enums.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "auditAction",
    ()=>auditAction,
    "backgroundCheckStatus",
    ()=>backgroundCheckStatus,
    "contactKind",
    ()=>contactKind,
    "contactLabel",
    ()=>contactLabel,
    "customFieldEntity",
    ()=>customFieldEntity,
    "customFieldType",
    ()=>customFieldType,
    "householdRole",
    ()=>householdRole,
    "hue",
    ()=>hue,
    "importOutcome",
    ()=>importOutcome,
    "importStatus",
    ()=>importStatus,
    "lifecycleStatus",
    ()=>lifecycleStatus,
    "milestoneKind",
    ()=>milestoneKind,
    "noteClassification",
    ()=>noteClassification,
    "relationshipKind",
    ()=>relationshipKind,
    "tenantRole",
    ()=>tenantRole
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$enum$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/enum.js [app-rsc] (ecmascript)");
;
const tenantRole = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$enum$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgEnum"])("tenant_role", [
    "owner",
    "admin",
    "staff",
    "finance",
    "pastoral",
    "group_leader",
    "team_leader",
    "checkin_volunteer",
    "member"
]);
const lifecycleStatus = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$enum$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgEnum"])("lifecycle_status", [
    "visitor",
    "regular_attender",
    "member",
    "inactive",
    "deceased",
    "archived"
]);
const householdRole = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$enum$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgEnum"])("household_role", [
    "head",
    "spouse",
    "child",
    "other"
]);
const contactKind = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$enum$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgEnum"])("contact_kind", [
    "email",
    "phone"
]);
const contactLabel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$enum$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgEnum"])("contact_label", [
    "home",
    "mobile",
    "work",
    "other"
]);
const relationshipKind = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$enum$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgEnum"])("relationship_kind", [
    "spouse",
    "parent",
    "child",
    "guardian",
    "emergency_contact",
    "do_not_contact"
]);
const milestoneKind = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$enum$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgEnum"])("milestone_kind", [
    "first_visit",
    "salvation",
    "baptism",
    "confirmation",
    "child_dedication",
    "membership_class",
    "marriage",
    "death"
]);
const noteClassification = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$enum$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgEnum"])("note_classification", [
    "general",
    "confidential"
]);
const backgroundCheckStatus = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$enum$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgEnum"])("background_check_status", [
    "not_started",
    "pending",
    "clear",
    "flagged",
    "expired"
]);
const customFieldType = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$enum$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgEnum"])("custom_field_type", [
    "text",
    "number",
    "date",
    "select",
    "multi_select",
    "boolean",
    "file"
]);
const customFieldEntity = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$enum$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgEnum"])("custom_field_entity", [
    "person",
    "household",
    "group",
    "event",
    "donation"
]);
const hue = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$enum$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgEnum"])("hue", [
    "rose",
    "coral",
    "amber",
    "citron",
    "fern",
    "jade",
    "teal",
    "sky",
    "indigo",
    "violet",
    "orchid",
    "clay"
]);
const auditAction = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$enum$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgEnum"])("audit_action", [
    "insert",
    "update",
    "delete",
    "read"
]);
const importStatus = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$enum$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgEnum"])("import_status", [
    "preview",
    "committed",
    "rolled_back",
    "failed"
]);
const importOutcome = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$enum$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgEnum"])("import_outcome", [
    "create",
    "update",
    "skip",
    "fail"
]);
}),
"[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "appUsers",
    ()=>appUsers,
    "campuses",
    ()=>campuses,
    "demoRecords",
    ()=>demoRecords,
    "locations",
    ()=>locations,
    "rooms",
    ()=>rooms,
    "serviceTimes",
    ()=>serviceTimes,
    "storedFiles",
    ()=>storedFiles,
    "tenantMembers",
    ()=>tenantMembers,
    "tenantRoles",
    ()=>tenantRoles,
    "tenants",
    ()=>tenants
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/boolean.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/integer.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$bigint$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/bigint.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/date.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/sql/sql.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/enums.ts [app-rsc] (ecmascript)");
;
;
;
const pk = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom();
const created = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).defaultNow().notNull();
const updated = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("updated_at", {
        withTimezone: true
    }).defaultNow().notNull();
const tenants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("tenants", {
    id: pk(),
    slug: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("slug").notNull(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    legalName: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("legal_name"),
    timezone: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("timezone").notNull().default("America/Chicago"),
    /** R1.1. One address. A church with two buildings has two campuses (R1.2). */ addressLine1: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("address_line1"),
    addressLine2: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("address_line2"),
    city: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("city"),
    region: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("region"),
    postalCode: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("postal_code"),
    country: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("country").notNull().default("US"),
    phone: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("phone"),
    /** R1.1. Where somebody reading a public page writes to. */ email: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("email"),
    website: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("website"),
    /**
     * R7.6. How many held services somebody misses in a row before the church
     * wants to know. Three by default, which is roughly a month of services.
     */ absenceThreshold: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("absence_threshold").notNull().default(3),
    /** R1.1. One of the twelve hues, used wherever the church brands a page. */ brandHue: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["hue"])("brand_hue").notNull().default("indigo"),
    /** R1.1. The key of the logo in the church bucket. */ logoKey: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("logo_key"),
    /**
     * R19.7. Set only on a demo church, to the moment it stops existing.
     *
     * A demo is a whole church of its own rather than a mode inside a real one,
     * because the only safe place for invented members is somewhere nobody could
     * mistake for their own records.
     */ demoExpiresAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("demo_expires_at", {
        withTimezone: true
    }),
    /** When a visitor took this demo church. Null while it waits in the pool. */ demoClaimedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("demo_claimed_at", {
        withTimezone: true
    }),
    /**
     * R1.16. Hard, enforced, visible. Two gibibytes, which is a logo, a few
     * hundred photos and the documents a church of this size actually keeps.
     * Sermon video is a non-goal: link to YouTube.
     */ storageQuotaBytes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$bigint$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["bigint"])("storage_quota_bytes", {
        mode: "number"
    }).notNull().default(2147483648),
    /**
     * R22.1. The setup wizard is answered by looking at the church's records,
     * so there is no progress to store. These two are the things no query can
     * find out: that a church has no kids' classes and does not want to be
     * asked again, and that somebody put the whole thing away.
     */ setupDismissedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("setup_dismissed_at", {
        withTimezone: true
    }),
    setupSkipped: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("setup_skipped").array(),
    /**
     * R1.7, R22.1. Whether somebody can make an account from the church's own
     * address.
     *
     * This replaced a join code. A code was a shared password: it never
     * expired, it was used any number of times, and anybody who had ever seen
     * it had a way in forever. The church is named by the URL now, so there is
     * nothing to leak and nothing to rotate. Off means the door is shut and
     * invitations are the only way in.
     */ selfSignup: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("self_signup").notNull().default(true),
    /**
     * R1.1, R17.1. The church's own address for its members' screens.
     *
     * A member reading their serving dates on the church's own host is on the
     * church's site rather than on ours, and the session cookie is first-party,
     * which is the only way the signed-in screens can live inside a church's
     * domain at all. Compared against the Host header, so it is stored the way
     * that header arrives: lower case, no scheme, no path.
     */ customDomain: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("custom_domain"),
    /**
     * R8.11. What goes on a child's label.
     *
     * The church's own layout rather than the station's, because a parent who
     * collects from two different doors should be handed the same label, and a
     * tablet swapped out at 9:55 should print what the one before it printed.
     */ labelShowRoom: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("label_show_room").notNull().default(true),
    labelShowAllergies: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("label_show_allergies").notNull().default(true),
    labelShowCode: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("label_show_code").notNull().default(true),
    labelShowService: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("label_show_service").notNull().default(true),
    labelParentTag: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("label_parent_tag").notNull().default(true),
    /** One of LABEL_SIZES. The stock the church loads into its printer. */ labelSize: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("label_size").notNull().default("brother_24x11"),
    /**
     * R1.1, R21.x. When a human looked at this church and said it is a church.
     *
     * Null means provisional, which is where every new church starts. A
     * provisional church works for the person who made it and is capped: a
     * small number of members, no join link, no invitations. A real church is
     * unblocked in an hour, which is what the sixty-minute time-to-value
     * number needs. An abuser gets nothing worth having.
     *
     * Not a queue with a task on somebody. That was built and taken out on the
     * same day, because it put work on a volunteer every time a regular signed
     * up for a door the church had already chosen to open.
     */ approvedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("approved_at", {
        withTimezone: true
    }),
    approvedBy: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("approved_by"),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("tenants_slug_key").on(t.slug)
    ]);
const serviceTimes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("service_times", {
    id: pk(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>tenants.id, {
        onDelete: "cascade"
    }),
    campusId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("campus_id").references(()=>campuses.id, {
        onDelete: "cascade"
    }),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    /** 0 is Sunday, matching JavaScript and Postgres `dow`. */ dayOfWeek: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("day_of_week").notNull(),
    /** Local to the church's timezone, as HH:MM. */ startsAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("starts_at").notNull(),
    /**
     * R7.1. "weekly", "fortnightly" or "monthly". Monthly means the same
     * weekday of the month, so a second Tuesday stays a second Tuesday rather
     * than drifting to a date that lands on a Saturday.
     */ frequency: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("frequency").notNull().default("weekly"),
    /**
     * The first date, which fixes the pattern. Fortnightly counts from it, and
     * monthly takes its place in the month from it.
     */ anchorOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("anchor_on"),
    /** R7.1. When it stops. Null means it carries on. */ untilOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("until_on"),
    sortOrder: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("sort_order").notNull().default(0),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("service_times_tenant_idx").on(t.tenantId)
    ]);
const campuses = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("campuses", {
    id: pk(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>tenants.id, {
        onDelete: "cascade"
    }),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    isPrimary: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("is_primary").notNull().default(false),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("campuses_tenant_idx").on(t.tenantId)
    ]);
const locations = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("locations", {
    id: pk(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>tenants.id, {
        onDelete: "cascade"
    }),
    campusId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("campus_id").notNull().references(()=>campuses.id, {
        onDelete: "cascade"
    }),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("locations_tenant_idx").on(t.tenantId)
    ]);
const rooms = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("rooms", {
    id: pk(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>tenants.id, {
        onDelete: "cascade"
    }),
    locationId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("location_id").notNull().references(()=>locations.id, {
        onDelete: "cascade"
    }),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    hue: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["hue"])("hue").notNull(),
    minAgeMonths: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("min_age_months"),
    maxAgeMonths: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("max_age_months"),
    capacity: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("capacity"),
    /** R8.16. Configurable per age band. */ volunteerRatio: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("volunteer_ratio"),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("rooms_tenant_idx").on(t.tenantId)
    ]);
const appUsers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("app_users", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey(),
    email: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("email").notNull(),
    fullName: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("full_name"),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("app_users_email_key").on(t.email)
    ]);
const tenantRoles = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("tenant_roles", {
    id: pk(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>tenants.id, {
        onDelete: "cascade"
    }),
    /** The built-in's own name, such as "staff", or a slug for a custom role. */ key: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("key").notNull(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    /** Permission keys from packages/db/src/permissions.ts. */ permissions: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("permissions").array().notNull().default(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`'{}'::text[]`),
    builtin: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("builtin").notNull().default(false),
    /**
     * R1.6. Whether this church has changed a built-in from what ConnectApp ships.
     *
     * An untouched built-in keeps following the product, so a permission we add
     * later reaches a church that has been running for a year. One a church has
     * edited is theirs, and we stop writing to it.
     */ customised: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("customised").notNull().default(false),
    position: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("position").notNull().default(0),
    /** R1.6. Archived, never deleted: somebody held this role, and the log says so. */ archivedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("archived_at", {
        withTimezone: true
    }),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("tenant_roles_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("tenant_roles_key_unique").on(t.tenantId, t.key)
    ]);
const tenantMembers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("tenant_members", {
    id: pk(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>tenants.id, {
        onDelete: "cascade"
    }),
    userId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("user_id").notNull().references(()=>appUsers.id, {
        onDelete: "cascade"
    }),
    /**
     * R1.4. The built-in role. Kept alongside role_id because it is what the
     * audit log records and what a path that has not been handed the permission
     * set falls back to. A member on a custom role holds "member" here, so
     * anything reading this column alone fails closed.
     */ role: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenantRole"])("role").notNull().default("staff"),
    /** R1.6. The role this member actually holds, built-in or custom. */ roleId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("role_id").references(()=>tenantRoles.id, {
        onDelete: "set null"
    }),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("tenant_members_unique").on(t.tenantId, t.userId)
    ]);
const storedFiles = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("stored_files", {
    id: pk(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>tenants.id, {
        onDelete: "cascade"
    }),
    bucket: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("bucket").notNull().default("church"),
    /** The path inside the bucket, which begins with the church's slug. */ key: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("key").notNull(),
    /** What it is for: "logo", "person_photo". Drives where it may be shown. */ purpose: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("purpose").notNull(),
    contentType: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("content_type").notNull(),
    bytes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$bigint$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["bigint"])("bytes", {
        mode: "number"
    }).notNull(),
    uploadedByUserId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("uploaded_by_user_id").references(()=>appUsers.id, {
        onDelete: "set null"
    }),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("stored_files_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("stored_files_key").on(t.bucket, t.key)
    ]);
const demoRecords = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("demo_records", {
    id: pk(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>tenants.id, {
        onDelete: "cascade"
    }),
    /** "person", "household" or "tag". */ entity: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("entity").notNull(),
    recordId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("record_id").notNull(),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("demo_records_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("demo_records_unique").on(t.tenantId, t.entity, t.recordId)
    ]);
}),
"[project]/packages/db/src/schema/members.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "addresses",
    ()=>addresses,
    "backgroundChecks",
    ()=>backgroundChecks,
    "contactMethods",
    ()=>contactMethods,
    "householdMemberships",
    ()=>householdMemberships,
    "households",
    ()=>households,
    "memberTags",
    ()=>memberTags,
    "members",
    ()=>members,
    "milestones",
    ()=>milestones,
    "relationships",
    ()=>relationships,
    "tags",
    ()=>tags
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/boolean.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/date.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$primary$2d$keys$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/primary-keys.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/enums.ts [app-rsc] (ecmascript)");
;
;
;
const pk = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom();
const tenantId = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    });
const created = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).defaultNow().notNull();
const updated = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("updated_at", {
        withTimezone: true
    }).defaultNow().notNull();
const households = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("households", {
    id: pk(),
    tenantId: tenantId(),
    campusId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("campus_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["campuses"].id, {
        onDelete: "set null"
    }),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    /** R2.13. Archive, never hard delete. */ archivedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("archived_at", {
        withTimezone: true
    }),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("households_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("households_name_idx").on(t.tenantId, t.name)
    ]);
const members = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("members", {
    id: pk(),
    tenantId: tenantId(),
    campusId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("campus_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["campuses"].id, {
        onDelete: "set null"
    }),
    /** R24.6. The readable part of their address, unique within the church. */ slug: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("slug").notNull(),
    firstName: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("first_name").notNull(),
    lastName: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("last_name").notNull(),
    /** What members actually call them. Shown in preference to the legal first name. */ preferredName: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("preferred_name"),
    gender: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("gender"),
    dateOfBirth: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("date_of_birth"),
    maritalStatus: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("marital_status"),
    /**
     * R2.1. What year of school they are in, from pre-K to graduate school.
     *
     * A church asks this to put a child in the right room and a student in the
     * right group, so it is a managed vocabulary rather than free text: a room
     * assignment cannot be made from "6th" and "sixth grade" being two answers.
     * Null for everybody who is not in school, which is most members.
     */ schoolLevel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("school_level"),
    lifecycleStatus: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["lifecycleStatus"])("lifecycle_status").notNull().default("visitor"),
    membershipDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("membership_date"),
    firstVisitOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("first_visit_on"),
    photoKey: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("photo_key"),
    /**
     * R8.10. What a volunteer has to know before a child goes into a room, in
     * the fewest words that are true: "Peanuts", "Bee stings". Printed on the
     * child's label and shown full size at check-in.
     */ allergies: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("allergies"),
    /** R8.10. Anything else a room needs: an inhaler, a seizure plan. */ medicalNote: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("medical_note"),
    /**
     * R9.3. The account this person signs in with, where they have one.
     *
     * A role says what somebody may do; this says who they are. A group leader
     * cannot be scoped to their own group without it, and neither can anything
     * a member does for themselves in the portal.
     */ appUserId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("app_user_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appUsers"].id, {
        onDelete: "set null"
    }),
    /** R2.13. Archived members leave lists and counts, history is retained. */ archivedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("archived_at", {
        withTimezone: true
    }),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("people_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("people_name_idx").on(t.tenantId, t.lastName, t.firstName),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("people_status_idx").on(t.tenantId, t.lifecycleStatus),
        // One person a church for an account, so "who am I here" has one answer.
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("people_user_unique").on(t.tenantId, t.appUserId)
    ]);
const householdMemberships = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("household_memberships", {
    id: pk(),
    tenantId: tenantId(),
    householdId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("household_id").notNull().references(()=>households.id, {
        onDelete: "cascade"
    }),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>members.id, {
        onDelete: "cascade"
    }),
    role: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["householdRole"])("role").notNull().default("other"),
    startedOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("started_on"),
    endedOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("ended_on"),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("hm_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("hm_person_idx").on(t.tenantId, t.memberId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("hm_household_idx").on(t.tenantId, t.householdId)
    ]);
const contactMethods = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("contact_methods", {
    id: pk(),
    tenantId: tenantId(),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>members.id, {
        onDelete: "cascade"
    }),
    kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["contactKind"])("kind").notNull(),
    label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["contactLabel"])("label").notNull().default("mobile"),
    value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("value").notNull(),
    isPrimary: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("is_primary").notNull().default(false),
    /** R16.7. Bounces invalidate an address rather than silently failing forever. */ isValid: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("is_valid").notNull().default(true),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("contact_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("contact_person_idx").on(t.tenantId, t.memberId)
    ]);
const addresses = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("addresses", {
    id: pk(),
    tenantId: tenantId(),
    householdId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("household_id").references(()=>households.id, {
        onDelete: "cascade"
    }),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").references(()=>members.id, {
        onDelete: "cascade"
    }),
    label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["contactLabel"])("label").notNull().default("home"),
    line1: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("line1").notNull(),
    line2: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("line2"),
    city: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("city"),
    region: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("region"),
    postalCode: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("postal_code"),
    country: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("country").notNull().default("US"),
    isPrimary: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("is_primary").notNull().default(false),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("addresses_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("addresses_person_idx").on(t.tenantId, t.memberId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("addresses_household_idx").on(t.tenantId, t.householdId)
    ]);
const relationships = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("relationships", {
    id: pk(),
    tenantId: tenantId(),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>members.id, {
        onDelete: "cascade"
    }),
    relatedMemberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("related_member_id").notNull().references(()=>members.id, {
        onDelete: "cascade"
    }),
    kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["relationshipKind"])("kind").notNull(),
    notes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("notes"),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("rel_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("rel_person_idx").on(t.tenantId, t.memberId),
        // Who points at this person. R8.8 reads the relationship both ways,
        // because a guardian recorded once is a guardian in both directions.
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("rel_related_idx").on(t.tenantId, t.relatedMemberId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("rel_unique").on(t.tenantId, t.memberId, t.relatedMemberId, t.kind)
    ]);
const milestones = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("milestones", {
    id: pk(),
    tenantId: tenantId(),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>members.id, {
        onDelete: "cascade"
    }),
    kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["milestoneKind"])("kind").notNull(),
    occurredOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("occurred_on").notNull(),
    notes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("notes"),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("milestones_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("milestones_person_idx").on(t.tenantId, t.memberId)
    ]);
const backgroundChecks = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("background_checks", {
    id: pk(),
    tenantId: tenantId(),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>members.id, {
        onDelete: "cascade"
    }),
    provider: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("provider"),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["backgroundCheckStatus"])("status").notNull().default("not_started"),
    completedOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("completed_on"),
    expiresOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("expires_on"),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("bgc_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("bgc_person_idx").on(t.tenantId, t.memberId)
    ]);
const tags = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("tags", {
    id: pk(),
    tenantId: tenantId(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    hue: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["hue"])("hue").notNull().default("teal"),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("tags_unique").on(t.tenantId, t.name)
    ]);
const memberTags = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("member_tags", {
    tenantId: tenantId(),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>members.id, {
        onDelete: "cascade"
    }),
    tagId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tag_id").notNull().references(()=>tags.id, {
        onDelete: "cascade"
    }),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$primary$2d$keys$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["primaryKey"])({
            columns: [
                t.memberId,
                t.tagId
            ]
        }),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("person_tags_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("person_tags_tag_idx").on(t.tenantId, t.tagId)
    ]);
}),
"[project]/packages/db/src/schema/notes.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "notes",
    ()=>notes
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/members.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/enums.ts [app-rsc] (ecmascript)");
;
;
;
;
const notes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("notes", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    }),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "cascade"
    }),
    classification: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["noteClassification"])("classification").notNull().default("general"),
    /** Plaintext for general notes. Null for confidential. */ body: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("body"),
    /** AES-256-GCM payload for confidential notes. Null for general. */ bodyEncrypted: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("body_encrypted"),
    authorUserId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("author_user_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appUsers"].id, {
        onDelete: "set null"
    }),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).defaultNow().notNull(),
    updatedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("updated_at", {
        withTimezone: true
    }).defaultNow().notNull()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("notes_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("notes_person_idx").on(t.tenantId, t.memberId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("notes_class_idx").on(t.tenantId, t.classification)
    ]);
}),
"[project]/packages/db/src/schema/invitations.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "invitations",
    ()=>invitations
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/members.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/enums.ts [app-rsc] (ecmascript)");
;
;
;
;
const invitations = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("invitations", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    }),
    email: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("email").notNull(),
    role: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenantRole"])("role").notNull().default("staff"),
    /**
     * R1.6. The role the church actually chose, where it wrote its own.
     *
     * The enum above then reads "member", the same way it does on
     * tenant_members, so anything reading it alone fails closed.
     */ roleId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("role_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenantRoles"].id, {
        onDelete: "set null"
    }),
    /**
     * R1.7. The record this account is for, where the church knows which one.
     *
     * An invitation that grants a role and links no record leaves somebody
     * signed in to a church that has never heard of them. Set when a church
     * invites a person it already holds.
     */ memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "set null"
    }),
    invitedByUserId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("invited_by_user_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appUsers"].id, {
        onDelete: "set null"
    }),
    expiresAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("expires_at", {
        withTimezone: true
    }).notNull(),
    acceptedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("accepted_at", {
        withTimezone: true
    }),
    acceptedByUserId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("accepted_by_user_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appUsers"].id, {
        onDelete: "set null"
    }),
    revokedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("revoked_at", {
        withTimezone: true
    }),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).defaultNow().notNull()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("invitations_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("invitations_pending_unique").on(t.tenantId, t.email)
    ]);
}),
"[project]/packages/db/src/schema/custom-fields.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "customFieldValues",
    ()=>customFieldValues,
    "customFields",
    ()=>customFields
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/jsonb.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/enums.ts [app-rsc] (ecmascript)");
;
;
;
const customFields = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("custom_fields", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    }),
    entity: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["customFieldEntity"])("entity").notNull(),
    key: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("key").notNull(),
    label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("label").notNull(),
    type: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["customFieldType"])("type").notNull(),
    options: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsonb"])("options").$type(),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).defaultNow().notNull()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("custom_fields_unique").on(t.tenantId, t.entity, t.key)
    ]);
const customFieldValues = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("custom_field_values", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    }),
    fieldId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("field_id").notNull().references(()=>customFields.id, {
        onDelete: "cascade"
    }),
    entityId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("entity_id").notNull(),
    value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsonb"])("value"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).defaultNow().notNull()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("cfv_unique").on(t.fieldId, t.entityId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("cfv_tenant_idx").on(t.tenantId)
    ]);
}),
"[project]/packages/db/src/schema/imports.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "importBatches",
    ()=>importBatches,
    "importRows",
    ()=>importRows
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/integer.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/boolean.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/jsonb.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/enums.ts [app-rsc] (ecmascript)");
;
;
;
const importBatches = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("import_batches", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    }),
    filename: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("filename").notNull(),
    /**
     * R19.5. "members" or "groups". A group file's rows are memberships rather
     * than members, so the preview, the counts and the rollback all read it
     * differently.
     */ kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("kind").notNull().default("members"),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importStatus"])("status").notNull().default("preview"),
    /** The header-to-field mapping used, kept so it can be offered again (R19.1). */ mapping: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsonb"])("mapping").$type(),
    duplicateStrategy: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("duplicate_strategy").notNull().default("skip"),
    rowsTotal: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("rows_total").notNull().default(0),
    rowsCreated: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("rows_created").notNull().default(0),
    rowsUpdated: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("rows_updated").notNull().default(0),
    rowsSkipped: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("rows_skipped").notNull().default(0),
    rowsFailed: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("rows_failed").notNull().default(0),
    startedByUserId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("started_by_user_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appUsers"].id, {
        onDelete: "set null"
    }),
    committedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("committed_at", {
        withTimezone: true
    }),
    rolledBackAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("rolled_back_at", {
        withTimezone: true
    }),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).defaultNow().notNull()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("import_batches_tenant_idx").on(t.tenantId, t.createdAt)
    ]);
const importRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("import_rows", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    }),
    batchId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("batch_id").notNull().references(()=>importBatches.id, {
        onDelete: "cascade"
    }),
    lineNumber: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("line_number").notNull(),
    outcome: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importOutcome"])("outcome").notNull(),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id"),
    /** R19.5. The group a membership row put that person into. */ groupId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("group_id"),
    /** R19.5. True on the row that brought a group into existence. */ groupCreated: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("group_created").notNull().default(false),
    /** Why a row was skipped or failed, as a message key with its values. */ reason: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("reason"),
    before: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsonb"])("before"),
    source: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsonb"])("source").$type(),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).defaultNow().notNull()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("import_rows_batch_idx").on(t.batchId, t.lineNumber),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("import_rows_tenant_idx").on(t.tenantId)
    ]);
}),
"[project]/packages/db/src/schema/merges.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "personMerges",
    ()=>personMerges
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/jsonb.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/members.ts [app-rsc] (ecmascript)");
;
;
;
const personMerges = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("person_merges", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    }),
    /** The record that survives. */ winnerId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("winner_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "cascade"
    }),
    /** The record that is archived. Never deleted, so undo has something to restore. */ loserId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("loser_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "cascade"
    }),
    /** The winner's own fields as they were, so an overwrite can be put back. */ winnerBefore: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsonb"])("winner_before"),
    /** Every row re-pointed at the winner, as [{ table, id }], so undo moves back exactly those. */ movedRows: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsonb"])("moved_rows").$type(),
    mergedByUserId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("merged_by_user_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appUsers"].id, {
        onDelete: "set null"
    }),
    mergedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("merged_at", {
        withTimezone: true
    }).defaultNow().notNull(),
    undoneAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("undone_at", {
        withTimezone: true
    })
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("person_merges_tenant_idx").on(t.tenantId, t.mergedAt),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("person_merges_loser_idx").on(t.loserId)
    ]);
}),
"[project]/packages/db/src/schema/audit.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "auditEntries",
    ()=>auditEntries
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/jsonb.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/enums.ts [app-rsc] (ecmascript)");
;
;
;
const auditEntries = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("audit_entries", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    }),
    actorUserId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("actor_user_id"),
    actorRole: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("actor_role"),
    action: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auditAction"])("action").notNull(),
    entity: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("entity").notNull(),
    entityId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("entity_id"),
    before: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsonb"])("before"),
    after: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsonb"])("after"),
    ip: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("ip"),
    at: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("at", {
        withTimezone: true
    }).defaultNow().notNull()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("audit_tenant_idx").on(t.tenantId, t.at),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("audit_entity_idx").on(t.tenantId, t.entity, t.entityId)
    ]);
}),
"[project]/packages/db/src/schema/gatherings.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "attendanceRecords",
    ()=>attendanceRecords,
    "serviceOccurrences",
    ()=>serviceOccurrences
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/date.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/integer.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/members.ts [app-rsc] (ecmascript)");
;
;
;
const pk = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom();
const tenantId = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    });
const created = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).defaultNow().notNull();
const updated = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("updated_at", {
        withTimezone: true
    }).defaultNow().notNull();
const serviceOccurrences = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("service_occurrences", {
    id: pk(),
    tenantId: tenantId(),
    campusId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("campus_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["campuses"].id, {
        onDelete: "set null"
    }),
    /** Null for a one-off. Set for anything generated from the weekly pattern. */ serviceTimeId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("service_time_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["serviceTimes"].id, {
        onDelete: "set null"
    }),
    /** R24.6. The readable part of its address: the date, then its name. */ slug: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("slug").notNull(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    occursOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("occurs_on").notNull(),
    /** Local to the church's timezone, as HH:MM. */ startsAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("starts_at").notNull(),
    /** "scheduled" or "cancelled". Cancelled occurrences stay, so a gap in the
     *  attendance record is explained rather than blank. */ status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("status").notNull().default("scheduled"),
    /** R7.8. Weather, a holiday, anything that explains a number. */ note: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("note"),
    /** R7.2. Headcounts, when a church only ever counts heads. */ countAdults: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("count_adults"),
    countChildren: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("count_children"),
    countVisitors: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("count_visitors"),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("occ_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("occ_date_idx").on(t.tenantId, t.occursOn),
        // One occurrence per service time per day. A special service has no service
        // time, and Postgres treats those nulls as distinct, which is what we want:
        // a church can hold two carol services on the same evening.
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("occ_unique").on(t.tenantId, t.serviceTimeId, t.occursOn)
    ]);
const attendanceRecords = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("attendance_records", {
    id: pk(),
    tenantId: tenantId(),
    occurrenceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("occurrence_id").notNull().references(()=>serviceOccurrences.id, {
        onDelete: "cascade"
    }),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "cascade"
    }),
    /** How it was recorded: "roster", "checkin", "import". */ source: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("source").notNull().default("roster"),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("att_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("att_occurrence_idx").on(t.tenantId, t.occurrenceId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("att_person_idx").on(t.tenantId, t.memberId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("att_unique").on(t.occurrenceId, t.memberId)
    ]);
}),
"[project]/packages/db/src/schema/checkin.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "checkinCodes",
    ()=>checkinCodes,
    "checkinOfflineEvents",
    ()=>checkinOfflineEvents,
    "checkinOverrides",
    ()=>checkinOverrides,
    "checkinRooms",
    ()=>checkinRooms,
    "checkinStationRooms",
    ()=>checkinStationRooms,
    "checkinStationServices",
    ()=>checkinStationServices,
    "checkinStations",
    ()=>checkinStations,
    "checkinVisits",
    ()=>checkinVisits,
    "incidentReports",
    ()=>incidentReports
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/integer.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/boolean.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/date.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$gatherings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/gatherings.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/members.ts [app-rsc] (ecmascript)");
;
;
;
;
const pk = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom();
const tenantId = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    });
const created = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).defaultNow().notNull();
const updated = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("updated_at", {
        withTimezone: true
    }).defaultNow().notNull();
const checkinRooms = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("checkin_rooms", {
    id: pk(),
    tenantId: tenantId(),
    campusId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("campus_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["campuses"].id, {
        onDelete: "set null"
    }),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    /** One of the twelve hues. Printed on the label. */ hue: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("hue").notNull().default("sky"),
    /**
     * R8.14, R8.16. Whether this room holds children.
     *
     * A church books adults into rooms too, and the safeguarding rules only
     * apply to one of those. The volunteer ratio warning, the two-adult rule
     * and the pickup code are for a children's room, so the room has to say
     * which it is rather than it being guessed from an age band.
     */ forChildren: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("for_children").notNull().default(true),
    /** Inclusive, in months. Null means no floor. */ minAgeMonths: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("min_age_months"),
    /** Exclusive, in months, so 0 to 24 and 24 to 48 tile with no gap and no
     *  overlap. Null means no ceiling. */ maxAgeMonths: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("max_age_months"),
    /** How many children the room holds. Null means the church has not said. */ capacity: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("capacity"),
    /** One volunteer per this many children. Null means the church has not said. */ ratio: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("ratio"),
    /** Where it sits in the list the station shows. */ position: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("position").notNull().default(0),
    archivedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("archived_at", {
        withTimezone: true
    }),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("room_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("room_age_idx").on(t.tenantId, t.minAgeMonths, t.maxAgeMonths),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("room_name_unique").on(t.tenantId, t.name)
    ]);
const checkinStations = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("checkin_stations", {
    id: pk(),
    tenantId: tenantId(),
    campusId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("campus_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["campuses"].id, {
        onDelete: "set null"
    }),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    /** "desk", a volunteer drives it, or "kiosk", a family does. */ mode: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("mode").notNull().default("desk"),
    /** "brother", "dymo" or "paper". */ printer: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("printer").notNull().default("paper"),
    /** When a device last identified itself as this station. */ lastSeenAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("last_seen_at", {
        withTimezone: true
    }),
    archivedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("archived_at", {
        withTimezone: true
    }),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("station_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("station_name_unique").on(t.tenantId, t.name)
    ]);
const checkinStationRooms = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("checkin_station_rooms", {
    id: pk(),
    tenantId: tenantId(),
    stationId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("station_id").notNull().references(()=>checkinStations.id, {
        onDelete: "cascade"
    }),
    roomId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("room_id").notNull().references(()=>checkinRooms.id, {
        onDelete: "cascade"
    })
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("station_room_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("station_room_unique").on(t.stationId, t.roomId)
    ]);
const checkinStationServices = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("checkin_station_services", {
    id: pk(),
    tenantId: tenantId(),
    stationId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("station_id").notNull().references(()=>checkinStations.id, {
        onDelete: "cascade"
    }),
    serviceTimeId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("service_time_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["serviceTimes"].id, {
        onDelete: "cascade"
    })
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("station_service_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("station_service_unique").on(t.stationId, t.serviceTimeId)
    ]);
const checkinVisits = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("checkin_visits", {
    id: pk(),
    tenantId: tenantId(),
    occurrenceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("occurrence_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$gatherings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["serviceOccurrences"].id, {
        onDelete: "cascade"
    }),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "cascade"
    }),
    /** Null for an adult taking a name badge rather than a room. (R8.5) */ roomId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("room_id").references(()=>checkinRooms.id, {
        onDelete: "set null"
    }),
    stationId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("station_id").references(()=>checkinStations.id, {
        onDelete: "set null"
    }),
    /** R8.6. Unique within a service occurrence, and not reused for 12 months. */ code: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("code"),
    /**
     * R8.17. "child" or "adult", which is what the row is rather than what the
     * person is. An adult with a room is serving in it, and the two-adult rule
     * counts those. Stored rather than worked out from a date of birth, because
     * a church that holds no date of birth for a volunteer still has to be able
     * to count them.
     */ kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("kind").notNull().default("child"),
    /**
     * R8.12. A third label, for the bag or the stroller that came with them.
     *
     * Kept on the visit rather than decided when printing, so a reprint at
     * 11:20 prints what was printed at 09:58, and a station that was offline
     * prints the same thing when it reconciles.
     */ bagLabel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("bag_label").notNull().default(false),
    checkedInAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("checked_in_at", {
        withTimezone: true
    }).defaultNow().notNull(),
    /** Who did the checking in, where a volunteer was driving the station. */ checkedInBy: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("checked_in_by"),
    checkedOutAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("checked_out_at", {
        withTimezone: true
    }),
    /** The person who collected them, where the church holds a record of them. */ checkedOutTo: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("checked_out_to").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "set null"
    }),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("visit_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("visit_occurrence_idx").on(t.tenantId, t.occurrenceId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("visit_person_idx").on(t.tenantId, t.memberId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("visit_room_idx").on(t.tenantId, t.roomId),
        // One live visit per person per service. Checking a child in twice is the
        // same child, and two rows would be two codes for one label pair.
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("visit_unique").on(t.occurrenceId, t.memberId),
        // R8.6. A code is a church's own and is never handed out twice, which is
        // stronger than the twelve months the requirement asks for and simpler to
        // be sure of. The database is what enforces it, rather than a check that
        // two stations could both pass at the same moment.
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("visit_code_unique").on(t.tenantId, t.code)
    ]);
const checkinOverrides = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("checkin_overrides", {
    id: pk(),
    tenantId: tenantId(),
    visitId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("visit_id").notNull().references(()=>checkinVisits.id, {
        onDelete: "cascade"
    }),
    /** "code", "pickup" or "restriction". What was passed. */ reasonKind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("reason_kind").notNull(),
    /** What the person typed. Required, because "why" is the point of the row. */ reason: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("reason").notNull(),
    /** The signed-in user who authorised it. */ authorisedBy: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("authorised_by"),
    /** Who collected the child, where the church holds a record of them. */ collectedBy: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("collected_by").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "set null"
    }),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("override_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("override_visit_idx").on(t.tenantId, t.visitId)
    ]);
const checkinCodes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("checkin_codes", {
    id: pk(),
    tenantId: tenantId(),
    occurrenceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("occurrence_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$gatherings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["serviceOccurrences"].id, {
        onDelete: "cascade"
    }),
    stationId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("station_id").notNull().references(()=>checkinStations.id, {
        onDelete: "cascade"
    }),
    code: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("code").notNull(),
    /** Set when a visit takes it, so a block can be topped up honestly. */ usedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("used_at", {
        withTimezone: true
    }),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("code_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("code_block_idx").on(t.tenantId, t.stationId, t.occurrenceId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("code_unique").on(t.tenantId, t.code)
    ]);
const checkinOfflineEvents = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("checkin_offline_events", {
    id: pk(),
    tenantId: tenantId(),
    stationId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("station_id").notNull().references(()=>checkinStations.id, {
        onDelete: "cascade"
    }),
    /** The id the station gave it, before it had a network to ask. */ eventId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("event_id").notNull(),
    /** "checkin" or "checkout". */ kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("kind").notNull(),
    /** When it happened at the station, which is not when it arrived here. */ happenedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("happened_at", {
        withTimezone: true
    }).notNull(),
    /** "applied", or the name of what stopped it. */ outcome: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("outcome").notNull(),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("offline_event_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("offline_event_station_idx").on(t.tenantId, t.stationId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("offline_event_unique").on(t.tenantId, t.eventId)
    ]);
const incidentReports = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("incident_reports", {
    id: pk(),
    tenantId: tenantId(),
    /** The child it happened to. */ memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "cascade"
    }),
    /** The class they were in, where they were in one. */ roomId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("room_id").references(()=>checkinRooms.id, {
        onDelete: "set null"
    }),
    /** The service it happened at, where it was during one. */ occurrenceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("occurrence_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$gatherings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["serviceOccurrences"].id, {
        onDelete: "set null"
    }),
    /** The day it happened, which is not always the day it was written. */ occurredOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("occurred_on").notNull(),
    /**
     * Who was in the room. Free text until serving is built (F10), because a
     * church that cannot name the members present at all writes nothing down.
     */ volunteers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("volunteers").notNull().default(""),
    /** What happened, in the words of whoever saw it. */ description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("description").notNull(),
    /** What was done about it. */ action: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("action").notNull(),
    /** R8.13. Whether the guardian was told, and when. */ guardianNotified: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("guardian_notified").notNull().default(false),
    notifiedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("notified_at", {
        withTimezone: true
    }),
    notifiedBy: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("notified_by"),
    /** Who wrote it. */ reportedBy: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("reported_by"),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("incident_tenant_idx").on(t.tenantId, t.occurredOn),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("incident_person_idx").on(t.tenantId, t.memberId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("incident_room_idx").on(t.tenantId, t.roomId)
    ]);
}),
"[project]/packages/db/src/schema/groups.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "groupAttendance",
    ()=>groupAttendance,
    "groupJoinRequests",
    ()=>groupJoinRequests,
    "groupMeetings",
    ()=>groupMeetings,
    "groupMemberships",
    ()=>groupMemberships,
    "groupTypes",
    ()=>groupTypes,
    "groups",
    ()=>groups
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/sql/sql.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/integer.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/boolean.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/date.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/members.ts [app-rsc] (ecmascript)");
;
;
;
;
const pk = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom();
const tenantId = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    });
const created = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).defaultNow().notNull();
const updated = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("updated_at", {
        withTimezone: true
    }).defaultNow().notNull();
const groupTypes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("group_types", {
    id: pk(),
    tenantId: tenantId(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    /**
     * R9.5. What this kind of group is, in the church's words, shown at the top
     * of its section in the finder. This is where a church says "Life Groups
     * exist to help you grow" and when the next term starts.
     */ description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("description"),
    hue: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("hue").notNull().default("sky"),
    position: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("position").notNull().default(0),
    archivedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("archived_at", {
        withTimezone: true
    }),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("group_type_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("group_type_name_unique").on(t.tenantId, t.name)
    ]);
const groups = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("groups", {
    id: pk(),
    tenantId: tenantId(),
    campusId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("campus_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["campuses"].id, {
        onDelete: "set null"
    }),
    typeId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("type_id").references(()=>groupTypes.id, {
        onDelete: "set null"
    }),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    /** R9.2. The readable part of its address, unique within the church. */ slug: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("slug").notNull(),
    /**
     * R9.5. "draft" or "published".
     *
     * The finder and the group's own public page are places a church shows the
     * world, so a group is written first and published when it is ready.
     */ status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("status").notNull().default("draft"),
    /** What it is for, in the leader's words. Shown in the finder. */ description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("description"),
    /** 0 Sunday to 6 Saturday. Null for a group with no weekly pattern. */ dayOfWeek: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("day_of_week"),
    /** 24-hour HH:MM, so it sorts and a timezone never gets involved. */ startsAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("starts_at"),
    /** When it finishes, because "7:15 to 8:45" is what members need to know. */ endsAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("ends_at"),
    /**
     * "daily", "weekly", "fortnightly", "monthly", or null where it is
     * irregular. Fortnightly is written on screen as every other week, which is
     * what a church says.
     */ frequency: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("frequency"),
    /**
     * R9.2. The day the group stops meeting, where it has one.
     *
     * A class runs for eight weeks and a small group runs until it does not, so
     * most groups leave this empty. Where it is set, the dates stop there.
     */ endsOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("ends_on"),
    /** Where it meets, as somebody would tell a newcomer: "The Hall", "U-City". */ location: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("location"),
    /**
     * R9.5. The street address, where the church is willing to publish one.
     *
     * Separate from the location because "The Hall" is what you say and
     * "6350 Delmar Blvd" is what a map needs, and a group meeting in a home
     * often has the first and deliberately not the second. Held in parts for
     * the same reason a person's address is: a map and a mail merge both need
     * the city on its own.
     */ addressLine1: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("address_line1"),
    addressLine2: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("address_line2"),
    city: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("city"),
    region: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("region"),
    postalCode: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("postal_code"),
    country: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("country"),
    /** How many it holds. Null means the church has not said. */ capacity: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("capacity"),
    /**
     * R9.2. A picture of the group, in the church bucket.
     *
     * The finder is a wall of cards, and a card with a photograph of eight
     * members round a table says what a paragraph cannot: this is a real group
     * of real members and you would not be the only new one. Null is a working
     * state, and most groups will stay that way.
     */ photoKey: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("photo_key"),
    /**
     * R9.5. Who the group is for, as a church says it: anyone, men, women,
     * young adults, students, seniors, parents. One field rather than a gender
     * and an age range, because a church writes "Young adults" on the poster
     * and nobody fills in two dropdowns to say it.
     */ forWhom: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("for_whom"),
    /** R9.5. It meets online, so where it is does not narrow it. */ online: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("online").notNull().default(false),
    /** R9.5. The question every parent asks before they ask anything else. */ childrenWelcome: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("children_welcome").notNull().default(false),
    /** R9.5. Whether the finder offers a join request. */ openToJoin: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("open_to_join").notNull().default(true),
    /** R9.5. Whether members see it in the finder at all. */ listed: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("listed").notNull().default(true),
    archivedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("archived_at", {
        withTimezone: true
    }),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("group_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("group_type_idx").on(t.tenantId, t.typeId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("group_day_idx").on(t.tenantId, t.dayOfWeek),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("group_status_idx").on(t.tenantId, t.status),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("group_name_unique").on(t.tenantId, t.name),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("group_slug_unique").on(t.tenantId, t.slug)
    ]);
const groupMemberships = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("group_memberships", {
    id: pk(),
    tenantId: tenantId(),
    groupId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("group_id").notNull().references(()=>groups.id, {
        onDelete: "cascade"
    }),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "cascade"
    }),
    /** "leader", "coleader" or "member". */ role: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("role").notNull().default("member"),
    joinedOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("joined_on").notNull(),
    leftOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("left_on"),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("group_member_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("group_member_group_idx").on(t.tenantId, t.groupId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("group_member_person_idx").on(t.tenantId, t.memberId),
        // One live membership a person a group. Somebody who leaves and comes back
        // gets a second row, which is the history worth keeping, so the uniqueness
        // only covers the live one.
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("group_member_live_unique").on(t.groupId, t.memberId).where(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`${t.leftOn} is null`)
    ]);
const groupMeetings = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("group_meetings", {
    id: pk(),
    tenantId: tenantId(),
    groupId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("group_id").notNull().references(()=>groups.id, {
        onDelete: "cascade"
    }),
    metOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("met_on").notNull(),
    /** R9.7. Marked rather than deleted, because not meeting is information. */ notHeld: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("not_held").notNull().default(false),
    note: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("note"),
    /** The leader who recorded it. */ recordedBy: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("recorded_by"),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("group_meeting_tenant_idx").on(t.tenantId, t.metOn),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("group_meeting_group_idx").on(t.tenantId, t.groupId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("group_meeting_unique").on(t.groupId, t.metOn)
    ]);
const groupAttendance = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("group_attendance", {
    id: pk(),
    tenantId: tenantId(),
    meetingId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("meeting_id").notNull().references(()=>groupMeetings.id, {
        onDelete: "cascade"
    }),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "cascade"
    }),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("group_attendance_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("group_attendance_meeting_idx").on(t.tenantId, t.meetingId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("group_attendance_person_idx").on(t.tenantId, t.memberId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("group_attendance_unique").on(t.meetingId, t.memberId)
    ]);
const groupJoinRequests = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("group_join_requests", {
    id: pk(),
    tenantId: tenantId(),
    groupId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("group_id").notNull().references(()=>groups.id, {
        onDelete: "cascade"
    }),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "cascade"
    }),
    /** What they said when they asked. Optional, and usually empty. */ message: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("message"),
    /** "pending", "approved" or "declined". */ status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("status").notNull().default("pending"),
    decidedBy: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("decided_by"),
    decidedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("decided_at", {
        withTimezone: true
    }),
    /** R9.6. Whether the person has been told the answer. */ notifiedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("notified_at", {
        withTimezone: true
    }),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("join_request_tenant_idx").on(t.tenantId, t.status),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("join_request_group_idx").on(t.tenantId, t.groupId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("join_request_person_idx").on(t.tenantId, t.memberId),
        // One open request a person a group. Asking twice is the same asking.
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("join_request_open_unique").on(t.groupId, t.memberId).where(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`${t.status} = 'pending'`)
    ]);
}),
"[project]/packages/db/src/schema/followups.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "followUps",
    ()=>followUps,
    "pipelineEntries",
    ()=>pipelineEntries,
    "pipelineSteps",
    ()=>pipelineSteps,
    "pipelines",
    ()=>pipelines
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/sql/sql.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/integer.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/date.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/members.ts [app-rsc] (ecmascript)");
;
;
;
;
const pk = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom();
const tenantId = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    });
const created = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).defaultNow().notNull();
const updated = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("updated_at", {
        withTimezone: true
    }).defaultNow().notNull();
const pipelines = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("pipelines", {
    id: pk(),
    tenantId: tenantId(),
    /** What the code triggers on: first_visit, second_visit, absent, and so on. */ key: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("key").notNull(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("description"),
    hue: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("hue").notNull().default("sky"),
    position: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("position").notNull().default(0),
    /** R5.3. Who the steps land on when nobody is named. */ ownerUserId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("owner_user_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appUsers"].id, {
        onDelete: "set null"
    }),
    /** Off means nobody is added to it, by hand or by a trigger. */ archivedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("archived_at", {
        withTimezone: true
    }),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("pipeline_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("pipeline_key_unique").on(t.tenantId, t.key)
    ]);
const pipelineSteps = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("pipeline_steps", {
    id: pk(),
    tenantId: tenantId(),
    pipelineId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("pipeline_id").notNull().references(()=>pipelines.id, {
        onDelete: "cascade"
    }),
    position: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("position").notNull().default(0),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    /** Days after somebody enters the pipeline that this step is due. */ dueDays: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("due_days").notNull().default(2),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("pipeline_step_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("pipeline_step_pipeline_idx").on(t.tenantId, t.pipelineId)
    ]);
const pipelineEntries = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("pipeline_entries", {
    id: pk(),
    tenantId: tenantId(),
    pipelineId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("pipeline_id").notNull().references(()=>pipelines.id, {
        onDelete: "cascade"
    }),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "cascade"
    }),
    /** open, done, or left. */ status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("status").notNull().default("open"),
    /** What put them here: by_hand, first_visit, second_visit, absent, milestone. */ reason: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("reason").notNull().default("by_hand"),
    startedOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("started_on").notNull(),
    closedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("closed_at", {
        withTimezone: true
    }),
    /** R5.4. Why they came out, in the church's own words. */ exitReason: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("exit_reason"),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("pipeline_entry_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("pipeline_entry_person_idx").on(t.tenantId, t.memberId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("pipeline_entry_pipeline_idx").on(t.tenantId, t.pipelineId, t.status),
        // One open entry per person per pipeline. A visitor who comes twice in a
        // fortnight is welcomed once.
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("pipeline_entry_open_unique").on(t.tenantId, t.pipelineId, t.memberId).where(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`status = 'open'`)
    ]);
const followUps = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("follow_ups", {
    id: pk(),
    tenantId: tenantId(),
    entryId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("entry_id").references(()=>pipelineEntries.id, {
        onDelete: "cascade"
    }),
    stepId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("step_id").references(()=>pipelineSteps.id, {
        onDelete: "set null"
    }),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "cascade"
    }),
    title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("title").notNull(),
    assigneeUserId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("assignee_user_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appUsers"].id, {
        onDelete: "set null"
    }),
    dueOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("due_on"),
    position: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("position").notNull().default(0),
    doneAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("done_at", {
        withTimezone: true
    }),
    doneByUserId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("done_by_user_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appUsers"].id, {
        onDelete: "set null"
    }),
    /** R5.1. What happened, written when it is marked done. */ outcome: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("outcome"),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("follow_up_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("follow_up_person_idx").on(t.tenantId, t.memberId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("follow_up_entry_idx").on(t.tenantId, t.entryId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("follow_up_queue_idx").on(t.tenantId, t.assigneeUserId, t.doneAt)
    ]);
}),
"[project]/packages/db/src/schema/directory.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "directoryPreferences",
    ()=>directoryPreferences
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/boolean.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/members.ts [app-rsc] (ecmascript)");
;
;
;
const pk = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom();
const tenantId = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    });
const directoryPreferences = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("directory_preferences", {
    id: pk(),
    tenantId: tenantId(),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "cascade"
    }),
    /** R3.3. Off means absent from the member directory, still in the database. */ listed: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("listed").notNull().default(true),
    showEmail: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("show_email").notNull().default(false),
    showPhone: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("show_phone").notNull().default(false),
    showAddress: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("show_address").notNull().default(false),
    showBirthday: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("show_birthday").notNull().default(false),
    showPhoto: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("show_photo").notNull().default(false),
    /**
     * R3.4. Set by the head of the household: whether the children in it appear
     * at all. Never carries contact details with it.
     */ showChildren: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("show_children").notNull().default(false),
    updatedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("updated_at", {
        withTimezone: true
    }).defaultNow().notNull()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("directory_prefs_person_key").on(t.tenantId, t.memberId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("directory_prefs_tenant_idx").on(t.tenantId)
    ]);
}),
"[project]/packages/db/src/schema/lists.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "savedListMembers",
    ()=>savedListMembers,
    "savedLists",
    ()=>savedLists
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/jsonb.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/members.ts [app-rsc] (ecmascript)");
;
;
;
const savedLists = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("saved_lists", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    }),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    /** "static" for a set somebody picked, "rule" for one that answers itself. */ kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("kind").notNull().default("static"),
    /** The directory filters, for a rule list. Null on a static one. */ rule: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsonb"])("rule").$type(),
    createdByUserId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("created_by_user_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appUsers"].id, {
        onDelete: "set null"
    }),
    archivedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("archived_at", {
        withTimezone: true
    }),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).defaultNow().notNull(),
    updatedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("updated_at", {
        withTimezone: true
    }).defaultNow().notNull()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("saved_lists_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("saved_lists_name_unique").on(t.tenantId, t.name)
    ]);
const savedListMembers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("saved_list_members", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    }),
    listId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("list_id").notNull().references(()=>savedLists.id, {
        onDelete: "cascade"
    }),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "cascade"
    }),
    addedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("added_at", {
        withTimezone: true
    }).defaultNow().notNull()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("saved_list_members_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("saved_list_members_unique").on(t.listId, t.memberId)
    ]);
}),
"[project]/packages/db/src/schema/serving.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "blockoutDates",
    ()=>blockoutDates,
    "servingAssignments",
    ()=>servingAssignments,
    "servingPreferences",
    ()=>servingPreferences,
    "teamMemberPositions",
    ()=>teamMemberPositions,
    "teamMembers",
    ()=>teamMembers,
    "teamPositions",
    ()=>teamPositions,
    "teams",
    ()=>teams
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/sql/sql.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/integer.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/boolean.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/date.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$primary$2d$keys$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/primary-keys.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$gatherings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/gatherings.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/members.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/enums.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
const pk = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom();
const tenantId = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    });
const created = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).defaultNow().notNull();
const updated = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("updated_at", {
        withTimezone: true
    }).defaultNow().notNull();
const teams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("teams", {
    id: pk(),
    tenantId: tenantId(),
    campusId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("campus_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["campuses"].id, {
        onDelete: "set null"
    }),
    /** R24.6. The readable part of its address, unique within the church. */ slug: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("slug").notNull(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    /** What the team does, in the church's words. */ description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("description"),
    hue: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["hue"])("hue").notNull().default("teal"),
    position: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("position").notNull().default(0),
    archivedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("archived_at", {
        withTimezone: true
    }),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("team_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("team_name_unique").on(t.tenantId, t.name)
    ]);
const teamPositions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("team_positions", {
    id: pk(),
    tenantId: tenantId(),
    teamId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("team_id").notNull().references(()=>teams.id, {
        onDelete: "cascade"
    }),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    /**
     * R10.9. Whether this position puts somebody with children. Separate from
     * the team, because the kids team has a room leader who is with children
     * and a check-in desk volunteer who is not.
     */ withChildren: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("with_children").notNull().default(false),
    /**
     * R10.2. Whether a valid background check is required before anybody is
     * scheduled here. The hard gate that reads it is R10.9, in the children's
     * ministry pass. This records the church's decision now, so the gate has
     * something to enforce when it lands.
     */ requiresCheck: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("requires_check").notNull().default(false),
    /** How many the church wants in this position at one service. */ needed: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("needed").notNull().default(1),
    position: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("position").notNull().default(0),
    archivedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("archived_at", {
        withTimezone: true
    }),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("team_position_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("team_position_team_idx").on(t.tenantId, t.teamId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("team_position_name_unique").on(t.teamId, t.name)
    ]);
const teamMembers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("team_members", {
    id: pk(),
    tenantId: tenantId(),
    teamId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("team_id").notNull().references(()=>teams.id, {
        onDelete: "cascade"
    }),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "cascade"
    }),
    /** "leader" or "member". A co-leader is a leader. */ role: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("role").notNull().default("member"),
    joinedOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("joined_on").notNull(),
    leftOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("left_on"),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("team_member_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("team_member_team_idx").on(t.tenantId, t.teamId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("team_member_person_idx").on(t.tenantId, t.memberId),
        // One live membership a person a team. Somebody who steps off and comes
        // back gets a second row, which is the history worth keeping.
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("team_member_live_unique").on(t.teamId, t.memberId).where(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`${t.leftOn} is null`)
    ]);
const teamMemberPositions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("team_member_positions", {
    tenantId: tenantId(),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>teamMembers.id, {
        onDelete: "cascade"
    }),
    positionId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("position_id").notNull().references(()=>teamPositions.id, {
        onDelete: "cascade"
    }),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$primary$2d$keys$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["primaryKey"])({
            columns: [
                t.memberId,
                t.positionId
            ]
        }),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("tmp_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("tmp_position_idx").on(t.tenantId, t.positionId)
    ]);
const servingAssignments = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("serving_assignments", {
    id: pk(),
    tenantId: tenantId(),
    occurrenceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("occurrence_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$gatherings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["serviceOccurrences"].id, {
        onDelete: "cascade"
    }),
    teamId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("team_id").notNull().references(()=>teams.id, {
        onDelete: "cascade"
    }),
    positionId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("position_id").notNull().references(()=>teamPositions.id, {
        onDelete: "cascade"
    }),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "cascade"
    }),
    /** "pending", "accepted" or "declined". */ status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("status").notNull().default("pending"),
    /**
     * R10.6. The link a volunteer answers on, with no sign-in.
     *
     * Generated by the database so a row cannot exist without one. It is a
     * bearer credential: whoever holds it can answer for this person, on this
     * one assignment, and see nothing else.
     */ respondToken: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("respond_token").notNull().default(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"]`replace(gen_random_uuid()::text, '-', '')`),
    /** R10.6. Why they cannot, in their own words, where they gave one. */ declineReason: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("decline_reason"),
    respondedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("responded_at", {
        withTimezone: true
    }),
    /**
     * R10.4. True where the scheduler was warned and went ahead: a blockout, or
     * somebody already serving at that hour. Kept because the answer to "why is
     * she down twice" has to be answerable later.
     */ overridden: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("overridden").notNull().default(false),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("assignment_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("assignment_occurrence_idx").on(t.tenantId, t.occurrenceId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("assignment_person_idx").on(t.tenantId, t.memberId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("assignment_team_idx").on(t.tenantId, t.teamId, t.occurrenceId),
        // The same person is not put in the same position twice at one service.
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("assignment_unique").on(t.occurrenceId, t.positionId, t.memberId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("assignment_token_unique").on(t.respondToken)
    ]);
const blockoutDates = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("blockout_dates", {
    id: pk(),
    tenantId: tenantId(),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "cascade"
    }),
    startsOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("starts_on").notNull(),
    endsOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("ends_on").notNull(),
    /** "Away", "Surgery". Theirs, and nobody is required to give one. */ reason: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("reason"),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("blockout_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("blockout_person_idx").on(t.tenantId, t.memberId, t.startsOn)
    ]);
const servingPreferences = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("serving_preferences", {
    tenantId: tenantId(),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "cascade"
    }),
    /** "weekly", "fortnightly", "monthly", "quarterly". */ frequency: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("frequency").notNull(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$primary$2d$keys$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["primaryKey"])({
            columns: [
                t.memberId
            ]
        }),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("serving_pref_tenant_idx").on(t.tenantId)
    ]);
}),
"[project]/packages/db/src/schema/plans.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "planItemFiles",
    ()=>planItemFiles,
    "planItemNotes",
    ()=>planItemNotes,
    "planItems",
    ()=>planItems,
    "planTemplateItems",
    ()=>planTemplateItems,
    "planTemplates",
    ()=>planTemplates,
    "servicePlans",
    ()=>servicePlans
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/integer.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$gatherings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/gatherings.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$serving$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/serving.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/members.ts [app-rsc] (ecmascript)");
;
;
;
;
;
const pk = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom();
const tenantId = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    });
const created = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).defaultNow().notNull();
const updated = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("updated_at", {
        withTimezone: true
    }).defaultNow().notNull();
const servicePlans = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("service_plans", {
    id: pk(),
    tenantId: tenantId(),
    occurrenceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("occurrence_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$gatherings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["serviceOccurrences"].id, {
        onDelete: "cascade"
    }),
    /** What this service is called on the plan, where it differs from the name on the calendar. */ title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("title"),
    /** "Advent", "The Sermon on the Mount". The run of weeks this belongs to. */ series: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("series"),
    /** The one idea of the day, in the leader's words. */ theme: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("theme"),
    /**
     * R11.11. Live mode. The item the service is on, when the service
     * started, and when that item started.
     *
     * Held on the plan rather than in a session, because the team is following
     * on their own phones and a leader's browser tab is not somewhere a team
     * can read from. All three are null between services.
     */ liveItemId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("live_item_id"),
    liveStartedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("live_started_at", {
        withTimezone: true
    }),
    liveItemAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("live_item_at", {
        withTimezone: true
    }),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("plan_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("plan_occurrence_unique").on(t.occurrenceId)
    ]);
const planItems = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("plan_items", {
    id: pk(),
    tenantId: tenantId(),
    planId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("plan_id").notNull().references(()=>servicePlans.id, {
        onDelete: "cascade"
    }),
    /**
     * "song", "scripture", "sermon", "announcement", "media", "prayer",
     * "offering" or "custom". Text rather than an enum, because a church that
     * runs a thing we have no word for should not be blocked by a migration.
     */ kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("kind").notNull().default("custom"),
    title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("title").notNull(),
    /** What happens, for whoever is reading the plan rather than running it. */ description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("description"),
    minutes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("minutes").notNull().default(5),
    position: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("position").notNull().default(0),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("plan_item_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("plan_item_plan_idx").on(t.tenantId, t.planId, t.position)
    ]);
const planItemNotes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("plan_item_notes", {
    id: pk(),
    tenantId: tenantId(),
    itemId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("item_id").notNull().references(()=>planItems.id, {
        onDelete: "cascade"
    }),
    body: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("body").notNull(),
    teamId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("team_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$serving$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["teams"].id, {
        onDelete: "cascade"
    }),
    positionId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("position_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$serving$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["teamPositions"].id, {
        onDelete: "cascade"
    }),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "cascade"
    }),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("plan_note_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("plan_note_item_idx").on(t.tenantId, t.itemId)
    ]);
const planItemFiles = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("plan_item_files", {
    id: pk(),
    tenantId: tenantId(),
    itemId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("item_id").notNull().references(()=>planItems.id, {
        onDelete: "cascade"
    }),
    fileId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("file_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["storedFiles"].id, {
        onDelete: "cascade"
    }),
    /** What to call it on screen. Falls back to the kind of file it is. */ label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("label"),
    position: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("position").notNull().default(0),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("plan_file_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("plan_file_item_idx").on(t.tenantId, t.itemId, t.position),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("plan_file_unique").on(t.itemId, t.fileId)
    ]);
const planTemplates = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("plan_templates", {
    id: pk(),
    tenantId: tenantId(),
    /** "Morning service", "Carols", "Midweek". What the church calls the shape. */ name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("plan_template_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("plan_template_name_unique").on(t.tenantId, t.name)
    ]);
const planTemplateItems = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("plan_template_items", {
    id: pk(),
    tenantId: tenantId(),
    templateId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("template_id").notNull().references(()=>planTemplates.id, {
        onDelete: "cascade"
    }),
    kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("kind").notNull().default("custom"),
    title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("title").notNull(),
    minutes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("minutes").notNull().default(5),
    position: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("position").notNull().default(0),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("plan_template_item_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("plan_template_item_idx").on(t.tenantId, t.templateId, t.position)
    ]);
}),
"[project]/packages/db/src/schema/forms.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "formFields",
    ()=>formFields,
    "formSubmissions",
    ()=>formSubmissions,
    "forms",
    ()=>forms
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/boolean.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/integer.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/jsonb.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/enums.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/members.ts [app-rsc] (ecmascript)");
;
;
;
;
const pk = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom();
const tenantId = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    });
const created = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).defaultNow().notNull();
const updated = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("updated_at", {
        withTimezone: true
    }).defaultNow().notNull();
const forms = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("forms", {
    id: pk(),
    tenantId: tenantId(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    /** The words at the top of the form, in the church's own voice. Markdown. */ intro: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("intro"),
    /**
     * R24.4. The form's colour, from the same twelve the rest of the product
     * assigns to things. It paints the cover and the heading band.
     */ hue: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["hue"])("hue").notNull().default("indigo"),
    /** R4.1. The picture across the top, where a church uploaded one. */ coverKey: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("cover_key"),
    /** The part of the public link that names this form. */ slug: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("slug").notNull(),
    /**
     * R14.5. The event whose registration questions these are, or null.
     *
     * A form with an event belongs to that event's Register section and never
     * shows in the Forms list, which keeps that list the standalone forms a
     * church actually goes looking for.
     *
     * No foreign key, because the event points at the form as well and two
     * references in a circle make either row impossible to insert first. The
     * event's reference is the one that cascades.
     */ eventId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("event_id"),
    /** "draft", "open" or "closed". A draft has no public link. */ status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("status").notNull().default("draft"),
    /**
     * R4.9. How many submissions this form takes before it closes itself.
     *
     * Null means no limit. A church running a sign-up for twelve places sets
     * twelve, and the form closes rather than a volunteer having to watch it.
     */ submissionLimit: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("submission_limit"),
    /** What somebody reads after sending it, in the church's own words. */ thanks: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("thanks"),
    archivedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("archived_at", {
        withTimezone: true
    }),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("form_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("form_slug_unique").on(t.tenantId, t.slug)
    ]);
const formFields = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("form_fields", {
    id: pk(),
    tenantId: tenantId(),
    formId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("form_id").notNull().references(()=>forms.id, {
        onDelete: "cascade"
    }),
    /**
     * "text", "long_text", "email", "phone", "number", "date", "select",
     * "multi_select", "checkbox", "file" or "section".
     */ kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("kind").notNull(),
    label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("label").notNull(),
    /** The church's own clarifier under the question. Theirs to write. */ help: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("help"),
    required: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("required").notNull().default(false),
    /** The choices, for a select or a multi-select. */ options: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("options").array(),
    /** R4.1. How many files a file question takes, and of what kind. */ maxFiles: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("max_files").notNull().default(1),
    /** "any", "images" or "documents". */ fileKinds: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("file_kinds").notNull().default("any"),
    position: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("position").notNull().default(0),
    /**
     * R4.2. The earlier question this one waits on, when it waits on one.
     *
     * A church asking "are you new here?" wants the three follow-up questions
     * to appear for the members who say yes and stay out of everybody else's
     * way. One condition per question is the whole feature: a builder with and
     * and or in it is a builder Maria closes.
     *
     * Cleared rather than orphaned when the earlier question goes, so a
     * condition always points at a question that exists.
     */ showWhenFieldId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("show_when_field_id").references(()=>formFields.id, {
        onDelete: "set null"
    }),
    /** "is", "is_not", "answered" or "blank". */ showWhenOp: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("show_when_op"),
    /** The answer being matched, for "is" and "is_not". */ showWhenValue: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("show_when_value"),
    /**
     * R4.4. Which part of a person's record this answer is, or null.
     *
     * One of the core keys `PERSON_TARGETS` names, or `custom:<field id>` for
     * one of the church's own fields. A church writes its questions in its own
     * words, so the label cannot be read for meaning and the builder asks once
     * here instead.
     */ mapsTo: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("maps_to"),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("form_field_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("form_field_form_idx").on(t.tenantId, t.formId, t.position)
    ]);
const formSubmissions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("form_submissions", {
    id: pk(),
    tenantId: tenantId(),
    formId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("form_id").notNull().references(()=>forms.id, {
        onDelete: "cascade"
    }),
    /** Question id to answer, the shape `FormAnswer` describes. */ answers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsonb"])("answers").notNull(),
    /**
     * R4.4. Who this turned out to be, once anybody is sure.
     *
     * Null while it is waiting for somebody to look, and null for a form that
     * asks nothing a person can be found by.
     */ memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "set null"
    }),
    /** "created", "matched", "review" or "none". */ matchState: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("match_state").notNull().default("none"),
    createdAt: created()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("form_submission_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("form_submission_form_idx").on(t.tenantId, t.formId, t.createdAt),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("form_submission_person_idx").on(t.tenantId, t.memberId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("form_submission_review_idx").on(t.tenantId, t.matchState)
    ]);
}),
"[project]/packages/db/src/schema/events.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "eventRegistrations",
    ()=>eventRegistrations,
    "events",
    ()=>events
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/integer.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/boolean.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/date.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/members.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$forms$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/forms.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/enums.ts [app-rsc] (ecmascript)");
;
;
;
;
;
const pk = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom();
const tenantId = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    });
const created = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).defaultNow().notNull();
const updated = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("updated_at", {
        withTimezone: true
    }).defaultNow().notNull();
const events = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("events", {
    id: pk(),
    tenantId: tenantId(),
    campusId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("campus_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["campuses"].id, {
        onDelete: "set null"
    }),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    /** The part of the public link that names this event. */ slug: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("slug").notNull(),
    /** R14.1. What it is, in the church's own words. Markdown. */ description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("description"),
    /** R24.4. The colour it wears on a card, a tile and its public page. */ hue: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["hue"])("hue").notNull().default("amber"),
    /** R14.1. The picture across the top. */ coverKey: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("cover_key"),
    /** R14.1. When it happens. An event with no end time runs as long as it runs. */ startsOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("starts_on").notNull(),
    startsAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("starts_at"),
    endsOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("ends_on"),
    endsAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("ends_at"),
    /** R14.1. Where, in the church's words, plus an address worth publishing. */ location: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("location"),
    addressLine1: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("address_line1"),
    addressLine2: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("address_line2"),
    city: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("city"),
    region: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("region"),
    postalCode: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("postal_code"),
    country: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("country"),
    /**
     * R14.1. "draft", "published" or "cancelled".
     *
     * A draft has no public page. A cancelled event keeps its page and says so,
     * because the members who registered will go looking for it.
     */ status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("status").notNull().default("draft"),
    /** R14.1. Whether anybody without an account can see it. */ listed: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("listed").notNull().default(true),
    /**
     * R14.1. Whether anybody signs up for this at all.
     *
     * A carol service is an announcement: there is a page, and nobody
     * registers. That is a different thing from registration being closed,
     * which is a thing the church does to an event that does take them.
     */ takesRegistrations: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("takes_registrations").notNull().default(true),
    /** R14.2, R14.4. Whether it is taking them right now. */ registrationOpen: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("registration_open").notNull().default(true),
    /** R14.4. The last day somebody can register. Null means up to the event. */ registrationClosesOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["date"])("registration_closes_on"),
    /**
     * R14.4. The time of day it closes, on that last day.
     *
     * Null means the end of the day, which is what a church means by "closes on
     * the 6th". A church that wants noon says noon.
     */ registrationClosesAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("registration_closes_at"),
    /** R14.4. How many places. Null means no limit. */ capacity: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["integer"])("capacity"),
    /**
     * R14.4. Whether the public page says how many places are left.
     *
     * A camp with eighty places reads well and moves members. A membership class
     * for twenty reads as a room half empty, and a church should get to decide
     * which of those it is showing.
     */ showCapacity: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("show_capacity").notNull().default(true),
    /**
     * R14.4. A full event takes names for a waiting list.
     *
     * Not asked any more. A church whose camp fills wants to know who else
     * wanted a place, and turning members away without a trace is the worse
     * outcome. The column stays because a church that one day wants to refuse
     * a full event outright should not need a migration to say so.
     */ waitlist: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("waitlist").notNull().default(true),
    /**
     * R14.5. The questions somebody answers when they register.
     *
     * A form of its own, so everything the form builder does is already here.
     * Null until the church adds questions, which is the common case: most
     * events want a name and a number of places and nothing else.
     */ formId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("form_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$forms$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["forms"].id, {
        onDelete: "set null"
    }),
    /** R14.1. Who to ask about it. */ contactMemberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("contact_member_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "set null"
    }),
    archivedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("archived_at", {
        withTimezone: true
    }),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("event_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("event_when_idx").on(t.tenantId, t.startsOn),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("event_slug_unique").on(t.tenantId, t.slug)
    ]);
const eventRegistrations = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("event_registrations", {
    id: pk(),
    tenantId: tenantId(),
    eventId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("event_id").notNull().references(()=>events.id, {
        onDelete: "cascade"
    }),
    /** R14.6. The others who were registered in the same breath. */ bookingId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("booking_id").notNull(),
    memberId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("member_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"].id, {
        onDelete: "set null"
    }),
    /** What they typed, kept whether or not a record was found. */ name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    email: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("email"),
    phone: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("phone"),
    /** "going", "waiting" or "cancelled". */ state: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("state").notNull().default("going"),
    /** R14.5. The answers to this event's questions, for this person. */ submissionId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("submission_id"),
    /**
     * R14.2. Taken while the event was a draft, so the church could walk
     * through its own registration. Cleared when the event is published.
     */ trial: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["boolean"])("trial").notNull().default(false),
    /** R14.10. When they turned up. */ arrivedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("arrived_at", {
        withTimezone: true
    }),
    note: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("note"),
    createdAt: created(),
    updatedAt: updated()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("event_reg_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("event_reg_event_idx").on(t.tenantId, t.eventId, t.state),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("event_reg_booking_idx").on(t.tenantId, t.bookingId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("event_reg_person_idx").on(t.tenantId, t.memberId)
    ]);
}),
"[project]/packages/db/src/schema/notifications.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "notifications",
    ()=>notifications
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/jsonb.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
;
;
const notifications = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("notifications", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    }),
    /** Who is being told. */ userId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("user_id").notNull(),
    /** What kind of thing happened, which picks the icon and the hue. */ kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("kind").notNull(),
    /** The i18n key for the line, and whatever it interpolates. */ messageKey: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("message_key").notNull(),
    params: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsonb"])("params").$type(),
    /** Where pressing it goes, relative and without the church parameter. */ href: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("href"),
    readAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("read_at", {
        withTimezone: true
    }),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).defaultNow().notNull()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("notification_tenant_idx").on(t.tenantId),
        // The unread count and the panel are both this shape.
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("notification_user_idx").on(t.tenantId, t.userId, t.readAt, t.createdAt)
    ]);
}),
"[project]/packages/db/src/schema/push.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "pushSubscriptions",
    ()=>pushSubscriptions
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
;
;
const pushSubscriptions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("push_subscriptions", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    }),
    /** The account this browser is signed in as. */ userId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("user_id").notNull(),
    endpoint: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("endpoint").notNull(),
    /** The subscription's public key, which the payload is encrypted to. */ p256dh: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("p256dh").notNull(),
    auth: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("auth").notNull(),
    /** Which browser this is, so somebody can tell two of their own apart. */ userAgent: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("user_agent"),
    /** When it last took a push, for clearing out what has gone quiet. */ usedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("used_at", {
        withTimezone: true
    }),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).defaultNow().notNull()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("push_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("push_user_idx").on(t.tenantId, t.userId),
        // One row an endpoint. A browser that re-subscribes replaces its own.
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("push_endpoint_unique").on(t.endpoint)
    ]);
}),
"[project]/packages/db/src/schema/reports.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "savedReports",
    ()=>savedReports
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/table.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/text.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/jsonb.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/drizzle-orm@0.38.4_@types+react@19.3.0_postgres@3.4.9_react@19.3.0/node_modules/drizzle-orm/pg-core/indexes.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
;
;
const savedReports = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pgTable"])("saved_reports", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom(),
    tenantId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("tenant_id").notNull().references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"].id, {
        onDelete: "cascade"
    }),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    /** R24.6. The readable part of its address, unique within the church. */ slug: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("slug").notNull(),
    /** "members", "attendance" or "followups". */ subject: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["text"])("subject").notNull(),
    spec: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsonb"])("spec").notNull().default({}),
    createdByUserId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uuid"])("created_by_user_id").references(()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appUsers"].id, {
        onDelete: "set null"
    }),
    /** R2.13. Archive, never hard delete. */ archivedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("archived_at", {
        withTimezone: true
    }),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).defaultNow().notNull(),
    updatedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["timestamp"])("updated_at", {
        withTimezone: true
    }).defaultNow().notNull()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["index"])("saved_reports_tenant_idx").on(t.tenantId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$drizzle$2d$orm$40$0$2e$38$2e$4_$40$types$2b$react$40$19$2e$3$2e$0_postgres$40$3$2e$4$2e$9_react$40$19$2e$3$2e$0$2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uniqueIndex"])("saved_reports_name_unique").on(t.tenantId, t.name)
    ]);
}),
"[project]/packages/db/src/schema/index.ts [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/enums.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/members.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$notes$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/notes.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$invitations$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/invitations.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$custom$2d$fields$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/custom-fields.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/imports.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$merges$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/merges.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$audit$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/audit.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$gatherings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/gatherings.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$checkin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/checkin.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/groups.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$followups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/followups.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$directory$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/directory.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$lists$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/lists.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$serving$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/serving.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$plans$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/plans.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$forms$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/forms.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$events$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/events.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$notifications$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/notifications.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$push$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/push.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$reports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/reports.ts [app-rsc] (ecmascript)");
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
"[project]/packages/db/src/schema/index.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "addresses",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addresses"],
    "appUsers",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appUsers"],
    "attendanceRecords",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$gatherings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["attendanceRecords"],
    "auditAction",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auditAction"],
    "auditEntries",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$audit$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auditEntries"],
    "backgroundCheckStatus",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["backgroundCheckStatus"],
    "backgroundChecks",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["backgroundChecks"],
    "blockoutDates",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$serving$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["blockoutDates"],
    "campuses",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["campuses"],
    "checkinCodes",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$checkin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["checkinCodes"],
    "checkinOfflineEvents",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$checkin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["checkinOfflineEvents"],
    "checkinOverrides",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$checkin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["checkinOverrides"],
    "checkinRooms",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$checkin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["checkinRooms"],
    "checkinStationRooms",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$checkin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["checkinStationRooms"],
    "checkinStationServices",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$checkin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["checkinStationServices"],
    "checkinStations",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$checkin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["checkinStations"],
    "checkinVisits",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$checkin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["checkinVisits"],
    "contactKind",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["contactKind"],
    "contactLabel",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["contactLabel"],
    "contactMethods",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["contactMethods"],
    "customFieldEntity",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["customFieldEntity"],
    "customFieldType",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["customFieldType"],
    "customFieldValues",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$custom$2d$fields$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["customFieldValues"],
    "customFields",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$custom$2d$fields$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["customFields"],
    "demoRecords",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["demoRecords"],
    "directoryPreferences",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$directory$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["directoryPreferences"],
    "eventRegistrations",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$events$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eventRegistrations"],
    "events",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$events$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["events"],
    "followUps",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$followups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["followUps"],
    "formFields",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$forms$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formFields"],
    "formSubmissions",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$forms$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["formSubmissions"],
    "forms",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$forms$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["forms"],
    "groupAttendance",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupAttendance"],
    "groupJoinRequests",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupJoinRequests"],
    "groupMeetings",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupMeetings"],
    "groupMemberships",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupMemberships"],
    "groupTypes",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groupTypes"],
    "groups",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["groups"],
    "householdMemberships",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["householdMemberships"],
    "householdRole",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["householdRole"],
    "households",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["households"],
    "hue",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["hue"],
    "importBatches",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importBatches"],
    "importOutcome",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importOutcome"],
    "importRows",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importRows"],
    "importStatus",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["importStatus"],
    "incidentReports",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$checkin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["incidentReports"],
    "invitations",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$invitations$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["invitations"],
    "lifecycleStatus",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["lifecycleStatus"],
    "locations",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["locations"],
    "memberTags",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["memberTags"],
    "members",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["members"],
    "milestoneKind",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["milestoneKind"],
    "milestones",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["milestones"],
    "noteClassification",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["noteClassification"],
    "notes",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$notes$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["notes"],
    "notifications",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$notifications$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["notifications"],
    "personMerges",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$merges$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["personMerges"],
    "pipelineEntries",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$followups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pipelineEntries"],
    "pipelineSteps",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$followups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pipelineSteps"],
    "pipelines",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$followups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pipelines"],
    "planItemFiles",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$plans$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["planItemFiles"],
    "planItemNotes",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$plans$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["planItemNotes"],
    "planItems",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$plans$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["planItems"],
    "planTemplateItems",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$plans$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["planTemplateItems"],
    "planTemplates",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$plans$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["planTemplates"],
    "pushSubscriptions",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$push$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pushSubscriptions"],
    "relationshipKind",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["relationshipKind"],
    "relationships",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["relationships"],
    "rooms",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rooms"],
    "savedListMembers",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$lists$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["savedListMembers"],
    "savedLists",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$lists$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["savedLists"],
    "savedReports",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$reports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["savedReports"],
    "serviceOccurrences",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$gatherings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["serviceOccurrences"],
    "servicePlans",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$plans$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["servicePlans"],
    "serviceTimes",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["serviceTimes"],
    "servingAssignments",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$serving$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["servingAssignments"],
    "servingPreferences",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$serving$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["servingPreferences"],
    "storedFiles",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["storedFiles"],
    "tags",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tags"],
    "teamMemberPositions",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$serving$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["teamMemberPositions"],
    "teamMembers",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$serving$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["teamMembers"],
    "teamPositions",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$serving$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["teamPositions"],
    "teams",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$serving$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["teams"],
    "tenantMembers",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenantMembers"],
    "tenantRole",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenantRole"],
    "tenantRoles",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenantRoles"],
    "tenants",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tenants"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/db/src/schema/index.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$enums$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/enums.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$tenancy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/tenancy.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$members$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/members.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$notes$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/notes.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$invitations$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/invitations.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$custom$2d$fields$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/custom-fields.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$imports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/imports.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$merges$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/merges.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$audit$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/audit.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$gatherings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/gatherings.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$checkin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/checkin.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$groups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/groups.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$followups$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/followups.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$directory$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/directory.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$lists$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/lists.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$serving$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/serving.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$plans$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/plans.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$forms$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/forms.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$events$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/events.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$notifications$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/notifications.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$push$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/push.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$db$2f$src$2f$schema$2f$reports$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/db/src/schema/reports.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=packages_db_src_schema_6fd2a3fd._.js.map