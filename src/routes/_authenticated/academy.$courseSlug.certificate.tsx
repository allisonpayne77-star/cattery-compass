import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The old in-app certificate lived here. It rendered a second, plainer design,
 * stamped TODAY's date instead of the completion date, and printed the cattery
 * name where the person's name belongs.
 *
 * There is now one certificate, at /certificate/$courseSlug. This route forwards
 * to it so existing links and bookmarks keep working.
 */
export const Route = createFileRoute("/_authenticated/academy/$courseSlug/certificate")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/certificate/$courseSlug",
      params: { courseSlug: params.courseSlug },
      replace: true,
    });
  },
});
