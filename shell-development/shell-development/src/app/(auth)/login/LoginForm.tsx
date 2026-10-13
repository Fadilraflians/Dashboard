"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import styles from "./login.module.css";

// Static display label (hardcoded) — app name shown on the login screen.
const appName = "Portal MFE";

type Step = "credentials" | "otp";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/landing";

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, type: "2" }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(data.message || "Login gagal");
        setLoading(false);
        return;
      }

      // OTP challenge issued.
      setOtpToken(data.data?.otpToken ?? "");
      setMaskedEmail(data.data?.maskedEmail ?? "");
      setStep("otp");
      setLoading(false);
    } catch {
      setError("Tidak dapat terhubung ke server");
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpToken, otpCode }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(data.message || "OTP tidak valid");
        setLoading(false);
        return;
      }

      // Session cookie set — navigate so the server layout re-reads it.
      router.replace(callbackUrl);
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server");
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      {step === "credentials" ? (
        <form className={styles.card} onSubmit={handleCredentials}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>MF</span>
            <div>
              <h1 className={styles.title}>{appName}</h1>
              <p className={styles.subtitle}>Masuk untuk melanjutkan</p>
            </div>
          </div>

          {error && (
            <div className={styles.field}>
              <Message severity="error" text={error} style={{ width: "100%" }} />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <InputText
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@bni.co.id"
              autoComplete="username"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <Password
              inputId="password"
              className={styles.input}
              inputStyle={{ width: "100%" }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              feedback={false}
              toggleMask
              autoComplete="current-password"
              required
            />
          </div>

          <Button
            type="submit"
            label={loading ? "Memproses..." : "Masuk"}
            className={styles.submit}
            loading={loading}
            disabled={loading}
          />
        </form>
      ) : (
        <form className={styles.card} onSubmit={handleVerifyOtp}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>MF</span>
            <div>
              <h1 className={styles.title}>Verifikasi OTP</h1>
              <p className={styles.subtitle}>
                Kode OTP dikirim ke {maskedEmail || "email Anda"}
              </p>
            </div>
          </div>

          {error && (
            <div className={styles.field}>
              <Message severity="error" text={error} style={{ width: "100%" }} />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="otp">
              Kode OTP
            </label>
            <InputText
              id="otp"
              className={styles.input}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="Masukkan 6 digit OTP"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
          </div>

          <Button
            type="submit"
            label={loading ? "Memverifikasi..." : "Verifikasi"}
            className={styles.submit}
            loading={loading}
            disabled={loading}
          />

          <button
            type="button"
            className={styles.hint}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              marginTop: 12,
            }}
            onClick={() => {
              setStep("credentials");
              setOtpCode("");
              setError(null);
            }}
          >
            ← Kembali ke login
          </button>
        </form>
      )}
    </div>
  );
}
