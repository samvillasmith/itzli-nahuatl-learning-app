import type { Metadata } from "next";
import { requireAuth } from "@/lib/require-auth";
import CultureTrack from "./CultureTrack";

export const metadata: Metadata = {
  title: "Nahua Culture and History",
  description:
    "A sourced companion track on Mexica history, the wider Nahua world, Nahuatl through time, and living Huasteca Nahua communities.",
};

export default async function CulturePage() {
  await requireAuth();
  return <CultureTrack />;
}
