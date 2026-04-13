export type GuestStatus = 'Confirmado' | 'Pendente' | 'Recusou';

export type Task = {
  id: string;
  title: string;
  assignee: string;
  done: boolean;
};

export type Guest = {
  id: string;
  name: string;
  group: string;
  status: GuestStatus;
};

export type BudgetItem = {
  id: string;
  label: string;
  category: string;
  amount: number;
};

export type Party = {
  id: string;
  name: string;
  category: string;
  date: string;
  location: string;
  tasks: Task[];
  guests: Guest[];
  budget: {
    estimated: number;
    spent: number;
    items: BudgetItem[];
  };
};

export type RoadmapStage = {
  id: string;
  title: string;
  description: string;
  status: 'Concluida' | 'Em andamento' | 'Planejada';
};

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthSession = {
  accessToken: string;
  expiresAtUtc: string;
  user: AuthenticatedUser;
};

export type NotificationSettings = {
  informationalEnabled: boolean;
};

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAtUtc: string;
};
