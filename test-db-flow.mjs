import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const BASE = "http://localhost:3000";
const COOKIE_JAR = tmpdir() + "/mfe-test-cookies.txt";

async function main() {
  // 1. Login
  console.log("=== Step 1: Login ===");
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "dev@bni.co.id", password: "dev123" }),
  });
  const loginData = await loginRes.json();
  console.log(JSON.stringify(loginData, null, 2));

  const setCookie = loginRes.headers.get("set-cookie");
  if (setCookie) writeFileSync(COOKIE_JAR, setCookie + "\n");

  const otpToken = loginData?.data?.otpToken;
  if (!otpToken) { console.error("No otpToken"); process.exit(1); }

  // 2. Verify OTP
  console.log("\n=== Step 2: Verify OTP ===");
  const otpRes = await fetch(`${BASE}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: setCookie ?? "" },
    body: JSON.stringify({ otpToken, otpCode: "123456" }),
  });
  const otpData = await otpRes.json();
  console.log(JSON.stringify(otpData, null, 2));

  const sessionCookie = otpRes.headers.get("set-cookie");
  if (sessionCookie) writeFileSync(COOKIE_JAR, sessionCookie + "\n");

  // 3. Access gateway - dashboard summary (from MySQL)
  console.log("\n=== Step 3: /api/gateway/dashboardBok/api/dashboard/summary ===");
  const gwRes = await fetch(`${BASE}/api/gateway/dashboardBok/api/dashboard/summary`, {
    headers: { Cookie: sessionCookie ?? "" },
  });
  const gwData = await gwRes.json();
  console.log(`Status: ${gwRes.status}`);
  console.log(JSON.stringify(gwData, null, 2));

  // 4. Access gateway - transactions (from MySQL)
  console.log("\n=== Step 4: /api/gateway/dashboardBok/api/dashboard/transactions ===");
  const txRes = await fetch(`${BASE}/api/gateway/dashboardBok/api/dashboard/transactions`, {
    headers: { Cookie: sessionCookie ?? "" },
  });
  const txData = await txRes.json();
  console.log(`Status: ${txRes.status}`);
  console.log(JSON.stringify(txData, null, 2));

  // 5. Access gateway - roles
  console.log("\n=== Step 5: /api/gateway/roleMgmt/api/roles/list ===");
  const roleRes = await fetch(`${BASE}/api/gateway/roleMgmt/api/roles/list`, {
    headers: { Cookie: sessionCookie ?? "" },
  });
  const roleData = await roleRes.json();
  console.log(`Status: ${roleRes.status}`);
  console.log(JSON.stringify(roleData, null, 2));

  console.log("\n=== All tests passed ===");
  rmSync(COOKIE_JAR, { force: true });
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});