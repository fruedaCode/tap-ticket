import type { LegalDocs } from './index'
import { COMPANY } from './company'

const AEPD = (
  <a href="https://www.aepd.es" target="_blank" rel="noreferrer">
    www.aepd.es
  </a>
)

export const en: LegalDocs = {
  privacy: {
    title: 'Privacy policy',
    body: (
      <>
        <p>
          This policy explains what personal data TapTicket collects, why, and what you can do about
          it. It is written for the EU General Data Protection Regulation (GDPR) and Spanish
          organic law 3/2018 (LOPDGDD).
        </p>

        <h2>1. Who is responsible for your data</h2>
        <p>
          Data controller: {COMPANY.name}, tax ID {COMPANY.taxId}, {COMPANY.address}. Privacy
          contact: <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>.
        </p>

        <h2>2. What we collect</h2>
        <ul>
          <li>
            <strong>Account:</strong> your email address, display name, avatar (taken from your
            Google account if you sign in with Google) and the app language you chose.
          </li>
          <li>
            <strong>Receipts:</strong> the photo you take of a receipt, and the restaurant, items,
            prices and totals extracted from it.
          </li>
          <li>
            <strong>Sharing:</strong> which tickets you belong to, which items you claimed, and the
            balance you owe or are owed.
          </li>
          <li>
            <strong>Settlements:</strong> payments you mark as made, and the payment proof image you
            optionally upload.
          </li>
          <li>
            <strong>Billing:</strong> your plan and the Stripe customer and subscription identifiers.
            Card numbers never reach our servers — Stripe collects and stores them.
          </li>
          <li>
            <strong>Analytics — only if you accept:</strong> pages viewed, in-app actions, browser and
            device type, approximate location derived from your IP address, and a pseudonymous
            identifier. If you reject analytics, none of this is collected.
          </li>
          <li>
            <strong>Technical logs:</strong> our server records errors and request metadata needed to
            keep the service running and secure.
          </li>
        </ul>

        <h2>3. Why we use it, and on what legal basis</h2>
        <ul>
          <li>
            To create your account, read your receipts, split bills and let you share them with other
            people — <strong>performance of a contract</strong> (GDPR art. 6(1)(b)).
          </li>
          <li>
            To take payment for paid plans and issue the corresponding records —{' '}
            <strong>contract</strong> and <strong>legal obligation</strong> (art. 6(1)(b) and (c)).
          </li>
          <li>
            To measure how the app is used and improve it — <strong>your consent</strong> (art.
            6(1)(a)), which you can withdraw at any time.
          </li>
          <li>
            To keep the service secure, prevent abuse and debug failures —{' '}
            <strong>legitimate interest</strong> (art. 6(1)(f)).
          </li>
        </ul>

        <h2>4. Who else processes your data</h2>
        <p>
          We use the following providers. Each acts as a processor on our instructions under a data
          processing agreement:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> — database, authentication and file storage (EU region).
          </li>
          <li>
            <strong>Mistral AI (France)</strong> — reads your receipt photo with an AI document model.
            Only the photo and a fixed instruction are sent; your name, email and account identifier
            are not. Mistral states that data sent through its API is not used to train its models.
          </li>
          <li>
            <strong>Stripe</strong> — payment processing for paid plans.
          </li>
          <li>
            <strong>PostHog (EU cloud)</strong> — product analytics. Only runs if you accept analytics.
          </li>
          <li>
            <strong>Google</strong> — only if you choose to sign in with Google.
          </li>
          <li>
            <strong>Fly.io</strong> — application hosting, Paris region.
          </li>
        </ul>
        <p>
          We never sell your data and never share it for advertising. People you share a ticket with
          can see your display name, your avatar, the items you claimed and your balance on that
          ticket — they cannot see your email address.
        </p>

        <h2>5. Where your data is processed</h2>
        <p>
          All processing takes place inside the European Union, including the AI reading of your
          receipt. We do not transfer your personal data outside the EU or the EEA.
        </p>

        <h2>6. How long we keep it</h2>
        <ul>
          <li>Receipts, tickets and settlements: until you delete them, or until you delete your account.</li>
          <li>Account data: until you delete your account, after which it is erased.</li>
          <li>Billing records: for as long as Spanish tax and accounting law requires.</li>
          <li>Analytics: retained by PostHog under its standard retention periods.</li>
        </ul>

        <h2>7. Your rights</h2>
        <p>
          You have the right to access, rectify, erase, restrict and object to the processing of your
          data, the right to data portability, and the right to withdraw consent at any time without
          affecting processing already carried out.
        </p>
        <ul>
          <li>
            <strong>Access and portability:</strong> Account → <em>Download my data</em> gives you a
            machine-readable JSON copy immediately.
          </li>
          <li>
            <strong>Rectification:</strong> edit your display name in Account; edit any receipt from
            the ticket screen.
          </li>
          <li>
            <strong>Erasure:</strong> Account → <em>Delete account</em> permanently deletes your
            account, receipts, images and payment proofs.
          </li>
          <li>
            <strong>Withdraw analytics consent:</strong> on the{' '}
            <a href="/legal/cookies">cookie policy</a> page.
          </li>
          <li>
            <strong>Anything else:</strong> write to{' '}
            <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>.
          </li>
        </ul>
        <p>
          If you believe we have mishandled your data you can complain to the Spanish data protection
          authority, Agencia Española de Protección de Datos, C/ Jorge Juan 6, 28001 Madrid ({AEPD}).
        </p>

        <h2>8. Artificial intelligence</h2>
        <p>
          TapTicket uses an AI vision model to read your receipt photo and turn it into a list of
          items and prices. The extraction is automatic and <strong>can be wrong</strong>: you can
          review and edit every item before sharing a ticket, and you should. No decision with legal
          or similarly significant effects on you is taken automatically (GDPR art. 22). We tell you
          on the scan screen, before you send the photo, that AI will process it.
        </p>

        <h2>9. Age</h2>
        <p>TapTicket is not intended for people under 14 years of age.</p>

        <h2>10. Changes</h2>
        <p>
          If we change this policy we will update the date shown at the top of this page and, for
          significant changes, tell you inside the app.
        </p>
      </>
    ),
  },

  terms: {
    title: 'Terms of service',
    body: (
      <>
        <h2>1. Who you are contracting with</h2>
        <p>
          TapTicket is operated by {COMPANY.name}, tax ID {COMPANY.taxId}, {COMPANY.address}, contact{' '}
          <a href={`mailto:${COMPANY.contactEmail}`}>{COMPANY.contactEmail}</a>. By using TapTicket you
          accept these terms.
        </p>

        <h2>2. The service</h2>
        <p>
          TapTicket lets you photograph a restaurant receipt, extracts its line items using an AI
          model, and lets you share the result so the people you were with can claim the items they
          had and see what each of them owes.
        </p>

        <h2>3. Your account</h2>
        <p>
          You need an account, created with a valid email address or a Google sign-in. You must be at
          least 14 years old. Keep access to your email secure — anyone with it can sign in as you.
        </p>

        <h2>4. Plans and payment</h2>
        <p>
          The free plan has a weekly scan limit. Paid plans are billed monthly through Stripe and
          renew automatically until you cancel. You can cancel at any time from the Account screen;
          the cancellation takes effect at the end of the period you have already paid for, and we do
          not refund the remainder of a started period. Prices include VAT where applicable.
        </p>
        <p>
          Because the service is supplied digitally and immediately, by subscribing you ask us to
          start performance right away and acknowledge that you lose the 14-day right of withdrawal
          once the service has been fully performed for that period.
        </p>

        <h2>5. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>upload images containing anything other than a receipt or a payment proof;</li>
          <li>upload other people&apos;s personal data without a reason to do so;</li>
          <li>attempt to access tickets you were not invited to, or probe the service for weaknesses;</li>
          <li>use the service to break the law, or in a way that degrades it for other people.</li>
        </ul>

        <h2>6. Your content</h2>
        <p>
          The receipts and images you upload remain yours. You grant us only the permission needed to
          store and process them so the service can work — including sending the receipt photo to our
          AI provider — and to show them to the people you share a ticket with.
        </p>

        <h2>7. AI accuracy — please check the result</h2>
        <p>
          Item extraction is performed automatically by an AI model and{' '}
          <strong>may contain errors</strong>: wrong prices, missing lines, misread quantities. The
          totals and balances TapTicket shows are only as good as that extraction. You are
          responsible for reviewing and correcting a ticket before relying on it or sharing it, and
          TapTicket is not liable for money settled on the basis of an unchecked result.
        </p>

        <h2>8. Availability</h2>
        <p>
          We work to keep TapTicket available but do not guarantee uninterrupted service. Features may
          change, and we may suspend or discontinue the service, giving notice where reasonable.
        </p>

        <h2>9. Liability</h2>
        <p>
          To the extent permitted by law, we are not liable for indirect or consequential damages, or
          for loss arising from your use of the service. Nothing here limits liability that cannot be
          limited by law, including liability for wilful misconduct or gross negligence, or your
          statutory rights as a consumer.
        </p>

        <h2>10. Ending the agreement</h2>
        <p>
          You can stop using TapTicket and delete your account at any time from the Account screen. We
          may suspend or close an account that breaches these terms.
        </p>

        <h2>11. Governing law and disputes</h2>
        <p>
          These terms are governed by Spanish law. If you are a consumer, you may bring proceedings in
          the courts of your place of residence, and you can also use the European Commission&apos;s
          online dispute resolution platform at{' '}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer">
            ec.europa.eu/consumers/odr
          </a>
          .
        </p>
      </>
    ),
  },

  cookies: {
    title: 'Cookie policy',
    body: (
      <>
        <p>
          TapTicket stores a small amount of data in your browser. Most of it is strictly necessary
          for the app to work and does not require your consent. Analytics is the only optional part,
          and it only runs if you accept it.
        </p>

        <h2>Strictly necessary</h2>
        <ul>
          <li>
            <strong>Session cookies (<code>sb-*</code>)</strong> — set by Supabase to keep you signed
            in. Deleted when you sign out or the session expires.
          </li>
          <li>
            <strong><code>lang</code> (local storage)</strong> — remembers the language you selected.
          </li>
          <li>
            <strong><code>tt-consent</code> (local storage)</strong> — remembers whether you accepted
            or rejected analytics, and the date you chose, so we do not ask you again. It expires
            after 24 months. Your choice is kept for 24 months;
            after that we ask once more.
          </li>
          <li>
            <strong>Service worker cache</strong> — stores the app shell so TapTicket loads fast and
            works offline. It holds no personal data.
          </li>
        </ul>

        <h2>Analytics — optional</h2>
        <ul>
          <li>
            <strong>PostHog (<code>ph_*</code>)</strong> — records which screens you visit and which
            actions you take, so we can see what to improve. Hosted in the EU. Nothing is sent until
            you accept, and rejecting deletes what PostHog stored in your browser.
          </li>
        </ul>

        <h2>Your choice</h2>
        <p>
          You can change your mind at any time using the buttons below. Rejecting is as easy as
          accepting, and rejecting does not limit any part of the app. Your choice does not last
          forever: after 24 months we ask again, and until you answer no analytics runs.
        </p>
      </>
    ),
  },

  'aviso-legal': {
    title: 'Legal notice',
    body: (
      <>
        <p>
          Information required by article 10 of Spanish law 34/2002 on information society services
          and electronic commerce (LSSI-CE).
        </p>

        <h2>Operator</h2>
        <ul>
          <li>Name: {COMPANY.name}</li>
          <li>Tax ID: {COMPANY.taxId}</li>
          <li>Registered address: {COMPANY.address}</li>
          <li>
            Email: <a href={`mailto:${COMPANY.contactEmail}`}>{COMPANY.contactEmail}</a>
          </li>
          {COMPANY.registry && <li>Commercial registry: {COMPANY.registry}</li>}
        </ul>

        <h2>Purpose</h2>
        <p>
          This website and progressive web app provide the TapTicket service: digitising restaurant
          receipts and splitting bills between the people who shared them.
        </p>

        <h2>Intellectual property</h2>
        <p>
          The TapTicket name, logo, interface, texts and source code belong to {COMPANY.name} or its
          licensors. Reproducing, distributing or transforming them without written permission is not
          allowed. Receipts and images uploaded by users remain theirs.
        </p>

        <h2>Liability</h2>
        <p>
          We are not responsible for the content of third-party sites linked from TapTicket, nor for
          the use users make of the service. Use of the service is governed by our{' '}
          <a href="/legal/terms">terms of service</a> and{' '}
          <a href="/legal/privacy">privacy policy</a>.
        </p>

        <h2>Applicable law</h2>
        <p>Spanish law applies to this notice and to the use of this site.</p>
      </>
    ),
  },
}
