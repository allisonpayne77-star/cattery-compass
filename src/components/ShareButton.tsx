import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  url: string;
  filename?: string;
  label?: string;
  className?: string;
};

export function ShareButton({ url, filename = "file", label, className }: Props) {
  const [busy, setBusy] = useState(false);

  async function share() {
    if (!url) return;
    setBusy(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Could not load the file");
      const blob = await res.blob();

      const ext = blob.type.includes("pdf")
        ? "pdf"
        : blob.type.includes("png")
          ? "png"
          : blob.type.includes("webp")
            ? "webp"
            : "jpg";
      const name = filename.includes(".") ? filename : `${filename}.${ext}`;
      const file = new File([blob], name, { type: blob.type });

      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
        share?: (data: { files: File[]; title?: string }) => Promise<void>;
      };

      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: name });
      } else {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
        toast.success("Downloaded — attach it to your email from there.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not share that file";
      if (!msg.toLowerCase().includes("abort")) toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      disabled={busy || !url}
      onClick={share}
    >
      <Share2 className="h-4 w-4 mr-1.5" />
      {label ?? "Share"}
    </Button>
  );
}
