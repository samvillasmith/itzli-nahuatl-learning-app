import {
  BookOpenText,
  Languages,
  Landmark,
  MapPinned,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import type { CultureModule } from "@/data/culture-lessons";

const ICONS: Record<CultureModule["icon"], LucideIcon> = {
  city: Landmark,
  world: Waypoints,
  language: Languages,
  region: MapPinned,
  sources: BookOpenText,
};

export default function CultureModuleIcon({
  icon,
  size = 20,
}: {
  icon: CultureModule["icon"];
  size?: number;
}) {
  const Icon = ICONS[icon];
  return <Icon aria-hidden="true" size={size} strokeWidth={1.9} />;
}
