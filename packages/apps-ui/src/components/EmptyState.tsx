import "./EmptyState.css";

interface EmptyStateProps {
  hasSearched: boolean;
  returned: number;
}

export function EmptyState({ hasSearched, returned }: EmptyStateProps) {
  if (!hasSearched) {
    return (
      <div className="connpass-empty" aria-busy="true">
        <span>Connpassイベントを探しています</span>
        <span className="connpass-dots">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </div>
    );
  }

  return (
    <div className="connpass-empty">
      {returned === 0
        ? "イベントが見つかりませんでした。条件を調整して再検索してください。"
        : "条件に一致するイベントがありません。別のキーワードをお試しください。"}
    </div>
  );
}
