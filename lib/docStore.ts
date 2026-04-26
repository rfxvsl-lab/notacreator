export type DocType = 'faktur' | 'kwitansi';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export interface DocumentData {
  id: string;
  type: DocType;
  createdAt: number;
  updatedAt: number;
  
  docNumber: string;
  date: string;
  
  // For Faktur
  customerName?: string;
  customerAddress?: string;
  items?: InvoiceItem[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  totalAmount?: number;
  notes?: string;

  // For Kwitansi
  receivedFrom?: string;
  paymentFor?: string;
  amountNumber?: number;
  amountText?: string;
  signatureName?: string;
  signatureLocation?: string;
}

const STORAGE_KEY = 'quicknota_docs';

export const getDocs = (): DocumentData[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const getDoc = (id: string): DocumentData | undefined => {
  const docs = getDocs();
  return docs.find(d => d.id === id);
};

export const saveDoc = (doc: DocumentData): void => {
  const docs = getDocs();
  const existingIndex = docs.findIndex(d => d.id === doc.id);
  
  if (existingIndex >= 0) {
    doc.updatedAt = Date.now();
    docs[existingIndex] = doc;
  } else {
    doc.createdAt = Date.now();
    doc.updatedAt = Date.now();
    docs.push(doc);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
};

export const deleteDoc = (id: string): void => {
  const docs = getDocs();
  const filtered = docs.filter(d => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
};
