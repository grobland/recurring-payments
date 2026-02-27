import { Metadata } from "next";
import { DashboardHeader } from "@/components/layout";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "Help",
  description: "Frequently asked questions and documentation",
};

const FAQ_CATEGORIES = [
  {
    id: "getting-started",
    title: "Getting Started",
    questions: [
      {
        id: "getting-started-1",
        question: "What is Subscription Manager?",
        answer:
          "Subscription Manager helps you keep track of all your recurring payments in one place so you're never caught off guard by a renewal charge. You can add subscriptions manually, import them from bank statements, and set up email reminders before each renewal date.",
      },
      {
        id: "getting-started-2",
        question: "How do I add my first subscription?",
        answer:
          'Head over to the Subscriptions page and click the "Add Subscription" button. Fill in the name, amount, billing frequency, and next renewal date — that\'s all you need to get started. You can always add more details like a category or notes later.',
      },
      {
        id: "getting-started-3",
        question: "What's included in the free trial?",
        answer:
          "Your free trial gives you full access to every feature in the app, including PDF import, email reminders, and analytics. The trial runs for 14 days, and you'll get a heads-up before it ends so you can decide whether to continue with a paid plan.",
      },
      {
        id: "getting-started-4",
        question: "How do I connect my bank statements?",
        answer:
          'Go to the Doc Vault and upload your PDF bank or credit card statements using the Doc Load page. Once uploaded, the app processes them automatically and extracts any recurring transactions it finds. You can then review the suggestions and confirm which ones to add as subscriptions.',
      },
    ],
  },
  {
    id: "subscriptions",
    title: "Subscriptions",
    questions: [
      {
        id: "subscriptions-1",
        question: "How do I add a subscription manually?",
        answer:
          'Click "Add Subscription" on the Subscriptions page and fill in the details — name, amount, currency, billing frequency, and next renewal date. You can also choose a category, add a website URL, and write any notes you want to keep handy.',
      },
      {
        id: "subscriptions-2",
        question: "What do the subscription statuses mean?",
        answer:
          "Active means the subscription is ongoing and you'll receive reminders for it. Paused means you've temporarily stopped tracking reminders for it, but it's still in your list. Cancelled means you've marked it as no longer active — it stays in your history but is excluded from spending totals.",
      },
      {
        id: "subscriptions-3",
        question: "Can I track subscriptions in different currencies?",
        answer:
          "Yes — you can add subscriptions in any currency, and the app will convert them to your display currency for totals and analytics. Exchange rates are cached and refreshed periodically so your spending summaries stay accurate.",
      },
      {
        id: "subscriptions-4",
        question: "How do I delete a subscription?",
        answer:
          "Open the subscription you want to remove and look for the delete option in the actions menu. Deleting is a soft delete, so the record is removed from your active list but preserved in the database for audit purposes. If you want to keep it but stop reminders, consider pausing or cancelling it instead.",
      },
    ],
  },
  {
    id: "importing",
    title: "Importing Statements",
    questions: [
      {
        id: "importing-1",
        question: "How does PDF import work?",
        answer:
          "You upload your PDF bank or credit card statement, and the app uses AI to scan through the transactions and identify recurring charges. It looks for patterns like consistent amounts and regular billing intervals, then shows you the suggestions so you can decide which ones to add as subscriptions.",
      },
      {
        id: "importing-2",
        question: "Which banks are supported?",
        answer:
          "The import works with PDF statements from most major banks and credit card providers. Since the extraction uses AI vision rather than bank-specific parsers, it handles a wide variety of statement formats. If your statement is a scanned image rather than a text-based PDF, results may vary.",
      },
      {
        id: "importing-3",
        question: "What happens after I upload a statement?",
        answer:
          "The app processes the PDF in the background, which usually takes a minute or two. When it's done, you'll see the extracted transactions on the Doc Vault page where you can review each one and either confirm it as a subscription or dismiss it.",
      },
      {
        id: "importing-4",
        question: "Why did my import fail?",
        answer:
          "Imports can fail if the PDF is password-protected, corrupted, or in an unsupported format. Scanned image PDFs (rather than text-based) can also cause issues since the text isn't directly readable. Try re-exporting the statement from your bank's website and uploading the fresh copy.",
      },
    ],
  },
  {
    id: "reminders",
    title: "Reminders",
    questions: [
      {
        id: "reminders-1",
        question: "How do renewal reminders work?",
        answer:
          "The app sends you an email before each subscription renews based on your reminder schedule. By default you'll get notified 7 days and 1 day before each renewal. You can change these defaults in Settings or set custom timing per subscription.",
      },
      {
        id: "reminders-2",
        question: "Can I customize reminder timing?",
        answer:
          "Yes — go to Settings to update your global reminder schedule (the days-before values apply to all subscriptions). You can also override the schedule for individual subscriptions by editing them and adjusting the reminder settings there.",
      },
      {
        id: "reminders-3",
        question: "How do I turn off reminders for a specific subscription?",
        answer:
          "Open the subscription and toggle off the reminder option in its settings. This disables reminders just for that subscription while keeping your global reminder preferences intact for everything else.",
      },
    ],
  },
  {
    id: "billing",
    title: "Billing & Plans",
    questions: [
      {
        id: "billing-1",
        question: "What features are included in each plan?",
        answer:
          "The free trial gives you access to all features. Paid plans differ by the number of subscriptions you can track, PDF imports, and advanced analytics. Check the pricing page for a full breakdown of what's included at each tier.",
      },
      {
        id: "billing-2",
        question: "How do I upgrade or change my plan?",
        answer:
          "Go to Settings and open the Billing tab. From there you can view your current plan, upgrade to a higher tier, or switch between monthly and annual billing. Upgrades take effect immediately.",
      },
      {
        id: "billing-3",
        question: "How do I cancel my subscription?",
        answer:
          "You can cancel your plan anytime from the Billing tab in Settings. Your access continues until the end of the current billing period — you won't be charged again after that. Your data stays in your account even after cancellation.",
      },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    questions: [
      {
        id: "troubleshooting-1",
        question: "My subscriptions aren't showing up",
        answer:
          "Check the filter settings on the Subscriptions page — you might have an active filter hiding some entries. Also make sure the subscription status isn't set to Cancelled, as cancelled subscriptions are hidden from the main list by default. If you imported them, confirm they were accepted during the import review step.",
      },
      {
        id: "troubleshooting-2",
        question: "I'm not receiving reminder emails",
        answer:
          "First check your spam folder since reminder emails can sometimes be filtered. Then verify that email reminders are enabled in Settings and that the subscription's reminder setting is turned on. Make sure your account email address is correct and verified.",
      },
      {
        id: "troubleshooting-3",
        question: "The PDF import didn't detect all my transactions",
        answer:
          "The AI looks for patterns that match recurring charges, so one-off transactions or subscriptions with irregular amounts may not appear in the suggestions. You can always add those subscriptions manually. Uploading multiple months of statements also helps the pattern detection work better.",
      },
      {
        id: "troubleshooting-4",
        question: "How do I reset my password?",
        answer:
          'Click "Forgot password" on the login page and enter your email address. You\'ll receive a reset link within a few minutes — check your spam folder if it doesn\'t arrive. The link is valid for a limited time, so use it promptly.',
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <>
      <DashboardHeader title="Help" />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Help</h2>
            <p className="text-muted-foreground">
              Frequently asked questions and how things work
            </p>
          </div>
          <div className="space-y-8">
            {FAQ_CATEGORIES.map((category) => (
              <div key={category.id}>
                <h3 className="text-lg font-semibold mb-3">
                  {category.title}
                </h3>
                <Accordion type="multiple" className="border rounded-lg px-4">
                  {category.questions.map((item) => (
                    <AccordionItem key={item.id} value={item.id}>
                      <AccordionTrigger>{item.question}</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">{item.answer}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
          <div className="mt-12 pt-8 border-t text-center">
            <p className="text-muted-foreground text-sm">
              Didn&apos;t find what you&apos;re looking for?{" "}
              <a
                href="mailto:support@subscriptions.app"
                className="text-primary hover:underline font-medium"
              >
                Contact us
              </a>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
