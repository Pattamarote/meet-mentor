'use client';
import { useActionState } from 'react';
import type { FormState } from './actions';

export function LoginForm({ action, fields, submit }: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  fields: { name: string; label: string; type?: string; inputMode?: 'numeric' | 'text'; pattern?: string; maxLength?: number; autoComplete?: string; hint?: string }[];
  submit: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction}>
      {state?.error && <div className="alert err">{state.error}</div>}
      {state?.ok && <div className="alert ok">{state.ok}</div>}
      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name}>{f.label}</label>
          <input id={f.name} name={f.name} type={f.type ?? 'text'} inputMode={f.inputMode} pattern={f.pattern} maxLength={f.maxLength} autoComplete={f.autoComplete} required aria-describedby={f.hint ? `${f.name}-hint` : undefined} />
          {f.hint && <div id={`${f.name}-hint`} className="small muted" style={{ marginTop: 4 }}>{f.hint}</div>}
        </div>
      ))}
      <button className="btn block mt" disabled={pending}>{pending ? 'กำลังดำเนินการ...' : submit}</button>
    </form>
  );
}
