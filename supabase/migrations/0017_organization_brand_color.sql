-- Reportes/exports (PDF y Excel) usan logo_url + brand_color para
-- personalizar el documento por cliente en vez de mostrar siempre la marca
-- de TAPnalytics. logo_url ya existía; falta el color.
alter table public.organizations
  add column brand_color text;
