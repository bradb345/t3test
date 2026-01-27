import { EventEmitter } from "events";
import { db } from "~/server/db";
import { notifications } from "~/server/db/schema";

class NotificationEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(0);
  }

  subscribe(userId: number, callback: (notification: unknown) => void) {
    const event = `notification:${userId}`;
    this.on(event, callback);
    return () => {
      this.off(event, callback);
    };
  }

  emitNotification(userId: number, notification: unknown) {
    this.emit(`notification:${userId}`, notification);
  }
}

const globalForEmitter = globalThis as unknown as {
  notificationEmitter: NotificationEmitter | undefined;
};

export const notificationEmitter =
  globalForEmitter.notificationEmitter ?? new NotificationEmitter();

if (process.env.NODE_ENV !== "production") {
  globalForEmitter.notificationEmitter = notificationEmitter;
}

export async function createAndEmitNotification(
  values: typeof notifications.$inferInsert
) {
  const [inserted] = await db.insert(notifications).values(values).returning();
  if (inserted) {
    notificationEmitter.emitNotification(values.userId, inserted);
  }
  return inserted;
}
