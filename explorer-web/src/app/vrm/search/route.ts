import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { searchVrm } from "@/lib/api/indexer";

export async function POST(request: Request) {
  const formData = await request.formData();
  const query = String(formData.get("query") || "").trim();

  if (!query) {
    const cookieStore = await cookies();
    cookieStore.set("explorer_message", "Enter a Verium block height, block hash, txid, or address.", {
      path: "/",
      maxAge: 60,
    });
    redirect("/vrm");
  }

  try {
    const target = await searchVrm(query);
    if (target) {
      redirect(target);
    }
    const cookieStore = await cookies();
    cookieStore.set("explorer_message", `No indexed Verium result found for query: ${query}`, {
      path: "/",
      maxAge: 60,
    });
    redirect("/vrm");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    const cookieStore = await cookies();
    cookieStore.set(
      "explorer_message",
      `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      { path: "/", maxAge: 60 },
    );
    redirect("/vrm");
  }
}
