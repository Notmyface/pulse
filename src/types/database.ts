export type UserRole = 'admin' | 'manager' | 'member';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';
export type NotificationType = 'task_assigned' | 'task_completed' | 'mention' | 'new_comment' | 'direct_message';
export type PersonalTodoStatus = 'todo' | 'done';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  user_emoji?: string;
  user_color?: string;
  is_active?: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color_code: string;
  created_by?: string;
  category_id?: string;
  module_todo?: boolean;
  module_docs?: boolean;
  module_files?: boolean;
  module_kanban?: boolean;
  module_gantt?: boolean;
  module_chat?: boolean;
  documentation_content?: string;
  category?: Category;
  is_archived: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  order_index?: number;
  is_archived?: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  created_by: string;
  assigned_to?: string;
  start_date?: string;
  due_date?: string;
  task_color?: string;
  completed_at?: string;
  completed_by?: string;
  archived_at?: string;
  archived_by?: string;
  created_at: string;
  // Joins
  assigned_profile?: Profile;
  assignees?: Profile[];
  project?: Project;
}

export interface TaskDependency {
  id: string;
  project_id: string;
  task_id: string;
  depends_on_task_id: string;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: Profile;
}

export interface PersonalTodo {
  id: string;
  user_id: string;
  title: string;
  note?: string;
  priority: TaskPriority;
  status: PersonalTodoStatus;
  due_at?: string;
  remind_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  channel_id?: string;
  project_id?: string;
  sender_id: string;
  recipient_id?: string;
  content: string;
  mentions: string[];
  is_direct_message: boolean;
  created_at: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
  attachment_mime?: string;
  sender?: Profile;
}

export interface Channel {
  id: string;
  project_id?: string;
  name: string;
  description?: string;
  type: 'project' | 'custom';
  created_by: string;
  created_at: string;
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  joined_at: string;
}

export interface ListModulePermission {
  id: string;
  project_id: string;
  user_id: string;
  can_todo: boolean;
  can_docs: boolean;
  can_files: boolean;
  can_kanban: boolean;
  can_gantt: boolean;
  can_chat: boolean;
  created_at: string;
}

export interface CalendarPermission {
  id: string;
  granter_user_id: string;
  viewer_user_id: string;
  show_title: boolean;
  show_dates: boolean;
  show_priority: boolean;
  show_assignees: boolean;
  show_description: boolean;
  show_list_name: boolean;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  actor_id: string;
  type: NotificationType;
  title: string;
  message: string;
  entity_type: 'task' | 'chat' | 'project';
  entity_id: string;
  is_read: boolean;
  created_at: string;
  actor?: Profile;
}
