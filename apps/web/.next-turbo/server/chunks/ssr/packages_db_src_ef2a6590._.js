module.exports = [
"[project]/packages/db/src/client.ts [app-rsc] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/packages_db_src_client_ts_6850e59d._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/packages/db/src/client.ts [app-rsc] (ecmascript)");
    });
});
}),
"[project]/packages/db/src/import/xlsx.ts [app-rsc] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.resolve().then(() => {
        return parentImport("[project]/packages/db/src/import/xlsx.ts [app-rsc] (ecmascript)");
    });
});
}),
];