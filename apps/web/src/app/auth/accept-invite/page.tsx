import { AcceptInviteClient } from "@/components/auth/AcceptInviteClient";

type PageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function AcceptInvitePage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <AcceptInviteClient token={params.token} />;
}
