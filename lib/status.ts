export const SLOT_STATUS: Record<string, string> = {
  available: 'ว่าง',
  booked: 'ถูกจองแล้ว',
  closed: 'ปิดการจอง',
  expired: 'หมดเวลา',
};
export const BOOKING_STATUS: Record<string, string> = {
  confirmed: 'ยืนยันการจองแล้ว',
  cancelled: 'ยกเลิกแล้ว',
};
export const MEMBER_STATUS: Record<string, string> = {
  pending: 'รออนุมัติ',
  active: 'เปิดใช้งาน',
  suspended: 'ระงับการใช้งาน',
};
export const HISTORY_ACTION: Record<string, string> = {
  create: 'สร้างการจอง',
  move: 'ย้ายนัด',
  cancel: 'ยกเลิก',
  note: 'บันทึก',
};

export type SlotRow = {
  id: string;
  mentor_id: string;
  mentor_name: string;
  mentor_active: boolean;
  start_at: string;
  end_at: string;
  location: string | null;
  is_open: boolean;
  booking_id: string | null;
  booking_no: string | null;
  member_id: string | null;
  member_name: string | null;
  employee_code: string | null;
  status: 'available' | 'booked' | 'closed' | 'expired';
};
