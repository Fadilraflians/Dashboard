import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const BASE = "http://localhost:3000";
const COOKIE_JAR = tmpdir() + "/mfe-test-ai.txt";

async function main() {
  // 1. Login
  console.log("=== Step 1: Login ===");
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "dev@bni.co.id", password: "dev123" }),
  });
  const loginData = await loginRes.json();
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
  const sessionCookie = otpRes.headers.get("set-cookie");
  if (sessionCookie) writeFileSync(COOKIE_JAR, sessionCookie + "\n");

  // 3. Test Aigovtech chat
  console.log("\n=== Step 3: Aigovtech Chat ===");
  const chatRes = await fetch(`${BASE}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: sessionCookie ?? "" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Hai, siapa kamu?" }],
    }),
  });
  const chatData = await chatRes.json();
  console.log(`Status: ${chatRes.status}`);
  console.log(JSON.stringify(chatData, null, 2));

  console.log("\n=== All tests passed ===");
  rmSync(COOKIE_JAR, { force: true });
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});