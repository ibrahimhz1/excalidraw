import React, { useEffect, useState } from "react";

interface RenameFieldProps {
  initialValue: string;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}

export const RenameField = (props: RenameFieldProps) => {
  const { initialValue, busy } = props;
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();

    if (trimmed) {
      props.onSubmit(trimmed);
    }
  };

  return (
    <form className="cloud-rename" onSubmit={handleSubmit}>
      <input
        className="cloud-rename__input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={200}
        autoFocus
        disabled={busy}
        aria-label="Diagram name"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            props.onCancel();
          }
        }}
      />
      <div className="cloud-rename__actions">
        <button
          type="submit"
          className="cloud-button cloud-button--primary cloud-button--small"
          disabled={busy || !value.trim()}
        >
          Save
        </button>
        <button
          type="button"
          className="cloud-button cloud-button--small"
          disabled={busy}
          onClick={props.onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
