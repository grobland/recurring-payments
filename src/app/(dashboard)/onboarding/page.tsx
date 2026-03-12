"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useUser, useUpdateUser } from "@/lib/hooks";
import { SUPPORTED_CURRENCIES } from "@/lib/constants/currencies";
import { toast } from "sonner";

const steps = [
  { id: "welcome", title: "Welcome" },
  { id: "profile", title: "Your Profile" },
  { id: "preferences", title: "Preferences" },
  { id: "complete", title: "All Set" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data } = useUser();
  const updateUser = useUpdateUser();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    displayCurrency: "GBP",
    emailRemindersEnabled: true,
    reminderDaysBefore: [7, 1],
  });

  // Initialize form data when user data loads (pre-fill name from registration)
  useEffect(() => {
    if (data?.user) {
      setFormData((prev) => ({
        ...prev,
        name: data.user.name ?? prev.name,
        displayCurrency: data.user.displayCurrency ?? prev.displayCurrency,
        emailRemindersEnabled: data.user.emailRemindersEnabled ?? prev.emailRemindersEnabled,
        reminderDaysBefore: data.user.reminderDaysBefore ?? prev.reminderDaysBefore,
      }));
    }
  }, [data?.user]);

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      // Final step - save and complete onboarding
      try {
        await updateUser.mutateAsync({
          ...formData,
          // Mark onboarding as completed will be handled separately
        });

        // Complete onboarding
        await fetch("/api/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ onboardingCompleted: true }),
        });

        toast.success("Welcome! Your account is all set up.");
        router.push("/payments/dashboard");
      } catch (error) {
        toast.error("Failed to complete setup. Please try again.");
      }
      return;
    }

    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleSkip = async () => {
    // Skip onboarding
    try {
      await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingCompleted: true }),
      });
      router.push("/payments/dashboard");
    } catch (error) {
      router.push("/payments/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            {steps.map((step, index) => (
              <span
                key={step.id}
                className={index <= currentStep ? "text-primary font-medium" : ""}
              >
                {step.title}
              </span>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card>
          {currentStep === 0 && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Welcome to Subscription Manager</CardTitle>
                <CardDescription>
                  Let&apos;s get your account set up in just a few steps.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg border p-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Track your subscriptions</p>
                      <p className="text-sm text-muted-foreground">
                        Keep all your recurring payments in one place
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Import from bank statements</p>
                      <p className="text-sm text-muted-foreground">
                        AI-powered PDF import makes setup easy
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Never miss a renewal</p>
                      <p className="text-sm text-muted-foreground">
                        Get email reminders before charges hit
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 1 && (
            <>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>
                  Tell us a bit about yourself.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Display Currency</Label>
                  <Select
                    value={formData.displayCurrency}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, displayCurrency: value }))
                    }
                  >
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.code} - {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    All amounts will be converted to this currency for display.
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 2 && (
            <>
              <CardHeader>
                <CardTitle>Reminder Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to be notified about renewals.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Email Reminders</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified before subscriptions renew
                    </p>
                  </div>
                  <Button
                    variant={formData.emailRemindersEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        emailRemindersEnabled: !prev.emailRemindersEnabled,
                      }))
                    }
                  >
                    {formData.emailRemindersEnabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>

                {formData.emailRemindersEnabled && (
                  <div className="space-y-3">
                    <Label>Remind me before renewal:</Label>
                    <div className="flex flex-wrap gap-2">
                      {[1, 3, 7, 14, 30].map((days) => {
                        const isSelected = formData.reminderDaysBefore.includes(days);
                        return (
                          <Button
                            key={days}
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                reminderDaysBefore: isSelected
                                  ? prev.reminderDaysBefore.filter((d) => d !== days)
                                  : [...prev.reminderDaysBefore, days].sort((a, b) => b - a),
                              }));
                            }}
                          >
                            {days} day{days !== 1 && "s"}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          )}

          {currentStep === 3 && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-2xl">You&apos;re All Set!</CardTitle>
                <CardDescription>
                  Your account is ready. Here&apos;s what you can do next:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <button
                    onClick={() => router.push("/payments/subscriptions/new")}
                    className="flex w-full items-center justify-between rounded-lg border p-4 text-left hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">Add your first subscription</p>
                      <p className="text-sm text-muted-foreground">
                        Manually enter a subscription to track
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => router.push("/vault/load")}
                    className="flex w-full items-center justify-between rounded-lg border p-4 text-left hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">Import from bank statement</p>
                      <p className="text-sm text-muted-foreground">
                        Upload a PDF and let AI find your subscriptions
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => router.push("/payments/dashboard")}
                    className="flex w-full items-center justify-between rounded-lg border p-4 text-left hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">Go to dashboard</p>
                      <p className="text-sm text-muted-foreground">
                        Explore your dashboard and settings
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
              </CardContent>
            </>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between border-t p-6">
            <div>
              {currentStep > 0 && currentStep < steps.length - 1 && (
                <Button variant="ghost" onClick={handleBack}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentStep === 0 && (
                <Button variant="ghost" onClick={handleSkip}>
                  Skip setup
                </Button>
              )}
              <Button onClick={handleNext} disabled={updateUser.isPending}>
                {updateUser.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : currentStep === steps.length - 1 ? (
                  "Finish Setup"
                ) : (
                  <>
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
