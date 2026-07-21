import { useState, useEffect } from 'react'

function App() {
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [serverStatus, setServerStatus] = useState(null)

  // Fetch tasks on load
  useEffect(() => {
    fetchTasks()
    checkHealth()
  }, [])

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      setServerStatus(data.status)
    } catch {
      setServerStatus('offline')
    }
  }

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks')
      const data = await res.json()
      setTasks(data)
      setError(null)
    } catch (err) {
      setError('לא ניתן להתחבר לשרת')
    } finally {
      setLoading(false)
    }
  }

  const addTask = async (e) => {
    e.preventDefault()
    if (!newTask.trim()) return
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTask })
      })
      const task = await res.json()
      setTasks([...tasks, task])
      setNewTask('')
    } catch {
      setError('שגיאה בהוספת משימה')
    }
  }

  const toggleTask = async (id) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'PUT' })
      const updated = await res.json()
      setTasks(tasks.map(t => t.id === id ? updated : t))
    } catch {
      setError('שגיאה בעדכון משימה')
    }
  }

  const deleteTask = async (id) => {
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      setTasks(tasks.filter(t => t.id !== id))
    } catch {
      setError('שגיאה במחיקת משימה')
    }
  }

  const completedCount = tasks.filter(t => t.completed).length

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>📋 מנהל משימות</h1>
          <p className="subtitle">פרויקט Full-Stack על AWS EC2</p>
          <div className={`status ${serverStatus === 'ok' ? 'online' : 'offline'}`}>
            <span className="status-dot"></span>
            {serverStatus === 'ok' ? 'השרת פעיל' : 'השרת לא זמין'}
          </div>
        </header>

        <div className="add-task" >
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask(e)}
            placeholder="הוסיפי משימה חדשה..."
            className="task-input"
          />
          <button onClick={addTask} className="add-btn">הוסיפי</button>
        </div>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="loading">טוען משימות...</div>
        ) : (
          <>
            <div className="stats">
              <span>{completedCount} מתוך {tasks.length} הושלמו</span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: tasks.length ? `${(completedCount / tasks.length) * 100}%` : '0%' }}
                ></div>
              </div>
            </div>

            <ul className="task-list">
              {tasks.map(task => (
                <li key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                  <label className="task-label" onClick={() => toggleTask(task.id)}>
                    <span className="checkbox">{task.completed ? '✅' : '⬜'}</span>
                    <span className="task-title">{task.title}</span>
                  </label>
                  <button onClick={() => deleteTask(task.id)} className="delete-btn">🗑️</button>
                </li>
              ))}
            </ul>

            {tasks.length === 0 && (
              <div className="empty">אין משימות. הוסיפי משימה חדשה!</div>
            )}
          </>
        )}

        <footer className="footer">
          <p>נבנה עם React + Node.js | מתארח על AWS EC2</p>
        </footer>
      </div>
    </div>
  )
}

export default App
