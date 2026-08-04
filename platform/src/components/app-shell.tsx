"use client";

import {
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileClock,
  FolderKanban,
  GitBranch,
  MonitorCog,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Settings,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const menuItems = [
  { label: "프로젝트", icon: FolderKanban, href: "/" },
  { label: "추가 준비", icon: ClipboardList, href: "/project-readiness" },
  { label: "프로젝트 작업", icon: BookOpen, href: "/project-summary" },
  { label: "검토 현황", icon: ClipboardCheck, href: "/review-board" },
  { label: "작업 기록", icon: FileClock, href: "/runs" },
  { label: "소스 관리", icon: GitBranch, href: "/source-control" },
  { label: "MySQL 설정", icon: Database, href: "/settings/database" },
  { label: "환경 진단", icon: MonitorCog, href: "/diagnostics" },
  { label: "사용 방법", icon: BookOpen, href: "/workspace-guide" },
  { label: "설정", icon: Settings, href: "/settings/workspace" }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Sparkles size={18} aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold leading-5">AI Dev Workspace</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Markdown 기반 ChatGPT/Codex 복붙 작업 관리</p>
            </div>
          </div>
          <div className="hidden items-center gap-3 text-sm text-slate-600 dark:text-slate-300 md:flex">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              local ready
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="inline-flex items-center gap-1">
              <GitBranch size={14} aria-hidden />
              project scoped
            </span>
          </div>
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => window.location.reload()}
            title="새로고침"
            type="button"
          >
            <RefreshCw size={16} aria-hidden />
          </button>
        </div>
      </header>

      <div
        className={cn(
          "mx-auto grid max-w-7xl grid-cols-1 gap-0 px-4 transition-[grid-template-columns] sm:px-6 lg:grid-cols-[220px_1fr]",
          isSidebarCollapsed && "lg:grid-cols-[72px_1fr]"
        )}
      >
        <aside className="hidden border-r border-slate-200 py-6 pr-4 dark:border-slate-800 lg:block">
          <button
            className={cn(
              "mb-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
              isSidebarCollapsed && "w-10 px-0"
            )}
            onClick={() => setIsSidebarCollapsed((value) => !value)}
            title={isSidebarCollapsed ? "메뉴 펼치기" : "메뉴 접기"}
            type="button"
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={16} aria-hidden /> : <PanelLeftClose size={16} aria-hidden />}
            {!isSidebarCollapsed && <span>메뉴 접기</span>}
          </button>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900",
                    isActive && "bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-200",
                    isSidebarCollapsed && "justify-center px-0"
                  )}
                >
                  <item.icon size={16} aria-hidden />
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 py-6 lg:pl-6">{children}</main>
      </div>
    </div>
  );
}
