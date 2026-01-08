import { storage } from "./storage";

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    const tokens = await storage.getPushTokensByUserId(userId);
    
    if (tokens.length === 0) {
      console.log(`No push tokens found for user ${userId}`);
      return false;
    }

    for (const tokenRecord of tokens) {
      console.log(`Would send push to ${tokenRecord.platform}: ${payload.title}`);
    }

    return true;
  } catch (error) {
    console.error("Error sending push notification:", error);
    return false;
  }
}

export async function sendPushNotificationToMultipleUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<void> {
  const tokens = await storage.getPushTokensForUsers(userIds);
  
  if (tokens.length === 0) {
    console.log(`No push tokens found for users`);
    return;
  }

  for (const tokenRecord of tokens) {
    console.log(`Would send push to ${tokenRecord.platform}: ${payload.title}`);
  }
}

export async function notifyDeliveryStatusChange(
  deliveryId: string,
  newStatus: string,
  recipientUserIds: string[]
): Promise<void> {
  const statusMessages: Record<string, string> = {
    pending: "A new delivery has been created",
    pending_driver_acceptance: "A delivery is waiting for driver acceptance",
    assigned: "A driver has been assigned to your delivery",
    driver_en_route_pickup: "Driver is on the way to pickup",
    arrived_at_pickup: "Driver has arrived at pickup location",
    in_transit: "Your vehicle is in transit",
    arrived_at_dropoff: "Driver has arrived at dropoff location",
    completed: "Delivery has been completed",
    cancelled: "A delivery has been cancelled",
  };

  const message = statusMessages[newStatus] || `Delivery status updated to ${newStatus}`;

  await sendPushNotificationToMultipleUsers(recipientUserIds, {
    title: "Delivery Update",
    body: message,
    data: { deliveryId, status: newStatus, type: "delivery_status" },
  });
}

export async function notifyNewMessage(
  deliveryId: string,
  senderName: string,
  recipientUserId: string
): Promise<void> {
  await sendPushNotification(recipientUserId, {
    title: "New Message",
    body: `${senderName} sent you a message`,
    data: { deliveryId, type: "new_message" },
  });
}

export async function notifyNewDeliveryAvailable(
  deliveryId: string,
  driverUserIds: string[]
): Promise<void> {
  await sendPushNotificationToMultipleUsers(driverUserIds, {
    title: "New Delivery Available",
    body: "A new delivery job is available in your area",
    data: { deliveryId, type: "new_delivery" },
  });
}

export async function notifyDriverApplication(
  dealerUserId: string,
  driverName: string,
  applicationId: string
): Promise<void> {
  await sendPushNotification(dealerUserId, {
    title: "New Driver Application",
    body: `${driverName} has applied to join your dealership`,
    data: { applicationId, type: "driver_application" },
  });
}

export async function notifyApplicationDecision(
  driverUserId: string,
  dealerName: string,
  approved: boolean
): Promise<void> {
  await sendPushNotification(driverUserId, {
    title: approved ? "Application Approved" : "Application Update",
    body: approved 
      ? `${dealerName} has approved your driver application`
      : `Your application to ${dealerName} was not approved`,
    data: { type: "application_decision", approved: String(approved) },
  });
}
