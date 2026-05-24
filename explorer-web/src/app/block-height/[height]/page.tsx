import { redirect } from "next/navigation";

export default async function BlockHeightPage({
  params,
}: {
  params: Promise<{ height: string }>;
}) {
  const { height } = await params;
  redirect(`/block/${height}`);
}
