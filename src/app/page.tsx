import { getSession } from "@/lib/jwt";
import { prisma } from "@/lib/db";
import HomeClient from "./HomeClient";

export default async function Home() {
  const [session, members] = await Promise.all([
    getSession(),
    prisma.familyMember.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <HomeClient
      initialMembers={members}
      user={session ? { name: session.name, email: session.email } : null}
    />
  );
}
