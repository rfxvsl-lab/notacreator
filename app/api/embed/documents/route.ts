import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

const EMBED_USER_ID = "embed-public";

// CORS headers for cross-origin embed access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const id = body.id || uuidv4();
    const now = Date.now();

    const dataToSave = {
      id,
      userId: body.userId || EMBED_USER_ID,
      type: body.type || "faktur",
      createdAt: body.createdAt || now,
      updatedAt: now,
      docNumber: body.docNumber || "",
      date: body.date || new Date().toISOString().split("T")[0],
      customerName: body.customerName || null,
      customerAddress: body.customerAddress || null,
      customerPhone: body.customerPhone || null,
      customerEmail: body.customerEmail || null,
      items: body.items ? body.items : null,
      subtotal: body.subtotal || null,
      discount: body.discount || null,
      tax: body.tax || null,
      downPayment: body.downPayment || null,
      isDpBilling: body.isDpBilling || null,
      totalAmount: body.totalAmount || null,
      notes: body.notes || null,
      receivedFrom: body.receivedFrom || null,
      paymentFor: body.paymentFor || null,
      amountNumber: body.amountNumber || null,
      amountText: body.amountText || null,
      signatureName: body.signatureName || null,
      signatureLocation: body.signatureLocation || null,
      signatureImage: body.signatureImage || null,
      stampImage: body.stampImage || null,
    };

    await db.insert(documents).values(dataToSave);

    return NextResponse.json(
      { success: true, id, message: "Dokumen berhasil disimpan" },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Embed API Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan dokumen" },
      { status: 500, headers: corsHeaders }
    );
  }
}
