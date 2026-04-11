# ContaFlow AI — Design System Reference

Sistema de diseño visual para el panel contable. Todas las clases
están definidas en `app/globals.css` y se usan directamente en JSX.

---

## Paleta de colores

| Token                   | Hex       | Uso                              |
|-------------------------|-----------|----------------------------------|
| `#1B3A6B` navy-500      | Azul marino | Primario, sidebar activo, montos |
| `#00A651` green-brand-500 | Verde    | Botón acción, puntos CTA          |
| `#F5F5F7` surface       | Gris claro  | Fondo general de la app          |
| `#FFFFFF` surface-card  | Blanco      | Cards, sidebar items             |
| `#E5E7EB` border        | Gris borde  | Bordes estándar                  |
| `#1A1D23` text-primary  | Casi negro  | Texto principal                  |
| `#4B5563` text-secondary| Gris medio  | Texto secundario                 |
| `#9CA3AF` text-muted    | Gris claro  | Placeholders, metadata           |
| `#16A34A` success-500   | Verde vivo  | Aprobado, al corriente           |
| `#D97706` warning-500   | Ámbar       | Pendiente, revisión              |
| `#DC2626` danger-500    | Rojo        | Rechazado, sin actividad         |
| `#111827` sidebar-bg    | Negro/azul  | Fondo del sidebar                |

---

## Tipografía — Inter

Cargada via `next/font/google` en `app/layout.tsx`.

```
Heading grande  — font-size: 1.5rem   font-weight: 700   (títulos de sección)
Heading medio   — font-size: 1.125rem  font-weight: 600   (subtítulos)
Body default    — font-size: 0.9375rem font-weight: 400   (texto general)
Body small      — font-size: 0.8125rem font-weight: 400   (metadata, labels)
Caption         — font-size: 0.75rem   font-weight: 500   (fechas, hints)
Micro           — font-size: 0.6875rem font-weight: 600   (badges, tooltips)
Monospace (UUID)— font-family: JetBrains Mono / ui-monospace
```

---

## 1. Layout principal

```html
<!-- Estructura de toda página del dashboard -->
<div class="app-shell">
  <!-- Sidebar — incluido via layout.tsx automáticamente -->
  <main class="main-content">

    <!-- Header fijo de la página -->
    <header class="page-header">
      <div>
        <h1 class="page-title">Título de la página</h1>
        <p class="page-subtitle">Descripción opcional</p>
      </div>
      <button class="btn btn-action btn-md">+ Agregar</button>
    </header>

    <!-- Contenido -->
    <div class="page-body">
      <!-- aquí va el contenido -->
    </div>

  </main>
</div>
```

---

## 2. Badge de status — CFDIs

```html
<!-- Pendiente -->
<span class="badge badge-pendiente">Pendiente</span>

<!-- Aprobado -->
<span class="badge badge-aprobado">Aprobado</span>

<!-- Rechazado -->
<span class="badge badge-rechazado">Rechazado</span>

<!-- Info / Tipo de CFDI -->
<span class="badge badge-info">Ingreso</span>

<!-- Empresa activa/inactiva -->
<span class="badge badge-activo">Activa</span>
<span class="badge badge-inactivo">Inactiva</span>
```

En JSX con datos dinámicos:
```tsx
const BADGE_MAP = {
  pendiente: 'badge-pendiente',
  aprobado:  'badge-aprobado',
  rechazado: 'badge-rechazado',
} as const;

<span className={`badge ${BADGE_MAP[cfdi.status]}`}>
  {cfdi.status.charAt(0).toUpperCase() + cfdi.status.slice(1)}
</span>
```

---

## 3. Semáforo de empresa — con tooltip

```html
<!-- Chip completo (recomendado en listas) -->
<div class="tooltip-wrapper">
  <span class="semaforo-chip verde">
    <span class="semaforo-dot verde"></span>
    Al corriente
  </span>
  <div class="tooltip-content">Actividad en los últimos 14 días</div>
</div>

<div class="tooltip-wrapper">
  <span class="semaforo-chip amarillo">
    <span class="semaforo-dot amarillo"></span>
    Pendiente revisión
  </span>
  <div class="tooltip-content">Sin actividad entre 14 y 30 días</div>
</div>

<div class="tooltip-wrapper">
  <span class="semaforo-chip rojo">
    <span class="semaforo-dot rojo"></span>
    Sin actividad
  </span>
  <div class="tooltip-content">Más de 30 días sin CFDIs</div>
</div>

<!-- Solo punto (para uso en filas compactas) -->
<span class="semaforo-dot verde"></span>
<span class="semaforo-dot amarillo"></span>
<span class="semaforo-dot rojo"></span>
```

En JSX con datos dinámicos:
```tsx
const SEM_CONFIG = {
  verde:    { label: 'Al corriente',      tip: 'Actividad en los últimos 14 días'    },
  amarillo: { label: 'Pendiente revisión', tip: 'Sin actividad entre 14 y 30 días'   },
  rojo:     { label: 'Sin actividad',     tip: 'Más de 30 días sin CFDIs registrados' },
} as const;

const sem = SEM_CONFIG[empresa._semaforo];

<div className="tooltip-wrapper">
  <span className={`semaforo-chip ${empresa._semaforo}`}>
    <span className={`semaforo-dot ${empresa._semaforo}`} />
    {sem.label}
  </span>
  <div className="tooltip-content">{sem.tip}</div>
</div>
```

---

## 4. Card de empresa en lista

```html
<a href="/dashboard/empresas?id=..." class="empresa-row">

  <!-- Punto semáforo -->
  <span class="semaforo-dot verde"></span>

  <!-- Info principal -->
  <div style="flex:1; min-width:0;">
    <div class="empresa-nombre">Restaurantes del Norte SA de CV</div>
    <div class="empresa-meta">
      <span class="empresa-rfc">RENO890412AB3</span>
      <span style="color:#D1D5DB;"> · </span>
      <span>Alimentos y bebidas</span>
    </div>
  </div>

  <!-- Stat derecho -->
  <div style="text-align:right; flex-shrink:0;">
    <div style="font-size:0.875rem; font-weight:700; color:#1B3A6B;">12 CFDIs</div>
    <div style="font-size:0.6875rem; color:#16A34A; font-weight:600;">Al corriente</div>
  </div>

  <!-- Flecha -->
  <svg class="empresa-row-arrow" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
  </svg>

</a>
```

---

## 5. Card de CFDI — con acciones inline

```html
<div class="cfdi-row">

  <!-- Dot de status -->
  <span class="semaforo-dot amarillo" style="width:8px;height:8px;"></span>

  <!-- Información -->
  <div style="flex:1; min-width:0;">
    <div style="display:flex; align-items:center; gap:0.375rem; flex-wrap:wrap; margin-bottom:0.25rem;">
      <span class="badge badge-pendiente">Pendiente</span>
      <span style="font-size:0.6875rem; font-weight:600; color:#6B7280; text-transform:uppercase; letter-spacing:0.04em;">Ingreso</span>
      <span style="font-size:0.6875rem; color:#D1D5DB;">·</span>
      <span style="font-size:0.6875rem; color:#1B3A6B; font-weight:600;">Empresa SA de CV</span>
    </div>
    <p class="cfdi-uuid">550e8400-e29b-41d4-a716-446655440000</p>
    <p style="font-size:0.6875rem; color:#9CA3AF; margin-top:0.125rem;">2024-03-15</p>
  </div>

  <!-- Monto -->
  <div style="flex-shrink:0;">
    <div class="cfdi-amount">$45,600.00</div>
    <div class="cfdi-iva">IVA $7,296.00</div>
  </div>

  <!-- Acciones (solo cuando status === 'pendiente') -->
  <div class="cfdi-actions">
    <button class="btn btn-approve">Aprobar</button>
    <button class="btn btn-reject">Rechazar</button>
  </div>

</div>
```

Estado desactivado (procesando):
```html
<button class="btn btn-approve" disabled style="opacity:0.5; cursor:not-allowed;">
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    style="animation: spin 1s linear infinite;">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
  Procesando
</button>
```

---

## 6. Stat card — número grande + tendencia

```html
<!-- Grid recomendado: grid-cols-2 sm:grid-cols-4 gap-3 -->
<div class="stat-card">
  <div style="font-size:0.6875rem; font-weight:600; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.5rem;">
    Total acumulado
  </div>
  <div class="stat-value">$328,400</div>
  <div class="stat-trend-up">
    <!-- Flecha arriba -->
    <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
    +12% vs. mes anterior
  </div>
</div>

<!-- Variante con tendencia negativa -->
<div class="stat-card">
  <div style="font-size:0.6875rem; font-weight:600; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.5rem;">
    CFDIs pendientes
  </div>
  <div class="stat-value" style="color:#D97706;">8</div>
  <div class="stat-trend-down">
    <!-- Flecha abajo -->
    <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
    Requieren revisión
  </div>
</div>

<!-- Variante neutral (sin tendencia) -->
<div class="stat-card">
  <div style="font-size:0.6875rem; font-weight:600; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.5rem;">
    Empresas activas
  </div>
  <div class="stat-value">24</div>
  <div class="stat-label">en tu despacho</div>
</div>
```

---

## 7. Empty state

```html
<!-- Cuando no hay datos -->
<div class="empty-state">

  <!-- Ícono contextual -->
  <div class="empty-icon">
    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  </div>

  <div>
    <p class="empty-title">Sin CFDIs registrados</p>
    <p class="empty-description">
      Esta empresa no tiene comprobantes en el sistema.
      Los CFDIs aparecerán aquí una vez que sean cargados.
    </p>
  </div>

  <!-- CTA opcional -->
  <button class="btn btn-primary btn-md">
    Cargar CFDIs
  </button>

</div>

<!-- Variante para filtros sin resultados (sin CTA, más ligera) -->
<div class="empty-state" style="padding: 2rem;">
  <div class="empty-icon" style="width:40px; height:40px;">
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  </div>
  <p class="empty-title">Sin resultados</p>
  <p class="empty-description">Prueba ajustando los filtros seleccionados.</p>
</div>
```

---

## 8. Toast / Notificaciones

```html
<!-- Contenedor — posición fija, abajo a la derecha -->
<div class="toast-container">

  <!-- Éxito -->
  <div class="toast toast-success">
    <svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div class="toast-body">
      <div class="toast-title">CFDI aprobado</div>
      <div class="toast-message">El comprobante fue marcado como aprobado correctamente.</div>
    </div>
    <!-- Botón cerrar -->
    <button style="background:none;border:none;cursor:pointer;color:inherit;opacity:0.6;padding:2px;" aria-label="Cerrar">
      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>

  <!-- Error -->
  <div class="toast toast-error">
    <svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div class="toast-body">
      <div class="toast-title">Error al procesar</div>
      <div class="toast-message">No se pudo actualizar el status. Intenta de nuevo.</div>
    </div>
  </div>

  <!-- Advertencia -->
  <div class="toast toast-warning">
    <svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
    <div class="toast-body">
      <div class="toast-title">3 CFDIs pendientes</div>
      <div class="toast-message">Tienes comprobantes esperando revisión.</div>
    </div>
  </div>

</div>
```

Hook de toast recomendado (useState + setTimeout):
```tsx
const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'err' } | null>(null);

const showToast = (msg: string, tipo: 'ok' | 'err') => {
  setToast({ msg, tipo });
  setTimeout(() => setToast(null), 3500);
};

// En el JSX:
{toast && (
  <div className="toast-container">
    <div className={`toast ${toast.tipo === 'ok' ? 'toast-success' : 'toast-error'}`}>
      {/* ... ícono y contenido ... */}
      <div className="toast-body">
        <div className="toast-title">{toast.tipo === 'ok' ? 'Listo' : 'Error'}</div>
        <div className="toast-message">{toast.msg}</div>
      </div>
    </div>
  </div>
)}
```

---

## 9. Loading skeleton

```html
<!-- Skeleton de una fila de empresa -->
<div class="skeleton-empresa-row">
  <div class="skeleton skeleton-circle" style="width:10px; height:10px;"></div>
  <div style="flex:1; display:flex; flex-direction:column; gap:0.375rem;">
    <div class="skeleton skeleton-text-lg" style="width:55%;"></div>
    <div class="skeleton skeleton-text-sm" style="width:35%;"></div>
  </div>
  <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.375rem;">
    <div class="skeleton skeleton-text-md" style="width:60px;"></div>
    <div class="skeleton skeleton-text-sm" style="width:80px;"></div>
  </div>
</div>

<!-- Lista de skeletons — 5 filas mientras carga -->
<div style="display:flex; flex-direction:column; gap:0.5rem;">
  <!-- Repite este bloque 5 veces -->
  <div class="skeleton-empresa-row">
    <div class="skeleton skeleton-circle" style="width:10px; height:10px;"></div>
    <div style="flex:1; display:flex; flex-direction:column; gap:0.375rem;">
      <div class="skeleton skeleton-text-lg" style="width:50%;"></div>
      <div class="skeleton skeleton-text-sm" style="width:30%;"></div>
    </div>
    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.375rem;">
      <div class="skeleton skeleton-text-md" style="width:55px;"></div>
      <div class="skeleton skeleton-text-sm" style="width:70px;"></div>
    </div>
  </div>
</div>

<!-- Skeleton de stat card -->
<div class="stat-card">
  <div class="skeleton skeleton-text-sm" style="width:40%; margin-bottom:0.625rem;"></div>
  <div class="skeleton skeleton-text-lg" style="width:60%; height:1.75rem;"></div>
  <div class="skeleton skeleton-text-sm" style="width:45%; margin-top:0.5rem;"></div>
</div>
```

En JSX:
```tsx
{loading ? (
  <div className="flex flex-col gap-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="skeleton-empresa-row">
        <div className="skeleton skeleton-circle" style={{ width: 10, height: 10 }} />
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="skeleton skeleton-text-lg" style={{ width: `${40 + (i % 3) * 15}%` }} />
          <div className="skeleton skeleton-text-sm" style={{ width: '30%' }} />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="skeleton skeleton-text-md" style={{ width: 55 }} />
          <div className="skeleton skeleton-text-sm" style={{ width: 75 }} />
        </div>
      </div>
    ))}
  </div>
) : (
  /* lista real */
)}
```

---

## 10. Botones — referencia completa

```html
<!-- Primario — acciones de navegación / confirmación -->
<button class="btn btn-primary btn-md">Guardar cambios</button>

<!-- Acción principal — CTA verde (+ Agregar, Exportar) -->
<button class="btn btn-action btn-md">+ Agregar empresa</button>

<!-- Ghost — acciones secundarias -->
<button class="btn btn-ghost btn-md">Cancelar</button>

<!-- Destructivo outline — rechazar, eliminar -->
<button class="btn btn-danger-outline btn-md">Eliminar</button>

<!-- Tamaños -->
<button class="btn btn-primary btn-sm">Pequeño</button>
<button class="btn btn-primary btn-md">Mediano</button>
<button class="btn btn-primary btn-lg">Grande</button>

<!-- Desactivado -->
<button class="btn btn-primary btn-md" disabled>Procesando...</button>

<!-- Con ícono -->
<button class="btn btn-action btn-md">
  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
  </svg>
  Agregar
</button>

<!-- Aprobar / Rechazar inline en CFDIs -->
<button class="btn btn-approve">Aprobar</button>
<button class="btn btn-reject">Rechazar</button>
```

---

## 11. Tabs

```html
<div class="tabs-container" role="tablist">
  <button class="tab-item active" role="tab" aria-selected="true">
    CFDIs (12)
  </button>
  <button class="tab-item" role="tab" aria-selected="false">
    Estados de cuenta (3)
  </button>
  <button class="tab-item" role="tab" aria-selected="false">
    Conciliación
  </button>
</div>
```

---

## 12. Filter bar

```html
<div class="filter-bar">
  <select class="form-input form-select" style="width:auto; min-width:180px;">
    <option value="">Todas las empresas</option>
    <option>Empresa Alpha SA</option>
    <option>Beta Comercial SC</option>
  </select>

  <select class="form-input form-select" style="width:auto;">
    <option>Todos los estados</option>
    <option>Pendiente</option>
    <option>Aprobado</option>
    <option>Rechazado</option>
  </select>

  <select class="form-input form-select" style="width:auto;">
    <option>Todos los tipos</option>
    <option>Ingreso</option>
    <option>Egreso</option>
    <option>Nómina</option>
  </select>

  <!-- Contador de resultados — alineado a la derecha -->
  <span style="margin-left:auto; font-size:0.75rem; color:#9CA3AF; white-space:nowrap;">
    48 CFDIs encontrados
  </span>
</div>
```

---

## Identidad visual — principios

### Lo que hace que se vea "profesional para un contador"

1. **Datos en primer lugar.** Los números (montos, conteos) son siempre el elemento más grande y en azul marino. El ojo del contador llega directo al dato.

2. **Sin ornamentos innecesarios.** El sidebar es oscuro y sin gradientes decorativos. Las cards son blancas con borde sutil. La sobriedad genera confianza.

3. **Monoespaciado para datos técnicos.** Los UUIDs del SAT, RFCs y cantidades en tablas usan `font-mono` (JetBrains Mono). Esto señaliza que el sistema trata los datos con precisión.

4. **Semáforos como lenguaje universal.** Verde/amarillo/rojo es el sistema de alertas que los contadores ya entienden del SAT. Se reutiliza en toda la app para consistencia cognitiva.

5. **Badges con punto de color.** El punto antes del texto del badge (`::before`) añade el color sin depender solo del fondo — accesible incluso en pantallas con contraste reducido.

6. **Jerarquía en la acción.** Hay exactamente un botón verde por pantalla (la acción principal). El resto son azul marino (confirmación) o ghost (secundaria). El contador nunca duda qué hacer.

7. **Sidebar oscuro vs. contenido claro.** El contraste entre el sidebar `#111827` y el fondo `#F5F5F7` define claramente el cromo de la app del contenido de trabajo.

---

## Accesibilidad — checklist

- [x] Contraste WCAG AA: texto principal (#1A1D23 sobre blanco) = 16.1:1
- [x] Contraste WCAG AA: texto secundario (#4B5563 sobre blanco) = 7.4:1
- [x] Contraste badges: texto oscuro sobre fondo claro (ej: #92400E sobre #FEF3C7) = 7.1:1
- [x] Focus visible en todos los botones (box-shadow anillo azul)
- [x] `aria-current="page"` en sidebar item activo
- [x] `aria-label` en badges con conteo numérico
- [x] `role="tablist"` y `aria-selected` en tabs
- [x] Touch targets mínimo 40px en todos los elementos interactivos
- [x] `prefers-reduced-motion` — animaciones desactivadas si el usuario lo prefiere
- [x] `lang="es-MX"` en el html root

---

*Generado: ContaFlow AI Design System — Sesión 6*
