# 🛡️ Security Policy

We take the security of **RaktaSetu NOOR** and Thalassemia patient information seriously. As an AI-for-good platform dealing with clinical forecasting and healthcare inventories, protecting system integrity and user privacy is our top priority.

---

## 🔑 Secret & Credentials Management

To prevent accidental leaks and potential compromises, all developers must strictly follow these rules:

1. **Never Commit Secrets:** Under no circumstances should private API keys, database passwords, or server secrets be committed to this repository. This includes:
   - Supabase keys (`SUPABASE_SERVICE_KEY`)
   - AI Engine credentials (`ANTHROPIC_API_KEY`)
   - Messaging credentials (`TWILIO_AUTH_TOKEN`)
   - Sarvam Voice keys (`SARVAM_API_KEY`)
   - JWT tokens or Session Secret Keys (`APP_SECRET_KEY`)
2. **Use Environment Isolation:** All secrets must live in your local `.env` file, which is actively ignored by `.gitignore`. 
3. **Automated Secret Scanning:** If you accidentally commit a secret, notify the team immediately, rotate the compromised key on the provider console (e.g., Twilio or Anthropic), and force-remove the commit from history.

---

## ⚕️ Patient Data Privacy (HIPAA / Digital Personal Data Protection)

While RaktaSetu NOOR operates as a hackathon prototype, it handles simulated medical records. Ensure that:
- No real-world Patient Identifiable Information (PII) is committed to seed files or test suites.
- Databases (`raktasetu.db`) are ignored from Git and never pushed.
- All mock data is anonymized and generated programmatically.

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability, please do **NOT** open a public issue. Instead, coordinate directly with the lead maintainer:

- **Contact Email:** `pushkar.prabhath@example.com` (replace with active contact)
- **Response SLA:** We aim to investigate and address reported vulnerabilities within **48 hours**.

Thank you for helping keep RaktaSetu NOOR secure for patients and donors!
