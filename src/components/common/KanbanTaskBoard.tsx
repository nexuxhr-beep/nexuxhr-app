import React, { useState } from 'react';
import { useHR } from '../../context/HRContext';
import { TaskItem, TaskStatus } from '../../types';
import {
  CheckSquare,
  Plus,
  AlertCircle,
  Clock,
  AlertTriangle,
  Flame,
  User,
  Trash2,
  FileText,
  Search,
  CheckCircle2,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export const KanbanTaskBoard: React.FC = () => {
  const { tasks, currentUser, activeRole, users, addTask, updateTaskStatus, deleteTask } = useHR();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newStatus, setNewStatus] = useState<TaskStatus>('not_started');
  const [newPriority, setNewPriority] = useState<TaskItem['priority']>('Medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState(currentUser.employeeId || currentUser.id);

  const columnConfigs: { key: TaskStatus; title: string; color: string; icon: React.ReactNode; bgHeader: string }[] = [
    {
      key: 'not_started',
      title: 'Not Started',
      color: 'border-slate-600 text-slate-600',
      bgHeader: 'bg-slate-100/80',
      icon: <Clock className="w-4 h-4 text-slate-500" />
    },
    {
      key: 'due',
      title: 'Due Soon',
      color: 'border-blue-500 text-blue-700',
      bgHeader: 'bg-blue-50',
      icon: <CheckCircle2 className="w-4 h-4 text-blue-400" />
    },
    {
      key: 'overdue',
      title: 'Overdue',
      color: 'border-amber-500 text-amber-700',
      bgHeader: 'bg-amber-950/40',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />
    },
    {
      key: 'need_urgent',
      title: 'Need Urgent',
      color: 'border-red-500 text-red-700',
      bgHeader: 'bg-red-50',
      icon: <Flame className="w-4 h-4 text-red-400 animate-bounce" />
    },
  ];

  // Filter tasks: if employee view, default to tasks assigned to current user, unless searching
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.notes.toLowerCase().includes(searchTerm.toLowerCase());
    
    // For team_member, show tasks assigned to them or created by them
    if (activeRole === 'team_member') {
      const isMine = task.assignedTo === currentUser.employeeId || task.assignedTo === currentUser.id;
      return matchesSearch && isMine;
    }
    return matchesSearch;
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const assignedTarget = users.find(u => u.employeeId === assignedEmployeeId || u.id === assignedEmployeeId);
    const assignedName = assignedTarget ? assignedTarget.name : currentUser.name;

    addTask({
      title: newTitle,
      notes: newNotes,
      status: newStatus,
      assignedTo: assignedEmployeeId,
      assignedToName: assignedName,
      assignedBy: currentUser.employeeId || currentUser.id,
      assignedByName: `${currentUser.name} (${activeRole})`,
      dueDate: newDueDate || new Date().toISOString().split('T')[0],
      priority: newPriority,
    });

    setNewTitle('');
    setNewNotes('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-100/80 p-5 rounded-2xl border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-900">My Tasks & Kanban Board</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Organize tasks into Not Started, Due, Overdue, and Need Urgent categories with notes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tasks or notes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-xl glass-input text-xs text-slate-900 w-48 lg:w-64"
            />
          </div>

          {/* Add Task Button */}
          <button
            id="add-task-btn"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columnConfigs.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.key);

          return (
            <div key={col.key} className="bg-white/90 rounded-2xl border border-slate-200 flex flex-col h-[650px]">
              
              {/* Column Header */}
              <div className={`p-3.5 rounded-t-2xl border-b border-slate-200 flex items-center justify-between ${col.bgHeader}`}>
                <div className="flex items-center gap-2 font-bold text-xs">
                  {col.icon}
                  <span className="text-slate-800">{col.title}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${col.color}`}>
                  {colTasks.length}
                </span>
              </div>

              {/* Column Task List */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-700">
                {colTasks.length === 0 ? (
                  <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-500 text-xs">
                    No tasks in this column
                  </div>
                ) : (
                  colTasks.map(task => (
                    <div
                      key={task.id}
                      className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200/70 hover:border-indigo-500/50 shadow-sm transition-all group relative"
                    >
                      {/* Priority Badge & Delete */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          task.priority === 'Critical' ? 'bg-red-500/20 text-red-700' :
                          task.priority === 'High' ? 'bg-amber-500/20 text-amber-700' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {task.priority} Priority
                        </span>

                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Task Title */}
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">{task.title}</h4>

                      {/* Notes Box */}
                      {task.notes && (
                        <div className="mt-2 p-2 rounded-lg bg-white/60 text-[11px] text-slate-600 border border-slate-200/50 flex items-start gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          <p className="line-clamp-3">{task.notes}</p>
                        </div>
                      )}

                      {/* Assignee & Due Date */}
                      <div className="mt-3 pt-2.5 border-t border-slate-200/50 flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5 truncate max-w-[120px]" title={`Assigned to ${task.assignedToName}`}>
                          <User className="w-3 h-3 text-slate-500" />
                          <span className="truncate">{task.assignedToName}</span>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>{task.dueDate}</span>
                        </div>
                      </div>

                      {/* Move Column Quick Controls */}
                      <div className="mt-3 pt-2 border-t border-slate-200/40 flex items-center justify-between gap-1">
                        <span className="text-[10px] font-medium text-slate-500">Move:</span>
                        <div className="flex items-center gap-1">
                          {columnConfigs.filter(c => c.key !== task.status).map(c => (
                            <button
                              key={c.key}
                              onClick={() => updateTaskStatus(task.id, c.key)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 hover:bg-indigo-600 text-slate-700 hover:text-white transition-colors"
                              title={`Move to ${c.title}`}
                            >
                              {c.title.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-modal border border-slate-900/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" /> Create New Task
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-slate-900 font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g., Update Q3 Performance Appraisal Docs"
                  className="w-full px-3 py-2 rounded-xl glass-input text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Task Notes / Description</label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Enter detailed task guidelines, instructions, or sub-tasks..."
                  className="w-full px-3 py-2 rounded-xl glass-input text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Status Column</label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="due">Due Soon</option>
                    <option value="overdue">Overdue</option>
                    <option value="need_urgent">Need Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Assign To Employee</label>
                  <select
                    value={assignedEmployeeId}
                    onChange={e => setAssignedEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={currentUser.employeeId || currentUser.id}>
                      Assign To Myself ({currentUser.name})
                    </option>
                    {users
                      .filter(u => u.id !== currentUser.id)
                      .map(u => (
                        <option key={u.id} value={u.employeeId || u.id}>
                          {u.name} ({u.designation || u.role})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={e => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg transition-colors"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
