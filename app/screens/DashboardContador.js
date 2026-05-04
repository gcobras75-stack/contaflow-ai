import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, ActivityIndicator, Alert, RefreshControl,
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
  gris2: '#6B7280',
};

const fmt = (n) =>
  Number(n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const fmtCompact = (n) => {
  const v = Number(n ?? 0);
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

const MenuItem = ({ icon, label, badge, badgeColor, onPress }) => (
  <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={onPress}>
    <View style={styles.menuIcon}>
      <Ionicons name={icon} size={24} color={C.azul} />
    </View>
    <Text style={styles.menuLabel}>{label}</Text>
    {badge ? (
      <View style={[styles.badge, badgeColor && { backgroundColor: badgeColor }]}>
        <Text style={styles.badgeTxt}>{badge}</Text>
      </View>
    ) : null}
    <Ionicons name="chevron-forward" size={18} color="#CCC" />
  </TouchableOpacity>
);

export default function DashboardContador({ onLogout, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nombre, setNombre] = useState('');
  const [stats, setStats] = useState({
    empresas:          0,
    cfdisEsteMes:      0,
    cfdisPendientes:   0,
    totalIngresos:     0,
    totalEgresos:      0,
    obligacionesProximas: 0,
    obligacionesVencidas: 0,
    trialPorVencer:    0,
  });
  const [proximasObligaciones, setProximasObligaciones] = useState([]);

  const cargarDatos = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usr } = await supabase
        .from('usuarios')
        .select('nombre, despacho_id')
        .eq('id', user.id)
        .single();

      if (usr?.nombre) setNombre(usr.nombre);
      if (!usr?.despacho_id) { setLoading(false); setRefreshing(false); return; }

      const despachoId = usr.despacho_id;

      // Rango del mes actual
      const ahora     = new Date();
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
        .toISOString().slice(0, 10);
      const hoyStr    = ahora.toISOString().slice(0, 10);
      const en7dias   = new Date(ahora.getTime() + 7 * 86400000)
        .toISOString().slice(0, 10);
      const en5dias   = new Date(ahora.getTime() + 5 * 86400000).toISOString();

      // Traer todas las empresas del despacho (necesitamos sus IDs para filtrar CFDIs)
      const { data: empresasList } = await supabase
        .from('empresas_clientes')
        .select('id')
        .eq('despacho_id', despachoId)
        .eq('activa', true);

      const empresaIds = (empresasList ?? []).map(e => e.id);

      // Queries paralelas — todas filtradas por despacho/empresas del despacho
      const [cfdisMesRes, cfdisPendRes, obligProxRes, obligVencRes, trialRes] = await Promise.all([
        // CFDIs del mes (solo de empresas del despacho)
        empresaIds.length > 0
          ? supabase
              .from('cfdis')
              .select('tipo, total')
              .in('empresa_id', empresaIds)
              .gte('fecha_emision', inicioMes)
          : Promise.resolve({ data: [] }),

        // CFDIs pendientes (solo del despacho)
        empresaIds.length > 0
          ? supabase
              .from('cfdis')
              .select('id', { count: 'exact', head: true })
              .in('empresa_id', empresaIds)
              .eq('status', 'pendiente')
          : Promise.resolve({ count: 0 }),

        // Obligaciones próximas: pendientes en los próximos 7 días
        supabase
          .from('calendario_obligaciones')
          .select('id, obligacion, fecha_limite, empresa_id, empresas_clientes ( nombre )')
          .eq('despacho_id', despachoId)
          .eq('status', 'pendiente')
          .gte('fecha_limite', hoyStr)
          .lte('fecha_limite', en7dias)
          .order('fecha_limite', { ascending: true })
          .limit(5),

        // Obligaciones vencidas (status='vencido' en calendario)
        supabase
          .from('calendario_obligaciones')
          .select('id', { count: 'exact', head: true })
          .eq('despacho_id', despachoId)
          .eq('status', 'vencido'),

        // Trials por vencer en los próximos 5 días
        supabase
          .from('suscripciones')
          .select('id', { count: 'exact', head: true })
          .eq('despacho_id', despachoId)
          .eq('status', 'trial')
          .lte('trial_ends_at', en5dias),
      ]);

      // Calcular totales ingresos/egresos del mes
      let totalIngresos = 0;
      let totalEgresos  = 0;
      for (const c of (cfdisMesRes.data ?? [])) {
        if (c.tipo === 'ingreso') totalIngresos += Number(c.total ?? 0);
        if (c.tipo === 'egreso')  totalEgresos  += Number(c.total ?? 0);
      }

      setStats({
        empresas:             empresaIds.length,
        cfdisEsteMes:         (cfdisMesRes.data ?? []).length,
        cfdisPendientes:      cfdisPendRes.count ?? 0,
        totalIngresos,
        totalEgresos,
        obligacionesProximas: (obligProxRes.data ?? []).length,
        obligacionesVencidas: obligVencRes.count ?? 0,
        trialPorVencer:       trialRes.count ?? 0,
      });

      setProximasObligaciones(obligProxRes.data ?? []);
    } catch (e) {
      console.error('Error cargando dashboard contador:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const onRefresh = () => { setRefreshing(true); cargarDatos(); };

  const webSolo = (label) =>
    Alert.alert(
      'Disponible en panel web',
      `"${label}" está optimizado para el panel web de ContaFlow AI. Ábrelo en tu navegador.`,
      [{ text: 'Entendido' }],
    );

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ContaFlow AI</Text>
        </View>
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={C.azul} />
        </View>
      </SafeAreaView>
    );
  }

  const hayAlertas = stats.obligacionesVencidas > 0 || stats.trialPorVencer > 0;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Panel del Contador</Text>
          <Text style={styles.headerTitle}>{nombre || 'ContaFlow AI'}</Text>
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
        {/* ── Alertas rojas ─────────────────────────────────── */}
        {hayAlertas && (
          <View style={styles.alertasBox}>
            {stats.obligacionesVencidas > 0 && (
              <View style={styles.alertaItem}>
                <Ionicons name="alert-circle" size={18} color={C.rojo} />
                <Text style={styles.alertaTxt}>
                  {stats.obligacionesVencidas} obligación{stats.obligacionesVencidas !== 1 ? 'es' : ''} vencida{stats.obligacionesVencidas !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
            {stats.trialPorVencer > 0 && (
              <View style={styles.alertaItem}>
                <Ionicons name="time" size={18} color={C.amarillo} />
                <Text style={styles.alertaTxt}>
                  {stats.trialPorVencer} cliente{stats.trialPorVencer !== 1 ? 's' : ''} con trial por vencer (≤5 días)
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Stats del mes ─────────────────────────────────── */}
        <Text style={styles.seccion}>Este mes</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, styles.statBoxWide]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.statLbl}>Ingresos</Text>
              <Text style={[styles.statNum, { color: C.verde }]}>{fmtCompact(stats.totalIngresos)}</Text>
            </View>
            <Ionicons name="arrow-up-circle" size={22} color={C.verde} />
          </View>
          <View style={[styles.statBox, styles.statBoxWide]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.statLbl}>Egresos</Text>
              <Text style={[styles.statNum, { color: C.rojo }]}>{fmtCompact(stats.totalEgresos)}</Text>
            </View>
            <Ionicons name="arrow-down-circle" size={22} color={C.rojo} />
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNumSmall}>{stats.empresas}</Text>
            <Text style={styles.statLbl}>Clientes activos</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumSmall}>{stats.cfdisEsteMes}</Text>
            <Text style={styles.statLbl}>CFDIs del mes</Text>
          </View>
          <View style={[styles.statBox, stats.cfdisPendientes > 0 && styles.statBoxAlert]}>
            <Text style={[styles.statNumSmall, stats.cfdisPendientes > 0 && { color: C.amarillo }]}>
              {stats.cfdisPendientes}
            </Text>
            <Text style={styles.statLbl}>CFDIs pend.</Text>
          </View>
        </View>

        {/* ── Próximas obligaciones (7 días) ────────────────── */}
        {proximasObligaciones.length > 0 && (
          <>
            <Text style={styles.seccion}>Próximas obligaciones (7 días)</Text>
            <View style={styles.obligacionesCard}>
              {proximasObligaciones.map((o, idx) => {
                const nombreEmp = o.empresas_clientes?.nombre ?? 'Empresa';
                const fecha = new Date(o.fecha_limite + 'T00:00:00')
                  .toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
                return (
                  <View
                    key={o.id}
                    style={[
                      styles.obligacionRow,
                      idx < proximasObligaciones.length - 1 && styles.obligacionDivider,
                    ]}
                  >
                    <View style={styles.obligacionIcon}>
                      <Ionicons name="calendar-outline" size={16} color={C.azul} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.obligacionTitulo} numberOfLines={1}>{o.obligacion}</Text>
                      <Text style={styles.obligacionSub} numberOfLines={1}>{nombreEmp}</Text>
                    </View>
                    <Text style={styles.obligacionFecha}>{fecha}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ── Menú ──────────────────────────────────────────── */}
        <Text style={styles.seccion}>Acciones</Text>
        <MenuItem
          icon="people-outline"
          label="Mis Empresas"
          badge={stats.empresas > 0 ? String(stats.empresas) : null}
          onPress={() => onNavigate?.('MisEmpresas')}
        />
        <MenuItem
          icon="document-text-outline"
          label="CFDIs"
          badge={stats.cfdisPendientes > 0 ? String(stats.cfdisPendientes) : null}
          badgeColor={stats.cfdisPendientes > 0 ? C.amarillo : null}
          onPress={() => onNavigate?.('Historial')}
        />
        <MenuItem
          icon="bar-chart-outline"
          label="Reportes"
          onPress={() => onNavigate?.('Reportes')}
        />
        <MenuItem
          icon="bulb-outline"
          label="Estrategia Fiscal por Cliente"
          onPress={() => onNavigate?.('EstrategiaFiscal')}
        />
        <MenuItem
          icon="chatbubble-ellipses-outline"
          label="Chat con CPC Ricardo"
          onPress={() => onNavigate?.('ChatContador')}
        />
        <MenuItem
          icon="analytics-outline"
          label="Conciliación"
          onPress={() => webSolo('Conciliación')}
        />
        <MenuItem
          icon="download-outline"
          label="Exportar"
          onPress={() => webSolo('Exportar')}
        />
        <MenuItem
          icon="person-outline"
          label="Mi Perfil"
          onPress={() => onNavigate?.('Perfil')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gris },
  header: {
    backgroundColor: C.azul,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  headerTitle: { color: C.blanco, fontSize: 20, fontWeight: '700' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 8 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10, paddingBottom: 32 },

  // Alertas
  alertasBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  alertaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertaTxt: { flex: 1, fontSize: 12, color: '#991B1B', fontWeight: '600' },

  // Sección header
  seccion: {
    fontSize: 12,
    fontWeight: '700',
    color: C.gris2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 2,
  },

  // Stats
  statsGrid: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: C.blanco,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statBoxWide: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statBoxAlert: { borderWidth: 1, borderColor: '#FDE68A' },
  statNum: { fontSize: 18, fontWeight: '700', color: C.azul },
  statNumSmall: { fontSize: 20, fontWeight: '700', color: C.azul },
  statLbl: { fontSize: 11, color: C.gris2, marginTop: 2, textAlign: 'center' },

  // Obligaciones
  obligacionesCard: {
    backgroundColor: C.blanco,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  obligacionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  obligacionDivider: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  obligacionIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#EEF2FA',
    alignItems: 'center', justifyContent: 'center',
  },
  obligacionTitulo: { fontSize: 13, fontWeight: '600', color: C.texto },
  obligacionSub: { fontSize: 11, color: C.gris2, marginTop: 1 },
  obligacionFecha: { fontSize: 12, fontWeight: '600', color: C.amarillo },

  // Menu
  menuItem: {
    backgroundColor: C.blanco,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#EEF2FA',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: C.texto },
  badge: {
    backgroundColor: C.azul,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
  },
  badgeTxt: { color: C.blanco, fontSize: 11, fontWeight: '700' },
});
