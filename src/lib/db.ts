import { supabase } from "@/integrations/supabase/client";

export const CAT_BREEDS = [
  "Abyssinian",
  "American Bobtail",
  "American Curl",
  "American Shorthair",
  "American Wirehair",
  "Balinese",
  "Bengal",
  "Birman",
  "Bombay",
  "British Shorthair",
  "Burmese",
  "Chartreux",
  "Chausie",
  "Cornish Rex",
  "Devon Rex",
  "Egyptian Mau",
  "Exotic Shorthair",
  "Havana Brown",
  "Himalayan",
  "Japanese Bobtail",
  "Korat",
  "LaPerm",
  "Maine Coon",
  "Manx",
  "Munchkin",
  "Norwegian Forest Cat",
  "Ocicat",
  "Oriental Shorthair",
  "Persian",
  "Peterbald",
  "Ragamuffin",
  "Ragdoll",
  "Russian Blue",
  "Scottish Fold",
  "Selkirk Rex",
  "Siamese",
  "Siberian",
  "Singapura",
  "Snowshoe",
  "Somali",
  "Sphynx",
  "Tonkinese",
  "Toyger",
  "Turkish Angora",
  "Turkish Van",
  "Mixed",
  "Other",
] as const;

export const REGISTRATION_BODIES = [
  "TICA",
  "CFA",
  "GCCF",
  "WCF",
  "FIFe",
  "ACF",
  "ACFA",
  "CCA",
  "Other",
] as const;

export type Profile = {
  id: string;
  user_id: string;
  cattery_name: string | null;
  breed: string | null;
  multiple_breeds: boolean | null;
  registration_body: string | null;
  registration_number: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Cat = {
  id: string;
  user_id: string;
  name: string;
  breed: string | null;
  gender: "Stud" | "Queen" | "Alter";
  dob: string | null;
  registration_number: string | null;
  photo_url: string | null;
  pedigree_url: string | null;
  notes: string | null;
  created_at: string;
};

export type Mating = {
  id: string;
  user_id: string;
  queen_id: string;
  stud_id: string;
  mating_date: string;
  mating_end_date: string | null;
  status: string;
  notes: string | null;
};

export type Litter = {
  id: string;
  user_id: string;
  queen_id: string | null;
  stud_id: string | null;
  mating_id: string | null;
  dob: string;
  kitten_count: number;
  males_count: number;
  females_count: number;
  notes: string | null;
};

export type Kitten = {
  id: string;
  user_id: string;
  litter_id: string;
  name: string | null;
  gender: string | null;
  color: string | null;
  registration_number: string | null;
  sold: boolean;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  owner_address: string | null;
  sale_date: string | null;
  sale_price: number | string | null;
  contract_url: string | null;
  contract_file_name: string | null;
  sale_rights: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type HealthRecord = {
  id: string;
  user_id: string;
  cat_id: string;
  record_type: "HCM Echo" | "Hip Dysplasia" | "DNA Panel" | "Vaccination Booklet" | "Other";
  title: string | null;
  file_url: string;
  file_name: string | null;
  test_date: string | null;
  notes: string | null;
  created_at: string;
};

// Signed-URL helper for private buckets
export async function signUrl(bucket: string, path: string, expires = 3600) {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expires);
  return data?.signedUrl ?? null;
}

export function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
