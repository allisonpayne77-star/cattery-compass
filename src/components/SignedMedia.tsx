import { useEffect, useState } from "react";
import { signedMediaUrl } from "@/lib/media";

export function SignedImage({ path, alt, className }: { path: string; alt?: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { void signedMediaUrl(path).then(setUrl); }, [path]);
  if (!url) return <div className={`animate-pulse rounded bg-secondary ${className ?? "h-48 w-full"}`} />;
  return <img src={url} alt={alt ?? ""} className={className ?? "w-full rounded-lg"} loading="lazy" />;
}

export function SignedVideo({ path, className }: { path: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { void signedMediaUrl(path).then(setUrl); }, [path]);
  if (!url) return <div className={`aspect-video animate-pulse rounded-lg bg-secondary ${className ?? ""}`} />;
  return <video src={url} controls className={className ?? "w-full rounded-lg"} />;
}
