# todo-notes-app v2 — Brief

> Qué se construye, para quién y qué debe hacer. Dominio en `Domain.md`, tecnología en `Stack.md`, ejecución y estado de avance en `Plan.md`.

> [!IMPORTANT]
> **Actualización de alcance comunicada por el docente (19–20 nov 2026):**
> - **Solo se evalúa la conexión con APIs internas del dispositivo** (cámara, galería, sistema de archivos privado, GPS/mapas, permisos nativos, almacenamiento local `AsyncStorage` y almacenamiento seguro `expo-secure-store`), **no la conexión con APIs externas (servicios web)**.
> - Toda la aplicación funciona **100 % dentro del dispositivo** (incluso sin conexión a internet), incluyendo el **registro e inicio de sesión de cuentas locales** y el aislamiento de tareas y fotos por usuario.
> - El **mismo repositorio** (`todo-notes-app`) y el **mismo `README.md` con pantallazos reales de iPhone y Android** sirven como informe de entrega.

## 1. Contexto académico

| Campo | Valor |
|---|---|
| Asignatura | Desarrollo de Aplicaciones Móviles |
| Evaluación | Sumativa Unidad 2 — *"Los recursos son muchos"* (20 % de la nota final, 100 pts, exigencia 60 % = nota 4,0) |
| Docente | Boris Marcelo Belmar Muñoz |
| Equipo | Pía Alarcón, Ain Cortés |
| Resultado de aprendizaje | Construir aplicaciones móviles que utilicen periféricos y APIs internas del dispositivo (cámara, galería, GPS, almacenamiento seguro y almacenamiento local), gestionando permisos y pruebas automatizadas |
| Base | Proyecto de la Unidad 1: `todo-notes-app` (Expo SDK 58 + React Native 0.88 + TypeScript + AsyncStorage + `bun test`) |

**Desviación autorizada:** el enunciado original nombra Ionic/Capacitor, pero el docente autorizó trabajar con **React Native + Expo SDK 58**. Equivalencias documentadas en el informe:
- `@capacitor/camera` → `expo-image-picker`
- `@capacitor/geolocation` → `expo-location`
- Capacitor `Preferences` / `Filesystem` → `@react-native-async-storage/async-storage` + `expo-file-system` + `expo-secure-store` (Keychain/Keystore)

## 2. Resumen

La To-Do List de la Unidad 1 (CRUD local de tareas) evoluciona a una aplicación móvil **multiusuario, offline-first y orientada a APIs internas del dispositivo**: incorpora **autenticación y registro local de cuentas** (con sesión persistente en `expo-secure-store`), **cámara y galería** con guardado de imágenes en directorio privado (`expo-file-system`), **GPS** al crear la tarea con medición de precisión y apertura en Mapas del sistema (`expo-location`), **gestión incremental de permisos** con explicación previa (*rationale*) y redirección a Ajustes, además de una **suite TDD automatizada** con `bun test`.

## 3. Objetivos evaluables (ajustados a APIs internas del dispositivo)

| # | Objetivo | Capacidad cubierta |
|---|---|---|
| O1 | Capturar fotos con la cámara o galería, guardarlas en el almacenamiento privado de la app y registrar GPS al crear tareas | Cámara, Galería, Sistema de archivos, GPS y optimización (compresión, timeout 10 s, UI optimista) |
| O2 | Solicitar permisos de forma incremental con explicación previa (*rationale*), manejando denegación con alternativa y bloqueo con acceso directo a Ajustes | Permisos nativos en Android e iOS (`whenInUse`, sin permisos en segundo plano) |
| O3 | Almacenamiento local avanzado y multiusuario 100 % en el dispositivo | `AsyncStorage` aislado por `userId` (`tasks_v2:<userId>`, `users_v1`), migración U1→U2, fotos privadas y `expo-secure-store` |
| O4 | Sistema de autenticación local (iniciar sesión, crear cuenta, mostrar/ocultar contraseña, cuentas de prueba y cierre de sesión) | Seguridad de sesión en Keychain/Keystore, aislamiento por usuario y continuidad offline |
| O5 | Pruebas automatizadas TDD sobre lógica de dominio, almacenamiento, permisos, periféricos y autenticación | Suite `bun test --coverage` con dobles de prueba (*fakes*), reloj simulado y pruebas tabulares |

## 4. Alcance funcional

### 4.1 Heredado de la Unidad 1 (conservado sin regresiones)
Crear, editar, completar, eliminar, filtrar (`Todas` / `Pendientes` / `Completadas`) y buscar tareas en tiempo real; persistencia local y suite de regresión `src/__tests__/taskLogic.test.ts` (13 pruebas sobre `taskRules.ts`).

### 4.2 Nuevo en Unidad 2
1. **Autenticación y registro local multiusuario**:
   - Pantalla de acceso (`LoginScreen`) con pestaña/selector **«Iniciar sesión» / «Crear cuenta»**.
   - Validación local de usuario (incluye `@` para soportar formato correo o alias), contraseña (mín. 6 caracteres), confirmación de contraseña y botón de **mostrar/ocultar contraseña**.
   - Cuentas de prueba preconfiguradas (`emilys` / `emilyspass` y `michaelw` / `michaelwpass`) con botones rápidos para demostración.
   - Creación de nuevas cuentas guardadas localmente en el dispositivo (`users_v1`) evitando duplicados.
   - Sesión activa guardada en almacenamiento seguro (`expo-secure-store`), persistente al cerrar/reabrir la app incluso en modo avión.
   - Aislamiento estricto por usuario (`tasks_v2:<userId>` y `photos/<userId>/...`) y cierre de sesión (`Salir`).
2. **Cámara y galería**: tomar foto o elegir de galería al crear o editar; miniatura en la tarjeta; vista ampliada en modal; quitar o reemplazar foto con limpieza automática del archivo anterior.
3. **GPS al crear la tarea**: captura automática no bloqueante (UI optimista) y botón «Verificar GPS» al crear; registra latitud, longitud, precisión en metros (`±N m`), aviso visual si la precisión es baja (`> 100 m`), inmutabilidad al editar y botón «Abrir en mapa» (`Apple Maps` en iOS / `geo:` en Android).
4. **Permisos incrementales**: explicación previa antes del diálogo nativo del sistema operativo; alternativa de galería al denegar cámara; manejo de permiso bloqueado (`canAskAgain = false` o doble denegación en Android Expo Go) con botón «Abrir ajustes» y sincronización pasiva vía `AppState` al regresar de Ajustes.
5. **Almacenamiento local privado**: migración única de tareas U1 (`@ipss_todo_app:tasks_v1` excluyendo `seed-*`) y persistencia de fotos en `Paths.document/photos/<userId>/`.

### 4.3 Fuera de alcance (descartado por actualización del docente)
- Sincronización remota con servidor REST (`DummyJSON` `/todos`), cola de outbox contra backend externo, importación de tareas desde servicio web externo y consulta del clima en Open-Meteo.
- Login con Google/Apple, mapas embebidos con API keys de pago y notificaciones push.

## 5. Usuarios y roles

| Rol | Capacidades |
|---|---|
| Visitante (sin sesión) | Iniciar sesión o crear una nueva cuenta local en el dispositivo. |
| Usuario autenticado | CRUD completo de **sus** tareas, adjuntar/ampliar/reemplazar fotos, registrar ubicación GPS al crear, abrir coordenadas en Mapas y cerrar sesión. |

## 6. Entregables

1. **Repositorio Git (`todo-notes-app`, rama `unidad2`)**: código completo, documentos `docs/` (`Brief.md`, `Domain.md`, `Stack.md`, `Plan.md`) y commits fase por fase (`test:` + `feat:`) como evidencia de metodología TDD.
2. **Informe integrado en `README.md`**: arquitectura, equivalencia Ionic→Expo, detalle de cada API interna y periférico implementado, pantallazos reales en **iPhone** y **Android (OnePlus)**, tabla comparativa de precisión GPS vs. Mapas, metodología TDD y salida de `bun test --coverage`.
3. **Demostración en video** (flujo completo en dispositivo físico: registro/login, aislamiento multiusuario, creación de tarea con foto y GPS, denegación/bloqueo de permisos, modo avión y pruebas `bun test`).

## 7. Criterios de éxito (checklist final)

- [x] Permisos incrementales con rationale, denegación y bloqueo→Ajustes probados en iPhone y Android.
- [x] Fotos de cámara y galería guardadas en directorio privado (`expo-file-system`), persistentes tras reiniciar sin red y eliminadas al borrar/reemplazar.
- [x] Captura GPS no bloqueante al crear (con timeout de 10 s), inmutable al editar, medida en ambos SO y con enlace directo a Mapas.
- [x] Registro de nuevas cuentas locales («Crear cuenta») + inicio/cierre de sesión + aislamiento entre usuarios verificados en ambos teléfonos.
- [x] Sesión persistente en `expo-secure-store` incluso en modo avión.
- [x] `bun test --coverage` >= 80 %, `bun --bun x tsc --noEmit` y `bun --bun x expo lint` sin errores.
- [x] Informe completo en `README.md` con capturas reales embebidas desde `Capturas/u2/`.
