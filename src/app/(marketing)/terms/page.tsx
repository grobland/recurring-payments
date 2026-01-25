export const metadata = {
  title: "Terms of Service - Subscription Manager",
  description: "Terms and conditions for using Subscription Manager.",
};

export default function TermsPage() {
  return (
    <div className="container max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-4 text-muted-foreground">Last updated: January 2026</p>

      <div className="prose prose-neutral mt-8 dark:prose-invert">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using Subscription Manager (&quot;the Service&quot;), you agree
          to be bound by these Terms of Service. If you do not agree to these
          terms, please do not use the Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Subscription Manager is a web application that helps users track and
          manage their recurring subscriptions and payments. The Service includes
          features such as subscription tracking, PDF import, email reminders,
          and spending analytics.
        </p>

        <h2>3. User Accounts</h2>
        <h3>3.1 Registration</h3>
        <p>
          To use the Service, you must create an account by providing accurate
          and complete information. You are responsible for maintaining the
          security of your account credentials.
        </p>

        <h3>3.2 Account Responsibility</h3>
        <p>
          You are responsible for all activities that occur under your account.
          You must notify us immediately of any unauthorized use of your account.
        </p>

        <h2>4. Subscription and Payments</h2>
        <h3>4.1 Free Trial</h3>
        <p>
          New users may be eligible for a 14-day free trial. During the trial,
          you have access to all features. No credit card is required to start
          the trial.
        </p>

        <h3>4.2 Paid Subscriptions</h3>
        <p>
          After the trial period, continued access to the Service requires a paid
          subscription. Subscriptions are billed monthly or annually, depending
          on the plan selected.
        </p>

        <h3>4.3 Cancellation</h3>
        <p>
          You may cancel your subscription at any time through your account
          settings. Upon cancellation, you will retain access to the Service
          until the end of your current billing period.
        </p>

        <h3>4.4 Refunds</h3>
        <p>
          Subscription fees are non-refundable, except as required by applicable
          law or at our sole discretion.
        </p>

        <h2>5. User Content and Data</h2>
        <h3>5.1 Your Data</h3>
        <p>
          You retain ownership of all data you enter into the Service. We do not
          claim ownership of your subscription information or uploaded documents.
        </p>

        <h3>5.2 Data Processing</h3>
        <p>
          By using the Service, you grant us permission to process your data as
          necessary to provide the Service, including storing, analyzing, and
          displaying your subscription information.
        </p>

        <h3>5.3 PDF Import</h3>
        <p>
          When using the PDF import feature, you confirm that you have the right
          to upload and process the documents you provide. We use third-party AI
          services to analyze uploaded documents.
        </p>

        <h2>6. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any illegal purpose</li>
          <li>Attempt to gain unauthorized access to our systems</li>
          <li>Interfere with or disrupt the Service</li>
          <li>Upload malicious files or content</li>
          <li>Share your account with others</li>
          <li>Resell or redistribute the Service</li>
        </ul>

        <h2>7. Intellectual Property</h2>
        <p>
          The Service, including its design, features, and content, is owned by
          us and protected by intellectual property laws. You may not copy,
          modify, or distribute any part of the Service without our permission.
        </p>

        <h2>8. Disclaimer of Warranties</h2>
        <p>
          The Service is provided &quot;as is&quot; without warranties of any kind. We do
          not guarantee that the Service will be uninterrupted, error-free, or
          secure. The Service is not intended to be financial advice.
        </p>

        <h2>9. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, we shall not be liable for any
          indirect, incidental, special, or consequential damages arising from
          your use of the Service.
        </p>

        <h2>10. Indemnification</h2>
        <p>
          You agree to indemnify and hold us harmless from any claims, damages,
          or expenses arising from your use of the Service or violation of these
          terms.
        </p>

        <h2>11. Changes to Terms</h2>
        <p>
          We may modify these terms at any time. We will notify you of
          significant changes by email or through the Service. Continued use of
          the Service after changes constitutes acceptance of the new terms.
        </p>

        <h2>12. Termination</h2>
        <p>
          We may terminate or suspend your account if you violate these terms.
          Upon termination, your right to use the Service will immediately cease.
        </p>

        <h2>13. Governing Law</h2>
        <p>
          These terms shall be governed by and construed in accordance with
          applicable laws, without regard to conflict of law principles.
        </p>

        <h2>14. Contact</h2>
        <p>
          If you have any questions about these Terms of Service, please contact
          us at:
        </p>
        <p>
          <strong>Email:</strong> legal@subscriptionmanager.app
        </p>
      </div>
    </div>
  );
}
