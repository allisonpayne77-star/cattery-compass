import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail } from "lucide-react";

export function BreederInsuranceFooter() {
  return (
    <footer className="mt-12 pt-8 border-t">
      <h2 className="font-display text-lg font-semibold mb-4">Breeder Insurance Programs</h2>

      <Card className="p-6 bg-primary/5 border-primary/20">
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
            <Badge
              variant="default"
              className="shrink-0 bg-primary text-primary-foreground uppercase tracking-wider"
            >
              Sponsored Partner
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="h-24 w-40 rounded-md border-2 border-dashed border-muted-foreground/30 bg-background flex items-center justify-center shrink-0">
              <span className="text-xs text-muted-foreground">Your Logo</span>
            </div>
            <div className="space-y-2 min-w-0">
              <p className="font-medium text-foreground">Your Company Tagline Here</p>
              <p className="text-sm text-muted-foreground">
                A brief one-line description of your program and what it offers to cat breeders.
              </p>
            </div>
          </div>

          <hr className="border-border" />

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              This section is reserved for a verified partner offering breeder support or pet
              insurance programs to The Cattery Manager subscribers.
            </p>
            <p>Interested in reaching thousands of dedicated cat breeders?</p>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <a
                href="mailto:meow@catterycompanion.com"
                className="text-primary hover:underline font-medium"
              >
                Contact us
              </a>{" "}
              to learn about partnership opportunities.
            </p>
          </div>
        </div>
      </Card>

      <div className="mt-8 text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>The Cattery Manager</span>
        <span>·</span>
        <span>Cat College</span>
        <span>·</span>
        <span>Partnership Enquiries</span>
        <a
          href="mailto:meow@catterycompanion.com"
          className="text-primary hover:underline"
        >
          meow@catterycompanion.com
        </a>
      </div>
    </footer>
  );
}
