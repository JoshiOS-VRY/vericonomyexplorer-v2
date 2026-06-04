import { faviconImage } from "@/lib/seo/faviconImage";

export const size = { width: 48, height: 48 };
export const contentType = "image/png";

export default function Icon() {
  return faviconImage(48);
}
