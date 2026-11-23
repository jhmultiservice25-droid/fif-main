/**
 * Development fallback only. In production, a missing mail provider must fail closed:
 * existing users must never receive a publicly visible fixed login code.
 */
export const FALLBACK_OTP = (process.env.OTP_FALLBACK_CODE ?? "123456").padStart(6, "0").slice(0, 6);

export const otpFallbackActive = () => process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY;
