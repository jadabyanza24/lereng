CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS data_sources (
 id text PRIMARY KEY, name text NOT NULL, kind text NOT NULL, url text NOT NULL,
 license text NOT NULL, limitations text NOT NULL, frequency_hours numeric NOT NULL,
 status text NOT NULL DEFAULT 'not_ingested', last_success_at timestamptz, last_attempt_at timestamptz, error text
);
CREATE TABLE IF NOT EXISTS ingestion_runs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, source_id text REFERENCES data_sources(id), started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, status text NOT NULL DEFAULT 'running', record_count integer NOT NULL DEFAULT 0, error text, content_hash text
);
CREATE TABLE IF NOT EXISTS administrative_regions (
 id text PRIMARY KEY, name text NOT NULL, level integer NOT NULL CHECK(level BETWEEN 1 AND 4), parent_id text, source_id text REFERENCES data_sources(id), geom geometry(MultiPolygon,4326) NOT NULL, retrieved_at timestamptz NOT NULL DEFAULT now(), metadata jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS regions_geom_idx ON administrative_regions USING gist(geom);
CREATE TABLE IF NOT EXISTS landslide_incidents (
 id text PRIMARY KEY, external_id text NOT NULL, title text NOT NULL, description text, occurred_at timestamptz NOT NULL,
 province text, regency text, district text, village text, geom geometry(Point,4326), coordinate_precision text NOT NULL,
 fatalities integer CHECK(fatalities>=0), injuries integer CHECK(injuries>=0), missing integer CHECK(missing>=0), displaced integer CHECK(displaced>=0), damaged_buildings integer CHECK(damaged_buildings>=0), infrastructure_impact text,
 source_id text NOT NULL REFERENCES data_sources(id), source_url text NOT NULL, verification_status text NOT NULL CHECK(verification_status IN ('official','media_reported','unverified')),
 published_at timestamptz, retrieved_at timestamptz NOT NULL, fingerprint text NOT NULL, raw jsonb NOT NULL,
 UNIQUE(source_id,external_id), CHECK(geom IS NULL OR (ST_X(geom) BETWEEN 94 AND 142 AND ST_Y(geom) BETWEEN -12 AND 7))
);
CREATE INDEX IF NOT EXISTS incidents_geom_idx ON landslide_incidents USING gist(geom);
CREATE INDEX IF NOT EXISTS incidents_geography_idx ON landslide_incidents USING gist((geom::geography));
CREATE INDEX IF NOT EXISTS incidents_date_idx ON landslide_incidents(occurred_at);
CREATE INDEX IF NOT EXISTS incidents_province_date_idx ON landslide_incidents(province,occurred_at);
CREATE INDEX IF NOT EXISTS incidents_fingerprint_idx ON landslide_incidents(fingerprint);
CREATE TABLE IF NOT EXISTS incident_sources (incident_id text REFERENCES landslide_incidents(id),source_url text NOT NULL,source_id text REFERENCES data_sources(id),published_at timestamptz,retrieved_at timestamptz NOT NULL,PRIMARY KEY(incident_id,source_url));
CREATE TABLE IF NOT EXISTS news_articles (id text PRIMARY KEY,title text NOT NULL,description text,source_id text REFERENCES data_sources(id),source_url text UNIQUE NOT NULL,published_at timestamptz,retrieved_at timestamptz NOT NULL,verification_status text NOT NULL DEFAULT 'unverified',geographic_mentions jsonb NOT NULL DEFAULT '[]',duplicate_group text,incident_id text REFERENCES landslide_incidents(id));
CREATE TABLE IF NOT EXISTS weather_forecasts (id text PRIMARY KEY,source_id text REFERENCES data_sources(id),adm4 text NOT NULL,location_name text NOT NULL,geom geometry(Point,4326) NOT NULL,issued_at timestamptz NOT NULL,valid_at timestamptz NOT NULL,retrieved_at timestamptz NOT NULL,temperature numeric,humidity numeric,description text,payload jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS forecasts_geom_idx ON weather_forecasts USING gist(geom);
CREATE TABLE IF NOT EXISTS weather_observations (id text PRIMARY KEY,source_id text REFERENCES data_sources(id),geom geometry(Point,4326) NOT NULL,observed_at timestamptz NOT NULL,retrieved_at timestamptz NOT NULL,rainfall_mm numeric CHECK(rainfall_mm>=0),interval_hours numeric,payload jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS observations_geom_idx ON weather_observations USING gist(geom);
CREATE TABLE IF NOT EXISTS official_warnings (id text PRIMARY KEY,source_id text REFERENCES data_sources(id),title text NOT NULL,description text,source_url text NOT NULL,effective_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,published_at timestamptz NOT NULL,retrieved_at timestamptz NOT NULL,geom geometry(MultiPolygon,4326),payload jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS warnings_geom_idx ON official_warnings USING gist(geom);
CREATE TABLE IF NOT EXISTS geospatial_datasets (id text PRIMARY KEY,name text NOT NULL,source_id text REFERENCES data_sources(id),kind text NOT NULL,license text NOT NULL,resolution text,coverage text,updated_at timestamptz,limitations text NOT NULL,metadata jsonb NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS susceptibility_layers (id text PRIMARY KEY,dataset_id text REFERENCES geospatial_datasets(id),classification text NOT NULL,legend jsonb NOT NULL,geom geometry(MultiPolygon,4326),official boolean NOT NULL DEFAULT false);
CREATE INDEX IF NOT EXISTS susceptibility_geom_idx ON susceptibility_layers USING gist(geom);
CREATE TABLE IF NOT EXISTS ai_datasets (id text PRIMARY KEY,version text UNIQUE NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),content_hash text NOT NULL,provenance jsonb NOT NULL,methodology jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS ai_models (id text PRIMARY KEY,version text UNIQUE NOT NULL,dataset_id text REFERENCES ai_datasets(id),status text NOT NULL CHECK(status IN ('research','validated','retired')),trained_at timestamptz,evaluation jsonb NOT NULL,validation_methodology text NOT NULL,coverage jsonb NOT NULL,limitations jsonb NOT NULL,last_successful_inference timestamptz);
CREATE TABLE IF NOT EXISTS ai_training_runs (id text PRIMARY KEY,model_id text REFERENCES ai_models(id),dataset_id text REFERENCES ai_datasets(id),started_at timestamptz NOT NULL,finished_at timestamptz,configuration jsonb NOT NULL,metrics jsonb NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS ai_predictions (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,model_id text NOT NULL REFERENCES ai_models(id),issued_at timestamptz NOT NULL,horizon_hours integer NOT NULL CHECK(horizon_hours IN (24,72)),geographic_unit text NOT NULL,geom geometry(MultiPolygon,4326),predicted_value numeric CHECK(predicted_value BETWEEN 0 AND 1),uncertainty jsonb,input_freshness jsonb NOT NULL,limitations jsonb NOT NULL);
