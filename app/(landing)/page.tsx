import { redirect } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { redirects } from "@/lib/constants";

export default async function Home() {
  const { user } = await validateRequest();

  if (user) redirect(redirects.afterLogin);

  return (
    <section className="grid flex-col items-center justify-center max-w-5xl gap-4 py-10 mx-auto text-center md:py-12">
      <p>Nate&apos;s Next.js Starter</p>
    </section>
  );
}
