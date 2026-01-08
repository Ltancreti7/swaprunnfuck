import type { Express } from "express";
import { storage } from "./storage";
import bcrypt from "bcryptjs";

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function registerRoutes(app: Express): void {
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, role } = req.body;
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }
      
      const user = await storage.createUser({
        email,
        passwordHash: await hashPassword(password),
        role,
      });
      
      (req.session as any).userId = user.id;
      (req.session as any).role = user.role;
      
      res.json({ user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user || !await verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      (req.session as any).userId = user.id;
      (req.session as any).role = user.role;
      
      res.json({ user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.json({ user: null });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.json({ user: null });
      }
      
      let profile = null;
      const role = user.role;
      
      if (role === "dealer") {
        profile = await storage.getDealerByUserId(userId);
      } else if (role === "sales") {
        profile = await storage.getSalesByUserId(userId);
      } else if (role === "driver") {
        profile = await storage.getDriverByUserId(userId);
      }
      
      res.json({ 
        user: { id: user.id, email: user.email, role: user.role },
        profile
      });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ error: "Auth check failed" });
    }
  });

  app.get("/api/dealers", async (req, res) => {
    try {
      const dealers = await storage.getDealers();
      res.json(dealers);
    } catch (error) {
      console.error("Get dealers error:", error);
      res.status(500).json({ error: "Failed to get dealers" });
    }
  });

  app.get("/api/dealers/:id", async (req, res) => {
    try {
      const dealer = await storage.getDealer(req.params.id);
      if (!dealer) {
        return res.status(404).json({ error: "Dealer not found" });
      }
      res.json(dealer);
    } catch (error) {
      console.error("Get dealer error:", error);
      res.status(500).json({ error: "Failed to get dealer" });
    }
  });

  app.post("/api/dealers", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const dealer = await storage.createDealer({ ...req.body, userId });
      
      await storage.createDealerAdmin({
        dealerId: dealer.id,
        userId,
        role: "owner",
        invitedBy: userId,
      });
      
      res.json(dealer);
    } catch (error) {
      console.error("Create dealer error:", error);
      res.status(500).json({ error: "Failed to create dealer" });
    }
  });

  app.patch("/api/dealers/:id", async (req, res) => {
    try {
      const dealer = await storage.updateDealer(req.params.id, req.body);
      res.json(dealer);
    } catch (error) {
      console.error("Update dealer error:", error);
      res.status(500).json({ error: "Failed to update dealer" });
    }
  });

  app.get("/api/sales", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const dealer = await storage.getDealerByUserId(userId);
      if (!dealer) {
        return res.status(404).json({ error: "Dealer not found" });
      }
      
      const sales = await storage.getSalesByDealerId(dealer.id);
      res.json(sales);
    } catch (error) {
      console.error("Get sales error:", error);
      res.status(500).json({ error: "Failed to get sales" });
    }
  });

  app.post("/api/sales", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const sales = await storage.createSales({ ...req.body, userId });
      res.json(sales);
    } catch (error) {
      console.error("Create sales error:", error);
      res.status(500).json({ error: "Failed to create sales" });
    }
  });

  app.patch("/api/sales/:id", async (req, res) => {
    try {
      const sales = await storage.updateSales(req.params.id, req.body);
      res.json(sales);
    } catch (error) {
      console.error("Update sales error:", error);
      res.status(500).json({ error: "Failed to update sales" });
    }
  });

  app.delete("/api/sales/:id", async (req, res) => {
    try {
      await storage.deleteSales(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete sales error:", error);
      res.status(500).json({ error: "Failed to delete sales" });
    }
  });

  app.get("/api/dealer/current", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const admin = await storage.getDealerAdminByUserId(userId);
      if (admin) {
        const dealer = await storage.getDealer(admin.dealerId);
        return res.json({ dealer, adminRole: admin.role });
      }
      
      const dealer = await storage.getDealerByUserId(userId);
      if (dealer) {
        return res.json({ dealer, adminRole: 'owner' });
      }
      
      res.status(404).json({ error: "Dealer not found" });
    } catch (error) {
      console.error("Get current dealer error:", error);
      res.status(500).json({ error: "Failed to get dealer" });
    }
  });

  app.get("/api/sales/current", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const sales = await storage.getSalesByUserId(userId);
      if (!sales) {
        return res.status(404).json({ error: "Sales profile not found" });
      }
      
      res.json(sales);
    } catch (error) {
      console.error("Get current sales error:", error);
      res.status(500).json({ error: "Failed to get sales profile" });
    }
  });

  app.get("/api/sales/dealer/:dealerId", async (req, res) => {
    try {
      const sales = await storage.getSalesByDealerId(req.params.dealerId);
      res.json(sales);
    } catch (error) {
      console.error("Get sales by dealer error:", error);
      res.status(500).json({ error: "Failed to get sales" });
    }
  });

  app.get("/api/deliveries/sales/:salesId", async (req, res) => {
    try {
      const deliveries = await storage.getDeliveriesBySalesId(req.params.salesId);
      res.json(deliveries);
    } catch (error) {
      console.error("Get deliveries by sales error:", error);
      res.status(500).json({ error: "Failed to get deliveries" });
    }
  });

  app.get("/api/drivers/approved/:dealerId", async (req, res) => {
    try {
      const approvals = await storage.getApprovedDriversByDealerId(req.params.dealerId);
      const drivers = await Promise.all(
        approvals.map(async (a) => {
          const driver = await storage.getDriver(a.driverId);
          return driver;
        })
      );
      res.json(drivers.filter(Boolean));
    } catch (error) {
      console.error("Get approved drivers error:", error);
      res.status(500).json({ error: "Failed to get approved drivers" });
    }
  });

  app.get("/api/deliveries/dealer/:dealerId", async (req, res) => {
    try {
      const deliveries = await storage.getDeliveriesByDealerId(req.params.dealerId);
      res.json(deliveries);
    } catch (error) {
      console.error("Get deliveries by dealer error:", error);
      res.status(500).json({ error: "Failed to get deliveries" });
    }
  });

  app.get("/api/driver-applications/dealer/:dealerId", async (req, res) => {
    try {
      const applications = await storage.getDriverApplicationsByDealerId(req.params.dealerId);
      const applicationsWithDrivers = await Promise.all(
        applications.map(async (app) => {
          const driver = await storage.getDriver(app.driverId);
          return { ...app, driver };
        })
      );
      res.json(applicationsWithDrivers.filter(a => a.driver));
    } catch (error) {
      console.error("Get driver applications error:", error);
      res.status(500).json({ error: "Failed to get driver applications" });
    }
  });

  app.get("/api/drivers", async (req, res) => {
    try {
      const drivers = await storage.getDrivers();
      res.json(drivers);
    } catch (error) {
      console.error("Get drivers error:", error);
      res.status(500).json({ error: "Failed to get drivers" });
    }
  });

  app.get("/api/drivers/current", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const driver = await storage.getDriverByUserId(userId);
      if (!driver) {
        return res.status(404).json({ error: "Driver profile not found" });
      }
      
      res.json(driver);
    } catch (error) {
      console.error("Get current driver error:", error);
      res.status(500).json({ error: "Failed to get driver profile" });
    }
  });

  app.get("/api/drivers/:id", async (req, res) => {
    try {
      const driver = await storage.getDriver(req.params.id);
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      res.json(driver);
    } catch (error) {
      console.error("Get driver error:", error);
      res.status(500).json({ error: "Failed to get driver" });
    }
  });

  app.post("/api/drivers", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const driver = await storage.createDriver({ ...req.body, userId });
      res.json(driver);
    } catch (error) {
      console.error("Create driver error:", error);
      res.status(500).json({ error: "Failed to create driver" });
    }
  });

  app.patch("/api/drivers/:id", async (req, res) => {
    try {
      const driver = await storage.updateDriver(req.params.id, req.body);
      res.json(driver);
    } catch (error) {
      console.error("Update driver error:", error);
      res.status(500).json({ error: "Failed to update driver" });
    }
  });

  app.delete("/api/drivers/:id", async (req, res) => {
    try {
      await storage.deleteDriver(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete driver error:", error);
      res.status(500).json({ error: "Failed to delete driver" });
    }
  });

  app.get("/api/deliveries", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      let deliveries;
      if (user.role === "dealer") {
        const dealer = await storage.getDealerByUserId(userId);
        if (dealer) {
          deliveries = await storage.getDeliveriesByDealerId(dealer.id);
        }
      } else if (user.role === "sales") {
        const sales = await storage.getSalesByUserId(userId);
        if (sales) {
          deliveries = await storage.getDeliveriesBySalesId(sales.id);
        }
      } else if (user.role === "driver") {
        const driver = await storage.getDriverByUserId(userId);
        if (driver) {
          deliveries = await storage.getDeliveriesByDriverId(driver.id);
        }
      }
      
      res.json(deliveries || []);
    } catch (error) {
      console.error("Get deliveries error:", error);
      res.status(500).json({ error: "Failed to get deliveries" });
    }
  });

  app.get("/api/deliveries/:id", async (req, res) => {
    try {
      const delivery = await storage.getDelivery(req.params.id);
      if (!delivery) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      res.json(delivery);
    } catch (error) {
      console.error("Get delivery error:", error);
      res.status(500).json({ error: "Failed to get delivery" });
    }
  });

  app.post("/api/deliveries", async (req, res) => {
    try {
      const delivery = await storage.createDelivery(req.body);
      res.json(delivery);
    } catch (error) {
      console.error("Create delivery error:", error);
      res.status(500).json({ error: "Failed to create delivery" });
    }
  });

  app.patch("/api/deliveries/:id", async (req, res) => {
    try {
      const delivery = await storage.updateDelivery(req.params.id, req.body);
      res.json(delivery);
    } catch (error) {
      console.error("Update delivery error:", error);
      res.status(500).json({ error: "Failed to update delivery" });
    }
  });

  app.get("/api/deliveries/driver/:driverId", async (req, res) => {
    try {
      const { status } = req.query;
      let deliveries = await storage.getDeliveriesByDriverId(req.params.driverId);
      if (status && typeof status === "string") {
        const statuses = status.split(",");
        deliveries = deliveries.filter(d => statuses.includes(d.status));
      }
      const enrichedDeliveries = await Promise.all(
        deliveries.map(async (d) => {
          const dealer = await storage.getDealer(d.dealerId);
          const sales = d.salesId ? await storage.getSales(d.salesId) : null;
          return { ...d, dealer, sales: sales ? { name: sales.name } : null };
        })
      );
      res.json(enrichedDeliveries);
    } catch (error) {
      console.error("Get deliveries by driver error:", error);
      res.status(500).json({ error: "Failed to get deliveries" });
    }
  });

  app.get("/api/deliveries/driver/:driverId/requests", async (req, res) => {
    try {
      const driverId = req.params.driverId;
      const approvedDealers = await storage.getApprovedDriverDealers(driverId);
      const dealerIds = approvedDealers.map(a => a.dealerId);
      
      if (dealerIds.length === 0) {
        return res.json([]);
      }
      
      const allDeliveries = await Promise.all(
        dealerIds.map(dealerId => storage.getDeliveriesByDealerId(dealerId))
      );
      
      const requests = allDeliveries.flat().filter(d => 
        (d.status === "pending" && !d.driverId) ||
        (d.status === "pending_driver_acceptance" && d.driverId === driverId)
      );
      
      const enrichedRequests = await Promise.all(
        requests.map(async (d) => {
          const dealer = await storage.getDealer(d.dealerId);
          const sales = d.salesId ? await storage.getSales(d.salesId) : null;
          return { ...d, dealer, sales: sales ? { name: sales.name } : null };
        })
      );
      
      res.json(enrichedRequests);
    } catch (error) {
      console.error("Get delivery requests for driver error:", error);
      res.status(500).json({ error: "Failed to get delivery requests" });
    }
  });

  app.get("/api/deliveries/:id/full", async (req, res) => {
    try {
      const delivery = await storage.getDelivery(req.params.id);
      if (!delivery) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      const dealer = await storage.getDealer(delivery.dealerId);
      const sales = delivery.salesId ? await storage.getSales(delivery.salesId) : null;
      res.json({ ...delivery, dealer, sales: sales ? { name: sales.name, userId: sales.userId } : null });
    } catch (error) {
      console.error("Get delivery with relations error:", error);
      res.status(500).json({ error: "Failed to get delivery" });
    }
  });

  app.post("/api/deliveries/:id/accept", async (req, res) => {
    try {
      const { driverId } = req.body;
      const delivery = await storage.getDelivery(req.params.id);
      
      if (!delivery) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      
      const isSpecificRequest = delivery.status === "pending_driver_acceptance" && delivery.driverId === driverId;
      
      if (delivery.driverId && !isSpecificRequest) {
        return res.status(400).json({ error: "Delivery already accepted by another driver" });
      }
      
      const updatedDelivery = await storage.updateDelivery(req.params.id, {
        driverId,
        status: "accepted",
        chatActivatedAt: new Date().toISOString(),
        acceptedAt: new Date().toISOString(),
      });
      
      const userId = (req.session as any)?.userId;
      const driver = await storage.getDriver(driverId);
      const dealer = await storage.getDealer(delivery.dealerId);
      const sales = delivery.salesId ? await storage.getSales(delivery.salesId) : null;
      
      const welcomeMessage = `Chat activated! Driver ${driver?.name || "Unknown"} has accepted this delivery. You can now coordinate the pickup schedule and any other details.`;
      await storage.createMessage({
        deliveryId: req.params.id,
        senderId: userId,
        recipientId: sales?.userId || dealer?.userId,
        content: welcomeMessage,
      });
      
      if (dealer?.userId) {
        await storage.createNotification({
          userId: dealer.userId,
          deliveryId: req.params.id,
          type: "delivery_accepted",
          title: "Delivery Accepted",
          message: `${driver?.name || "A driver"} has accepted a delivery request.`,
          read: false,
        });
      }
      if (sales?.userId) {
        await storage.createNotification({
          userId: sales.userId,
          deliveryId: req.params.id,
          type: "delivery_accepted",
          title: "Delivery Accepted",
          message: `${driver?.name || "A driver"} has accepted your delivery request.`,
          read: false,
        });
      }
      
      res.json(updatedDelivery);
    } catch (error) {
      console.error("Accept delivery error:", error);
      res.status(500).json({ error: "Failed to accept delivery" });
    }
  });

  app.post("/api/deliveries/:id/decline", async (req, res) => {
    try {
      const { driverId } = req.body;
      const delivery = await storage.getDelivery(req.params.id);
      
      if (!delivery) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      
      const updatedDelivery = await storage.updateDelivery(req.params.id, {
        driverId: null,
        status: "pending",
      });
      
      const driver = await storage.getDriver(driverId);
      const dealer = await storage.getDealer(delivery.dealerId);
      const sales = delivery.salesId ? await storage.getSales(delivery.salesId) : null;
      
      if (sales?.userId) {
        await storage.createNotification({
          userId: sales.userId,
          deliveryId: req.params.id,
          type: "delivery_declined",
          title: "Delivery Request Declined",
          message: `${driver?.name || "A driver"} has declined the delivery request for VIN: ${delivery.vin}. Please assign another driver.`,
          read: false,
        });
      }
      if (dealer?.userId && dealer.userId !== sales?.userId) {
        await storage.createNotification({
          userId: dealer.userId,
          deliveryId: req.params.id,
          type: "delivery_declined",
          title: "Delivery Request Declined",
          message: `${driver?.name || "A driver"} has declined a delivery request for VIN: ${delivery.vin}.`,
          read: false,
        });
      }
      
      res.json(updatedDelivery);
    } catch (error) {
      console.error("Decline delivery error:", error);
      res.status(500).json({ error: "Failed to decline delivery" });
    }
  });

  app.get("/api/messages/:deliveryId", async (req, res) => {
    try {
      const messages = await storage.getMessages(req.params.deliveryId);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const message = await storage.createMessage(req.body);
      res.json(message);
    } catch (error) {
      console.error("Create message error:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  app.post("/api/messages/:deliveryId/read", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      await storage.markMessagesAsRead(req.params.deliveryId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark messages read error:", error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });

  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Failed to get notifications" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const notification = await storage.createNotification(req.body);
      res.json(notification);
    } catch (error) {
      console.error("Create notification error:", error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      await storage.markNotificationAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.get("/api/messages/unread/count", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const count = await storage.getUnreadMessagesCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Get unread messages count error:", error);
      res.status(500).json({ error: "Failed to get unread messages count" });
    }
  });

  app.get("/api/conversations", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  app.get("/api/deliveries/:id/with-relations", async (req, res) => {
    try {
      const result = await storage.getDeliveryWithRelations(req.params.id);
      if (!result) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Get delivery with relations error:", error);
      res.status(500).json({ error: "Failed to get delivery" });
    }
  });

  app.get("/api/driver-statistics/:dealerId", async (req, res) => {
    try {
      const stats = await storage.getDriverStatisticsByDealerId(req.params.dealerId);
      res.json(stats);
    } catch (error) {
      console.error("Get driver statistics error:", error);
      res.status(500).json({ error: "Failed to get driver statistics" });
    }
  });

  app.get("/api/driver-preferences/:dealerId", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const preferences = await storage.getDriverPreferencesByUserAndDealer(userId, req.params.dealerId);
      res.json(preferences);
    } catch (error) {
      console.error("Get driver preferences error:", error);
      res.status(500).json({ error: "Failed to get driver preferences" });
    }
  });

  app.get("/api/driver-applications", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      if (user.role === "driver") {
        const driver = await storage.getDriverByUserId(userId);
        if (driver) {
          const applications = await storage.getDriverApplications(driver.id);
          return res.json(applications);
        }
      } else if (user.role === "dealer") {
        const dealer = await storage.getDealerByUserId(userId);
        if (dealer) {
          const applications = await storage.getDriverApplicationsByDealerId(dealer.id);
          return res.json(applications);
        }
      }
      
      res.json([]);
    } catch (error) {
      console.error("Get driver applications error:", error);
      res.status(500).json({ error: "Failed to get driver applications" });
    }
  });

  app.post("/api/driver-applications", async (req, res) => {
    try {
      const application = await storage.createDriverApplication(req.body);
      res.json(application);
    } catch (error) {
      console.error("Create driver application error:", error);
      res.status(500).json({ error: "Failed to create driver application" });
    }
  });

  app.patch("/api/driver-applications/:id", async (req, res) => {
    try {
      const application = await storage.updateDriverApplication(req.params.id, req.body);
      
      if (req.body.status === "approved" && application) {
        await storage.createApprovedDriverDealer({
          driverId: application.driverId,
          dealerId: application.dealerId,
        });
      }
      
      res.json(application);
    } catch (error) {
      console.error("Update driver application error:", error);
      res.status(500).json({ error: "Failed to update driver application" });
    }
  });

  app.get("/api/approved-driver-dealers", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      if (user.role === "driver") {
        const driver = await storage.getDriverByUserId(userId);
        if (driver) {
          const approvals = await storage.getApprovedDriverDealers(driver.id);
          return res.json(approvals);
        }
      } else if (user.role === "dealer") {
        const dealer = await storage.getDealerByUserId(userId);
        if (dealer) {
          const approvals = await storage.getApprovedDriversByDealerId(dealer.id);
          return res.json(approvals);
        }
      }
      
      res.json([]);
    } catch (error) {
      console.error("Get approved driver dealers error:", error);
      res.status(500).json({ error: "Failed to get approved driver dealers" });
    }
  });

  app.get("/api/approved-driver-dealers/driver/:driverId", async (req, res) => {
    try {
      const approvals = await storage.getApprovedDriverDealers(req.params.driverId);
      const approvalsWithDealers = await Promise.all(
        approvals.map(async (a) => {
          const dealer = await storage.getDealer(a.dealerId);
          return { ...a, dealer };
        })
      );
      res.json(approvalsWithDealers.filter(a => a.dealer));
    } catch (error) {
      console.error("Get approved dealerships for driver error:", error);
      res.status(500).json({ error: "Failed to get approved dealerships" });
    }
  });

  app.post("/api/approved-driver-dealers", async (req, res) => {
    try {
      const approval = await storage.createApprovedDriverDealer(req.body);
      res.json(approval);
    } catch (error) {
      console.error("Create approved driver dealer error:", error);
      res.status(500).json({ error: "Failed to create approved driver dealer" });
    }
  });

  app.delete("/api/approved-driver-dealers/:driverId/:dealerId", async (req, res) => {
    try {
      await storage.deleteApprovedDriverDealer(req.params.driverId, req.params.dealerId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete approved driver dealer error:", error);
      res.status(500).json({ error: "Failed to delete approved driver dealer" });
    }
  });

  app.get("/api/dealer-admins", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const dealer = await storage.getDealerByUserId(userId);
      if (!dealer) {
        const admin = await storage.getDealerAdminByUserId(userId);
        if (admin) {
          const admins = await storage.getDealerAdmins(admin.dealerId);
          return res.json(admins);
        }
        return res.status(404).json({ error: "Dealer not found" });
      }
      
      const admins = await storage.getDealerAdmins(dealer.id);
      res.json(admins);
    } catch (error) {
      console.error("Get dealer admins error:", error);
      res.status(500).json({ error: "Failed to get dealer admins" });
    }
  });

  app.post("/api/dealer-admins", async (req, res) => {
    try {
      const admin = await storage.createDealerAdmin(req.body);
      res.json(admin);
    } catch (error) {
      console.error("Create dealer admin error:", error);
      res.status(500).json({ error: "Failed to create dealer admin" });
    }
  });

  app.delete("/api/dealer-admins/:id", async (req, res) => {
    try {
      await storage.deleteDealerAdmin(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete dealer admin error:", error);
      res.status(500).json({ error: "Failed to delete dealer admin" });
    }
  });

  app.post("/api/sales/check-preregistered", async (req, res) => {
    try {
      const { email, dealerId } = req.body;
      const sales = await storage.getSalesByEmailAndDealerId(email.toLowerCase().trim(), dealerId);
      if (sales && sales.status === "pending_signup") {
        res.json({ preRegistered: true, salesId: sales.id });
      } else {
        res.json({ preRegistered: false });
      }
    } catch (error) {
      console.error("Check preregistered error:", error);
      res.status(500).json({ error: "Failed to check registration status" });
    }
  });

  app.post("/api/sales/activate", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { salesId } = req.body;
      const sales = await storage.updateSales(salesId, {
        userId,
        status: "active",
        activatedAt: new Date(),
        passwordChanged: true,
      });
      
      res.json(sales);
    } catch (error) {
      console.error("Activate sales error:", error);
      res.status(500).json({ error: "Failed to activate sales account" });
    }
  });
}
