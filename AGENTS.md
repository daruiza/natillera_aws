# AGENTS.md

## Estado actual

- Repo en fase **previa a la implementación**: `backend/`, `frontend/`, `database/` e `infraestructure/` existen pero están vacíos. No hay manifiestos, build, tests, lint ni typecheck. No inventes comandos de build/test: aún no hay ninguno.
- No hay CI de producto; `.github/workflows/copilot-setup-steps.yml` solo instala OpenSpec para el agente de GitHub.
- `documentation/requerimientos/requerimientos-natillera.md` es la **fuente de verdad del comportamiento** (alcance, RF-01..RF-16, matriz de permisos, criterios de aceptación).
- `documentation/arquitectura/decisiones-arquitectonicas.md` registra las decisiones técnicas. Ojo: varias están en estado **Propuesta/Pendiente**; no las trates como código ya implementado.
- La documentación y los artefactos se escriben en **español**.

## Flujo OpenSpec (vía normal para cambios)

- Schema `spec-driven` (`openspec/config.yaml`). Para funcionalidades usa `/opsx-propose` → revisar artefactos → `/opsx-apply`; cerrar con `/opsx-archive`. Otros: `/opsx-explore`, `/opsx-sync`, `/opsx-update`.
- Proponer es **solo planificación**: no implementes código en la misma respuesta que genera los artefactos.
- CLI: `openspec` (paquete npm `@fission-ai/openspec`), versión usada: 1.16.0. Verifica con `openspec --version` y el root con `openspec list --json`.
- Los cambios van en `openspec/changes/<nombre>/`; los archivados en `openspec/changes/archive/`; las specs principales en `openspec/specs/`.
- Las copias de prompts/skills en `.github/`, `.kiro/` y `.opencode/` son **generadas por OpenSpec**. No las edites a mano: usa el CLI (`openspec update`) para regenerarlas.
- No ejecutes `openspec init` ni crees `openspec/` a mano salvo que el usuario lo pida explícitamente.

## Invariantes del dominio (verificados en requisitos y esquema)

- Moneda **COP**. Montos como **enteros en unidades menores/centavos**; campos con sufijo `_minor` (ej. `minimum_contribution_minor`). Tasas en puntos base (`monthly_rate_bps`). Nunca floats.
- Los saldos **se calculan** desde las transacciones confirmadas/publicadas; **no se almacenan** (`accounts` no tiene campo de saldo). Pendientes o rechazadas no afectan saldos.
- Los registros financieros **nunca se borran físicamente**: se anulan/revierten conservando historial (`status: reversed`, `reverses_transaction_id`).
- Toda consulta se filtra por la natillera seleccionada y los permisos del usuario; nunca mezclar datos entre natilleras. Miembros y prestatarios son de solo lectura y solo ven sus propios datos.
- Fechas: sistema francés para préstamos; primera cuota un mes después del desembolso; día inexistente en mes corto → último día del mes. Recordatorios diarios en zona `America/Bogota`.
- Vocabulario de estados: transacciones `pending|posted|rejected|reversed`; préstamos `requested|approved|rejected|disbursed|paid`; solicitudes de retiro `requested|approved|rejected|executed`. Mantén consistencia con el esquema.

## Esquema de datos

- `documentation/diagramas/natillera-mongo-schema.js` es la definición autoritativa (validadores e índices).
- Al cambiar el esquema, actualiza en el mismo cambio `documentation/diagramas/natillera-mongo-schema-diagram.md` (diagrama ER en Mermaid).
- Convenciones: `snake_case`, `_id` ObjectId, timestamps `*_at`, estados como enums, índices únicos para correo, identidad OAuth (`provider` + `subject`), membresía por natillera y cuenta interna por membresía.

## Arquitectura prevista (según AD, aún no construida)

- Backend: Lambdas en **Go**, runtime `provided.al2023`, `arm64`, una por módulo; lógica de dominio en paquetes `internal/` y `main.go` solo como adaptador.
- API: API Gateway **HTTP API** (REST/JSON) con JWT authorizer de Cognito; la autorización por rol/módulo/natillera se valida en cada Lambda.
- Datos: **MongoDB Atlas**; sin VPC/NAT (el acceso a Atlas es por red abierta + TLS + credenciales en Parameter Store).
- Evidencias: **S3 privado** con URLs prefirmadas; en MongoDB solo clave y metadatos.
- Infra: **AWS CDK en TypeScript** dentro de `infraestructure/` (sic, con esa ortografía; no crear `infrastructure/`). Los binarios Go se compilan antes del synth con `GOOS=linux GOARCH=arm64` y salida `bootstrap`.
- App: Android con Angular Native (Expo), en `frontend/`; compilación local, sin EAS.
- Fase 2: mismo CDK desplegable en **LocalStack** (`cdklocal`), con MongoDB en contenedor.
