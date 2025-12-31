-- Seed data and helper views/functions for CMO and PRO organizations
-- Migration: 20251231_seed_cmo_pro_organizations
BEGIN;

INSERT INTO public.cmo_pro_organizations (name, acronym, organization_type, country, website, is_active) VALUES
  -- Europe
  ('Albautor', 'ALBAUTOR', 'CMO', 'AL', NULL, true),
  ('AKM Gesellschaft der Autoren, Komponisten und Musikverleger', 'AKM', 'PRO', 'AT', 'https://www.akm.at', true),
  ('Austro-Mechana', 'AUSTRO-MECHANA', 'CMO', 'AT', 'https://www.austromechana.at', true),
  ('Societe Belge des Auteurs, Compositeurs et Editeurs', 'SABAM', 'BOTH', 'BE', 'https://www.sabam.be', true),
  ('Musicautor', 'MUSICAUTOR', 'CMO', 'BG', 'https://www.musicautor.org', true),
  ('Croatian Composers Society', 'HDS ZAMP', 'CMO', 'HR', 'https://www.zamp.hr', true),
  ('Cyprus Regional Agreements', 'CYPRUS', 'BOTH', 'CY', NULL, true),
  ('Ochranny svaz autorsky pro prava k dilum hudebnim', 'OSA', 'CMO', 'CZ', 'https://www.osa.cz', true),
  ('Koda', 'KODA', 'BOTH', 'DK', 'https://www.koda.dk', true),
  ('Eesti Autorite Uhing', 'EAU', 'CMO', 'EE', 'https://www.eau.org', true),
  ('Teosto Finnish Composers Copyright Agency', 'TEOSTO', 'BOTH', 'FI', 'https://www.teosto.fi', true),
  ('Societe des Auteurs, Compositeurs et Editeurs de Musique', 'SACEM', 'CMO', 'FR', 'https://www.sacem.fr', true),
  ('Gesellschaft fur musikalische Auffuhrungs- und mechanische Vervielfaltigungsrechte', 'GEMA', 'CMO', 'DE', 'https://www.gema.de', true),
  ('Gesellschaft zur Verwertung von Leistungsschutzrechten', 'GVL', 'BOTH', 'DE', 'https://www.gvl.de', true),
  ('Greece Collective Rights (multiple societies)', 'GREECE', 'BOTH', 'GR', NULL, true),
  ('Artisjus Magyar Szerzoi Jogvedo Iroda Egyesulet', 'ARTISJUS', 'CMO', 'HU', 'https://www.artisjus.hu', true),
  ('Samtok tonskalda og eigenda flutningsrettar', 'STEF', 'CMO', 'IS', 'https://www.stef.is', true),
  ('Irish Music Rights Organisation', 'IMRO', 'PRO', 'IE', 'https://www.imro.ie', true),
  ('Societa Italiana degli Autori ed Editori', 'SIAE', 'CMO', 'IT', 'https://www.siae.it', true),
  ('Latvijas Autoru apvieniba', 'AKKA/LAA', 'CMO', 'LV', 'https://www.akka-laa.lv', true),
  ('Lietuvos autoriu teisiu gynimo asociacija', 'LATGA', 'CMO', 'LT', 'https://www.latga.lt', true),
  ('SACEM Luxembourg', 'SACEM LU', 'CMO', 'LU', 'https://www.sacem.fr', true),
  ('Udruzenje kompozitora Crne Gore', 'PAM CG', 'CMO', 'ME', NULL, true),
  ('Buma/Stemra', 'BUMA/STEMRA', 'BOTH', 'NL', 'https://www.bumastemra.nl', true),
  ('Zdruzenie na Avtori i Kompozitori na Makedonija', 'ZAMP', 'CMO', 'MK', 'https://www.zamp.com.mk', true),
  ('Tono', 'TONO', 'BOTH', 'NO', 'https://www.tono.no', true),
  ('Stowarzyszenie Autorow ZAIKS', 'ZAIKS', 'CMO', 'PL', 'https://www.zaiks.org.pl', true),
  ('Zwiazek Producentow Audio-Video', 'ZPAV', 'CMO', 'PL', 'https://www.zpav.pl', true),
  ('Sociedade Portuguesa de Autores', 'SPA', 'CMO', 'PT', 'https://www.spautores.pt', true),
  ('Uniunea Compozitorilor si Muzicologilor din Romania', 'UCMR-ADA', 'CMO', 'RO', 'https://www.ucmr-ada.ro', true),
  ('Organizacija Kompozitora Srbije', 'SOKOJ', 'CMO', 'RS', 'https://www.sokoj.rs', true),
  ('Slovensky Ochranny Zvez Autorsky pre Prava k Hudobnym Dielam', 'SOZA', 'CMO', 'SK', 'https://www.soza.sk', true),
  ('Slovenian Authors'' Agency', 'SAZAS', 'CMO', 'SI', 'https://www.sazas.org', true),
  ('Zdruzenje Slovenskih Glasbenikov', 'IPF', 'BOTH', 'SI', 'https://www.ipf.si', true),
  ('Sociedad General de Autores y Editores', 'SGAE', 'CMO', 'ES', 'https://www.sgae.es', true),
  ('Svenska Tonsattares Internationella Musikbyra', 'STIM', 'PRO', 'SE', 'https://www.stim.se', true),
  ('Schweizerische Gesellschaft fur die Rechte der Urheber musikalischer Werke', 'SUISA', 'CMO', 'CH', 'https://www.suisa.ch', true),
  ('Ukrainian Agency for Copyright and Related Rights', 'UACRR', 'CMO', 'UA', 'http://uacrr.org.ua', true),
  ('PRS for Music', 'PRS', 'PRO', 'GB', 'https://www.prsformusic.com', true),
  ('Mechanical-Copyright Protection Society', 'MCPS', 'CMO', 'GB', 'https://www.prsformusic.com', true),
  ('Phonographic Performance Limited', 'PPL', 'PRO', 'GB', 'https://www.ppluk.com', true),
  -- Americas
  ('American Society of Composers, Authors and Publishers', 'ASCAP', 'PRO', 'US', 'https://www.ascap.com', true),
  ('Broadcast Music, Inc.', 'BMI', 'PRO', 'US', 'https://www.bmi.com', true),
  ('SESAC', 'SESAC', 'PRO', 'US', 'https://www.sesac.com', true),
  ('Global Music Rights', 'GMR', 'PRO', 'US', 'https://globalmusicrights.com', true),
  ('SoundExchange', 'SOUNDEXCHANGE', 'PRO', 'US', 'https://www.soundexchange.com', true),
  ('Society of Composers, Authors and Music Publishers of Canada', 'SOCAN', 'BOTH', 'CA', 'https://www.socan.com', true),
  ('Sociedad de Autores y Compositores de Mexico', 'SACM', 'CMO', 'MX', 'https://www.sacm.org.mx', true),
  ('Sociedad Argentina de Autores y Compositores de Musica', 'SADAIC', 'CMO', 'AR', 'https://www.sadaic.org.ar', true),
  ('Escritorio Central de Arrecadacao e Distribuicao', 'ECAD', 'BOTH', 'BR', 'https://www.ecad.org.br', true),
  ('Sociedad Chilena del Derecho de Autor', 'SCD', 'CMO', 'CL', 'https://www.scd.cl', true),
  ('Sociedad de Autores y Compositores de Colombia', 'SAYCO', 'CMO', 'CO', 'https://www.sayco.org', true),
  ('Asociacion Peruana de Autores y Compositores', 'APDAYC', 'CMO', 'PE', 'https://www.apdayc.org.pe', true),
  ('Asociacion General de Autores del Uruguay', 'AGADU', 'CMO', 'UY', 'https://www.agadu.org', true),
  ('Sociedad de Autores y Compositores de Venezuela', 'SACVEN', 'CMO', 'VE', 'https://www.sacven.org', true),
  ('Asociacion de Compositores y Autores Musicales de Costa Rica', 'ACAM', 'CMO', 'CR', 'https://www.acam.co.cr', true),
  ('Sociedad Panamena de Autores y Compositores', 'SPAC', 'CMO', 'PA', NULL, true),
  ('Jamaica Association of Composers Authors and Publishers', 'JACAP', 'CMO', 'JM', 'https://www.jacapjamaica.com', true),
  ('Copyright Organisation of Trinidad and Tobago', 'COTT', 'CMO', 'TT', 'https://www.cott.org.tt', true),
  ('Copyright Society of Composers, Authors and Publishers Inc.', 'COSCAP', 'CMO', 'BB', NULL, true),
  ('Belize Society of Composers, Authors and Publishers', 'BSCAP', 'CMO', 'BZ', NULL, true),
  -- Middle East
  ('Acum Ltd.', 'ACUM', 'BOTH', 'IL', 'https://www.acum.org.il', true),
  -- Additional major markets
  ('Australasian Performing Right Association', 'APRA', 'PRO', 'AU', 'https://www.apra-amcos.com.au', true),
  ('Australasian Mechanical Copyright Owners Society', 'AMCOS', 'CMO', 'AU', 'https://www.apra-amcos.com.au', true),
  ('Japanese Society for Rights of Authors, Composers and Publishers', 'JASRAC', 'CMO', 'JP', 'https://www.jasrac.or.jp', true),
  ('Korea Music Copyright Association', 'KOMCA', 'CMO', 'KR', 'https://www.komca.or.kr', true),
  ('Australasian Performing Right Association New Zealand', 'APRA NZ', 'PRO', 'NZ', 'https://www.apra-amcos.com.au', true),
  ('Southern African Music Rights Organisation', 'SAMRO', 'BOTH', 'ZA', 'https://www.samro.org.za', true),
  -- Generic / fallback options
  ('Other (Not Listed)', 'OTHER', 'BOTH', NULL, NULL, true),
  ('Unknown / To Be Determined', 'UNKNOWN', 'BOTH', NULL, NULL, true)

ON CONFLICT (acronym) DO UPDATE SET
  name = EXCLUDED.name,
  organization_type = EXCLUDED.organization_type,
  country = EXCLUDED.country,
  website = EXCLUDED.website,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Regional and type helper views
CREATE OR REPLACE VIEW public.cmo_pro_by_region AS
SELECT 
  CASE 
    WHEN country IN ('AL','AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IE','IT','LV','LT','LU','ME','NL','MK','NO','PL','PT','RO','RS','SK','SI','ES','SE','CH','UA','GB') THEN 'Europe'
    WHEN country IN ('US','CA','MX','AR','BR','CL','CO','PE','UY','VE','CR','PA','JM','TT','BB','BZ') THEN 'Americas'
    WHEN country IN ('IL') THEN 'Middle East'
    WHEN country IN ('AU','NZ') THEN 'Oceania'
    WHEN country IN ('JP','KR') THEN 'Asia'
    WHEN country IN ('ZA') THEN 'Africa'
    ELSE 'Other/Global'
  END AS region,
  country,
  acronym,
  name,
  organization_type,
  website
FROM public.cmo_pro_organizations
WHERE is_active = true
ORDER BY region, country, acronym;

CREATE OR REPLACE VIEW public.cmo_pro_by_type AS
SELECT 
  organization_type,
  COUNT(*) AS organization_count,
  array_agg(acronym ORDER BY acronym) AS organizations
FROM public.cmo_pro_organizations
WHERE is_active = true
GROUP BY organization_type
ORDER BY organization_type;

CREATE OR REPLACE VIEW public.european_cmo_pro AS
SELECT 
  country,
  acronym,
  name,
  organization_type,
  website
FROM public.cmo_pro_organizations
WHERE is_active = true
  AND country IN ('AL','AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IE','IT','LV','LT','LU','ME','NL','MK','NO','PL','PT','RO','RS','SK','SI','ES','SE','CH','UA','GB')
ORDER BY country, acronym;

CREATE OR REPLACE VIEW public.us_pro_organizations AS
SELECT 
  acronym,
  name,
  organization_type,
  website
FROM public.cmo_pro_organizations
WHERE country = 'US' AND is_active = true
ORDER BY acronym;

-- Query helper functions
CREATE OR REPLACE FUNCTION public.get_cmo_pro_by_country(p_country text)
RETURNS TABLE(
  id uuid,
  acronym text,
  name text,
  organization_type text,
  website text
)
LANGUAGE sql
STABLE
AS $$
  SELECT id, acronym, name, organization_type, website
  FROM public.cmo_pro_organizations
  WHERE country = p_country AND is_active = true
  ORDER BY acronym;
$$;

CREATE OR REPLACE FUNCTION public.get_cmo_pro_by_type(p_type text)
RETURNS TABLE(
  id uuid,
  acronym text,
  name text,
  country text,
  website text
)
LANGUAGE sql
STABLE
AS $$
  SELECT id, acronym, name, country, website
  FROM public.cmo_pro_organizations
  WHERE organization_type = p_type AND is_active = true
  ORDER BY country, acronym;
$$;

CREATE OR REPLACE FUNCTION public.get_cmo_pro_by_region(p_region text)
RETURNS TABLE(
  country text,
  acronym text,
  name text,
  organization_type text,
  website text
)
LANGUAGE sql
STABLE
AS $$
  SELECT country, acronym, name, organization_type, website
  FROM public.cmo_pro_by_region
  WHERE region = p_region
  ORDER BY country, acronym;
$$;

-- Validation summary
DO $$
DECLARE
  total_count integer;
  europe_count integer;
  americas_count integer;
  other_count integer;
BEGIN
  SELECT COUNT(*) INTO total_count FROM public.cmo_pro_organizations;
  SELECT COUNT(*) INTO europe_count FROM public.cmo_pro_organizations WHERE country IN ('AL','AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IE','IT','LV','LT','LU','ME','NL','MK','NO','PL','PT','RO','RS','SK','SI','ES','SE','CH','UA','GB');
  SELECT COUNT(*) INTO americas_count FROM public.cmo_pro_organizations WHERE country IN ('US','CA','MX','AR','BR','CL','CO','PE','UY','VE','CR','PA','JM','TT','BB','BZ');
  SELECT COUNT(*) INTO other_count FROM public.cmo_pro_organizations WHERE country IN ('IL','AU','NZ','JP','KR','ZA') OR country IS NULL;

  RAISE NOTICE '=====================================';
  RAISE NOTICE 'CMO/PRO Organizations Summary';
  RAISE NOTICE '=====================================';
  RAISE NOTICE 'Total organizations: %', total_count;
  RAISE NOTICE 'Europe: %', europe_count;
  RAISE NOTICE 'Americas: %', americas_count;
  RAISE NOTICE 'Other/Global: %', other_count;
  RAISE NOTICE '=====================================';
END $$;

COMMIT;
