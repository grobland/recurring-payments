"use client";

import { TrialBanner, TrialExpiredBanner } from "./trial-banner";

export function TrialBannerWrapper() {
  return (
    <>
      <TrialBanner />
      <TrialExpiredBanner />
    </>
  );
}
