export interface Diagram {
  id: string;
  name: string;
  description: string | null;
  ownerId: string | null;
  folderId: string | null;
  googleDriveFileId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiagramInput {
  name: string;
  description: string | null;
  folderId: string | null;
}
