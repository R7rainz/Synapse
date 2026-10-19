"use client";

import { useState } from "react";

type PasswordFieldProps = {
  autoComplete: string;
  id: string;
  label: string;
  maxLength?: number;
  minLength?: number;
  name: string;
  placeholder: string;
  showStrength?: boolean;
};

const strengthLevels = [
  { label: "Weak", textClass: "text-danger", fillClass: "bg-danger" },
  { label: "Fair", textClass: "text-brand", fillClass: "bg-brand" },
  { label: "Good", textClass: "text-brand-light", fillClass: "bg-brand-light" },
  { label: "Strong", textClass: "text-positive", fillClass: "bg-positive" },
] as const;

function getStrength(password: string) {
  if (!password) return 0;

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  return Math.min(4, score);
}

export function PasswordField({
  autoComplete,
  id,
  label,
  maxLength,
  minLength,
  name,
  placeholder,
  showStrength = false,
}: PasswordFieldProps) {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const strength = getStrength(password);
  const strengthLevel = strengthLevels[strength - 1];

  return (
    <label className="grid gap-2 text-sm font-medium text-ink-dark" htmlFor={id}>
      {label}
      <span className="relative">
        <input
          className="form-control h-12 w-full px-3 pr-12 text-sm"
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          placeholder={placeholder}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute top-1/2 right-0 grid h-12 w-12 -translate-y-1/2 place-items-center text-body-dark transition-colors hover:text-deep-green"
          type="button"
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.7A10.45 10.45 0 0 0 2.25 12c1.4 3.5 4.75 5.75 9.75 5.75 1.4 0 2.65-.22 3.75-.62M6.53 6.53C8 5.67 9.8 5.25 12 5.25c5 0 8.35 2.25 9.75 5.75a10.7 10.7 0 0 1-2.55 3.78M3 3l18 18M10.6 10.6a2 2 0 0 0 2.83 2.83" />
            </svg>
          ) : (
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.35-5.75 9.75-5.75S21.75 12 21.75 12 18.4 17.75 12 17.75 2.25 12 2.25 12Z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
          )}
        </button>
      </span>
      {showStrength && (
        <span className="grid gap-2" aria-live="polite">
          <span className="flex gap-1" aria-label={strength ? `Password strength: ${strengthLevel.label}` : "Password strength not set"}>
            {strengthLevels.map((level, index) => (
              <span className={`h-1 flex-1 ${index < strength ? level.fillClass : "bg-hairline"}`} key={level.label} />
            ))}
          </span>
          <span className="flex items-center justify-between text-xs font-normal text-body-dark">
            <span>Use 8+ characters with a mix of letters, numbers, and symbols.</span>
            {strengthLevel && <span className={`font-medium ${strengthLevel.textClass}`}>{strengthLevel.label}</span>}
          </span>
        </span>
      )}
    </label>
  );
}
