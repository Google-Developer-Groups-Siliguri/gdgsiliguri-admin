import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTitle } from "@/components/PageTitle";
import { BlogsManager } from "@/components/blogs/BlogsManager";
import { EditorFallback } from "@/components/section/EditorFallback";
import { requireAdminPage } from "@/lib/auth/session";
import { listBlogs, readBlogSettings } from "@/lib/cms/blogs";

export const metadata: Metadata = { title: "Blogs" };

async function Manager() {
  await requireAdminPage();
  const [posts, settings] = await Promise.all([listBlogs(), readBlogSettings()]);
  return <BlogsManager posts={posts} {...settings} />;
}

export default function Page() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <PageTitle title="Blogs" eyebrow="Community" />
      <Suspense fallback={<EditorFallback />}>
        <Manager />
      </Suspense>
    </div>
  );
}
