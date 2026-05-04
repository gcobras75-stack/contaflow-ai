import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { supabase } from '../lib/supabase';

const C = {
  azul: '#1B3A6B',
  verde: '#00A651',
  blanco: '#FFFFFF',
  gris: '#F5F5F5',
  texto: '#333333',
  amarillo: '#F59E0B',
  rojo: '#EF4444',
  morado: '#7C3AED',
  gris2: '#6B7280',
};

const MESES_LABEL = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const fmt = (n) =>
  Number(n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const fmtCompact = (n) => {
  const v = Number(n ?? 0);
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

function construirResumenMensual(cfdis) {
  const hoy = new Date();
  const meses = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    meses.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: MESES_LABEL[d.getMonth()],
      ingresos: 0,
      egresos: 0,
      iva: 0,
      count: 0,
    });
  }

  cfdis.forEach(c => {
    const fecha = c.fecha_emision ?? c.created_at?.slice(0, 10);
    if (!fecha) return;
    const key = fecha.slice(0, 7);
    const mes = meses.find(m => m.key === key);
    if (!mes) return;
    mes.count++;
    mes.iva += Number(c.iva ?? 0);
    if (c.tipo === 'ingreso') mes.ingresos += Number(c.total ?? 0);
    else if (c.tipo === 'egreso') mes.egresos += Number(c.total ?? 0);
  });

  return meses;
}

/**
 * Agrupa CFDIs por contraparte (emisor o receptor) y devuelve top 5.
 * @param {Array} cfdis - lista de CFDIs
 * @param {'ingreso'|'egreso'} tipo - 'ingreso' = top clientes (rfc_receptor),
 *                                    'egreso'  = top proveedores (rfc_emisor)
 */
function top5PorContraparte(cfdis, tipo) {
  const mapa = new Map();
  for (const c of cfdis) {
    if (c.tipo !== tipo) continue;
    const rfc = tipo === 'ingreso' ? c.rfc_receptor : c.rfc_emisor;
    if (!rfc) continue;
    const prev = mapa.get(rfc) ?? { rfc, total: 0, count: 0 };
    prev.total += Number(c.total ?? 0);
    prev.count += 1;
    mapa.set(rfc, prev);
  }
  return Array.from(mapa.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundColor: '#FFFFFF',
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(27, 58, 107, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  style: { borderRadius: 12 },
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#1B3A6B' },
  propsForBackgroundLines: { stroke: '#E5E7EB', strokeDasharray: '0' },
};

export default function Reportes({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rol, setRol] = useState(null);

  // Selector de empresa (solo para rol contador)
  const [empresas, setEmpresas] = useState([]);
  const [empresaSel, setEmpresaSel] = useState(null); // null = todas las del despacho

  // Datos del reporte
  const [resumen, setResumen] = useState([]);
  const [totales, setTotales] = useState({ ingresos: 0, egresos: 0, iva: 0, count: 0 });
  const [topClientes, setTopClientes] = useState([]);
  const [topProveedores, setTopProveedores] = useState([]);

  // Carga inicial del usuario + empresas (si es contador)
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usr } = await supabase
        .from('usuarios')
        .select('rol, empresa_id, despacho_id')
        .eq('id', user.id)
        .single();

      setRol(usr?.rol ?? null);

      if (usr?.rol === 'contador' && usr?.despacho_id) {
        const { data } = await supabase
          .from('empresas_clientes')
          .select('id, nombre, rfc')
          .eq('despacho_id', usr.despacho_id)
          .eq('activa', true)
          .order('nombre');
        setEmpresas(data ?? []);
      } else if (usr?.rol === 'empresa' && usr?.empresa_id) {
        setEmpresaSel(usr.empresa_id);
      }
    }
    init();
  }, []);

  const cargarDatos = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usr } = await supabase
        .from('usuarios')
        .select('rol, empresa_id, despacho_id')
        .eq('id', user.id)
        .single();

      if (!usr) return;

      const inicioRango = new Date();
      inicioRango.setMonth(inicioRango.getMonth() - 5);
      inicioRango.setDate(1);

      let query = supabase
        .from('cfdis')
        .select('tipo, total, iva, subtotal, fecha_emision, created_at, rfc_emisor, rfc_receptor, empresa_id, status')
        .gte('created_at', inicioRango.toISOString());

      if (usr.rol === 'empresa' && usr.empresa_id) {
        query = query.eq('empresa_id', usr.empresa_id);
      } else if (usr.rol === 'contador' && usr.despacho_id) {
        if (empresaSel) {
          query = query.eq('empresa_id', empresaSel);
        } else {
          // Sin empresa seleccionada → agregar todas las del despacho
          const ids = empresas.map(e => e.id);
          if (ids.length > 0) {
            query = query.in('empresa_id', ids);
          } else {
            // No hay empresas todavía (carga inicial aún no terminó)
            setResumen(construirResumenMensual([]));
            setTotales({ ingresos: 0, egresos: 0, iva: 0, count: 0 });
            setTopClientes([]);
            setTopProveedores([]);
            setLoading(false);
            setRefreshing(false);
            return;
          }
        }
      }

      const { data: cfdis } = await query;
      const datos = cfdis ?? [];

      const meses = construirResumenMensual(datos);
      const tot = datos.reduce((acc, c) => {
        acc.count++;
        acc.iva += Number(c.iva ?? 0);
        if (c.tipo === 'ingreso') acc.ingresos += Number(c.total ?? 0);
        else if (c.tipo === 'egreso') acc.egresos += Number(c.total ?? 0);
        return acc;
      }, { ingresos: 0, egresos: 0, iva: 0, count: 0 });

      setResumen(meses);
      setTotales(tot);
      setTopClientes(top5PorContraparte(datos, 'ingreso'));
      setTopProveedores(top5PorContraparte(datos, 'egreso'));
    } catch (e) {
      console.error('Error cargando reportes:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [empresaSel, empresas]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);
  const onRefresh = () => { setRefreshing(true); cargarDatos(); };

  const balance = totales.ingresos - totales.egresos;
  const empresaActual = empresas.find(e => e.id === empresaSel);

  // Data para LineChart
  const chartData = {
    labels: resumen.map(m => m.label),
    datasets: [
      {
        data: resumen.map(m => m.ingresos),
        color: () => C.verde,
        strokeWidth: 2,
      },
      {
        data: resumen.map(m => m.egresos),
        color: () => C.rojo,
        strokeWidth: 2,
      },
    ],
    legend: ['Ingresos', 'Egresos'],
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={C.blanco} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Reportes</Text>
        </View>
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={C.azul} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.blanco} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Reportes</Text>
        <Text style={styles.headerSub}>6 meses</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.azul} />}
      >
        {/* Selector de empresa para contador */}
        {rol === 'contador' && empresas.length > 0 && (
          <View style={styles.selectorBox}>
            <Text style={styles.selectorLbl}>Cliente</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <TouchableOpacity
                onPress={() => setEmpresaSel(null)}
                style={[styles.chip, empresaSel === null && styles.chipActive]}
              >
                <Text style={[styles.chipTxt, empresaSel === null && styles.chipTxtActive]}>Todos</Text>
              </TouchableOpacity>
              {empresas.map(e => (
                <TouchableOpacity
                  key={e.id}
                  onPress={() => setEmpresaSel(e.id)}
                  style={[styles.chip, empresaSel === e.id && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipTxt, empresaSel === e.id && styles.chipTxtActive]}
                    numberOfLines={1}
                  >
                    {e.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {empresaActual && (
              <Text style={styles.selectorRfc}>{empresaActual.rfc}</Text>
            )}
          </View>
        )}

        {/* Tarjetas resumen */}
        <View style={styles.grid}>
          <TarjetaStat icon="trending-up-outline" label="Ingresos" valor={fmtCompact(totales.ingresos)} color={C.verde} />
          <TarjetaStat icon="trending-down-outline" label="Egresos" valor={fmtCompact(totales.egresos)} color={C.rojo} />
          <TarjetaStat icon="receipt-outline" label="IVA" valor={fmtCompact(totales.iva)} color={C.morado} />
          <TarjetaStat icon="document-text-outline" label="CFDIs" valor={String(totales.count)} color={C.azul} />
        </View>

        {/* Balance */}
        <View style={[styles.balanceBox, { borderLeftColor: balance >= 0 ? C.verde : C.rojo }]}>
          <Text style={styles.balanceLbl}>Balance neto (6 meses)</Text>
          <Text style={[styles.balanceVal, { color: balance >= 0 ? C.verde : C.rojo }]}>
            {balance >= 0 ? '+' : ''}{fmt(balance)}
          </Text>
        </View>

        {/* Line chart de ingresos vs egresos */}
        <Text style={styles.seccionTitulo}>Actividad mensual</Text>
        {totales.count === 0 ? (
          <View style={styles.sinDatos}>
            <Ionicons name="bar-chart-outline" size={40} color="#D1D5DB" />
            <Text style={styles.sinDatosTxt}>Sin CFDIs en los últimos 6 meses</Text>
          </View>
        ) : (
          <View style={styles.chartCard}>
            <LineChart
              data={chartData}
              width={screenWidth - 64}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={{ borderRadius: 12 }}
              yAxisLabel="$"
              yAxisInterval={1}
              formatYLabel={(y) => {
                const n = Number(y);
                if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
                if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
                return String(n);
              }}
            />
          </View>
        )}

        {/* Top 5 clientes */}
        <Text style={styles.seccionTitulo}>Top 5 clientes (por ingresos)</Text>
        {topClientes.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTxt}>Sin ingresos registrados</Text>
          </View>
        ) : (
          <View style={styles.topCard}>
            {topClientes.map((c, idx) => (
              <View
                key={c.rfc}
                style={[styles.topRow, idx < topClientes.length - 1 && styles.topDivider]}
              >
                <View style={[styles.topRank, { backgroundColor: '#E8F7EF' }]}>
                  <Text style={[styles.topRankTxt, { color: C.verde }]}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.topRfc}>{c.rfc}</Text>
                  <Text style={styles.topCount}>{c.count} factura{c.count !== 1 ? 's' : ''}</Text>
                </View>
                <Text style={[styles.topMonto, { color: C.verde }]}>{fmtCompact(c.total)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Top 5 proveedores */}
        <Text style={styles.seccionTitulo}>Top 5 proveedores (por egresos)</Text>
        {topProveedores.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTxt}>Sin egresos registrados</Text>
          </View>
        ) : (
          <View style={styles.topCard}>
            {topProveedores.map((p, idx) => (
              <View
                key={p.rfc}
                style={[styles.topRow, idx < topProveedores.length - 1 && styles.topDivider]}
              >
                <View style={[styles.topRank, { backgroundColor: '#FEF2F2' }]}>
                  <Text style={[styles.topRankTxt, { color: C.rojo }]}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.topRfc}>{p.rfc}</Text>
                  <Text style={styles.topCount}>{p.count} factura{p.count !== 1 ? 's' : ''}</Text>
                </View>
                <Text style={[styles.topMonto, { color: C.rojo }]}>{fmtCompact(p.total)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const TarjetaStat = ({ icon, label, valor, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={[styles.statValor, { color }]}>{valor}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gris },
  header: {
    backgroundColor: C.azul,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 6 },
  headerTitle: { color: C.blanco, fontSize: 18, fontWeight: '700', flex: 1 },
  headerSub: {
    color: 'rgba(255,255,255,0.65)', fontSize: 12,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },

  // Selector de empresa
  selectorBox: {
    backgroundColor: C.blanco, borderRadius: 12, padding: 12, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  selectorLbl: {
    fontSize: 11, color: C.gris2, textTransform: 'uppercase',
    letterSpacing: 0.5, fontWeight: '700',
  },
  selectorRfc: {
    fontSize: 11, color: C.gris2, fontFamily: 'monospace', marginTop: 2,
  },
  chip: {
    backgroundColor: '#F3F4F6', borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 7,
    maxWidth: 160,
  },
  chipActive: { backgroundColor: C.azul },
  chipTxt: { fontSize: 12, color: C.gris2, fontWeight: '600' },
  chipTxtActive: { color: C.blanco },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    backgroundColor: C.blanco, borderRadius: 12, padding: 14, width: '47%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  statValor: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 11, color: C.gris2 },

  balanceBox: {
    backgroundColor: C.blanco, borderRadius: 12, padding: 16,
    borderLeftWidth: 4,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  balanceLbl: { fontSize: 13, color: C.gris2, fontWeight: '500' },
  balanceVal: { fontSize: 18, fontWeight: '700' },

  seccionTitulo: { fontSize: 13, fontWeight: '700', color: C.gris2, marginTop: 4 },

  chartCard: {
    backgroundColor: C.blanco, borderRadius: 14, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  sinDatos: {
    alignItems: 'center', paddingVertical: 32, gap: 8,
    backgroundColor: C.blanco, borderRadius: 12,
  },
  sinDatosTxt: { color: '#9CA3AF', fontSize: 13 },
  emptyBox: {
    backgroundColor: C.blanco, borderRadius: 12, padding: 20,
    alignItems: 'center',
  },
  emptyTxt: { color: '#9CA3AF', fontSize: 13 },

  // Top 5
  topCard: {
    backgroundColor: C.blanco, borderRadius: 12, padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 12,
  },
  topDivider: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  topRank: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  topRankTxt: { fontSize: 14, fontWeight: '700' },
  topRfc: { fontSize: 13, fontWeight: '600', color: C.texto, fontFamily: 'monospace' },
  topCount: { fontSize: 11, color: C.gris2, marginTop: 1 },
  topMonto: { fontSize: 14, fontWeight: '700' },
});
