import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function isIOSSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iP(ad|hone|od)/i.test(ua) && /Safari/i.test(ua) && !/CriOS/i.test(ua) && !/FxiOS/i.test(ua);
}

export function IosSafariAuthBanner() {
  if (!isIOSSafari()) return null;

  return (
    <Alert className="mb-4 border-primary/30 bg-primary/5 text-foreground">
      <Info className="h-4 w-4 text-primary" />
      <AlertTitle className="text-sm font-semibold">iPhone or iPad sign-in tip</AlertTitle>
      <AlertDescription className="text-sm">
        Safari may ask if you want to sign in with Google. Tap <strong>Continue</strong> on the Safari prompt to finish signing in.
      </AlertDescription>
    </Alert>
  );
}
