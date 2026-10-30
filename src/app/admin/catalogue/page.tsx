import Link from "next/link";
import { redirect } from "next/navigation";
import { PilotStatus, Powertrain } from "@prisma/client";
import { auth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { canEditCatalog } from "@/lib/permissions";
import { listPilotModels, type PilotModel } from "@/modules/catalog";
import { findStaffById } from "@/modules/ops";
import { ActionForm } from "./action-form";
import {
  addVersionAction,
  renameModelAction,
  renameVersionAction,
  setModelStatusAction,
  setVersionActiveAction,
  setVersionTrackedAction,
} from "./actions";

export default async function CatalogPage() {
  const session = await auth();
  const staff = session?.user?.staffId ? await findStaffById(session.user.staffId) : null;
  if (!staff?.active) redirect("/connexion");
  const canEdit = canEditCatalog(staff.role);
  const models = await listPilotModels();

  return (
    <main className="page">
      <p>
        <Link href="/admin" className="back">
          {t("catalog.back")}
        </Link>
      </p>
      <h1>{t("catalog.title")}</h1>
      {!canEdit && <p className="notice">{t("catalog.readOnly")}</p>}
      <ol className="models">
        {models.map((model) => (
          <ModelCard key={model.id} model={model} canEdit={canEdit} />
        ))}
      </ol>
    </main>
  );
}

function ModelCard({ model, canEdit }: { model: PilotModel; canEdit: boolean }) {
  const status = model.pilotStatus;
  return (
    <li className="card">
      <details>
        <summary>
          <span className="rank" aria-label={t("catalog.rank")}>
            {model.pilotRank}
          </span>
          <span className="model-title">
            <strong>
              {model.brand.name} {model.name}
            </strong>
            <span className="meta">
              {t(`segment.${model.segment}`)} · {model.versions.length} {t("catalog.versionsCount")}
            </span>
          </span>
          {status && <span className={`badge status-${status}`}>{t(`pilotStatus.${status}`)}</span>}
        </summary>

        {model.versions.length === 0 ? (
          <p className="meta">{t("catalog.noVersion")}</p>
        ) : (
          <ul className="versions">
            {model.versions.map((version) => (
              <VersionRow key={version.id} version={version} canEdit={canEdit} />
            ))}
          </ul>
        )}

        {canEdit && (
          <>
            <AddVersionForm modelId={model.id} />
            <details className="sub">
              <summary>{t("catalog.model.edit")}</summary>
              <ActionForm action={renameModelAction} className="stack">
                <input type="hidden" name="modelId" value={model.id} />
                <label>
                  {t("catalog.model.name")}
                  <input name="name" defaultValue={model.name} required maxLength={80} />
                </label>
                <button type="submit">{t("catalog.model.rename")}</button>
              </ActionForm>
              <ActionForm action={setModelStatusAction} className="stack">
                <input type="hidden" name="modelId" value={model.id} />
                <label>
                  {t("catalog.model.status")}
                  <select name="status" defaultValue={status ?? PilotStatus.TO_CONFIRM}>
                    {Object.values(PilotStatus).map((s) => (
                      <option key={s} value={s}>
                        {t(`pilotStatus.${s}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit">{t("catalog.model.saveStatus")}</button>
              </ActionForm>
            </details>
          </>
        )}
      </details>
    </li>
  );
}

function VersionRow({
  version,
  canEdit,
}: {
  version: PilotModel["versions"][number];
  canEdit: boolean;
}) {
  return (
    <li className={version.isActive ? "version" : "version inactive"}>
      <div>
        <strong>{version.name}</strong>
        <span className="meta">
          {version.powertrain
            ? t(`powertrain.${version.powertrain}`)
            : t("catalog.version.powertrainUnknown")}
        </span>
      </div>
      <div className="badges">
        {version.isPopularCar && <span className="badge">{t("catalog.version.popular")}</span>}
        {!version.isActive ? (
          <span className="badge">{t("catalog.version.inactive")}</span>
        ) : version.isTracked ? (
          <span className="badge status-CONFIRMED">{t("catalog.version.tracked")}</span>
        ) : (
          <span className="badge">{t("catalog.version.notTracked")}</span>
        )}
      </div>

      {canEdit && (
        <div className="row-actions">
          {version.isActive && (
            <ActionForm action={setVersionTrackedAction}>
              <input type="hidden" name="versionId" value={version.id} />
              <input type="hidden" name="tracked" value={String(!version.isTracked)} />
              <button type="submit">
                {version.isTracked ? t("catalog.version.untrack") : t("catalog.version.track")}
              </button>
            </ActionForm>
          )}
          <ActionForm action={setVersionActiveAction}>
            <input type="hidden" name="versionId" value={version.id} />
            <input type="hidden" name="active" value={String(!version.isActive)} />
            <button type="submit" className="secondary">
              {version.isActive ? t("catalog.version.deactivate") : t("catalog.version.activate")}
            </button>
          </ActionForm>
          <details className="sub">
            <summary>{t("catalog.version.rename")}</summary>
            <ActionForm action={renameVersionAction} className="stack">
              <input type="hidden" name="versionId" value={version.id} />
              <label>
                {t("catalog.version.newName")}
                <input name="name" defaultValue={version.name} required maxLength={80} />
              </label>
              <button type="submit">{t("catalog.version.rename")}</button>
            </ActionForm>
          </details>
        </div>
      )}
    </li>
  );
}

function AddVersionForm({ modelId }: { modelId: string }) {
  return (
    <ActionForm action={addVersionAction} className="stack add-version">
      <h3>{t("catalog.version.add")}</h3>
      <input type="hidden" name="modelId" value={modelId} />
      <label>
        {t("catalog.version.name")}
        <input name="name" required maxLength={80} autoComplete="off" />
      </label>
      <label>
        {t("catalog.version.powertrain")}
        <select name="powertrain" defaultValue="">
          <option value="">{t("catalog.version.powertrainUnknown")}</option>
          {Object.values(Powertrain).map((p) => (
            <option key={p} value={p}>
              {t(`powertrain.${p}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="check">
        <input type="checkbox" name="isPopularCar" />
        {t("catalog.version.popular")}
      </label>
      <button type="submit">{t("catalog.version.add")}</button>
    </ActionForm>
  );
}
