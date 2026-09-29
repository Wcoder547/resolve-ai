import { VerifyEmailClient } from "@/components/auth/VerifyEmailClient";

type PageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <VerifyEmailClient token={params.token} />;
}
