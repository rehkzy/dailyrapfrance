import BrandLoader from "@/components/BrandLoader";

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <BrandLoader label="Chargement" size="lg" />
    </div>
  );
}
