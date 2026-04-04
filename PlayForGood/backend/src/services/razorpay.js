import Razorpay from "razorpay";
import { env } from "../config/env.js";

let razorpay;

export function isRazorpayEnabled() {
  return Boolean(env.RAZORPAY_ENABLED);
}

export function getRazorpayClient() {
  if (!isRazorpayEnabled()) {
    throw new Error("Razorpay is disabled in this environment.");
  }

  if (razorpay) {
    return razorpay;
  }

  razorpay = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET
  });

  return razorpay;
}
