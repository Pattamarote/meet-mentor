'use client';

/** เลือกแล้วแสดงผลทันที ไม่ต้องกดปุ่มค้นหา */
export function AutoSubmitSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
