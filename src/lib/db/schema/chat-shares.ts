import { pgTable, text, timestamp, index, unique } from "drizzle-orm/pg-core"
import { chats } from "./chats"

export const chatShares = pgTable("chat_shares", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").notNull(),
  sharedWithId: text("shared_with_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  unique("chat_shares_chat_user_uniq").on(t.chatId, t.sharedWithId),
  index("chat_shares_shared_with_id_idx").on(t.sharedWithId),
  index("chat_shares_chat_id_idx").on(t.chatId),
])
