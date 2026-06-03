import type { Metadata } from "next";
import { chainSectionMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = chainSectionMetadata("vrm");

export default function VrmLayout({ children }: { children: React.ReactNode }) {
  return children;
}
