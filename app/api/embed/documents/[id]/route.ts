import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const EMBED_USER_ID = "embed-public";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));

    const doc = docs[0];

    // Only return embed documents (safety check)
    if (!doc || doc.userId !== EMBED_USER_ID) {
      return NextResponse.json(
        { success: false, error: "Dokumen tidak ditemukan" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: doc.id,
          type: doc.type,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          docNumber: doc.docNumber,
          date: doc.date,
          customerName: doc.customerName,
          customerAddress: doc.customerAddress,
          customerPhone: doc.customerPhone,
          customerEmail: doc.customerEmail,
          items: doc.items,
          subtotal: doc.subtotal,
          discount: doc.discount,
          tax: doc.tax,
          downPayment: doc.downPayment,
          isDpBilling: doc.isDpBilling,
          totalAmount: doc.totalAmount,
          notes: doc.notes,
          receivedFrom: doc.receivedFrom,
          paymentFor: doc.paymentFor,
          amountNumber: doc.amountNumber,
          amountText: doc.amountText,
          signatureName: doc.signatureName,
          signatureLocation: doc.signatureLocation,
          signatureImage: doc.signatureImage,
          stampImage: doc.stampImage,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Embed API GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil dokumen" },
      { status: 500, headers: corsHeaders }
    );
  }
}
