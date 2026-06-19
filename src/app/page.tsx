import { getSession } from "@/lib/jwt";
import { prisma } from "@/lib/db";
import HomeClient from "./HomeClient";

export default async function Home() {
  const session = await getSession();

  // Нэвтрээгүй бол гэр бүлийн мэдээллийг серверт ч татахгүй (нууцлал)
  const [members, marriages] = session
    ? await Promise.all([
        prisma.familyMember.findMany({ orderBy: { createdAt: "asc" } }),
        prisma.marriage.findMany({ orderBy: { createdAt: "asc" } }),
      ])
    : [[], []];

  return (
    <HomeClient
      initialMembers={members}
      initialMarriages={marriages}
      user={session ? { name: session.name, email: session.email, role: session.role } : null}
    />
  );
}
