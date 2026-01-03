import { Users } from "lucide-react";
import type { ConnpassEvent } from "../types/events";
import { participantsLabel } from "../utils/date-formatting";

interface BadgeProps {
  participants: ConnpassEvent["participants"];
  className?: string;
}

export function Badge({ participants, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 ${className}`}
    >
      <Users size={14} />
      <span>{participantsLabel(participants)}</span>
    </span>
  );
}
