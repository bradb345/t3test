// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import {
  index,
  pgTableCreator,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `t3test_${name}`);

export const user = createTable(
  "user",
  {
    id: serial("id").primaryKey(),
    auth_id: varchar("auth_id", { length: 256 }).notNull().unique(),
    email: varchar("email", { length: 256 }).notNull(),
    first_name: varchar("first_name", { length: 256 }).notNull(),
    last_name: varchar("last_name", { length: 256 }).notNull(),
    image_url: varchar("image_url", { length: 256 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date()
    ),
  },
  (example) => ({
    nameIndex: index("name_idx").on(example.first_name, example.last_name),
  })
);
