import { redirect } from "next/navigation";

/** @deprecated Use header search or GET /v1/:chain/search via the combobox. */
export async function POST(request: Request) {
  const formData = await request.formData();
  const query = String(formData.get("query") || "").trim();
  if (!query) {
    redirect("/search");
  }
  redirect(`/search?q=${encodeURIComponent(query)}`);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  redirect(query ? `/search` : "/search");
}
