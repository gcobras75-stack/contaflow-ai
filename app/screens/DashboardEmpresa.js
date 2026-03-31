import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, ActivityIndicator, RefreshControl,
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
};

const fmt = (n) =>
  Number(n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export default function DashboardEmpresa({ onLogout, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [stats, setStats] = useState({
    cfdisEsteMes: 0,
    cfdisPendientes: 0,
    ultimoEstado: null,
    ivaAFavor: 0,
    ivaAPagar: 0,
    sinCFDI: 0,
  });

  const cargarDatos = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usr } = await supabase
        .from('usuarios')
        .select('nombre, empresa_id')
        .eq('id', user.id)
        .single();
      setUsuario(usr);

      if (!usr?.empresa_id) { setLoading(false); setRefreshing(false); return; }

      const ahora = new Date();
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();

      // CFDIs este mes
      const { data: cfdis } = await supabase
        .from('cfdis')
        .select('id, tipo, iva, status, created_at')
        .eq('empresa_id', usr.empresa_id)
        .gte('created_at', inicioMes);

      const cfdisEsteMes = cfdis?.length ?? 0;
      const cfdisPendientes = cfdis?.filter(c => c.status === 'pendiente').length ?? 0;

      // IVA
      let ivaAFavor = 0, ivaAPagar = 0;
      cfdis?.forEach(c => {
        if (c.tipo === 'egreso') ivaAFavor += Number(c.iva ?? 0);
        if (c.tipo === 'ingreso') ivaAPagar += Number(c.iva ?? 0);
      });

      // Último estado de cuenta
      const { data: estados } = await supabase
        .from('estados_cuenta')
        .select('banco, periodo, created_at, status')
        .eq('empresa_id', usr.empresa_id)
        .order('created_at', { ascending: false })
        .limit(1);

      setStats({
        cfdisEsteMes,
        cfdisPendientes,
        ultimoEstado: estados?.[0] ?? null,
        ivaAFavor: parseFloat(ivaAFavor.toFixed(2)),
        ivaAPagar: parseFloat(ivaAPagar.toFixed(2)),
        sinCFDI: 0,
      });
    } catch (e) {
      console.error('Error cargando dashboard:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const onRefresh = () => { setRefreshing(true); cargarDatos(); };

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mi Empresa</Text>
        </View>
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={C.azul} />
        </View>
      </SafeAreaView>
    );
  }

  const ivaBalance = stats.ivaAPagar - stats.ivaAFavor;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Bienvenido</Text>
          <Text style={styles.headerTitle}>{usuario?.nombre ?? 'Mi Empresa'}</Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={C.blanco} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.azul} />}
      >
        {/* Acciones rápidas */}
        <View style={styles.accionesRow}>
          <TouchableOpacity style={styles.accionBtn} onPress={() => onNavigate?.('SubirCFDI')}>
            <Ionicons name="document-text" size={22} color={C.blanco} />
            <Text style={styles.accionTxt}>Subir CFDI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.accionBtn, { backgroundColor: C.azul }]} onPress={() => onNavigate?.('SubirEstadoCuenta')}>
            <Ionicons name="card" size={22} color={C.blanco} />
            <Text style={styles.accionTxt}>Estado de Cuenta</Text>
          </TouchableOpacity>
        </View>

        {/* Sin empresa configurada */}
        {!usuario?.empresa_id && (
          <View style={styles.alertaBox}>
            <Ionicons name="information-circle-outline" size={20} color="#92400E" />
            <Text style={styles.alertaTxt}>
              Tu cuenta aún no tiene una empresa asignada. Contacta a tu despacho contable.
            </Text>
          </View>
        )}

        {/* Tarjetas estadísticas */}
        <Text style={styles.seccionTitulo}>Resumen del mes</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="document-text-outline"
            label="CFDIs este mes"
            valor={String(stats.cfdisEsteMes)}
            sub={`${stats.cfdisPendientes} pendientes`}
            color={C.azul}
          />
          <StatCard
            icon="card-outline"
            label="Último estado"
            valor={stats.ultimoEstado?.banco ?? '—'}
            sub={stats.ultimoEstado?.periodo ?? 'Sin registros'}
            color="#6366F1"
          />
          <StatCard
            icon="trending-up-outline"
            label="IVA a pagar"
            valor={fmt(stats.ivaAPagar)}
            sub="IVA de ingresos"
            color={C.rojo}
          />
          <StatCard
            icon="trending-down-outline"
            label="IVA a favor"
            valor={fmt(stats.ivaAFavor)}
            sub="IVA de egresos"
            color={C.verde}
          />
        </View>

        {/* Balance IVA */}
        {(stats.ivaAPagar > 0 || stats.ivaAFavor > 0) && (
          <View style={[styles.ivaBalance, { borderLeftColor: ivaBalance > 0 ? C.rojo : C.verde }]}>
            <Text style={styles.ivaBalanceLbl}>Balance IVA neto:</Text>
            <Text style={[styles.ivaBalanceVal, { color: ivaBalance > 0 ? C.rojo : C.verde }]}>
              {ivaBalance > 0 ? 'A pagar ' : 'A favor '}{fmt(Math.abs(ivaBalance))}
            </Text>
          </View>
        )}

        {/* Menú navegación */}
        <Text style={styles.seccionTitulo}>Módulos</Text>
        <MenuItem icon="time-outline" label="Historial de CFDIs" onPress={() => onNavigate?.('Historial')} />
        <MenuItem icon="bar-chart-outline" label="Reportes" onPress={() => onNavigate?.('Reportes')} />
        <MenuItem icon="person-outline" label="Mi Perfil" onPress={() => onNavigate?.('Perfil')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const StatCard = ({ icon, label, valor, sub, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.statValor}>{valor}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statSub}>{sub}</Text>
  </View>
);

const MenuItem = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.menuIcon}>
      <Ionicons name={icon} size={24} color={C.azul} />
    </View>
    <Text style={styles.menuLabel}>{label}</Text>
    <Ionicons name="chevron-forward" size={18} color="#CCC" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gris },
  header: {
    backgroundColor: C.azul, paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  headerTitle: { color: C.blanco, fontSize: 20, fontWeight: '700' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 8 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10 },
  accionesRow: { flexDirection: 'row', gap: 10 },
  accionBtn: {
    flex: 1, backgroundColor: C.verde, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', gap: 6,
  },
  accionTxt: { color: C.blanco, fontWeight: '700', fontSize: 12 },
  alertaBox: {
    flexDirection: 'row', backgroundColor: '#FEF3C7',
    borderRadius: 10, padding: 12, gap: 8,
  },
  alertaTxt: { color: '#92400E', fontSize: 12, flex: 1, lineHeight: 18 },
  seccionTitulo: { fontSize: 14, fontWeight: '700', color: '#6B7280', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    backgroundColor: C.blanco, borderRadius: 12, padding: 14,
    width: '47%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValor: { fontSize: 18, fontWeight: '700', color: C.texto },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  statSub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  ivaBalance: {
    backgroundColor: C.blanco, borderRadius: 10, padding: 14,
    borderLeftWidth: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  ivaBalanceLbl: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  ivaBalanceVal: { fontSize: 15, fontWeight: '700' },
  menuItem: {
    backgroundColor: C.blanco, borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  menuIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#EEF2FA', alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: C.texto },
});
