const logoAsset = { url: "/catterymanager-logo.png" };

export function CatteryLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <img
        src={logoAsset.url}
        alt="Cattery Manager"
        className="h-12 w-auto md:h-14"
      />
    </div>
  );
}
