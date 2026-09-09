import { createRootRoute, HeadContent, Outlet, Scripts, useRouterState } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { RequireAuth } from "@/components/require-auth";
import { SupportFloatButton } from "@/components/support-whatsapp";
import { APP_NAME } from "@/lib/brand";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/criar-conta" ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  );
}

function AppFrame() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const publicPage = isPublicPath(pathname);
  return (
    <AuthProvider>
      {publicPage ? (
        <Outlet />
      ) : (
        <RequireAuth>
          <Outlet />
        </RequireAuth>
      )}
      <SupportFloatButton />
      <Toaster position="bottom-left" />
    </AuthProvider>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      {
        name: "description",
        content: "Pesquise vagas em Moçambique, Angola e Portugal num só lugar.",
      },
      { name: "theme-color", content: "#0F6E4C" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="pt" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AppFrame />
        <Scripts />
      </body>
    </html>
  ),
});
