import { PatientDetailClient } from "./PatientDetailClient";
import { DEMO } from "@/lib/constants";

export function generateStaticParams() {
  return [
    { id: DEMO.PRIYA_ID },
    { id: DEMO.VIKRAM_ID },
  ];
}

interface PatientPageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage({ params }: PatientPageProps) {
  const { id } = await params;
  return <PatientDetailClient id={id} />;
}
