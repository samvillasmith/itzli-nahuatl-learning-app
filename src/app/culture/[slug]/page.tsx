import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CultureModuleContent from "../CultureModuleContent";
import { CULTURE_MODULES, getCultureModule } from "@/data/culture-lessons";
import { requireAuth } from "@/lib/require-auth";

type CultureModulePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return CULTURE_MODULES.map((cultureModule) => ({ slug: cultureModule.slug }));
}

export async function generateMetadata({
  params,
}: CultureModulePageProps): Promise<Metadata> {
  const cultureModule = getCultureModule((await params).slug);
  if (!cultureModule) return {};

  return {
    title: cultureModule.title,
    description: cultureModule.summary,
  };
}

export default async function CultureModulePage({ params }: CultureModulePageProps) {
  await requireAuth();
  const cultureModule = getCultureModule((await params).slug);
  if (!cultureModule) notFound();

  return <CultureModuleContent cultureModule={cultureModule} />;
}
