# Reporte de incidencia por bloque · Finca UB

Sitio estático. No necesita servidor ni compilación: son archivos planos.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | La página: filtros y pestañas Semana, Histórico y Mortalidad |
| `ub.js` | Metas, cálculos y gráficas del informe |
| `dash.js` | Carga el CSV y coordina cálculos y dibujos |
| `d3.min.js` | Librería de gráficas (incluida, sin CDN) |
| `datos.csv` | Incidencia por cultivo, semana, bloque y blanco (semanas 36 a 47 de 2026) |
| `mortalidad.csv` | Mortalidad de clavel por bloque y variedad, lectura mensual (septiembre y octubre de 2026) |
| `base.css` | Tipografía y colores |
| `vercel.json` | Configuración mínima de despliegue |

## Publicar en Vercel

Con la CLI, desde esta carpeta:

    npm i -g vercel
    vercel login
    vercel --prod

Vercel lo detecta como sitio estático. No hay que elegir framework ni comando de build.

Desde GitHub: sube esta carpeta a un repositorio, entra a vercel.com/new, importa el repositorio y despliega sin cambiar ninguna opción.

## Actualizar los datos

Reemplaza `datos.csv` conservando las columnas `cultivo,anio,semana,bloque,blanco,incidencia_pct` y vuelve a desplegar. Las semanas y los bloques de los menús salen del propio archivo.

## Cómo se calcula

El general finca de cada semana es el promedio simple de la incidencia de los bloques monitoreados de ese cultivo. Un blanco que WiPest no reporta en una semana cuenta como 0, solo en los bloques que sí se monitorearon.
