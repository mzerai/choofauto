// Réponse d'une Server Action du catalogue, affichée sous le formulaire.
export type FormState = { status: "idle" | "ok" | "error"; message: string };

export const initialFormState: FormState = { status: "idle", message: "" };
