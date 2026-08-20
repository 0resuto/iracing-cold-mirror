import React from 'react';

/**
 * Standard branded Checkbox component for the Cold Mirror interface.
 */
export function Checkbox({ checked, onChange, label, disabled = false, className = '' }) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer group select-none ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}>
      <div className="relative flex items-center justify-center flex-none">
        <input 
          type="checkbox" 
          className="sr-only"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
        <div 
          className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
            checked 
              ? 'bg-brand-30 border-brand-30 shadow-[0_0_8px_rgba(230,57,70,0.4)]' 
              : 'bg-brand-60/80 border-brand-60 group-hover:border-brand-30/70'
          }`}
        >
          {checked && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      {label && (
        <span className="text-xs text-brand-10/80 group-hover:text-brand-10 transition-colors font-medium">
          {label}
        </span>
      )}
    </label>
  );
}
