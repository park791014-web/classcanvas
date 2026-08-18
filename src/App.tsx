import { LessonNavigator } from './components/layout/LessonNavigator'
import { LessonWorkspace } from './components/layout/LessonWorkspace'
import { ToolBar } from './components/layout/ToolBar'
import { TopBar } from './components/layout/TopBar'

function App() {
  return (
    <div className="app-shell">
      <TopBar />
      <main className="lesson-layout" aria-label="수업 작업 영역">
        <LessonNavigator />
        <LessonWorkspace />
      </main>
      <ToolBar />
    </div>
  )
}

export default App
