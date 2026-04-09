import { PrismaClient, Role, UserStatus, AttendanceStatus, NotificationType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Watch Guard database...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.attendanceLog.deleteMany();
  await prisma.faceRequest.deleteMany();
  await prisma.user.deleteMany();
  await prisma.camera.deleteMany();

  // Hash password for all seed users
  const passwordHash = await bcrypt.hash('password123', 12);

  // ─── Create Users ───────────────────────────────────────
  const departments = ['Computer Science', 'Electrical Engineering', 'Mechanical Engineering', 'Administration', 'Security'];
  
  const usersData = [
    { name: 'Admin User', employeeId: 'ADM001', email: 'admin@watchguard.app', role: Role.ADMIN, department: 'Administration', status: UserStatus.ACTIVE },
    { name: 'Rahul Sharma', employeeId: 'EMP001', email: 'rahul.sharma@watchguard.app', role: Role.USER, department: 'Computer Science', status: UserStatus.ACTIVE },
    { name: 'Priya Patel', employeeId: 'EMP002', email: 'priya.patel@watchguard.app', role: Role.USER, department: 'Electrical Engineering', status: UserStatus.ACTIVE },
    { name: 'Amit Kumar', employeeId: 'EMP003', email: 'amit.kumar@watchguard.app', role: Role.USER, department: 'Mechanical Engineering', status: UserStatus.ACTIVE },
    { name: 'Sneha Reddy', employeeId: 'EMP004', email: 'sneha.reddy@watchguard.app', role: Role.USER, department: 'Computer Science', status: UserStatus.ACTIVE },
    { name: 'Vikram Singh', employeeId: 'EMP005', email: 'vikram.singh@watchguard.app', role: Role.USER, department: 'Security', status: UserStatus.ACTIVE },
    { name: 'Ananya Gupta', employeeId: 'EMP006', email: 'ananya.gupta@watchguard.app', role: Role.USER, department: 'Administration', status: UserStatus.ACTIVE },
    { name: 'Rohan Verma', employeeId: 'EMP007', email: 'rohan.verma@watchguard.app', role: Role.USER, department: 'Computer Science', status: UserStatus.ACTIVE },
    { name: 'Deepika Nair', employeeId: 'EMP008', email: 'deepika.nair@watchguard.app', role: Role.USER, department: 'Electrical Engineering', status: UserStatus.PENDING },
    { name: 'Karthik Menon', employeeId: 'EMP009', email: 'karthik.menon@watchguard.app', role: Role.USER, department: 'Mechanical Engineering', status: UserStatus.ACTIVE },
  ];

  const users = [];
  for (const userData of usersData) {
    const user = await prisma.user.create({
      data: {
        ...userData,
        passwordHash,
      },
    });
    users.push(user);
    console.log(`  ✅ Created user: ${user.name} (${user.employeeId})`);
  }

  // ─── Create Cameras ─────────────────────────────────────
  const camerasData = [
    { name: 'Main Entrance', location: 'Building A - Front Gate', streamUrl: 'http://camera1.local:8080/stream', isActive: true },
    { name: 'Hostel Gate', location: 'Hostel Block B - Entry', streamUrl: 'http://camera2.local:8080/stream', isActive: true },
    { name: 'Lab Access', location: 'CS Lab - Floor 2', streamUrl: 'http://camera3.local:8080/stream', isActive: true },
  ];

  const cameras = [];
  for (const camData of camerasData) {
    const camera = await prisma.camera.create({ data: camData });
    cameras.push(camera);
    console.log(`  📷 Created camera: ${camera.name}`);
  }

  // ─── Create 50 Attendance Logs ──────────────────────────
  const activeUsers = users.filter(u => u.status === UserStatus.ACTIVE);
  const statuses: AttendanceStatus[] = [AttendanceStatus.AUTHORIZED, AttendanceStatus.DENIED];
  
  for (let i = 0; i < 50; i++) {
    const user = activeUsers[Math.floor(Math.random() * activeUsers.length)];
    const camera = cameras[Math.floor(Math.random() * cameras.length)];
    const isAuthorized = Math.random() > 0.15; // 85% authorized
    const confidence = isAuthorized 
      ? 0.7 + Math.random() * 0.3  // 0.7–1.0 for authorized
      : 0.2 + Math.random() * 0.35; // 0.2–0.55 for denied
    
    // Spread logs across the last 7 days
    const daysAgo = Math.floor(Math.random() * 7);
    const hour = 7 + Math.floor(Math.random() * 12); // 7am-7pm
    const minute = Math.floor(Math.random() * 60);
    
    const entryTime = new Date();
    entryTime.setDate(entryTime.getDate() - daysAgo);
    entryTime.setHours(hour, minute, 0, 0);
    
    // 70% chance of having an exit time (1-8 hours after entry)
    let exitTime: Date | null = null;
    if (Math.random() > 0.3 && isAuthorized) {
      exitTime = new Date(entryTime);
      exitTime.setHours(exitTime.getHours() + 1 + Math.floor(Math.random() * 7));
    }

    await prisma.attendanceLog.create({
      data: {
        userId: user.id,
        entryTime,
        exitTime,
        confidence: parseFloat(confidence.toFixed(4)),
        status: isAuthorized ? AttendanceStatus.AUTHORIZED : AttendanceStatus.DENIED,
        cameraId: camera.id,
      },
    });
  }
  console.log(`  📋 Created 50 attendance logs`);

  // ─── Create sample notifications ───────────────────────
  const adminUser = users[0];
  const notificationsData = [
    { message: 'System started successfully', type: NotificationType.INFO, userId: adminUser.id },
    { message: 'Unknown face detected at Main Entrance', type: NotificationType.WARNING, userId: adminUser.id },
    { message: 'Multiple failed access attempts at Hostel Gate', type: NotificationType.DANGER, userId: adminUser.id },
    { message: 'New face registration request from Deepika Nair', type: NotificationType.INFO, userId: adminUser.id },
    { message: 'Camera "Lab Access" went offline', type: NotificationType.WARNING, userId: adminUser.id },
  ];

  for (const notifData of notificationsData) {
    await prisma.notification.create({ data: notifData });
  }
  console.log(`  🔔 Created ${notificationsData.length} notifications`);

  // ─── Create sample face requests ───────────────────────
  await prisma.faceRequest.create({
    data: {
      name: 'Deepika Nair',
      employeeId: 'EMP008',
      department: 'Electrical Engineering',
      role: Role.USER,
      imagePath: '/uploads/faces/deepika_nair.jpg',
      status: 'PENDING',
    },
  });
  console.log(`  📝 Created 1 pending face request`);

  console.log('\n✅ Seed completed successfully!');
  console.log(`   Users: ${usersData.length}`);
  console.log(`   Cameras: ${camerasData.length}`);
  console.log(`   Attendance Logs: 50`);
  console.log(`   Notifications: ${notificationsData.length}`);
  console.log(`\n   Login: admin@watchguard.app / password123`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
