'use server'

import { auth } from "@/auth";
import { db } from "./db";
import { companySettings, documents } from "./db/schema";
import { eq } from "drizzle-orm";
import type { DocumentData, CompanySettings } from "./docStore";

export async function getSessionUserId() {
  const session = await auth();
  return session?.user?.id;
}

export async function getDocsAction(): Promise<DocumentData[]> {
  const userId = await getSessionUserId();
  if (!userId) return [];

  const docs = await db.select().from(documents).where(eq(documents.userId, userId));
  
  return docs.map(doc => ({
    id: doc.id,
    type: doc.type as "faktur" | "kwitansi",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    docNumber: doc.docNumber,
    date: doc.date,
    customerName: doc.customerName || undefined,
    customerAddress: doc.customerAddress || undefined,
    customerPhone: doc.customerPhone || undefined,
    customerEmail: doc.customerEmail || undefined,
    items: doc.items ? JSON.parse(doc.items) : undefined,
    subtotal: doc.subtotal || undefined,
    discount: doc.discount || undefined,
    tax: doc.tax || undefined,
    downPayment: doc.downPayment || undefined,
    isDpBilling: doc.isDpBilling ?? undefined,
    totalAmount: doc.totalAmount || undefined,
    notes: doc.notes || undefined,
    receivedFrom: doc.receivedFrom || undefined,
    paymentFor: doc.paymentFor || undefined,
    amountNumber: doc.amountNumber || undefined,
    amountText: doc.amountText || undefined,
    signatureName: doc.signatureName || undefined,
    signatureLocation: doc.signatureLocation || undefined,
    signatureImage: doc.signatureImage || undefined,
    stampImage: doc.stampImage || undefined,
  }));
}

export async function getDocAction(id: string): Promise<DocumentData | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const docs = await db.select().from(documents).where(eq(documents.id, id));
  const doc = docs[0];
  if (!doc || doc.userId !== userId) return null;

  return {
    id: doc.id,
    type: doc.type as "faktur" | "kwitansi",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    docNumber: doc.docNumber,
    date: doc.date,
    customerName: doc.customerName || undefined,
    customerAddress: doc.customerAddress || undefined,
    customerPhone: doc.customerPhone || undefined,
    customerEmail: doc.customerEmail || undefined,
    items: doc.items ? JSON.parse(doc.items) : undefined,
    subtotal: doc.subtotal || undefined,
    discount: doc.discount || undefined,
    tax: doc.tax || undefined,
    downPayment: doc.downPayment || undefined,
    isDpBilling: doc.isDpBilling ?? undefined,
    totalAmount: doc.totalAmount || undefined,
    notes: doc.notes || undefined,
    receivedFrom: doc.receivedFrom || undefined,
    paymentFor: doc.paymentFor || undefined,
    amountNumber: doc.amountNumber || undefined,
    amountText: doc.amountText || undefined,
    signatureName: doc.signatureName || undefined,
    signatureLocation: doc.signatureLocation || undefined,
    signatureImage: doc.signatureImage || undefined,
    stampImage: doc.stampImage || undefined,
  };
}

export async function saveDocAction(doc: DocumentData) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Unauthorized");

  const existing = await db.select().from(documents).where(eq(documents.id, doc.id));

  const dataToSave = {
    userId,
    type: doc.type,
    createdAt: existing.length > 0 ? existing[0].createdAt : Date.now(),
    updatedAt: Date.now(),
    docNumber: doc.docNumber,
    date: doc.date,
    customerName: doc.customerName,
    customerAddress: doc.customerAddress,
    items: doc.items ? JSON.stringify(doc.items) : null,
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
  };

  if (existing.length > 0) {
    await db.update(documents).set(dataToSave).where(eq(documents.id, doc.id));
  } else {
    await db.insert(documents).values({ id: doc.id, ...dataToSave });
  }
}

export async function deleteDocAction(id: string) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Unauthorized");
  await db.delete(documents).where(eq(documents.id, id));
}

export async function getSettingsAction(): Promise<CompanySettings> {
  const userId = await getSessionUserId();
  const defaultSettings = { name: 'Perusahaan Anda', address: 'Jl. Contoh Alamat No. 123\nKota, Negara 12345', phone: '', email: 'info@perusahaan.com' };
  
  if (!userId) return defaultSettings;

  const res = await db.select().from(companySettings).where(eq(companySettings.userId, userId));
  if (res.length > 0) {
    return {
      name: res[0].name,
      address: res[0].address,
      phone: res[0].phone,
      email: res[0].email,
    };
  }
  return defaultSettings;
}

export async function saveSettingsAction(settings: CompanySettings) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Unauthorized");

  const existing = await db.select().from(companySettings).where(eq(companySettings.userId, userId));
  if (existing.length > 0) {
    await db.update(companySettings).set({
      name: settings.name,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
    }).where(eq(companySettings.userId, userId));
  } else {
    await db.insert(companySettings).values({
      userId,
      name: settings.name,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
    });
  }
}
