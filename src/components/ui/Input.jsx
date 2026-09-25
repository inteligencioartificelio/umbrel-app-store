import React from 'react';

export function Input({ className = '', icon: Icon, ...props }) {
  if (Icon) {
    return (
      <div className="ui-input-wrapper">
        <Icon size={15} className="ui-input-icon" />
        <input className={`ui-input with-icon ${className}`} {...props} />
      </div>
    );
  }

  return <input className={`ui-input ${className}`} {...props} />;
}

export default Input;
