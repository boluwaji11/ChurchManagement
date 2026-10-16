import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const BASE="http://localhost:4488", WHO="founder@newchurch.example.org";
const env=Object.fromEntries(readFileSync("/Users/boluwaji.oyewumi/Church Management/.env.local","utf8").split("\n").filter(l=>l.includes("=")&&!l.trimStart().startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^"|"$/g,"")];}));
const sb=env["NEXT_PUBLIC_SUPABASE_URL"], key=env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
const a=await fetch(`${sb}/auth/v1/token?grant_type=password`,{method:"POST",headers:{apikey:key,"content-type":"application/json"},body:JSON.stringify({email:WHO,password:env["SEED_USER_PASSWORD"]})});
const s=await a.json(); s.expires_at??=Math.floor(Date.now()/1000)+3600;
const v="base64-"+Buffer.from(JSON.stringify(s)).toString("base64url");
const n=`sb-${new URL(sb).hostname.split(".")[0]}-auth-token`, MAX=3180;
const parts=v.length<=MAX?[{name:n,value:v}]:Array.from({length:Math.ceil(v.length/MAX)},(_,i)=>({name:`${n}.${i}`,value:v.slice(i*MAX,(i+1)*MAX)}));
const b=await chromium.launch();
const c=await b.newContext({viewport:{width:1500,height:950}});
await c.addCookies(parts.map(p=>({...p,domain:"localhost",path:"/"})));
const page=await c.newPage(); const bad=[]; page.on("pageerror",e=>bad.push(String(e.message).slice(0,160)));
await page.goto(`${BASE}/settings/church`,{waitUntil:"domcontentloaded",timeout:90000});
await page.waitForLoadState("networkidle",{timeout:60000}).catch(()=>{});
await page.waitForTimeout(1500);
for (const tab of [/^About/, /^Members/]) {
  await page.getByRole("button", { name: tab }).first().click().catch(() => {});
  await page.waitForTimeout(600);
  const menu = await page.locator('[role="menu"], [role="dialog"]').last().innerText().catch(() => "");
  console.log(String(tab), "->", JSON.stringify(menu.replace(/\n+/g, " | ").slice(0, 200)));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
}
console.log("errors:", JSON.stringify(bad.slice(0,2)));
await b.close();
