import { BRAND_NAME } from '../constants/brand'
import './LegalPage.css'

export default function TermsOfService() {
  return (
    <div className="legal-page">
      <h1>Terms of Service</h1>
      <p className="legal-updated">Last updated: February 2025</p>

      <p>
        Welcome to {BRAND_NAME}. By accessing or using our prediction markets platform, you agree to these Terms of Service (&quot;Terms&quot;). If you do not agree, do not use the platform.
      </p>

      <h2>Acceptance</h2>
      <p>
        By creating an account, connecting a wallet, or using any part of the platform, you confirm that you are of legal age and capacity to enter into these Terms and that you accept them in full.
      </p>

      <h2>Use of the Service</h2>
      <p>
        The platform allows you to trade on prediction markets using virtual Credits. You agree to use the service only for lawful purposes and in accordance with these Terms and any applicable laws. You must not misuse the platform, attempt to gain unauthorized access, or interfere with other users or our systems.
      </p>

      <h2>Accounts and Wallet</h2>
      <p>
        You may be required to connect a wallet or provide a Party ID and authentication credentials. You are responsible for keeping your credentials secure and for all activity under your account. Deposits and withdrawals may involve blockchain or ledger transactions; you are responsible for understanding and complying with the rules of those networks.
      </p>

      <h2>Trading and Virtual Credits</h2>
      <p>
        Trading on the platform is conducted in virtual Credits. Markets are automated (AMM-based). Outcomes, payouts, and fees are described in the documentation and on the relevant market pages. Past performance does not guarantee future results; trading involves risk.
      </p>

      <h2>Fees</h2>
      <p>
        Fees (if any) for trading, deposits, or withdrawals are described in the Docs and on the platform. We may change fee structures with reasonable notice where practicable.
      </p>

      <h2>Disclaimers</h2>
      <p>
        THE PLATFORM AND ALL CONTENT ARE PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT GUARANTEE UNINTERRUPTED, ERROR-FREE, OR SECURE OPERATION.
      </p>

      <h2>Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE AND OUR AFFILIATES, OFFICERS, AND EMPLOYEES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOSS OF PROFITS OR DATA, ARISING FROM YOUR USE OF THE PLATFORM OR INABILITY TO USE IT, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US (IF ANY) IN THE TWELVE MONTHS BEFORE THE CLAIM.
      </p>

      <h2>Changes to the Terms or Service</h2>
      <p>
        We may modify these Terms or the platform at any time. We will post updated Terms on this page and update the &quot;Last updated&quot; date. Material changes may be communicated via the platform or email where appropriate. Continued use after changes constitutes acceptance.
      </p>

      <h2>Termination</h2>
      <p>
        We may suspend or terminate your access to the platform if you breach these Terms or for other operational or legal reasons. You may stop using the platform at any time.
      </p>

      <h2>Contact</h2>
      <p>
        For questions about these Terms, please contact us through the support or contact channels provided on the platform.
      </p>
    </div>
  )
}
