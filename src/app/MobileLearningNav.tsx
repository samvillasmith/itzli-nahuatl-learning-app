"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChartNoAxesColumnIncreasing, House, Landmark, LibraryBig } from "lucide-react";
import { useLocale } from "@/i18n/LocaleProvider";

const items = [
  { href: "/", label: "Home", icon: House },
  { href: "/units", label: "Learn", icon: BookOpen },
  { href: "/vocabulary", label: "Words", icon: LibraryBig },
  { href: "/culture", label: "Culture", icon: Landmark },
  { href: "/progress", label: "Progress", icon: ChartNoAxesColumnIncreasing },
];

export default function MobileLearningNav() {
  const pathname = usePathname();
  const { translate } = useLocale();

  return (
    <nav aria-label={translate("Mobile learning navigation")} className="mobile-learning-nav md:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={active ? "is-active" : ""}>
            <Icon aria-hidden="true" size={19} strokeWidth={active ? 2.4 : 1.8} />
            <span>{translate(label)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
