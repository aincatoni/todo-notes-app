# GUION DE DEFENSA TÉCNICA Y VIDEO EXPLICATIVO

## EVALUACIÓN SUMATIVA UNIDAD 1 – DESARROLLO DE APLICACIONES MÓVILES

- **Institución:** Instituto Profesional San Sebastián (IPSS)
- **Carrera:** Ingeniería en Informática / Conectividad y Redes
- **Estudiante:** Ain Catoni
- **Duración sugerida:** 3 a 4 minutos
- **Video Demostrativo en iPhone:** [https://youtube.com/shorts/k3e_sxzy7Bc](https://youtube.com/shorts/k3e_sxzy7Bc)
- **Video Explicativo / Defensa Técnica:** [https://youtu.be/deRYQaMxEqs](https://youtu.be/deRYQaMxEqs)

---

## 🖥️ PREPARACIÓN DE PANTALLA ANTES DE GRABAR

- **Opción A (Recomendada):** Lado izquierdo: **Emulador Android (Android Studio)**. Lado derecho: **Duplicación del iPhone**.
- **Opción B:** Lado izquierdo: **VS Code** (código y terminal `bun test`). Lado derecho: **iPhone**.
- **Esquina inferior derecha:** Ventana de cámara flotante de QuickTime (con `Visualización > Flotar encima de todo`).

---

## ⏱️ ESTRUCTURA Y TEXTO DEL GUION

### BLOQUE 1: Introducción y Presentación (0:00 – 0:45)

> **Qué mostrar en pantalla:** Portada del proyecto / README en GitHub o pantalla inicial de la app en el iPhone.

**Texto a exponer:**

> _"Buenas tardes profesor. Mi nombre es Ain Cortés Catoni y Junto a mi compañera Pia Alarcón desarrollamos la Evaluación Sumativa de la Unidad 1 para la asignatura de Desarrollo de Aplicaciones Móviles. A continuación presentaremos la defensa técnica del proyecto_
>
> _El proyecto consiste en una aplicación móvil de gestión de notas y tareas pendientes (To-Do List), desarrollada bajo el ecosistema de **React Native** utilizando **Expo SDK 58** en su versión más reciente, con **TypeScript** para un tipado estricto y el runtime **Bun** para una gestión de dependencias ultra rápida."_

---

### BLOQUE 2: Arquitectura, Persistencia y TDD (0:45 – 1:45)

> **Qué mostrar en pantalla:** Código en VS Code (`src/hooks/useTasks.ts`, `src/storage/taskStorage.ts`) y la terminal ejecutando `bun test`.

**Texto a exponer:**

> _"A nivel arquitectónico, implementamos el patrón de diseño **Custom Hooks** mediante `useTasks()`, desacoplando completamente la lógica de negocio y las operaciones CRUD de los componentes visuales de la interfaz._
>
> _Para el almacenamiento de datos, utilizamos **AsyncStorage**, el estándar nativo de React Native para persistencia asíncrona clave-valor. La colección de tareas se serializa en formato JSON y se almacena en el disco local del dispositivo bajo la clave `@ipss_todo_app:tasks_v1`. Esto asegura que la aplicación funcione de forma totalmente offline y que los datos no se pierdan al cerrar la app o reiniciar el teléfono._
>
> _Además, adoptamos una metodología **TDD (Test-Driven Development)**: construimos una suite automatizada con el test runner nativo de Bun. Como se aprecia en la terminal al ejecutar `bun test`, contamos con **13 pruebas unitarias** que validan la creación, validación de campos obligatorios, inmutabilidad del estado y cálculo de estadísticas en apenas 10 milisegundos."_

---

### BLOQUE 3: Demostración Funcional en Vivo y Multiplataforma (1:45 – 3:00)

> **Qué mostrar en pantalla:** Interactuar con la app en el iPhone y resaltar la ejecución paralela en Android.

> **Frase de impacto multiplataforma:**
> _"Un punto central exigido en la asignatura es la interoperabilidad multiplataforma. Como pueden apreciar en pantalla, tenemos exactamente el mismo código TypeScript ejecutándose en paralelo: a la izquierda en un emulador de Android (API 37 en Android Studio) y a la derecha en un iPhone físico con iOS. Ambos sistemas renderizan la interfaz y el teclado de forma nativa sin duplicar código."_
> **Pasos y texto a exponer:**

1. **Creación con Prevención de Errores (Usabilidad):**

   > _"En la app vemos una interfaz limpia basada en un grid de 8 puntos. Si toco el botón '+ Nueva' e intento guardar sin título, el sistema despliega un banner de validación que dice 'El título de la tarea es obligatorio', previniendo entradas vacías. Ahora escribo el título y una descripción, presiono Guardar y la tarea se añade al instante arriba, limpiando el formulario."_

2. **Edición:**

   > _"Al presionar el botón de editar con icono de lápiz, se abre el modal con los datos cargados. Modifico la tarea, presiono Actualizar y observamos cómo la tarjeta refleja los cambios con el indicador 'editado'."_

3. **Completado y Filtros:**

   > _"Toco el checkbox para marcar la tarea como completada. El texto se tacha visualmente y el contador de pendientes se actualiza en tiempo real. Si cambio a las pestañas 'Pendientes' o 'Completadas', la lista filtra de inmediato los elementos."_

4. **Eliminación Segura:**

   > _"Para borrar una tarea, presiono el icono de basurero. La aplicación no elimina abruptamente, sino que abre un diálogo nativo `Alert` de iOS para que el usuario confirme la acción destructiva."_

5. **Prueba de Persistencia Offline:**
   > _"Si cierro la app de Expo Go por completo y la vuelvo a abrir, confirmamos que AsyncStorage recupera todas las tareas intactas desde el almacenamiento interno."_

---

### BLOQUE 4: Conclusión y Proyección (3:00 – 3:30)

> **Qué mostrar en pantalla:** Vista general de la app o el repositorio en GitHub.

**Texto a exponer:**

> _"En conclusión, la aplicación cumple rigurosamente con los requerimientos funcionales del encargo y los 5 indicadores de la rúbrica de evaluación. La arquitectura modular y tipada en TypeScript deja el proyecto completamente preparado para conectarse a bases de datos en la nube y autenticación de usuarios en las siguientes unidades. Muchas gracias por su atención."_
