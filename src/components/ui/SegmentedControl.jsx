import React from 'react';

export default function SegmentedControl({
  options = [],
  value,
  onChange,
  className = '',
  size = 'md'
}) {
  return (
    <div className={`ui-segmented-control size-${size} ${className}`} role="tablist">
      {options.map((opt) => {
        const isOptActive = (typeof opt === 'object' ? opt.value : opt) === value;
        const optLabel = typeof opt === 'object' ? opt.label : opt;
        const optVal = typeof opt === 'object' ? opt.value : opt;
        const optIcon = typeof opt === 'object' ? opt.icon : null;

        return (
          <button
            key={String(optVal)}
            type="button"
            role="tab"
            aria-selected={isOptActive}
            className={`ui-segment-item ${isOptActive ? 'active' : ''}`}
            onClick={() => onChange(optVal)}
          >
            {optIcon && <span className="ui-segment-icon">{optIcon}</span>}
            <span>{optLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
