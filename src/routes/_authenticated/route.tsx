import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { LayoutDashboard, HeartPulse, LogOut, GraduationCap, Upload, User, BarChart2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
const companionIcon = { url: "/catterymanager-logo.png" };

const AUTH_NEXT_STORAGE_KEY = "cattery-companion-auth-next";

function getRememberedNext() {
  try {
    return window.sessionStorage.getItem(AUTH_NEXT_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function clearRememberedNext() {
  try {
    window.sessionStorage.removeItem(AUTH_NEXT_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}

function safeNext(next?: string) {
  if (!next || !next.startsWith("/")) return "/dashboard";
  if (next.startsWith("//") || next.startsWith("/auth")) return "/dashboard";
  return next;
}

function relativeNextFromHref(href: string) {
  try {
    const url = new URL(href, "https://cattery-companion.local");
    return safeNext(`${url.pathname}${url.search}${url.hash}`);
  } catch {
    return "/dashboard";
  }
}

async function waitForRestoredUser() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data: sessionData } = await supabase.auth.getSession();

    if (sessionData.session) {
      const { data: userData, error } = await supabase.auth.getUser();
      if (!error && userData.user) {
        console.log("[auth-gate] user restored on attempt", attempt);
        return userData.user;
      }
      console.warn("[auth-gate] getUser failed but session exists", error);
      return sessionData.session.user;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  console.warn("[auth-gate] no session after 12 attempts (~3s)");
  return null;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    console.log("[auth-gate] beforeLoad for", location.href);
    const user = await waitForRestoredUser();
    if (!user) {
      console.warn("[auth-gate] no user → redirect /auth with next=", relativeNextFromHref(location.href));
      throw redirect({
        to: "/auth",
        search: { next: relativeNextFromHref(location.href) },
        replace: true,
      });
    }
    return { user };
  },
  component: AuthLayout,
});

function CompanionIcon({ className }: { className?: string }) {
  return <img src={companionIcon.url} alt="Cattery Manager" className={className} />;
}

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, exact: true },
  { title: "Cattery Manager", url: "/cattery", icon: CompanionIcon },
  { title: "Breeding & Litters", url: "/breeding", icon: HeartPulse },
  { title: "Colour Predictor", url: "/predictor", icon: HeartPulse },
  { title: "EMS Colour Game", url: "/learn-ems", icon: HeartPulse },
  { title: "Cat College", url: "/academy", icon: GraduationCap },
  { title: "My Profile", url: "/profile", icon: User },
];

function AuthLayout() {
  const { user } = Route.useRouteContext();
  const nav = useNavigate();

  useEffect(() => {
    const rememberedNext = safeNext(getRememberedNext());
    if (rememberedNext === "/") {
      clearRememberedNext();
      return;
    }
    clearRememberedNext();
    nav({ to: rememberedNext as "/", replace: true });
  }, [nav]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar email={user.email ?? ""} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b bg-card/50 backdrop-blur px-4 sticky top-0 z-10">
            <SidebarTrigger />
          <div className="flex items-center gap-2">
            <img src={companionIcon.url} alt="Cattery Manager" className="h-6 w-auto max-w-[8rem] rounded-md object-contain brand-logo-image" />
            <span className="font-display text-sm font-semibold">Cattery Manager</span>
          </div>
          </header>
          <main className="flex-1 p-4 sm:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppSidebar({ email }: { email: string }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle()
        .then(({ data: row }) => { if (!cancelled) setIsAdmin(!!row); });
    });
    return () => { cancelled = true; };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <img src={companionIcon.url} alt="Cattery Manager" className="h-8 w-auto max-w-[10rem] shrink-0 rounded-lg object-contain brand-logo-image" />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="font-display font-semibold leading-tight truncate">My Cattery</div>
            <div className="text-xs text-white/70 truncate">Manager</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => (
                <SidebarMenuItem key={it.url}>
                  <SidebarMenuButton asChild isActive={isActive(it.url, it.exact)}>
                    <Link to={it.url}>
                      <it.icon className="h-4 w-4" />
                      <span>{it.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/import")}>
                    <Link to="/admin/import">
                      <Upload className="h-4 w-4" />
                      <span>Import Course Data</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/courses")}>
                    <Link to="/admin/courses">
                      <BookOpen className="h-4 w-4" />
                      <span>Course Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/analytics")}>
                    <Link to="/admin/analytics">
                      <BarChart2 className="h-4 w-4" />
                      <span>Analytics</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
          <div className="truncate text-xs text-muted-foreground mb-2">{email}</div>
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
