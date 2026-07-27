import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// 統一的 locale-aware 導航 API，取代手刻的 pathname 字串替換與手寫 cookie
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
