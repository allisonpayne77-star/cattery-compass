import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, { url: string; expires: number }>();

export async function signedMediaUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && hit.expires > now + 30_000) return hit.url;
  const { data, error } = await supabase.storage
    .from("course-media")
    .createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  cache.set(path, { url: data.signedUrl, expires: now + 60 * 60 * 1000 });
  return data.signedUrl;
}
