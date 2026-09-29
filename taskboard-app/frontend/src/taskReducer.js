// Both API responses and socket events go through here, so the board
// has one place where task state changes.
export function taskReducer(tasks, action) {
  switch (action.type) {
    case 'set':
      return action.tasks;
    case 'upsert':
      return tasks.some((t) => t.id === action.task.id)
        ? tasks.map((t) => (t.id === action.task.id ? action.task : t))
        : [action.task, ...tasks];
    case 'remove':
      return tasks.filter((t) => t.id !== action.id);
    default:
      return tasks;
  }
}
