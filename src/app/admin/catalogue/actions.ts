"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import type { Actor } from "@/lib/permissions";
import {
  addVersion,
  renameModel,
  renameVersion,
  setModelStatus,
  setVersionActive,
  setVersionTracked,
  type CatalogResult,
} from "@/modules/catalog";
import { findStaffById } from "@/modules/ops";
import type { FormState } from "./form-state";

// Le rôle est relu en base à chaque écriture : un compte désactivé ou rétrogradé depuis sa
// connexion ne peut plus écrire, même avec une session encore valable.
async function currentActor(): Promise<Actor | null> {
  const session = await auth();
  const staffId = session?.user?.staffId;
  if (!staffId) return null;
  const staff = await findStaffById(staffId);
  if (!staff?.active) return null;
  return { staffId: staff.id, role: staff.role };
}

type Write = (actor: Actor, raw: unknown) => Promise<CatalogResult>;

async function perform(write: Write, formData: FormData): Promise<FormState> {
  const actor = await currentActor();
  if (!actor) return { status: "error", message: t("catalog.error.forbidden") };
  const result = await write(actor, Object.fromEntries(formData));
  if (!result.ok) return { status: "error", message: t(`catalog.error.${result.error}`) };
  revalidatePath("/admin/catalogue");
  return { status: "ok", message: t("catalog.saved") };
}

export async function addVersionAction(_prev: FormState, formData: FormData) {
  return perform(addVersion, formData);
}

export async function renameVersionAction(_prev: FormState, formData: FormData) {
  return perform(renameVersion, formData);
}

export async function setVersionTrackedAction(_prev: FormState, formData: FormData) {
  return perform(setVersionTracked, formData);
}

export async function setVersionActiveAction(_prev: FormState, formData: FormData) {
  return perform(setVersionActive, formData);
}

export async function renameModelAction(_prev: FormState, formData: FormData) {
  return perform(renameModel, formData);
}

export async function setModelStatusAction(_prev: FormState, formData: FormData) {
  return perform(setModelStatus, formData);
}
