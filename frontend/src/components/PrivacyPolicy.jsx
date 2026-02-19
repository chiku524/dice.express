import { BRAND_NAME } from '../constants/brand'
import './LegalPage.css'

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated: February 2025</p>

      <p>
        {BRAND_NAME} (&quot;we&quot;, &quot;our&quot;, or &quot;the platform&quot;) respects your privacy.
        This policy describes how we collect, use, and protect information when you use our prediction markets platform.
      </p>

      <h2>Information We Collect</h2>
      <p>We may collect:</p>
      <ul>
        <li><strong>Account data:</strong> Display name, account identifier (Party ID), and authentication-related data you provide when connecting a wallet or signing in.</li>
        <li><strong>Usage data:</strong> How you use the platform (e.g. pages visited, trades, positions) to operate and improve our services.</li>
        <li><strong>Technical data:</strong> Device and browser information, IP address, and similar data necessary for security and operation.</li>
      </ul>

      <h2>How We Use Your Information</h2>
      <p>We use collected information to:</p>
      <ul>
        <li>Provide, maintain, and improve the platform and trading experience.</li>
        <li>Process deposits, withdrawals, and trades using virtual Credits.</li>
        <li>Comply with legal obligations and enforce our terms.</li>
        <li>Communicate with you about the service where relevant.</li>
      </ul>

      <h2>Data Sharing and Third Parties</h2>
      <p>
        We do not sell your personal information. We may share data with service providers that help us operate the platform (e.g. hosting, analytics) under strict confidentiality.
        Where you use blockchain or ledger features, relevant data may be processed on those networks according to their rules.
      </p>

      <h2>Your Rights</h2>
      <p>
        Depending on your location, you may have rights to access, correct, or delete your personal data, or to object to or restrict certain processing.
        Contact us (see below) to exercise these rights.
      </p>

      <h2>Security</h2>
      <p>
        We use reasonable technical and organizational measures to protect your data. No system is completely secure; we encourage you to protect your credentials and use the platform responsibly.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will post the revised policy on this page and update the &quot;Last updated&quot; date. Continued use of the platform after changes constitutes acceptance of the updated policy.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy-related questions or requests, please contact us through the support or contact channels provided on the platform.
      </p>
    </div>
  )
}
