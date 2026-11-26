'use client';
import { useActionState } from 'react';
import { checkImport, commitImport, type ImportState } from './actions';
import { SubmitButton } from '@/components/SubmitButton';

export function ImportForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(checkImport, undefined);
  const ok = state?.rows && state.errors && state.errors.length === 0;
  return (
    <>
      <form action={action} className="card row">
        <div><label>ไฟล์ตารางเวลา (.xlsx)</label><input type="file" name="file" accept=".xlsx" required /></div>
        <div className="shrink"><button className="btn" disabled={pending}>{pending ? 'กำลังตรวจสอบ...' : 'ตรวจสอบข้อมูล'}</button></div>
      </form>
      {state?.error && <div className="alert err">{state.error}</div>}
      {state?.errors && state.errors.length > 0 && (
        <div className="card">
          <div className="alert err">พบข้อผิดพลาด {state.errors.length} แถว — กรุณาแก้ไขในไฟล์แล้วอัปโหลดใหม่ (ยังไม่ได้บันทึกข้อมูลใด ๆ)</div>
          <div className="table-wrap"><table>
            <thead><tr><th>แถวที่</th><th>ปัญหา</th></tr></thead>
            <tbody>{state.errors.map((e, i) => <tr key={i}><td>{e.line}</td><td>{e.msg}</td></tr>)}</tbody>
          </table></div>
        </div>
      )}
      {ok && (
        <div className="card">
          <div className="alert ok">ข้อมูลถูกต้องทั้งหมด {state.rows!.length} แถว จากไฟล์ {state.fileName} — ตรวจสอบแล้วกดบันทึก</div>
          <div className="table-wrap"><table>
            <thead><tr><th>แถว</th><th>Mentor</th><th>วันที่</th><th>เวลา</th><th>สถานที่/ลิงก์</th></tr></thead>
            <tbody>{state.rows!.map((r) => <tr key={r.line}><td>{r.line}</td><td>{r.mentor}</td><td>{r.date}</td><td>{r.start}-{r.end}</td><td>{r.location ?? '-'}</td></tr>)}</tbody>
          </table></div>
          <form action={commitImport} className="mt">
            <input type="hidden" name="rows" value={JSON.stringify(state.rows)} />
            <SubmitButton>บันทึก {state.rows!.length} ช่วงเวลา</SubmitButton>
          </form>
        </div>
      )}
    </>
  );
}
