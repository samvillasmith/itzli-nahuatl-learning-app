"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChartNoAxesColumnIncreasing, House, RotateCcw, LibraryBig } from "lucide-react";
import { stripLocalePrefix, localizedPathname } from "@/i18n/config";
import { useLocale } from "@/i18n/LocaleProvider";

const items = [
  { href: "/", label: "Home", icon: House },
  { href: "/units", label: "Learn", icon: BookOpen },
  { href: "/vocabulary", label: "Words", icon: LibraryBig },
  { href: "/review", label: "Review", icon: RotateCcw },
  { href: "/progress", label: "Progress", icon: ChartNoAxesColumnIncreasing },
];

export default function MobileLearningNav() {
  const pathname = stripLocalePrefix(usePathname());
  const { translate, locale } = useLocale();

  return (
    <nav aria-label={translate("Mobile learning navigation")} className="mobile-learning-nav md:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link key={href} href={localizedPathname(href, locale)} aria-current={active ? "page" : undefined} className={active ? "is-active" : ""}>
            <Icon aria-hidden="true" size={19} strokeWidth={active ? 2.4 : 1.8} />
            <span>{translate(label)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
