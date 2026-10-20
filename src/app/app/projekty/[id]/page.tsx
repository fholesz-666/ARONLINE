import { Suspense } from "react";
import { ProjectWizard } from "@/components/wizard/wizard";

export const metadata = { title: "Analýza" };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <ProjectWizard id={id} />
    </Suspense>
  );
}
