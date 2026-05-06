import { useEffect } from "react";
import { toast } from "sonner";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";

import { useAppTranslation } from "@/hooks/use-app-translation";
import { supabase } from "@/lib/supabase/supabase";

export const AUTH_DEEP_LINK_SCHEME = "noia2";
export const AUTH_DEEP_LINK_CALLBACK_URL = `${AUTH_DEEP_LINK_SCHEME}://auth/callback`;
export const AUTH_OPEN_RECOVERY_EVENT = "auth:open-recovery";

function extractUrlParams(rawUrl: string) {
  const parsedUrl = new URL(rawUrl);
  const hashParams = new URLSearchParams(parsedUrl.hash.startsWith("#") ? parsedUrl.hash.slice(1) : parsedUrl.hash);
  const mergedParams = new URLSearchParams(parsedUrl.search);

  for (const [key, value] of hashParams.entries()) {
    mergedParams.set(key, value);
  }

  return { parsedUrl, params: mergedParams };
}

async function applySessionFromDeepLink(rawUrl: string) {
  console.log("[DeepLink] Processing URL:", rawUrl);
  const { parsedUrl, params } = extractUrlParams(rawUrl);

  console.log("[DeepLink] Parsed URL:", {
    protocol: parsedUrl.protocol,
    pathname: parsedUrl.pathname,
    search: parsedUrl.search,
    hash: parsedUrl.hash,
  });

  if (parsedUrl.protocol !== `${AUTH_DEEP_LINK_SCHEME}:`) {
    console.log("[DeepLink] Protocol mismatch, expected:", `${AUTH_DEEP_LINK_SCHEME}:`, "got:", parsedUrl.protocol);
    return { handled: false, recovery: false };
  }

  const code = params.get("code");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const authType = params.get("type");
  const recovery = authType === "recovery";

  console.log("[DeepLink] Extracted params:", {
    hasCode: !!code,
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    authType,
    recovery,
  });

  if (code) {
    console.log("[DeepLink] Exchanging code for session...");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[DeepLink] Failed to exchange code:", error);
      throw error;
    }
    console.log("[DeepLink] Session exchanged successfully:", data);
    return { handled: true, recovery };
  }

  if (accessToken && refreshToken) {
    console.log("[DeepLink] Setting session from tokens...");
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      console.error("[DeepLink] Failed to set session:", error);
      throw error;
    }
    console.log("[DeepLink] Session set successfully:", data);
    return { handled: true, recovery };
  }

  console.log("[DeepLink] No valid auth params found");
  return { handled: false, recovery };
}

export function AuthDeepLinkHandler() {
  const { t } = useAppTranslation();

  useEffect(() => {
    let mounted = true;

    const handleUrls = async (urls: string[]) => {
      console.log("[DeepLink] Handling URLs:", urls);
      for (const rawUrl of urls) {
        try {
          const { handled, recovery } = await applySessionFromDeepLink(rawUrl);
          if (!mounted || !handled) {
            console.log("[DeepLink] URL not handled or component unmounted");
            continue;
          }

          if (recovery) {
            window.dispatchEvent(new CustomEvent(AUTH_OPEN_RECOVERY_EVENT));
            toast.success(t("auth.feedback.recoveryReady"));
          } else {
            toast.success(t("auth.feedback.deepLinkSuccess"));
          }
        } catch (error) {
          console.error("[DeepLink] Failed to handle auth deep link:", error);
          if (mounted) {
            toast.error(t("auth.feedback.deepLinkFailed"));
          }
        }
      }
    };

    const setup = async () => {
      console.log("[DeepLink] Setting up deep link handler...");

      try {
        const currentUrls = await getCurrent();
        console.log("[DeepLink] Current URLs:", currentUrls);
        if (currentUrls && currentUrls.length > 0) {
          await handleUrls(currentUrls);
        }
      } catch (error) {
        console.error("[DeepLink] Error getting current URLs:", error);
      }

      try {
        const unlisten = await onOpenUrl((urls) => {
          console.log("[DeepLink] onOpenUrl triggered with:", urls);
          void handleUrls(urls);
        });
        console.log("[DeepLink] Deep link listener registered");
        return unlisten;
      } catch (error) {
        console.error("[DeepLink] Error registering onOpenUrl:", error);
        throw error;
      }
    };

    let cleanup: (() => void) | undefined;
    void setup().then((unlisten) => {
      cleanup = unlisten;
    });

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [t]);

  return null;
}
