import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  real
} from "drizzle-orm/sqlite-core"
import type { AdapterAccountType } from "next-auth/adapters"

export const users = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
})

export const accounts = sqliteTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] })
  ]
)

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
})

export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
)

// App specific tables
export const companySettings = sqliteTable("company_settings", {
  userId: text("userId")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
})

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["faktur", "kwitansi"] }).notNull(),
  createdAt: integer("createdAt").notNull(),
  updatedAt: integer("updatedAt").notNull(),
  docNumber: text("docNumber").notNull(),
  date: text("date").notNull(),
  
  // Faktur specific
  customerName: text("customerName"),
  customerAddress: text("customerAddress"),
  customerPhone: text("customerPhone"),
  customerEmail: text("customerEmail"),
  items: text("items", { mode: "json" }), // stores JSON string of items array
  subtotal: real("subtotal"),
  discount: real("discount"),
  tax: real("tax"),
  downPayment: real("downPayment"),
  isDpBilling: integer("isDpBilling", { mode: "boolean" }),
  totalAmount: real("totalAmount"),
  notes: text("notes"),
  
  // Kwitansi specific
  receivedFrom: text("receivedFrom"),
  paymentFor: text("paymentFor"),
  amountNumber: real("amountNumber"),
  amountText: text("amountText"),
  
  // Shared Print specific
  signatureName: text("signatureName"),
  signatureLocation: text("signatureLocation"),
  signatureImage: text("signatureImage"), // stores base64 string
  stampImage: text("stampImage"), // stores base64 string
})
