"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createNotebook() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("notebooks")
    .insert({ title: "Neues Notebook", user_id: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/");
  redirect(`/notebook/${data.id}`);
}

export async function renameNotebook(id: string, title: string) {
  const supabase = await createClient();
  await supabase.from("notebooks").update({ title }).eq("id", id);
  revalidatePath(`/notebook/${id}`);
  revalidatePath("/");
}

export async function deleteSource(id: string, notebookId: string) {
  const supabase = await createClient();
  await supabase.from("sources").delete().eq("id", id);
  revalidatePath(`/notebook/${notebookId}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
