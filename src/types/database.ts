export type UserRole = 'admin' | 'manager' | 'member';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';
export type NotificationType = 'task_assigned' | 'task_completed' | 'mention' | 'new_comment' | 'direct_message';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color_code: string;
  created_by?: string;
  is_archived: boolean;
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
  due_date?: string;
  completed_at?: string;
  completed_by?: string;
  created_at: string;
  // Joins
  assigned_profile?: Profile;
  project?: Project;
}

export interface ChatMessage {
  id: string;
  project_id?: string;
  sender_id: string;
  recipient_id?: string;
  content: string;
  mentions: string[];
  is_direct_message: boolean;
  created_at: string;
  sender?: Profile;
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
