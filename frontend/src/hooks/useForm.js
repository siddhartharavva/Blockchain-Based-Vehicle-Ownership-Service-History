import { useState } from "react";

/** Minimal controlled-form state: `bind(name)` gives value + onChange for a <Field>. */
export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));
  const bind = (name) => ({ name, value: values[name], onChange: (e) => set(name, e.target.value) });
  const reset = () => setValues(initial);
  return { values, set, bind, reset };
}
