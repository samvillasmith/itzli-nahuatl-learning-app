import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CultureModuleContent from "../CultureModuleContent";
import { CULTURE_MODULES, getCultureModule } from "@/data/culture-lessons";
import { requireAuth } from "@/lib/require-auth";
import { getRequestLocale } from "@/i18n/server";
import { translateDeep } from "@/i18n/translate";

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
  const locale = await getRequestLocale();
  const localizedModule = translateDeep(locale, cultureModule);

  return {
    title: localizedModule.title,
    description: localizedModule.summary,
  };
}

export default async function CultureModulePage({ params }: CultureModulePageProps) {
  await requireAuth();
  const sourceModule = getCultureModule((await params).slug);
  if (!sourceModule) notFound();
  const locale = await getRequestLocale();
  const cultureModule = translateDeep(locale, sourceModule);

  return <CultureModuleContent cultureModule={cultureModule} />;
}
