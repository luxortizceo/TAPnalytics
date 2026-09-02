-- Alerta cuando un empleado marca su entrada tarde (más de 5 minutos
-- después de su hora esperada) — reutiliza el fan-out de
-- createAlertAndNotify (in_app + los canales que el org configure).
alter type alert_type add value 'employee_late';
