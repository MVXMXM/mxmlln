import { createHash } from "crypto";
import { NextResponse } from "next/server";
import readingList from "@/content/reading-list.json";

export async function GET() {
  const links = (readingList.links ?? []).map((link) => ({
    ...link,
    screenshotHash: createHash("md5").update(link.url).digest("hex"),
  }));

  return NextResponse.json({ ...readingList, links });
}
