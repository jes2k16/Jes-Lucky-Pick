import { cn } from "@/lib/utils";

const colorMap: Record<string, string> = {
  "1-10": "bg-red-700",
  "11-20": "bg-orange-700",
  "21-30": "bg-green-700",
  "31-42": "bg-blue-700",
};

function getColor(num: number) {
  if (num <= 10) return colorMap["1-10"];
  if (num <= 20) return colorMap["11-20"];
  if (num <= 30) return colorMap["21-30"];
  return colorMap["31-42"];
}

export function NumberBall({
  number,
  size = "md",
}: {
  number: number;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold text-white shadow-sm",
        getColor(number),
        size === "sm" && "h-8 w-8 text-xs",
        size === "md" && "h-10 w-10 text-sm",
        size === "lg" && "h-14 w-14 text-lg"
      )}
    >
      {number}
    </span>
  );
}
