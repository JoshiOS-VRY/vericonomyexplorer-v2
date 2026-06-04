import { faviconImage } from "@/lib/seo/faviconImage";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return faviconImage(180);
}
