/**
 * Run this ONCE, locally, on your own machine — never in Supabase/Deno.
 * It RSA-encrypts your Daraja initiator password with Safaricom's public
 * certificate using PKCS1 padding, which is what the B2C API expects as
 * "SecurityCredential". Node's crypto module supports PKCS1 padding
 * directly; Deno's Web Crypto API does not, which is why this can't run
 * inside the Edge Function itself.
 *
 * Usage:
 *   1. Download the sandbox cert from Daraja docs (Certificate for testing):
 *        https://developer.safaricom.co.ke -> Daraja API docs -> B2C -> "Test Credentials"
 *      Save it as ./SandboxCertificate.cer in this folder.
 *   2. node generate-security-credential.js "<your-initiator-password>"
 *   3. Copy the printed base64 string into your Supabase secret:
 *        supabase secrets set DARAJA_SECURITY_CREDENTIAL="<printed-value>"
 *
 * For sandbox testing, Safaricom's default initiator password is
 * "Safaricom999!*!" with initiator name "testapi" — confirm current
 * values in the Daraja docs, they occasionally change.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const password = process.argv[2];
if (!password) {
  console.error('Usage: node generate-security-credential.js "<initiator-password>"');
  process.exit(1);
}

const certPath = path.join(__dirname, "SandboxCertificate.cer");
if (!fs.existsSync(certPath)) {
  console.error(
    `Certificate not found at ${certPath}\n` +
    "Download it from the Daraja B2C 'Test Credentials' page and save it as SandboxCertificate.cer next to this script."
  );
  process.exit(1);
}

const cert = fs.readFileSync(certPath, "utf8");

const encrypted = crypto.publicEncrypt(
  {
    key: cert,
    padding: crypto.constants.RSA_PKCS1_PADDING,
  },
  Buffer.from(password, "utf8")
);

const securityCredential = encrypted.toString("base64");
console.log("\nDARAJA_SECURITY_CREDENTIAL=");
console.log(securityCredential);
console.log("\nSet it with:");
console.log(`supabase secrets set DARAJA_SECURITY_CREDENTIAL="${securityCredential}"`);
