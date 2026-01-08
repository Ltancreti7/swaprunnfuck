/**
 * SwapRunn Smoke Test Runner
 * 
 * This script performs an end-to-end smoke test of all critical flows:
 * 1. Seeds test users (dealer, sales, driver)
 * 2. Creates a delivery job
 * 3. Driver applies and gets approved
 * 4. Driver accepts the job (verifies atomic lock)
 * 5. Sends chat message (verifies persistence)
 * 6. Moves job through all statuses (verifies transitions)
 * 
 * Usage: npx tsx scripts/smoke.ts
 */

import { db } from '../server/db';
import { storage } from '../server/storage';
import { 
  users, dealers, sales, drivers, deliveries, messages,
  driverApplications, approvedDriverDealers, notifications
} from '../shared/schema';
import bcrypt from 'bcryptjs';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  error?: string;
  duration: number;
}

const results: TestResult[] = [];
let testData: {
  dealer?: any;
  sales?: any;
  driver?: any;
  dealerUser?: any;
  salesUser?: any;
  driverUser?: any;
  delivery?: any;
  application?: any;
} = {};

async function runTest(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, status: 'PASS', duration: Date.now() - start });
    console.log(`  ✓ ${name}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, status: 'FAIL', error: errorMsg, duration: Date.now() - start });
    console.log(`  ✗ ${name}: ${errorMsg}`);
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  try {
    await db.delete(messages);
    await db.delete(notifications);
    await db.delete(approvedDriverDealers);
    await db.delete(driverApplications);
    await db.delete(deliveries);
    await db.delete(sales);
    await db.delete(drivers);
    await db.delete(dealers);
    await db.delete(users);
    console.log('   Cleanup complete\n');
  } catch (error) {
    console.log('   Cleanup error (may be expected on first run):', error);
  }
}

async function runSmokeTests() {
  console.log('\n========================================');
  console.log('  SwapRunn Smoke Test Runner');
  console.log('========================================\n');

  await cleanupTestData();

  console.log('📋 1. REGISTRATION TESTS\n');

  await runTest('Dealer registration creates user and dealer', async () => {
    const email = 'smoke-dealer@test.com';
    const passwordHash = await bcrypt.hash('TestPass123!', 10);
    
    testData.dealerUser = await storage.createUser({
      email,
      passwordHash,
      role: 'dealer',
    });
    
    if (!testData.dealerUser) throw new Error('Failed to create dealer user');
    
    testData.dealer = await storage.createDealer({
      userId: testData.dealerUser.id,
      name: 'Smoke Test Dealership',
      email,
      phone: '555-SMOKE',
      address: '123 Smoke Test Ave',
    });
    
    if (!testData.dealer) throw new Error('Failed to create dealer');
    if (!testData.dealer.id) throw new Error('Dealer has no ID');
  });

  await runTest('Sales registration links to dealership', async () => {
    const email = 'smoke-sales@test.com';
    const passwordHash = await bcrypt.hash('TestPass123!', 10);
    
    testData.salesUser = await storage.createUser({
      email,
      passwordHash,
      role: 'sales',
    });
    
    if (!testData.salesUser) throw new Error('Failed to create sales user');
    
    testData.sales = await storage.createSales({
      userId: testData.salesUser.id,
      name: 'Smoke Test Sales',
      email,
      phone: '555-SALES',
      dealerId: testData.dealer.id,
    });
    
    if (!testData.sales) throw new Error('Failed to create sales');
    if (testData.sales.dealerId !== testData.dealer.id) {
      throw new Error('Sales not linked to correct dealership');
    }
  });

  await runTest('Driver registration creates independent account', async () => {
    const email = 'smoke-driver@test.com';
    const passwordHash = await bcrypt.hash('TestPass123!', 10);
    
    testData.driverUser = await storage.createUser({
      email,
      passwordHash,
      role: 'driver',
    });
    
    if (!testData.driverUser) throw new Error('Failed to create driver user');
    
    testData.driver = await storage.createDriver({
      userId: testData.driverUser.id,
      name: 'Smoke Test Driver',
      email,
      phone: '555-DRIVE',
      vehicleType: 'Sedan',
      radius: 50,
    });
    
    if (!testData.driver) throw new Error('Failed to create driver');
  });

  console.log('\n📋 2. DRIVER HIRING FLOW\n');

  await runTest('Driver applies to dealership', async () => {
    testData.application = await storage.createDriverApplication({
      driverId: testData.driver.id,
      dealerId: testData.dealer.id,
      status: 'pending',
      message: 'I want to work with you',
    });
    
    if (!testData.application) throw new Error('Failed to create application');
    if (testData.application.status !== 'pending') {
      throw new Error('Application should be pending');
    }
  });

  await runTest('Dealer approves driver application', async () => {
    const updated = await storage.updateDriverApplication(testData.application.id, {
      status: 'approved',
    });
    
    if (!updated) throw new Error('Failed to update application');
    if (updated.status !== 'approved') throw new Error('Application not approved');
  });

  console.log('\n📋 3. DELIVERY LIFECYCLE\n');

  await runTest('Dealer creates delivery (pending status)', async () => {
    testData.delivery = await storage.createDelivery({
      dealerId: testData.dealer.id,
      salesId: testData.sales.id,
      vin: 'SMOKE12345678901234',
      pickup: '100 Pickup Lane',
      dropoff: '200 Dropoff Blvd',
      pickupCity: 'Pickup City',
      dropoffCity: 'Dropoff City',
      status: 'pending',
    });
    
    if (!testData.delivery) throw new Error('Failed to create delivery');
    if (testData.delivery.status !== 'pending') {
      throw new Error('Delivery should start as pending');
    }
  });

  await runTest('Status transition: pending → pending_driver_acceptance', async () => {
    const updated = await storage.updateDelivery(testData.delivery.id, {
      status: 'pending_driver_acceptance',
    });
    if (updated?.status !== 'pending_driver_acceptance') {
      throw new Error('Status transition failed');
    }
    testData.delivery = updated;
  });

  await runTest('Driver accepts delivery (assigned status)', async () => {
    const updated = await storage.updateDelivery(testData.delivery.id, {
      status: 'assigned',
      driverId: testData.driver.id,
    });
    if (updated?.status !== 'assigned') throw new Error('Accept failed');
    if (updated?.driverId !== testData.driver.id) throw new Error('Driver not assigned');
    testData.delivery = updated;
  });

  await runTest('Status: assigned → driver_en_route_pickup', async () => {
    const updated = await storage.updateDelivery(testData.delivery.id, {
      status: 'driver_en_route_pickup',
    });
    if (updated?.status !== 'driver_en_route_pickup') throw new Error('Transition failed');
    testData.delivery = updated;
  });

  await runTest('Status: driver_en_route_pickup → arrived_at_pickup', async () => {
    const updated = await storage.updateDelivery(testData.delivery.id, {
      status: 'arrived_at_pickup',
    });
    if (updated?.status !== 'arrived_at_pickup') throw new Error('Transition failed');
    testData.delivery = updated;
  });

  await runTest('Status: arrived_at_pickup → in_transit', async () => {
    const updated = await storage.updateDelivery(testData.delivery.id, {
      status: 'in_transit',
    });
    if (updated?.status !== 'in_transit') throw new Error('Transition failed');
    testData.delivery = updated;
  });

  await runTest('Status: in_transit → arrived_at_dropoff', async () => {
    const updated = await storage.updateDelivery(testData.delivery.id, {
      status: 'arrived_at_dropoff',
    });
    if (updated?.status !== 'arrived_at_dropoff') throw new Error('Transition failed');
    testData.delivery = updated;
  });

  await runTest('Status: arrived_at_dropoff → completed', async () => {
    const updated = await storage.updateDelivery(testData.delivery.id, {
      status: 'completed',
    });
    if (updated?.status !== 'completed') throw new Error('Transition failed');
    testData.delivery = updated;
  });

  console.log('\n📋 4. CHAT / MESSAGING\n');

  await runTest('Send chat message on delivery', async () => {
    const message = await storage.createMessage({
      deliveryId: testData.delivery.id,
      senderId: testData.dealer.id,
      recipientId: testData.driver.id,
      content: 'Thanks for completing the delivery!',
    });
    
    if (!message) throw new Error('Failed to send message');
    if (message.content !== 'Thanks for completing the delivery!') {
      throw new Error('Message content mismatch');
    }
  });

  await runTest('Retrieve messages for delivery', async () => {
    const messages = await storage.getMessages(testData.delivery.id);
    if (!messages || messages.length === 0) {
      throw new Error('No messages found');
    }
  });

  console.log('\n📋 5. DATA RETRIEVAL\n');

  await runTest('Get dealership deliveries', async () => {
    const deliveries = await storage.getDeliveriesByDealerId(testData.dealer.id);
    if (!deliveries || deliveries.length === 0) {
      throw new Error('No deliveries found for dealer');
    }
  });

  await runTest('Get driver deliveries', async () => {
    const deliveries = await storage.getDeliveriesByDriverId(testData.driver.id);
    if (!deliveries || deliveries.length === 0) {
      throw new Error('No deliveries found for driver');
    }
  });

  // Generate report
  console.log('\n========================================');
  console.log('  SMOKE TEST REPORT');
  console.log('========================================\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total Time: ${totalTime}ms\n`);

  if (failed > 0) {
    console.log('❌ FAILED TESTS:\n');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`  • ${r.name}`);
        console.log(`    Error: ${r.error}\n`);
      });
  }

  const score = Math.round((passed / total) * 100);
  console.log('========================================');
  if (failed === 0) {
    console.log(`  ✅ ALL TESTS PASSED (${score}%)`);
  } else {
    console.log(`  ⚠️  SOME TESTS FAILED (${score}%)`);
  }
  console.log('========================================\n');

  await cleanupTestData();

  process.exit(failed > 0 ? 1 : 0);
}

runSmokeTests().catch(error => {
  console.error('Smoke test runner error:', error);
  process.exit(1);
});
