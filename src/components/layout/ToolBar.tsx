export function ToolBar() {
  return (
    <footer className="tool-bar" aria-label="판서 도구 영역">
      <div className="toolbar-label">
        <span className="toolbar-grip" aria-hidden="true" />
        <div>
          <strong>판서 도구</strong>
          <span>수업 자료를 불러온 뒤 사용할 수 있습니다.</span>
        </div>
      </div>
      <div className="toolbar-placeholder" aria-hidden="true">
        <span>펜</span><span>형광펜</span><span>지우개</span><span>실행 취소 · 다시 실행</span>
      </div>
    </footer>
  )
}
