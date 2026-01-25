export const metadata = {
  title: "Privacy Policy - Subscription Manager",
  description: "Learn how we collect, use, and protect your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-4 text-muted-foreground">Last updated: January 2026</p>

      <div className="prose prose-neutral mt-8 dark:prose-invert">
        <h2>Introduction</h2>
        <p>
          This Privacy Policy explains how Subscription Manager (&quot;we&quot;, &quot;our&quot;, or
          &quot;us&quot;) collects, uses, and protects your personal information when you
          use our service.
        </p>

        <h2>Information We Collect</h2>
        <h3>Account Information</h3>
        <p>When you create an account, we collect:</p>
        <ul>
          <li>Email address</li>
          <li>Name (optional)</li>
          <li>Password (encrypted)</li>
        </ul>

        <h3>Subscription Data</h3>
        <p>When you use our service, we store:</p>
        <ul>
          <li>Subscription names and details you enter</li>
          <li>Payment amounts and frequencies</li>
          <li>Categories and notes</li>
          <li>Reminder preferences</li>
        </ul>

        <h3>Uploaded Documents</h3>
        <p>
          When you use our PDF import feature, we temporarily process your bank
          statements to extract subscription information. These documents are
          processed securely and are not permanently stored.
        </p>

        <h3>Payment Information</h3>
        <p>
          Payment information is handled securely by our payment processor,
          Stripe. We do not store your full credit card details on our servers.
        </p>

        <h2>How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide and maintain our service</li>
          <li>Send subscription renewal reminders</li>
          <li>Process payments for your subscription</li>
          <li>Respond to your inquiries and support requests</li>
          <li>Improve our service and develop new features</li>
        </ul>

        <h2>Data Sharing</h2>
        <p>
          We do not sell your personal information. We may share your data with:
        </p>
        <ul>
          <li>
            <strong>Service Providers:</strong> Companies that help us operate
            our service (e.g., Stripe for payments, Resend for emails)
          </li>
          <li>
            <strong>Legal Requirements:</strong> When required by law or to
            protect our rights
          </li>
        </ul>

        <h2>Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to
          protect your personal information, including:
        </p>
        <ul>
          <li>Encryption of data in transit and at rest</li>
          <li>Secure password hashing</li>
          <li>Regular security assessments</li>
          <li>Limited access to personal data</li>
        </ul>

        <h2>Your Rights (GDPR)</h2>
        <p>You have the right to:</p>
        <ul>
          <li>
            <strong>Access:</strong> Request a copy of your personal data
          </li>
          <li>
            <strong>Rectification:</strong> Correct inaccurate personal data
          </li>
          <li>
            <strong>Erasure:</strong> Request deletion of your personal data
          </li>
          <li>
            <strong>Portability:</strong> Export your data in a machine-readable
            format
          </li>
          <li>
            <strong>Object:</strong> Object to processing of your personal data
          </li>
        </ul>
        <p>
          You can exercise these rights through the Settings &gt; Privacy section
          of your account, or by contacting us directly.
        </p>

        <h2>Data Retention</h2>
        <p>
          We retain your personal data for as long as your account is active. If
          you delete your account, we will delete your personal data within 30
          days, except where we are required to retain it for legal purposes.
        </p>

        <h2>Cookies</h2>
        <p>
          We use essential cookies to maintain your session and preferences. We
          do not use tracking or advertising cookies.
        </p>

        <h2>Children&apos;s Privacy</h2>
        <p>
          Our service is not intended for children under 16 years of age. We do
          not knowingly collect personal information from children.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you
          of any significant changes by email or through our service.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy or our data
          practices, please contact us at:
        </p>
        <p>
          <strong>Email:</strong> privacy@subscriptionmanager.app
        </p>
      </div>
    </div>
  );
}
