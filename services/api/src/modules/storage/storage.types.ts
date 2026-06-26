export type StorageProvider = "LOCAL" | "R2";

export type StoredFileResult = {
  provider: StorageProvider;
  filePath: string | null;
  storageKey: string | null;
  storageBucket: string | null;
  storageRegion: string | null;
};

export type StoredFileReference = {
  storageProvider: string;
  filePath?: string | null;
  storageKey?: string | null;
  storageBucket?: string | null;
  storageRegion?: string | null;
};

export type StorageAccessResult = {
  filePath?: string;
  fileUrl?: string;
};