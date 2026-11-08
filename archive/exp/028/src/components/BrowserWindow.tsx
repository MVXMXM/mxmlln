"use client";

export default function BrowserWindow() {
  const trafficLightColors = ["#FF5F56", "#FFBD2E", "#27C93F"];
  const dropShadow =
    "0 50px 80px rgba(12, 16, 28, 0.18), 0 18px 40px rgba(15, 17, 23, 0.12)";

  return (
    <div
      className="h-full w-full rounded-[20px] border border-[var(--n4)] bg-[var(--n2)]"
      style={{
        boxShadow: dropShadow,
      }}
    >
      <div className="flex h-full flex-col rounded-[20px] p-1">
        <div className="flex items-center px-3 py-3">
          <div className="flex items-center gap-2">
            {trafficLightColors.map((color) => (
              <span
                key={color}
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        <div className="flex-1 rounded-[16px] border border-[var(--n3)] bg-[var(--n1)] mt-0.5" />
      </div>
    </div>
  );
}