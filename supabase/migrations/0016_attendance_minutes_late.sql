-- El check-in ya calculaba minutesLate en el server action (para decidir
-- on_time/late y armar el mensaje de la alerta), pero nunca se guardaba.
-- Sin esto no hay forma de reportar "cuánto" tarde llega alguien en
-- promedio, solo el booleano on_time/late.
alter table public.attendance_records
  add column minutes_late integer not null default 0;
