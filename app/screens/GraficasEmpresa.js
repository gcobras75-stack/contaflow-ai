/**
 * GraficasEmpresa.js — Panel de estadísticas fiscales
 *
 * Gráfica 1 — Barras: Ingresos vs Egresos (últimos 6 meses)
 * Gráfica 2 — Línea: Tendencia de ventas (últimos 6 meses)
 * Gráfica 3 — Dona: Distribución de gastos por RFC emisor (top 5)
 * Gráfica 4 — Gauge: Salud fiscal (egresos/ingresos %)
 * Gráfica 5 — Mapa de calor: Actividad de CFDIs del mes actual
 *
 * Librerías: react-native-chart-kit + react-native-svg
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, SafeAreaView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Dimensions, TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import Svg, { Path, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { supabase } from '../lib/supabase';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 32; // padding 16 cada lado

const C = {
  azul:    '#1B3A6B',
  verde:   '#00A651',
  blanco:  '#FFFFFF',
  gris:    '#F5F5F5',
  texto:   '#333333',
  amarillo:'#F59E0B',
  rojo:    '#EF4444',
  gris2:   '#6B7280',
  azulClaro: '#3B82F6',
};

const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DIAS_SEMANA = ['D','L','M','X','J','V','S'];
const PALETA_DONA = ['#3B82F6','#8B5CF6','#F59E0B','#10B981','#EF4444','#64748B'];

const fmt = (n) => Number(n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function getUltimos6Meses() {
  const meses = [];
  const hoy = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    meses.push({ año: d.getFullYear(), mes: d.getMonth(), label: MESES_CORTO[d.getMonth()] });
  }
  return meses;
}

function mesKey(año, mes) { return `${año}-${String(mes).padStart(2, '0')}`; }

// ── Gauge chart (velocímetro) con react-native-svg ────────────────────────────

function GaugeChart({ value, width }) {
  // value: 0–100  (egresos/ingresos * 100)
  const val = Math.min(Math.max(value, 0), 100);
  const r   = (width - 60) / 2;
  const cx  = width / 2;
  const cy  = width / 2 - 10;

  // Convierte progreso (0=izquierda, 1=derecha) a coordenada en el arco
  function gaugePoint(progress, radio) {
    const angle = Math.PI * (1 - progress); // π → 0
    return {
      x: cx + radio * Math.cos(angle),
      y: cy - radio * Math.sin(angle),
    };
  }

  // Genera el path de un segmento de arco entre p1 y p2 (0–1)
  function arcPath(p1, p2, radio) {
    const s = gaugePoint(p1, radio);
    const e = gaugePoint(p2, radio);
    // large-arc-flag=0 siempre (cada segmento ≤ 180°), sweep-flag=1 (horario en pantalla → arco superior)
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${radio} ${radio} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  }

  const strokeW = 18;
  const needleProgress = val / 100;
  const needleEnd = gaugePoint(needleProgress, r * 0.78);
  const needleBase1 = gaugePoint(needleProgress + 0.03, r * 0.12);
  const needleBase2 = gaugePoint(needleProgress - 0.03, r * 0.12);

  // Color del valor
  const color = val <= 40 ? C.verde : val <= 70 ? C.amarillo : C.rojo;
  const nivel = val <= 40 ? 'Salud fiscal buena' : val <= 70 ? 'Nivel de gasto moderado' : 'Gasto elevado';

  const svgH = width / 2 + 60;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={svgH}>
        {/* Fondo gris total */}
        <Path d={arcPath(0, 1, r)} stroke="#E5E7EB" strokeWidth={strokeW} fill="none" strokeLinecap="butt" />

        {/* Zonas de color */}
        <Path d={arcPath(0, 0.40, r)} stroke={C.verde}    strokeWidth={strokeW} fill="none" strokeLinecap="butt" />
        <Path d={arcPath(0.40, 0.70, r)} stroke={C.amarillo} strokeWidth={strokeW} fill="none" strokeLinecap="butt" />
        <Path d={arcPath(0.70, 1.0, r)} stroke={C.rojo}   strokeWidth={strokeW} fill="none" strokeLinecap="butt" />

        {/* Aguja */}
        <G>
          <Path
            d={`M ${needleBase1.x.toFixed(2)} ${needleBase1.y.toFixed(2)} L ${needleEnd.x.toFixed(2)} ${needleEnd.y.toFixed(2)} L ${needleBase2.x.toFixed(2)} ${needleBase2.y.toFixed(2)} Z`}
            fill={C.azul}
          />
        </G>

        {/* Pivote central */}
        <Circle cx={cx} cy={cy} r={8} fill={C.azul} />
        <Circle cx={cx} cy={cy} r={4} fill={C.blanco} />

        {/* Porcentaje */}
        <SvgText
          x={cx} y={cy + 38}
          textAnchor="middle"
          fontSize={26} fontWeight="bold"
          fill={color}
        >
          {Math.round(val)}%
        </SvgText>

        {/* Etiquetas extremos */}
        <SvgText x={cx - r - 2} y={cy + 14} textAnchor="middle" fontSize={11} fill={C.gris2}>0%</SvgText>
        <SvgText x={cx + r + 2} y={cy + 14} textAnchor="middle" fontSize={11} fill={C.gris2}>100%</SvgText>
      </Svg>

      <Text style={{ fontSize: 13, color, fontWeight: '600', marginTop: -8 }}>{nivel}</Text>
      <Text style={{ fontSize: 12, color: C.gris2, marginTop: 4, textAlign: 'center' }}>
        Tu nivel de gasto es {Math.round(val)}% de tus ingresos
      </Text>
    </View>
  );
}

// ── Calendario heatmap del mes ─────────────────────────────────────────────────

function CalendarioHeatmap({ datos, año, mes }) {
  const [seleccionado, setSeleccionado] = useState(null);

  const primerDia  = new Date(año, mes, 1).getDay();     // 0=Dom
  const diasMes    = new Date(año, mes + 1, 0).getDate();
  const celdas     = primerDia + diasMes;
  const filas      = Math.ceil(celdas / 7);

  function colorDia(count) {
    if (!count || count === 0) return '#F3F4F6';
    if (count <= 2)  return '#BFDBFE';
    if (count <= 5)  return '#60A5FA';
    return '#1D4ED8';
  }

  const hoy = new Date();
  const esHoy = (d) => año === hoy.getFullYear() && mes === hoy.getMonth() && d === hoy.getDate();

  return (
    <View>
      {/* Cabecera días de semana */}
      <View style={cal.semanaRow}>
        {DIAS_SEMANA.map(d => (
          <View key={d} style={cal.celdaHead}>
            <Text style={cal.celdaHeadTxt}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Filas del mes */}
      {Array.from({ length: filas }).map((_, fila) => (
        <View key={fila} style={cal.semanaRow}>
          {Array.from({ length: 7 }).map((_, col) => {
            const celIdx = fila * 7 + col;
            const dia    = celIdx - primerDia + 1;
            const valido = dia >= 1 && dia <= diasMes;
            const count  = valido ? (datos[dia] ?? 0) : 0;

            return (
              <TouchableWithoutFeedback
                key={col}
                onPress={() => valido && setSeleccionado(seleccionado === dia ? null : dia)}
              >
                <View style={[
                  cal.celda,
                  valido && { backgroundColor: colorDia(count) },
                  !valido && { backgroundColor: 'transparent' },
                  esHoy(dia) && cal.celdaHoy,
                  seleccionado === dia && cal.celdaSeleccionada,
                ]}>
                  {valido && (
                    <Text style={[
                      cal.celdaTxt,
                      count > 0 && { color: count >= 3 ? '#FFFFFF' : '#1E3A8A', fontWeight: '700' },
                      esHoy(dia) && { color: C.azul, fontWeight: '800' },
                    ]}>
                      {dia}
                    </Text>
                  )}
                </View>
              </TouchableWithoutFeedback>
            );
          })}
        </View>
      ))}

      {/* Tooltip día seleccionado */}
      {seleccionado !== null && (
        <View style={cal.tooltip}>
          <Ionicons name="document-text-outline" size={14} color={C.azulClaro} />
          <Text style={cal.tooltipTxt}>
            Día {seleccionado}: {datos[seleccionado] ?? 0} CFDI{(datos[seleccionado] ?? 0) !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Leyenda */}
      <View style={cal.leyenda}>
        {[
          { color: '#F3F4F6', label: 'Sin CFDIs' },
          { color: '#BFDBFE', label: '1–2' },
          { color: '#60A5FA', label: '3–5' },
          { color: '#1D4ED8', label: '6+' },
        ].map(l => (
          <View key={l.label} style={cal.leyendaItem}>
            <View style={[cal.leyendaDot, { backgroundColor: l.color, borderWidth: l.color === '#F3F4F6' ? 1 : 0, borderColor: '#E5E7EB' }]} />
            <Text style={cal.leyendaTxt}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Tarjeta contenedora de cada gráfica ───────────────────────────────────────

function GraficaCard({ titulo, subtitulo, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitulo}>{titulo}</Text>
      {subtitulo ? <Text style={styles.cardSub}>{subtitulo}</Text> : null}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

// ── Configuración base de chart-kit ──────────────────────────────────────────

const chartConfig = {
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo:   '#FFFFFF',
  decimalPlaces:          0,
  color: (opacity = 1) => `rgba(27, 58, 107, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  style: { borderRadius: 12 },
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#1B3A6B' },
  propsForBackgroundLines: { stroke: '#F3F4F6', strokeWidth: 1 },
};

const chartConfigVerde = {
  ...chartConfig,
  color: (opacity = 1) => `rgba(0, 166, 81, ${opacity})`,
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#00A651' },
};

const chartConfigRojo = {
  ...chartConfig,
  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#EF4444' },
};

// ── Pantalla principal ────────────────────────────────────────────────────────

export default function GraficasEmpresa({ onBack }) {
  const [loading, setLoading]     = useState(true);
  const [empresaId, setEmpresaId] = useState(null);
  const [empresaNombre, setEmpresaNombre] = useState('');

  // Datos procesados para cada gráfica
  const [g1Data, setG1Data] = useState(null);     // Barras: ingresos/egresos
  const [g2Data, setG2Data] = useState(null);     // Línea: tendencia
  const [g2Delta, setG2Delta] = useState(0);      // % cambio último mes
  const [g3Data, setG3Data] = useState([]);       // Dona: distribución
  const [g4Value, setG4Value] = useState(0);      // Gauge: salud
  const [g5Data, setG5Data] = useState({});       // Heatmap: {día: count}
  const [g5Meta, setG5Meta] = useState({ año: new Date().getFullYear(), mes: new Date().getMonth() });

  const cargar = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usr } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (!usr?.empresa_id) { setLoading(false); return; }
      setEmpresaId(usr.empresa_id);

      const { data: emp } = await supabase
        .from('empresas_clientes')
        .select('nombre')
        .eq('id', usr.empresa_id)
        .single();
      setEmpresaNombre(emp?.nombre ?? '');

      // Obtener CFDIs de los últimos 6 meses
      const ahora     = new Date();
      const inicio6m  = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1).toISOString();
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();

      const { data: cfdis6m } = await supabase
        .from('cfdis')
        .select('tipo, total, created_at, rfc_emisor')
        .eq('empresa_id', usr.empresa_id)
        .gte('created_at', inicio6m)
        .order('created_at');

      const todos = cfdis6m ?? [];
      const meses = getUltimos6Meses();

      // ── Gráfica 1 & 2: Agrupar por mes ─────────────────────────────────────
      const ingresosPorMes = {};
      const egresosPorMes  = {};
      meses.forEach(m => {
        const k = mesKey(m.año, m.mes);
        ingresosPorMes[k] = 0;
        egresosPorMes[k]  = 0;
      });

      todos.forEach(c => {
        const d  = new Date(c.created_at);
        const k  = mesKey(d.getFullYear(), d.getMonth());
        const v  = Number(c.total ?? 0);
        if (c.tipo === 'ingreso' && k in ingresosPorMes) ingresosPorMes[k] += v;
        if (c.tipo === 'egreso'  && k in egresosPorMes)  egresosPorMes[k]  += v;
      });

      const labels      = meses.map(m => m.label);
      const ingresosArr = meses.map(m => ingresosPorMes[mesKey(m.año, m.mes)]);
      const egresosArr  = meses.map(m => egresosPorMes[mesKey(m.año, m.mes)]);

      setG1Data({
        labels,
        ingresos: ingresosArr,
        egresos:  egresosArr,
      });

      setG2Data({
        labels,
        datasets: [{ data: ingresosArr.map(v => v === 0 ? 0 : v) }],
      });

      // Delta % entre penúltimo y último mes
      const penultimo = ingresosArr[ingresosArr.length - 2] ?? 0;
      const ultimo    = ingresosArr[ingresosArr.length - 1] ?? 0;
      if (penultimo > 0) {
        setG2Delta(Math.round(((ultimo - penultimo) / penultimo) * 100));
      }

      // ── Gráfica 3: Distribución de egresos por RFC emisor (top 5) ──────────
      const rfcMap = {};
      todos.filter(c => c.tipo === 'egreso').forEach(c => {
        const rfc = c.rfc_emisor?.trim() || 'Sin RFC';
        rfcMap[rfc] = (rfcMap[rfc] ?? 0) + Number(c.total ?? 0);
      });
      const rfcOrdenado = Object.entries(rfcMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      if (rfcOrdenado.length === 0) {
        setG3Data([{ name: 'Sin datos', population: 1, color: '#E5E7EB', legendFontColor: C.gris2, legendFontSize: 12 }]);
      } else {
        setG3Data(rfcOrdenado.map(([rfc, total], i) => ({
          name:             rfc.length > 12 ? rfc.slice(0, 12) + '…' : rfc,
          population:       Math.round(total),
          color:            PALETA_DONA[i % PALETA_DONA.length],
          legendFontColor:  C.texto,
          legendFontSize:   11,
        })));
      }

      // ── Gráfica 4: Salud fiscal ─────────────────────────────────────────────
      const totalIngMes = ingresosArr[ingresosArr.length - 1] ?? 0;
      const totalEgrMes = egresosArr[egresosArr.length - 1]  ?? 0;
      const gauge = totalIngMes > 0 ? (totalEgrMes / totalIngMes) * 100 : 0;
      setG4Value(gauge);

      // ── Gráfica 5: Heatmap mes actual ──────────────────────────────────────
      const { data: cfdisHoy } = await supabase
        .from('cfdis')
        .select('created_at')
        .eq('empresa_id', usr.empresa_id)
        .gte('created_at', inicioMes);

      const calMap = {};
      (cfdisHoy ?? []).forEach(c => {
        const dia = new Date(c.created_at).getDate();
        calMap[dia] = (calMap[dia] ?? 0) + 1;
      });
      setG5Data(calMap);
      setG5Meta({ año: ahora.getFullYear(), mes: ahora.getMonth() });

    } catch (e) {
      console.error('GraficasEmpresa error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.blanco} />
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Mis estadísticas</Text>
        </View>
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={C.azul} />
          <Text style={{ color: C.gris2, marginTop: 12, fontSize: 13 }}>Cargando estadísticas…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Datos vacíos seguros para chart-kit (no acepta arrays vacíos)
  const labelsSeguro     = g1Data?.labels   ?? ['Ene','Feb','Mar','Abr','May','Jun'];
  const ingresosSeguro   = g1Data?.ingresos ?? [0, 0, 0, 0, 0, 0];
  const egresosSeguro    = g1Data?.egresos  ?? [0, 0, 0, 0, 0, 0];
  const lineDataSeguro   = g2Data ?? { labels: labelsSeguro, datasets: [{ data: [0, 0, 0, 0, 0, 0] }] };

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.blanco} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitulo}>Mis estadísticas</Text>
          {empresaNombre ? (
            <Text style={styles.headerSub} numberOfLines={1}>{empresaNombre}</Text>
          ) : null}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* ── GRÁFICA 1 — Barras: Ingresos vs Egresos ──────── */}
        <GraficaCard
          titulo="Ingresos vs Egresos"
          subtitulo="Últimos 6 meses"
        >
          {/* Dos barras separadas con leyenda */}
          <View style={styles.leyendaRow}>
            <View style={styles.leyendaItem}>
              <View style={[styles.leyendaDot, { backgroundColor: C.verde }]} />
              <Text style={styles.leyendaTxt}>Ingresos</Text>
            </View>
            <View style={styles.leyendaItem}>
              <View style={[styles.leyendaDot, { backgroundColor: C.rojo }]} />
              <Text style={styles.leyendaTxt}>Egresos</Text>
            </View>
          </View>

          <BarChart
            data={{ labels: labelsSeguro, datasets: [{ data: ingresosSeguro }] }}
            width={CHART_W - 32}
            height={160}
            chartConfig={chartConfigVerde}
            style={{ borderRadius: 8 }}
            withInnerLines={false}
            showValuesOnTopOfBars={false}
            fromZero
            yAxisLabel="$"
            yAxisSuffix=""
          />

          <Text style={styles.chartSubLabel}>Egresos</Text>
          <BarChart
            data={{ labels: labelsSeguro, datasets: [{ data: egresosSeguro }] }}
            width={CHART_W - 32}
            height={160}
            chartConfig={chartConfigRojo}
            style={{ borderRadius: 8 }}
            withInnerLines={false}
            showValuesOnTopOfBars={false}
            fromZero
            yAxisLabel="$"
            yAxisSuffix=""
          />
        </GraficaCard>

        {/* ── GRÁFICA 2 — Línea: Tendencia de ventas ───────── */}
        <GraficaCard
          titulo="Tendencia de ventas"
          subtitulo="Ingresos últimos 6 meses"
        >
          {g2Delta !== 0 && (
            <View style={[styles.deltaBadge, { backgroundColor: g2Delta >= 0 ? '#D1FAE5' : '#FEE2E2' }]}>
              <Ionicons
                name={g2Delta >= 0 ? 'trending-up' : 'trending-down'}
                size={14}
                color={g2Delta >= 0 ? C.verde : C.rojo}
              />
              <Text style={[styles.deltaTxt, { color: g2Delta >= 0 ? '#065F46' : '#991B1B' }]}>
                {g2Delta >= 0 ? '+' : ''}{g2Delta}% vs mes anterior
              </Text>
            </View>
          )}
          <LineChart
            data={lineDataSeguro}
            width={CHART_W - 32}
            height={180}
            chartConfig={chartConfigVerde}
            bezier
            style={{ borderRadius: 8 }}
            withInnerLines={false}
            withShadow={false}
            fromZero
            yAxisLabel="$"
            yAxisSuffix=""
          />
        </GraficaCard>

        {/* ── GRÁFICA 3 — Dona: Distribución de gastos ─────── */}
        <GraficaCard
          titulo="Distribución de gastos"
          subtitulo="Por RFC emisor (top 5)"
        >
          <View style={{ position: 'relative', alignItems: 'center' }}>
            <PieChart
              data={g3Data.length > 0 ? g3Data : [{ name: 'Sin datos', population: 1, color: '#E5E7EB', legendFontColor: C.gris2, legendFontSize: 12 }]}
              width={CHART_W - 32}
              height={180}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="30"
              center={[10, 0]}
              absolute
              hasLegend
            />
          </View>
          {g3Data.length > 0 && g3Data[0].name !== 'Sin datos' && (
            <Text style={styles.donaTotal}>
              Total egresos: {fmt(g3Data.reduce((a, d) => a + d.population, 0))}
            </Text>
          )}
        </GraficaCard>

        {/* ── GRÁFICA 4 — Gauge: Salud fiscal ──────────────── */}
        <GraficaCard
          titulo="Salud fiscal"
          subtitulo="Ratio egresos / ingresos del último mes"
        >
          <GaugeChart value={g4Value} width={CHART_W - 32} />
          <View style={styles.gaugeZonas}>
            {[
              { color: C.verde,    label: '0–40%  Riesgo bajo' },
              { color: C.amarillo, label: '40–70%  Atención' },
              { color: C.rojo,     label: '70–100%  Riesgo alto' },
            ].map(z => (
              <View key={z.label} style={styles.gaugeZonaItem}>
                <View style={[styles.gaugeZonaDot, { backgroundColor: z.color }]} />
                <Text style={styles.gaugeZonaTxt}>{z.label}</Text>
              </View>
            ))}
          </View>
        </GraficaCard>

        {/* ── GRÁFICA 5 — Mapa de calor mensual ────────────── */}
        <GraficaCard
          titulo="Actividad de CFDIs"
          subtitulo={`${MESES_CORTO[g5Meta.mes]} ${g5Meta.año} — toca un día para ver el detalle`}
        >
          <CalendarioHeatmap
            datos={g5Data}
            año={g5Meta.año}
            mes={g5Meta.mes}
          />
        </GraficaCard>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.gris },
  centrado:{ flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:  { flex: 1 },
  content: { padding: 16, gap: 16 },

  header: {
    backgroundColor: C.azul,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn:     { padding: 4 },
  headerTitulo:{ color: C.blanco, fontSize: 18, fontWeight: '700', flex: 1 },
  headerSub:   { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 1 },

  // Tarjeta
  card: {
    backgroundColor: C.blanco, borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTitulo: { fontSize: 15, fontWeight: '700', color: C.texto },
  cardSub:    { fontSize: 11, color: C.gris2, marginTop: 2, marginBottom: 4 },
  cardBody:   { marginTop: 8 },

  // Leyenda barras
  leyendaRow: { flexDirection: 'row', gap: 16, marginBottom: 6 },
  leyendaItem:{ flexDirection: 'row', alignItems: 'center', gap: 5 },
  leyendaDot: { width: 10, height: 10, borderRadius: 5 },
  leyendaTxt: { fontSize: 12, color: C.gris2 },
  chartSubLabel: { fontSize: 12, fontWeight: '600', color: C.gris2, marginTop: 8, marginBottom: 2 },

  // Delta badge tendencia
  deltaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 8 },
  deltaTxt:   { fontSize: 12, fontWeight: '700' },

  // Dona
  donaTotal:  { fontSize: 12, color: C.gris2, textAlign: 'center', marginTop: 4 },

  // Gauge zonas
  gaugeZonas:    { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' },
  gaugeZonaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gaugeZonaDot:  { width: 8, height: 8, borderRadius: 4 },
  gaugeZonaTxt:  { fontSize: 11, color: C.gris2 },
});

// Estilos del calendario
const cal = StyleSheet.create({
  semanaRow:       { flexDirection: 'row', gap: 4, marginBottom: 4 },
  celdaHead:       { flex: 1, alignItems: 'center', paddingVertical: 4 },
  celdaHeadTxt:    { fontSize: 11, fontWeight: '700', color: C.gris2 },
  celda:           { flex: 1, aspectRatio: 1, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  celdaTxt:        { fontSize: 12, color: C.texto },
  celdaHoy:        { borderWidth: 2, borderColor: C.azul },
  celdaSeleccionada: { borderWidth: 2, borderColor: C.amarillo },
  tooltip:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', borderRadius: 8, padding: 8, marginTop: 8, borderWidth: 1, borderColor: '#BFDBFE' },
  tooltipTxt:      { fontSize: 13, color: '#1E3A8A', fontWeight: '600' },
  leyenda:         { flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' },
  leyendaItem:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  leyendaDot:      { width: 12, height: 12, borderRadius: 3 },
  leyendaTxt:      { fontSize: 10, color: C.gris2 },
});
