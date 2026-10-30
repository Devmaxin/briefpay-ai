import type { Metadata } from "next";
import { ProposalEditor } from "@/components/proposal-editor";

export const metadata: Metadata = { title: "Edit proposal" };

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProposalEditor id={id} />;
}
