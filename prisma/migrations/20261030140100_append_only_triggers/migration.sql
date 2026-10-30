-- Fondations F3 : journaux et observations en ajout seul. La base refuse toute modification,
-- suppression ou remise à zéro ; une correction est une nouvelle ligne.

CREATE FUNCTION "refuse_append_only_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'append-only table "%": % refused', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER "audit_log_append_only" BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION "refuse_append_only_change"();
CREATE TRIGGER "audit_log_no_truncate" BEFORE TRUNCATE ON "audit_log"
  FOR EACH STATEMENT EXECUTE FUNCTION "refuse_append_only_change"();

CREATE TRIGGER "analytics_events_append_only" BEFORE UPDATE OR DELETE ON "analytics_events"
  FOR EACH ROW EXECUTE FUNCTION "refuse_append_only_change"();
CREATE TRIGGER "analytics_events_no_truncate" BEFORE TRUNCATE ON "analytics_events"
  FOR EACH STATEMENT EXECUTE FUNCTION "refuse_append_only_change"();

CREATE TRIGGER "obs_field_checks_append_only" BEFORE UPDATE OR DELETE ON "obs_field_checks"
  FOR EACH ROW EXECUTE FUNCTION "refuse_append_only_change"();
CREATE TRIGGER "obs_field_checks_no_truncate" BEFORE TRUNCATE ON "obs_field_checks"
  FOR EACH STATEMENT EXECUTE FUNCTION "refuse_append_only_change"();

CREATE TRIGGER "obs_price_points_append_only" BEFORE UPDATE OR DELETE ON "obs_price_points"
  FOR EACH ROW EXECUTE FUNCTION "refuse_append_only_change"();
CREATE TRIGGER "obs_price_points_no_truncate" BEFORE TRUNCATE ON "obs_price_points"
  FOR EACH STATEMENT EXECUTE FUNCTION "refuse_append_only_change"();

CREATE TRIGGER "obs_availability_append_only" BEFORE UPDATE OR DELETE ON "obs_availability"
  FOR EACH ROW EXECUTE FUNCTION "refuse_append_only_change"();
CREATE TRIGGER "obs_availability_no_truncate" BEFORE TRUNCATE ON "obs_availability"
  FOR EACH STATEMENT EXECUTE FUNCTION "refuse_append_only_change"();

CREATE TRIGGER "obs_competitor_append_only" BEFORE UPDATE OR DELETE ON "obs_competitor"
  FOR EACH ROW EXECUTE FUNCTION "refuse_append_only_change"();
CREATE TRIGGER "obs_competitor_no_truncate" BEFORE TRUNCATE ON "obs_competitor"
  FOR EACH STATEMENT EXECUTE FUNCTION "refuse_append_only_change"();
