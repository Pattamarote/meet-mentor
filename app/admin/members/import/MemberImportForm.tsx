'use client';
import { useActionState } from 'react';
import { checkMembers, commitMembers, type MemberImportState } from '../actions';
import { SubmitButton } from '@/components/SubmitButton';

export function MemberImportForm() {
  const [state, action, pending] = useActionState<MemberImportState, FormData>(checkMembers, undefined);
  return (
    <>
      <form action={action} className="card row">
        <div><label>ไฟล์รายชื่อ (.xlsx)</label><input type="file" name="file" accept=".xlsx" required /></div>
        <div className="shrink"><button className="btn" disabled={pending}>{pending ? 'กำลังตรวจสอบ...' : 'ตรวจสอบข้อมูล'}</button></div>
      </form>
      {state?.error && <div className="alert err">{state.error}</div>}
      {state?.errors && state.errors.length > 0 && (
        <div className="card">
          <div className="alert err">พบข้อผิดพลาด {state.errors.length} แถว — แก้ไขในไฟล์แล้วอัปโหลดใหม่ (ยังไม่ได้บันทึก)</div>
          <div className="table-wrap"><table><thead><tr><th>แถวที่</th><th>ปัญหา</th></tr></thead>
            <tbody>{state.errors.map((e, i) => <tr key={i}><td>{e.line}</td><td>{e.msg}</td></tr>)}</tbody></table></div>
        </div>
      )}
      {state?.rows && state.errors?.length === 0 && (
        <div className="card">
          <div className="alert ok">ข้อมูลถูกต้อง {state.rows.length} คน</div>
          <div className="table-wrap"><table><thead><tr><th>แถว</th><th>ชื่อ</th><th>รหัสพนักงาน</th><th>รหัสผ่าน</th></tr></thead>
            <tbody>{state.rows.map((r) => <tr key={r.line}><td>{r.line}</td><td>{r.name}</td><td>{r.code}</td><td>••••</td></tr>)}</tbody></table></div>
          <form action={commitMembers} className="mt">
            <input type="hidden" name="rows" value={JSON.stringify(state.rows)} />
            <SubmitButton>บันทึก {state.rows.length} คน</SubmitButton>
          </form>
        </div>
      )}
    </>
  );
}
