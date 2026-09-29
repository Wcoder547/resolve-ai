import { ResetPasswordClient } from "@/components/auth/ResetPasswordClient";

type PageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <ResetPasswordClient token={params.token} />;
}
