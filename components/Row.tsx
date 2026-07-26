export default function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 snap-x"
      style={{
        maskImage: "linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)",
      }}
    >
      {children}
    </div>
  );
}
