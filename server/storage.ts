import { db } from "./db";
import { eq, and, or, desc, asc, sql, inArray } from "drizzle-orm";
import * as schema from "../shared/schema";
import type {
  Dealer, InsertDealer,
  Sales, InsertSales,
  Driver, InsertDriver,
  Delivery, InsertDelivery,
  Message, InsertMessage,
  Notification, InsertNotification,
  DriverApplication, InsertDriverApplication,
  ApprovedDriverDealer, InsertApprovedDriverDealer,
  DealerAdmin, InsertDealerAdmin,
  AdminInvitation, InsertAdminInvitation,
  User, InsertUser,
  DriverStatistics, DriverPreference,
} from "../shared/schema";
import crypto from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getDealer(id: string): Promise<Dealer | undefined>;
  getDealerByUserId(userId: string): Promise<Dealer | undefined>;
  getDealers(): Promise<Dealer[]>;
  createDealer(dealer: InsertDealer): Promise<Dealer>;
  updateDealer(id: string, dealer: Partial<InsertDealer>): Promise<Dealer | undefined>;
  
  getSales(id: string): Promise<Sales | undefined>;
  getSalesByUserId(userId: string): Promise<Sales | undefined>;
  getSalesByDealerId(dealerId: string): Promise<Sales[]>;
  getSalesByEmailAndDealerId(email: string, dealerId: string): Promise<Sales | undefined>;
  createSales(sales: InsertSales): Promise<Sales>;
  updateSales(id: string, sales: Partial<InsertSales>): Promise<Sales | undefined>;
  deleteSales(id: string): Promise<void>;
  
  getDriver(id: string): Promise<Driver | undefined>;
  getDriverByUserId(userId: string): Promise<Driver | undefined>;
  getDrivers(): Promise<Driver[]>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriver(id: string, driver: Partial<InsertDriver>): Promise<Driver | undefined>;
  deleteDriver(id: string): Promise<void>;
  
  getDelivery(id: string): Promise<Delivery | undefined>;
  getDeliveriesByDealerId(dealerId: string): Promise<Delivery[]>;
  getDeliveriesByDriverId(driverId: string): Promise<Delivery[]>;
  getDeliveriesBySalesId(salesId: string): Promise<Delivery[]>;
  createDelivery(delivery: InsertDelivery): Promise<Delivery>;
  updateDelivery(id: string, delivery: Partial<InsertDelivery>): Promise<Delivery | undefined>;
  
  getMessages(deliveryId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(deliveryId: string, recipientId: string): Promise<void>;
  
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<void>;
  
  getDriverApplications(driverId: string): Promise<DriverApplication[]>;
  getDriverApplicationsByDealerId(dealerId: string): Promise<DriverApplication[]>;
  createDriverApplication(application: InsertDriverApplication): Promise<DriverApplication>;
  updateDriverApplication(id: string, application: Partial<InsertDriverApplication>): Promise<DriverApplication | undefined>;
  
  getApprovedDriverDealers(driverId: string): Promise<ApprovedDriverDealer[]>;
  getApprovedDriversByDealerId(dealerId: string): Promise<ApprovedDriverDealer[]>;
  createApprovedDriverDealer(approval: InsertApprovedDriverDealer): Promise<ApprovedDriverDealer>;
  deleteApprovedDriverDealer(driverId: string, dealerId: string): Promise<void>;
  
  getDealerAdmins(dealerId: string): Promise<DealerAdmin[]>;
  getDealerAdminByUserId(userId: string): Promise<DealerAdmin | undefined>;
  getAllDealerAdminsByUserId(userId: string): Promise<DealerAdmin[]>;
  createDealerAdmin(admin: InsertDealerAdmin): Promise<DealerAdmin>;
  updateDealerAdmin(id: string, admin: Partial<InsertDealerAdmin>): Promise<DealerAdmin | undefined>;
  deleteDealerAdmin(id: string): Promise<void>;
  
  getAdminInvitations(dealerId: string): Promise<AdminInvitation[]>;
  getAdminInvitationByToken(token: string): Promise<AdminInvitation | undefined>;
  getPendingAdminInvitationsByEmail(email: string): Promise<AdminInvitation[]>;
  createAdminInvitation(invitation: InsertAdminInvitation): Promise<AdminInvitation>;
  updateAdminInvitation(id: string, invitation: Partial<InsertAdminInvitation>): Promise<AdminInvitation | undefined>;
  
  getUnreadMessagesCount(userId: string): Promise<number>;
  getConversations(userId: string): Promise<{ deliveryId: string; lastMessage: Message; unreadCount: number; delivery: Delivery }[]>;
  getDeliveryWithRelations(deliveryId: string): Promise<{ delivery: Delivery; sales?: Sales; driver?: Driver } | undefined>;
  getDriverStatisticsByDealerId(dealerId: string): Promise<DriverStatistics[]>;
  getDriverPreferencesByUserAndDealer(userId: string, dealerId: string): Promise<DriverPreference[]>;
  getDriverPreference(userId: string, driverId: string, dealerId: string): Promise<DriverPreference | undefined>;
  upsertDriverPreference(preference: { userId: string; driverId: string; dealerId: string; preferenceLevel: number }): Promise<DriverPreference>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(schema.users).values(user).returning();
    return created;
  }

  async getDealer(id: string): Promise<Dealer | undefined> {
    const [dealer] = await db.select().from(schema.dealers).where(eq(schema.dealers.id, id));
    return dealer;
  }

  async getDealerByUserId(userId: string): Promise<Dealer | undefined> {
    const [dealer] = await db.select().from(schema.dealers).where(eq(schema.dealers.userId, userId));
    return dealer;
  }

  async getDealers(): Promise<Dealer[]> {
    return db.select().from(schema.dealers).orderBy(asc(schema.dealers.name));
  }

  async createDealer(dealer: InsertDealer): Promise<Dealer> {
    const [created] = await db.insert(schema.dealers).values(dealer).returning();
    return created;
  }

  async updateDealer(id: string, dealer: Partial<InsertDealer>): Promise<Dealer | undefined> {
    const [updated] = await db.update(schema.dealers).set(dealer).where(eq(schema.dealers.id, id)).returning();
    return updated;
  }

  async getSales(id: string): Promise<Sales | undefined> {
    const [sales] = await db.select().from(schema.sales).where(eq(schema.sales.id, id));
    return sales;
  }

  async getSalesByUserId(userId: string): Promise<Sales | undefined> {
    const [sales] = await db.select().from(schema.sales).where(eq(schema.sales.userId, userId));
    return sales;
  }

  async getSalesByDealerId(dealerId: string): Promise<Sales[]> {
    return db.select().from(schema.sales).where(eq(schema.sales.dealerId, dealerId));
  }

  async getSalesByEmailAndDealerId(email: string, dealerId: string): Promise<Sales | undefined> {
    const [sales] = await db.select().from(schema.sales).where(
      and(eq(schema.sales.email, email), eq(schema.sales.dealerId, dealerId))
    );
    return sales;
  }

  async createSales(sales: InsertSales): Promise<Sales> {
    const [created] = await db.insert(schema.sales).values(sales).returning();
    return created;
  }

  async updateSales(id: string, sales: Partial<InsertSales>): Promise<Sales | undefined> {
    const [updated] = await db.update(schema.sales).set(sales).where(eq(schema.sales.id, id)).returning();
    return updated;
  }

  async deleteSales(id: string): Promise<void> {
    await db.delete(schema.sales).where(eq(schema.sales.id, id));
  }

  async getDriver(id: string): Promise<Driver | undefined> {
    const [driver] = await db.select().from(schema.drivers).where(eq(schema.drivers.id, id));
    return driver;
  }

  async getDriverByUserId(userId: string): Promise<Driver | undefined> {
    const [driver] = await db.select().from(schema.drivers).where(eq(schema.drivers.userId, userId));
    return driver;
  }

  async getDrivers(): Promise<Driver[]> {
    return db.select().from(schema.drivers);
  }

  async createDriver(driver: InsertDriver): Promise<Driver> {
    const [created] = await db.insert(schema.drivers).values(driver).returning();
    return created;
  }

  async updateDriver(id: string, driver: Partial<InsertDriver>): Promise<Driver | undefined> {
    const [updated] = await db.update(schema.drivers).set({ ...driver, updatedAt: new Date() }).where(eq(schema.drivers.id, id)).returning();
    return updated;
  }

  async deleteDriver(id: string): Promise<void> {
    await db.delete(schema.drivers).where(eq(schema.drivers.id, id));
  }

  async getDelivery(id: string): Promise<Delivery | undefined> {
    const [delivery] = await db.select().from(schema.deliveries).where(eq(schema.deliveries.id, id));
    return delivery;
  }

  async getDeliveriesByDealerId(dealerId: string): Promise<Delivery[]> {
    return db.select().from(schema.deliveries).where(eq(schema.deliveries.dealerId, dealerId)).orderBy(desc(schema.deliveries.createdAt));
  }

  async getDeliveriesByDriverId(driverId: string): Promise<Delivery[]> {
    return db.select().from(schema.deliveries).where(eq(schema.deliveries.driverId, driverId)).orderBy(desc(schema.deliveries.createdAt));
  }

  async getDeliveriesBySalesId(salesId: string): Promise<Delivery[]> {
    return db.select().from(schema.deliveries).where(eq(schema.deliveries.salesId, salesId)).orderBy(desc(schema.deliveries.createdAt));
  }

  async createDelivery(delivery: InsertDelivery): Promise<Delivery> {
    const [created] = await db.insert(schema.deliveries).values(delivery).returning();
    return created;
  }

  async updateDelivery(id: string, delivery: Partial<InsertDelivery>): Promise<Delivery | undefined> {
    const [updated] = await db.update(schema.deliveries).set({ ...delivery, updatedAt: new Date() }).where(eq(schema.deliveries.id, id)).returning();
    return updated;
  }

  async getMessages(deliveryId: string): Promise<Message[]> {
    return db.select().from(schema.messages).where(eq(schema.messages.deliveryId, deliveryId)).orderBy(asc(schema.messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(schema.messages).values(message).returning();
    return created;
  }

  async markMessagesAsRead(deliveryId: string, recipientId: string): Promise<void> {
    await db.update(schema.messages).set({ read: true }).where(
      and(eq(schema.messages.deliveryId, deliveryId), eq(schema.messages.recipientId, recipientId))
    );
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(schema.notifications).where(eq(schema.notifications.userId, userId)).orderBy(desc(schema.notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(schema.notifications).values(notification).returning();
    return created;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(schema.notifications).set({ read: true }).where(eq(schema.notifications.id, id));
  }

  async getDriverApplications(driverId: string): Promise<DriverApplication[]> {
    return db.select().from(schema.driverApplications).where(eq(schema.driverApplications.driverId, driverId));
  }

  async getDriverApplicationsByDealerId(dealerId: string): Promise<DriverApplication[]> {
    return db.select().from(schema.driverApplications).where(eq(schema.driverApplications.dealerId, dealerId));
  }

  async createDriverApplication(application: InsertDriverApplication): Promise<DriverApplication> {
    const [created] = await db.insert(schema.driverApplications).values(application).returning();
    return created;
  }

  async updateDriverApplication(id: string, application: Partial<InsertDriverApplication>): Promise<DriverApplication | undefined> {
    const [updated] = await db.update(schema.driverApplications).set(application).where(eq(schema.driverApplications.id, id)).returning();
    return updated;
  }

  async getApprovedDriverDealers(driverId: string): Promise<ApprovedDriverDealer[]> {
    return db.select().from(schema.approvedDriverDealers).where(eq(schema.approvedDriverDealers.driverId, driverId));
  }

  async getApprovedDriversByDealerId(dealerId: string): Promise<ApprovedDriverDealer[]> {
    return db.select().from(schema.approvedDriverDealers).where(eq(schema.approvedDriverDealers.dealerId, dealerId));
  }

  async createApprovedDriverDealer(approval: InsertApprovedDriverDealer): Promise<ApprovedDriverDealer> {
    const [created] = await db.insert(schema.approvedDriverDealers).values(approval).returning();
    return created;
  }

  async deleteApprovedDriverDealer(driverId: string, dealerId: string): Promise<void> {
    await db.delete(schema.approvedDriverDealers).where(
      and(eq(schema.approvedDriverDealers.driverId, driverId), eq(schema.approvedDriverDealers.dealerId, dealerId))
    );
  }

  async getDealerAdmins(dealerId: string): Promise<DealerAdmin[]> {
    return db.select().from(schema.dealerAdmins).where(eq(schema.dealerAdmins.dealerId, dealerId));
  }

  async getDealerAdminByUserId(userId: string): Promise<DealerAdmin | undefined> {
    const [admin] = await db.select().from(schema.dealerAdmins).where(eq(schema.dealerAdmins.userId, userId));
    return admin;
  }

  async getAllDealerAdminsByUserId(userId: string): Promise<DealerAdmin[]> {
    return db.select().from(schema.dealerAdmins).where(eq(schema.dealerAdmins.userId, userId));
  }

  async createDealerAdmin(admin: InsertDealerAdmin): Promise<DealerAdmin> {
    const [created] = await db.insert(schema.dealerAdmins).values(admin).returning();
    return created;
  }

  async updateDealerAdmin(id: string, admin: Partial<InsertDealerAdmin>): Promise<DealerAdmin | undefined> {
    const [updated] = await db.update(schema.dealerAdmins).set(admin).where(eq(schema.dealerAdmins.id, id)).returning();
    return updated;
  }

  async deleteDealerAdmin(id: string): Promise<void> {
    await db.delete(schema.dealerAdmins).where(eq(schema.dealerAdmins.id, id));
  }

  async getAdminInvitations(dealerId: string): Promise<AdminInvitation[]> {
    return db.select().from(schema.adminInvitations).where(eq(schema.adminInvitations.dealerId, dealerId));
  }

  async getAdminInvitationByToken(token: string): Promise<AdminInvitation | undefined> {
    const [invitation] = await db.select().from(schema.adminInvitations).where(eq(schema.adminInvitations.token, token));
    return invitation;
  }

  async getPendingAdminInvitationsByEmail(email: string): Promise<AdminInvitation[]> {
    return db.select().from(schema.adminInvitations)
      .where(and(
        sql`lower(${schema.adminInvitations.email}) = lower(${email})`,
        eq(schema.adminInvitations.status, "pending"),
        sql`${schema.adminInvitations.expiresAt} > now()`
      ));
  }

  async createAdminInvitation(invitation: InsertAdminInvitation): Promise<AdminInvitation> {
    const [created] = await db.insert(schema.adminInvitations).values(invitation).returning();
    return created;
  }

  async updateAdminInvitation(id: string, invitation: Partial<InsertAdminInvitation>): Promise<AdminInvitation | undefined> {
    const [updated] = await db.update(schema.adminInvitations).set(invitation).where(eq(schema.adminInvitations.id, id)).returning();
    return updated;
  }

  async getUnreadMessagesCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(schema.messages)
      .where(and(eq(schema.messages.recipientId, userId), eq(schema.messages.read, false)));
    return result[0]?.count || 0;
  }

  async getConversations(userId: string): Promise<{ deliveryId: string; lastMessage: Message; unreadCount: number; delivery: Delivery }[]> {
    const allMessages = await db.select()
      .from(schema.messages)
      .where(or(eq(schema.messages.senderId, userId), eq(schema.messages.recipientId, userId)))
      .orderBy(desc(schema.messages.createdAt));

    const deliveryIds = [...new Set(allMessages.map(m => m.deliveryId))];
    if (deliveryIds.length === 0) return [];

    const deliveries = await db.select().from(schema.deliveries).where(inArray(schema.deliveries.id, deliveryIds));

    const conversations = deliveryIds.map(deliveryId => {
      const msgs = allMessages.filter(m => m.deliveryId === deliveryId);
      const lastMessage = msgs[0];
      const unreadCount = msgs.filter(m => m.recipientId === userId && !m.read).length;
      const delivery = deliveries.find(d => d.id === deliveryId);
      if (!delivery || !lastMessage) return null;
      return { deliveryId, lastMessage, unreadCount, delivery };
    }).filter((c): c is NonNullable<typeof c> => c !== null);

    return conversations;
  }

  async getDeliveryWithRelations(deliveryId: string): Promise<{ delivery: Delivery; sales?: Sales; driver?: Driver } | undefined> {
    const [delivery] = await db.select().from(schema.deliveries).where(eq(schema.deliveries.id, deliveryId));
    if (!delivery) return undefined;

    let sales: Sales | undefined;
    let driver: Driver | undefined;

    if (delivery.salesId) {
      const [salesData] = await db.select().from(schema.sales).where(eq(schema.sales.id, delivery.salesId));
      sales = salesData;
    }
    if (delivery.driverId) {
      const [driverData] = await db.select().from(schema.drivers).where(eq(schema.drivers.id, delivery.driverId));
      driver = driverData;
    }

    return { delivery, sales, driver };
  }

  async getDriverStatisticsByDealerId(dealerId: string): Promise<DriverStatistics[]> {
    return db.select().from(schema.driverStatistics).where(eq(schema.driverStatistics.dealerId, dealerId));
  }

  async getDriverPreferencesByUserAndDealer(userId: string, dealerId: string): Promise<DriverPreference[]> {
    return db.select().from(schema.driverPreferences).where(
      and(eq(schema.driverPreferences.userId, userId), eq(schema.driverPreferences.dealerId, dealerId))
    );
  }

  async getDriverPreference(userId: string, driverId: string, dealerId: string): Promise<DriverPreference | undefined> {
    const [pref] = await db.select().from(schema.driverPreferences).where(
      and(
        eq(schema.driverPreferences.userId, userId),
        eq(schema.driverPreferences.driverId, driverId),
        eq(schema.driverPreferences.dealerId, dealerId)
      )
    );
    return pref;
  }

  async upsertDriverPreference(preference: { userId: string; driverId: string; dealerId: string; preferenceLevel: number }): Promise<DriverPreference> {
    const existing = await this.getDriverPreference(preference.userId, preference.driverId, preference.dealerId);
    
    if (existing) {
      const [updated] = await db.update(schema.driverPreferences)
        .set({ preferenceLevel: preference.preferenceLevel, updatedAt: new Date() })
        .where(eq(schema.driverPreferences.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(schema.driverPreferences)
        .values({
          userId: preference.userId,
          driverId: preference.driverId,
          dealerId: preference.dealerId,
          preferenceLevel: preference.preferenceLevel,
          useCount: 1,
        })
        .returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
