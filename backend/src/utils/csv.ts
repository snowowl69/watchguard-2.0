import { AttendanceLog, User } from '@prisma/client';

interface AttendanceWithUser extends AttendanceLog {
  user: Pick<User, 'name' | 'employeeId' | 'department'>;
}

export function formatAttendanceCSV(logs: AttendanceWithUser[]): string {
  const headers = ['Name', 'Employee ID', 'Department', 'Date', 'Entry Time', 'Exit Time', 'Confidence %', 'Status', 'Camera ID'];
  
  const rows = logs.map(log => {
    const date = new Date(log.entryTime).toLocaleDateString('en-IN');
    const entryTime = new Date(log.entryTime).toLocaleTimeString('en-IN');
    const exitTime = log.exitTime ? new Date(log.exitTime).toLocaleTimeString('en-IN') : 'N/A';
    const confidence = (log.confidence * 100).toFixed(1);
    
    return [
      `"${log.user.name}"`,
      log.user.employeeId,
      `"${log.user.department}"`,
      date,
      entryTime,
      exitTime,
      `${confidence}%`,
      log.status,
      log.cameraId || 'N/A',
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
