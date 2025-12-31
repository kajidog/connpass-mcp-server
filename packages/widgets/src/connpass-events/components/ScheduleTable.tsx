import type { ScheduleBlock } from "../utils/summary-parser";

interface ScheduleTableProps {
  block: ScheduleBlock;
}

export function ScheduleTable({ block }: ScheduleTableProps) {
  const headers = block.headers?.slice(0, 2) ?? ["時間", "内容"];
  while (headers.length < 2) {
    headers.push(headers.length === 0 ? "時間" : "内容");
  }

  return (
    <table className="w-full border-collapse text-sm my-4">
      <thead>
        <tr>
          {headers.map((header, idx) => (
            <th
              key={idx}
              className={`text-left py-2 px-3 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold border-b border-zinc-200 dark:border-zinc-600 ${
                idx === 0 ? "w-28" : ""
              }`}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {block.entries.map((entry, idx) => (
          <tr
            key={idx}
            className="border-b border-zinc-100 dark:border-zinc-700"
          >
            <th
              scope="row"
              className="text-left py-2 px-3 text-zinc-600 dark:text-zinc-300 font-medium align-top whitespace-nowrap"
            >
              {entry.time}
            </th>
            <td className="py-2 px-3 text-zinc-700 dark:text-zinc-200">
              {entry.description && (
                <div className="font-medium mb-1">{entry.description}</div>
              )}
              {entry.details.length > 0 && (
                <ul className="list-disc list-inside text-zinc-500 dark:text-zinc-400 space-y-0.5">
                  {entry.details.map((detail, detailIdx) => (
                    <li key={detailIdx} className="text-xs">
                      {detail.startsWith("※") ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          {detail}
                        </span>
                      ) : (
                        detail
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
