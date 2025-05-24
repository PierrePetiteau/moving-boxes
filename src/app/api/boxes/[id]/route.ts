import { notion } from "@src/lib/notion";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with service role key for uploads
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function DELETE(_: NextRequest, context: any) {
  try {
    const boxId = context.params.id;

    // Delete photos from Supabase storage
    const { data: files, error: listError } = await supabase.storage.from("photos").list(boxId);
    if (listError) throw listError;

    if (files?.length) {
      const { error: deleteError } = await supabase.storage
        .from("photos")
        .remove(files.map((file) => `${boxId}/${file.name}`));
      if (deleteError) throw deleteError;
    }

    // Delete the page from Notion
    await notion.pages.update({
      page_id: boxId,
      archived: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting box:", error);
    return NextResponse.json({ error: "Failed to delete box" }, { status: 500 });
  }
}
