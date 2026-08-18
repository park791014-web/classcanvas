const futureContentGroups = ['현재 페이지', '현재 단원', '개념', '예제', '문제', '그림·그래프']

export function LessonNavigator() {
  return (
    <aside className="lesson-navigator" aria-labelledby="navigator-title">
      <div className="panel-heading">
        <p className="eyebrow">수업 흐름</p>
        <h2 id="navigator-title">수업 내비게이터</h2>
      </div>
      <div className="navigator-empty-state">
        <span className="empty-state-icon" aria-hidden="true">＋</span>
        <p>아직 불러온 수업 자료가 없습니다.</p>
        <span>자료를 불러오면 페이지와 수업 항목이 여기에 정리됩니다.</span>
      </div>
      <div className="future-groups" aria-label="향후 지원할 수업 항목">
        {futureContentGroups.map((group) => <span key={group}>{group}</span>)}
      </div>
    </aside>
  )
}
