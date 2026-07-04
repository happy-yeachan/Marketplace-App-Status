import type { Metadata } from "next";
import { EmbedDashboard } from "@/components/embed-dashboard";

export const metadata: Metadata = {
  title: "Marketplace App Status — Embed",
  // Embed URLs carry a team's app list in the hash — never index them.
  robots: { index: false, follow: false },
};

export default function EmbedPage() {
  return <EmbedDashboard />;
}
