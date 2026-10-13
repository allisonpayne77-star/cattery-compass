import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/academy/$courseSlug")({
  component: CourseLayout,
});

function CourseLayout() {
  return <Outlet />;
}
