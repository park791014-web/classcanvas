export function LessonWorkspace() {
  return (
    <section className="lesson-workspace" aria-labelledby="workspace-title">
      <div className="workspace-layer-stack">
        <div className="workspace-layer workspace-document-layer" aria-hidden="true" />
        <div className="workspace-layer workspace-annotation-layer" aria-hidden="true" />
        <div className="workspace-layer workspace-ui-layer">
          <div className="workspace-empty-state">
            <span className="workspace-symbol" aria-hidden="true">
              <span /><span /><span />
            </span>
            <p className="eyebrow">수업 화면</p>
            <h2 id="workspace-title">수업 자료를 불러오면 이곳에 표시됩니다.</h2>
            <p>교과서 페이지와 판서 공간이 이 넓은 화면에 준비됩니다.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
