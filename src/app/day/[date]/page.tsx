import { redirect } from "next/navigation";

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  redirect(`/?date=${date}`);
}
