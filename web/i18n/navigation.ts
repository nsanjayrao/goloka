import { createNavigation } from "next-intl/navigation";

import { routing } from "@/i18n/routing";

// Locale-aware wrappers around next/link, next/navigation's router hooks,
// and redirect() - these automatically prepend the right prefix (or none,
// for "en") so component code never hand-builds a `/${locale}/...` path.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
