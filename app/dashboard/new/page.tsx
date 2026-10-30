import type { Metadata } from "next";
import { NewBriefWizard } from "@/components/new-brief-wizard";

export const metadata: Metadata = { title: "New proposal" };

export default function NewProposalPage() {
  return <NewBriefWizard />;
}
