import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
};

const MESES_LABEL = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const fmt = (n) =>
  Number(n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

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

const BarraSimple = ({ valor, maximo, color }) => {
  const pct = maximo > 0 ? Math.max(4, (valor / maximo) * 100) : 4;
  return (
    <View style={styles.barraFondo}>
      <View style={[styles.barraRelleno, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
};

export default function Reportes({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resumen, setResumen] = useState([]);
  const [totales, setTotales] = useState({ ingresos: 0, egresos: 0, iva: 0, count: 0 });
  const [rol, setRol] = useState(null);

  const cargarDatos = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usr } = await supabase
        .from('usuarios')
        .select('rol, empresa_id, despacho_id')
        .eq('id', user.id)
        .single();

      setRol(usr?.rol);

      const inicioRango = new Date();
      inicioRango.setMonth(inicioRango.getMonth() - 5);
      inicioRango.setDate(1);

      let query = supabase
        .from('cfdis')
        .select('tipo, total, iva, subtotal, fecha_emision, created_at, status')
        .gte('created_at', inicioRango.toISOString());

      if (usr?.rol === 'empresa' && usr?.empresa_id) {
        query = query.eq('empresa_id', usr.empresa_id);
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
    } catch (e) {
      console.error('Error cargando reportes:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);
  const onRefresh = () => { setRefreshing(true); cargarDatos(); };

  const maxIngreso = Math.max(...resumen.map(m => m.ingresos), 1);
  const maxEgreso = Math.max(...resumen.map(m => m.egresos), 1);
  const balance = totales.ingresos - totales.egresos;

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
        <Text style={styles.headerSub}>Últimos 6 meses</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.azul} />}
      >
        {/* Tarjetas resumen */}
        <View style={styles.grid}>
          <TarjetaStat
            icon="trending-up-outline"
            label="Ingresos"
            valor={fmt(totales.ingresos)}
            color={C.verde}
          />
          <TarjetaStat
            icon="trending-down-outline"
            label="Egresos"
            valor={fmt(totales.egresos)}
            color={C.rojo}
          />
          <TarjetaStat
            icon="receipt-outline"
            label="IVA total"
            valor={fmt(totales.iva)}
            color={C.morado}
          />
          <TarjetaStat
            icon="document-text-outline"
            label="CFDIs"
            valor={String(totales.count)}
            color={C.azul}
          />
        </View>

        {/* Balance */}
        <View style={[styles.balanceBox, { borderLeftColor: balance >= 0 ? C.verde : C.rojo }]}>
          <Text style={styles.balanceLbl}>Balance neto (6 meses)</Text>
          <Text style={[styles.balanceVal, { color: balance >= 0 ? C.verde : C.rojo }]}>
            {balance >= 0 ? '+' : ''}{fmt(balance)}
          </Text>
        </View>

        {/* Gráfica por mes */}
        <Text style={styles.seccionTitulo}>Actividad mensual</Text>
        <View style={styles.graficaCard}>
          {/* Leyenda */}
          <View style={styles.leyenda}>
            <View style={styles.leyendaItem}>
              <View style={[styles.leyendaDot, { backgroundColor: C.verde }]} />
              <Text style={styles.leyendaTxt}>Ingresos</Text>
            </View>
            <View style={styles.leyendaItem}>
              <View style={[styles.leyendaDot, { backgroundColor: C.rojo }]} />
              <Text style={styles.leyendaTxt}>Egresos</Text>
            </View>
          </View>

          {resumen.map((mes) => (
            <View key={mes.key} style={styles.mesRow}>
              <Text style={styles.mesLabel}>{mes.label}</Text>
              <View style={styles.barrasCol}>
                <BarraSimple valor={mes.ingresos} maximo={maxIngreso} color={C.verde} />
                <BarraSimple valor={mes.egresos} maximo={maxEgreso} color={C.rojo} />
              </View>
              <View style={styles.mesCifras}>
                <Text style={[styles.mesCifra, { color: C.verde }]} numberOfLines={1}>
                  {mes.ingresos > 0 ? fmt(mes.ingresos) : '—'}
                </Text>
                <Text style={[styles.mesCifra, { color: C.rojo }]} numberOfLines={1}>
                  {mes.egresos > 0 ? fmt(mes.egresos) : '—'}
                </Text>
              </View>
            </View>
          ))}

          {totales.count === 0 && (
            <View style={styles.sinDatos}>
              <Ionicons name="bar-chart-outline" size={40} color="#D1D5DB" />
              <Text style={styles.sinDatosTxt}>Sin CFDIs en los últimos 6 meses</Text>
            </View>
          )}
        </View>

        {/* Desglose mensual */}
        <Text style={styles.seccionTitulo}>Desglose por mes</Text>
        {resumen.filter(m => m.count > 0).length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTxt}>Sin datos registrados</Text>
          </View>
        ) : (
          resumen.map(mes => mes.count > 0 && (
            <View key={mes.key} style={styles.desgloseCard}>
              <View style={styles.desgloseHeader}>
                <Text style={styles.desgloseMes}>{mes.label} {mes.key.slice(0, 4)}</Text>
                <Text style={styles.desgloseCount}>{mes.count} CFDIs</Text>
              </View>
              <View style={styles.desgloseRow}>
                <Text style={styles.desgloseLbl}>Ingresos</Text>
                <Text style={[styles.desgloseVal, { color: C.verde }]}>{fmt(mes.ingresos)}</Text>
              </View>
              <View style={styles.desgloseRow}>
                <Text style={styles.desgloseLbl}>Egresos</Text>
                <Text style={[styles.desgloseVal, { color: C.rojo }]}>{fmt(mes.egresos)}</Text>
              </View>
              <View style={[styles.desgloseRow, styles.desgloseDivider]}>
                <Text style={styles.desgloseLbl}>IVA</Text>
                <Text style={styles.desgloseVal}>{fmt(mes.iva)}</Text>
              </View>
            </View>
          ))
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
    backgroundColor: C.azul, paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 20,
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
  scrollContent: { padding: 16, gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    backgroundColor: C.blanco, borderRadius: 12, padding: 14,
    width: '47%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValor: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#6B7280' },
  balanceBox: {
    backgroundColor: C.blanco, borderRadius: 12, padding: 16,
    borderLeftWidth: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  balanceLbl: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  balanceVal: { fontSize: 18, fontWeight: '700' },
  seccionTitulo: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginTop: 4 },
  graficaCard: {
    backgroundColor: C.blanco, borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  leyenda: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leyendaDot: { width: 10, height: 10, borderRadius: 5 },
  leyendaTxt: { fontSize: 12, color: '#6B7280' },
  mesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  mesLabel: { width: 28, fontSize: 11, fontWeight: '600', color: '#6B7280' },
  barrasCol: { flex: 1, gap: 4 },
  barraFondo: {
    height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden',
  },
  barraRelleno: { height: 8, borderRadius: 4 },
  mesCifras: { width: 80, alignItems: 'flex-end', gap: 4 },
  mesCifra: { fontSize: 10, fontWeight: '600' },
  sinDatos: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  sinDatosTxt: { color: '#9CA3AF', fontSize: 13 },
  emptyBox: {
    backgroundColor: C.blanco, borderRadius: 12, padding: 24,
    alignItems: 'center',
  },
  emptyTxt: { color: '#9CA3AF', fontSize: 13 },
  desgloseCard: {
    backgroundColor: C.blanco, borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  desgloseHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  desgloseMes: { fontSize: 14, fontWeight: '700', color: C.texto },
  desgloseCount: {
    fontSize: 11, color: C.azul, fontWeight: '600',
    backgroundColor: '#EEF2FA', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  desgloseRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  desgloseDivider: { borderTopWidth: 1, borderTopColor: '#F5F5F5', marginTop: 2, paddingTop: 8 },
  desgloseLbl: { fontSize: 13, color: '#6B7280' },
  desgloseVal: { fontSize: 13, fontWeight: '600', color: C.texto },
});
