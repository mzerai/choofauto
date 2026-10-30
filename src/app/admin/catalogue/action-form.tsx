"use client";

import { useActionState, type ReactNode } from "react";
import { initialFormState, type FormState } from "./form-state";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  className?: string;
  children: ReactNode;
};

// Formulaire branché sur une Server Action, avec son message de réussite ou d'erreur.
export function ActionForm({ action, className, children }: Props) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className={className} aria-busy={pending}>
      <fieldset disabled={pending}>{children}</fieldset>
      {state.status !== "idle" && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`msg msg-${state.status}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
