import React from 'react';

type TextareaProps = {
  placeholder?: string;
  rows?: number;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  hint?: string;
  name?: string;
  id?: string;
};

const TextArea: React.FC<TextareaProps> = ({
  placeholder = 'Enter your message',
  rows = 3,
  value = '',
  onChange,
  className = '',
  disabled = false,
  error = false,
  hint = '',
  name,
  id,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onChange) {
      onChange(e);
    }
  };

  let textareaClasses = `w-full rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs focus:outline-none resize-none ${className}`;

  if (disabled) {
    textareaClasses +=
      ' bg-gray-100 opacity-50 text-gray-800 border-gray-300 cursor-not-allowed';
  } else if (error) {
    textareaClasses +=
      ' bg-transparent border-gray-300 focus:border-error-300 focus:ring-3 focus:ring-error-500/10';
  } else {
    textareaClasses +=
      ' bg-transparent border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10';
  }

  return (
    <div className="relative">
      <textarea
        id={id}
        name={name}
        placeholder={placeholder}
        rows={rows}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={textareaClasses}
      />
      {hint && (
        <p
          className={`mt-2 text-sm ${
            error ? 'text-error-500' : 'text-gray-800'
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default TextArea;
