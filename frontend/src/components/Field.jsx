/** Labelled form control. `as` picks input / select / textarea; extra props go to the control. */
export function Field({ label, hint, as = "input", options, children, ...props }) {
  const Control = as;
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {as === "select" ? (
        <select {...props}>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <Control {...props} />
      )}
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
