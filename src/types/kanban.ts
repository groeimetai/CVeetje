export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  order: number;
}

export interface KanbanTag {
  id: string;
  label: string;
  color: string;
}

export interface KanbanBoard {
  id: string;
  title: string;
  description: string;
  columns: KanbanColumn[];
  tags: KanbanTag[];
  cardCount: number;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KanbanCard {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string;
  tagIds: string[];
  order: number;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}
