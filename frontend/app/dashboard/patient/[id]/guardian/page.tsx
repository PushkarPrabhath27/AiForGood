import { GuardianClient } from "./GuardianClient";
import { DEMO } from "@/lib/constants";

export function generateStaticParams() {
  return [
    { id: DEMO.PRIYA_ID },
    { id: DEMO.VIKRAM_ID },
  ];
}

interface GuardianPageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientGuardianPage({ params }: GuardianPageProps) {
  const { id } = await params;
  return <GuardianClient id={id} />;
}
