import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";

// Return all stored values
export async function GET() {
  const db = await getDb();
  const docs = await db
    .collection<{ _id: string; value: unknown }>("state")
    .find()
    .toArray();
  const data: Record<string, unknown> = {};
  for (const doc of docs) {
    // @ts-ignore
    data[doc._id] = doc.value;
  }
  return NextResponse.json(data);
}

// Upsert a value for a given key
export async function POST(req: NextRequest) {
  const { key, value } = await req.json();
  if (typeof key !== "string") {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }
  const db = await getDb();
  await db
    .collection<{ _id: string; value: unknown }>("state")
    .updateOne(
      { _id: key },
      { $set: { value } },
      { upsert: true }
    );
  return NextResponse.json({ ok: true });
}
