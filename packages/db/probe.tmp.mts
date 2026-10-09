process.loadEnvFile("/Users/boluwaji.oyewumi/Church Management/.env.local");
const { owner, closeConnections } = await import("./src/client.ts");
const { sendPush, pushConfigured } = await import("./src/repo/push-send.ts");

console.log("configured:", pushConfigured());
const rows = await owner()`select id, endpoint, p256dh, auth from push_subscriptions`;
console.log("targets:", rows.length);
const result = await sendPush(rows as never, {
  title: "Riverside Fellowship",
  body: "Probe from the terminal. If you see this, push works.",
  href: "/messages/office",
  tag: "probe",
});
console.log("result:", result);
await closeConnections();
