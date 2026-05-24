import { redirect } from "next/navigation";

export async function POST(request: Request) {
  const formData = await request.formData();
  const query = String(formData.get("query") || "").trim();
  if (!query) redirect("/search");
  if (/^\d+$/.test(query)) redirect(`/block-height/${query}`);
  if (/^[a-fA-F0-9]{64}$/.test(query)) redirect(`/tx/${query}`);
  redirect(`/address/${encodeURIComponent(query)}`);
}
