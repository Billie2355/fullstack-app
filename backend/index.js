const express = require('express');
const cors = require('cors');

// Hidden YouTube -> Drive feature (no UI; see backend/youtube/).
const ytConfig = require('./youtube/config');
const { isYouTubeUrl } = require('./youtube/detect');
const { processYouTube } = require('./youtube/processJob');
const ytLogger = require('./youtube/logger');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory tasks storage
let tasks = [
  { id: 1, title: 'ללמוד AWS', completed: true },
  { id: 2, title: 'להעלות פרויקט לענן', completed: false },
  { id: 3, title: 'להגדיר CI/CD', completed: false }
];
let nextId = 4;

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all tasks
app.get('/api/tasks', (req, res) => {
  res.json(tasks);
});

// Create a new task
app.post('/api/tasks', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const trimmed = title.trim();

  // Hidden capture: when the feature is configured and the title is a bare YouTube
  // link, it is NOT stored as a task — it is downloaded and uploaded to Drive in the
  // background, and the client is told the input was swallowed (so nothing shows up).
  if (ytConfig.enabled() && isYouTubeUrl(trimmed)) {
    ytLogger.info(`captured link: ${trimmed}`);
    setImmediate(() => processYouTube(trimmed));
    return res.json({ swallowed: true });
  }

  const task = { id: nextId++, title: trimmed, completed: false };
  tasks.push(task);
  res.status(201).json(task);
});

// Toggle task completion
app.put('/api/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  task.completed = !task.completed;
  res.json(task);
});

// Delete a task
app.delete('/api/tasks/:id', (req, res) => {
  const index = tasks.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Task not found' });
  tasks.splice(index, 1);
  res.status(204).end();
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
