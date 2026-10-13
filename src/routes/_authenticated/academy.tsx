import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BreederInsuranceFooter } from "@/components/BreederInsuranceFooter";

export const Route = createFileRoute("/_authenticated/academy")({
  component: AcademyLayout,
});

function AcademyLayout() {
  return (
    <div className="space-y-6">
      <Outlet />
      <BreederInsuranceFooter />
    </div>
  );
}



