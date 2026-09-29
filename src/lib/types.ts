export type Notebook = {
  id: string;
  title: string;
  created_at: string;
};

export type Source = {
  id: string;
  notebook_id: string;
  title: string;
  kind: "pdf" | "text" | "url";
  content: string;
  created_at: string;
};

/** One retrieved chunk. Its index in the array is what a citation points at. */
export type RetrievedChunk = {
  id: number;
  sourceId: string;
  sourceTitle: string;
  idx: number;
  content: string;
  similarity: number;
};

/** Claude's structured citation: a character range inside one document. */
export type Citation = {
  type: string;
  cited_text: string;
  document_index: number;
  document_title: string | null;
  start_char_index?: number;
  end_char_index?: number;
};
