export function TopBar() {
  return (
    <header className="top-bar">
      <div className="brand-block">
        <span className="brand-mark" aria-hidden="true">C</span>
        <h1>ClassCanvas</h1>
      </div>
      <div className="material-status" aria-label="현재 수업 자료 상태">
        <span className="status-indicator" aria-hidden="true" />
        <span>현재 자료 없음</span>
      </div>
    </header>
  )
}
