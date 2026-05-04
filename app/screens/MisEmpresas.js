import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl, TextInput,
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
  gris2: '#6B7280',
};

const STATUS_LABEL = {
  trial:          { label: 'Prueba',       bg: '#DBEAFE', text: '#1D4ED8' },
  activa:         { label: 'Activa',       bg: '#DCFCE7', text: '#15803D' },
  pago_pendiente: { label: 'Pendiente',    bg: '#FEF3C7', text: '#92400E' },
  suspendida:     { label: 'Suspendida',   bg: '#FEE2E2', text: '#991B1B' },
  vencida:        { label: 'Vencida',      bg: '#FEE2E2', text: '#991B1B' },
  cancelada:      { label: 'Cancelada',    bg: '#F3F4F6', text: '#6B7280' },
};

const fmt = (n) =>
  Number(n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

function diasHasta(isoFecha) {
  if (!isoFecha) return null;
  const ms = new Date(isoFecha).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

/**
 * MisEmpresas — lista todas las empresas cliente del despacho del contador
 * con sus datos esenciales: RFC, régimen, CFDIs del mes, ingresos/egresos,
 * estado FIEL, estado de suscripción.
 *
 * Búsqueda por nombre/RFC incluida. Refresh al pull down.
 * Para alta de nuevas empresas: referir al panel web (la vista contable del
 * alta con aceptación legal + autorización vive en /dashboard/configuracion).
 */
export default function MisEmpresas({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [filtro, setFiltro] = useState('');

  const cargarDatos = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usr } = await supabase
        .from('usuarios')
        .select('despacho_id')
        .eq('id', user.id)
        .single();

      if (!usr?.despacho_id) {
        setEmpresas([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Empresas del despacho
      const { data: emps } = await supabase
        .from('empresas_clientes')
        .select('id, nombre, rfc, giro, regimen_fiscal, fiel_disponible, activa, sat_ultima_sync')
        .eq('despacho_id', usr.despacho_id)
        .order('nombre');

      if (!emps || emps.length === 0) {
        setEmpresas([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const empresaIds = emps.map(e => e.id);

      // Datos agregados por empresa: CFDIs del mes, suscripción, ingresos/egresos
      const inicioMes = new Date();
      inicioMes.setDate(1);
      const inicioMesStr = inicioMes.toISOString().slice(0, 10);

      const [cfdisRes, susRes] = await Promise.all([
        supabase
          .from('cfdis')
          .select('empresa_id, tipo, total')
          .in('empresa_id', empresaIds)
          .gte('fecha_emision', inicioMesStr),
        supabase
          .from('suscripciones')
          .select('empresa_id, status, trial_ends_at, periodo_fin')
          .in('empresa_id', empresaIds),
      ]);

      // Agrupar por empresa
      const cfdiMap = new Map();
      for (const c of (cfdisRes.data ?? [])) {
        const prev = cfdiMap.get(c.empresa_id) ?? { count: 0, ingresos: 0, egresos: 0 };
        prev.count += 1;
        if (c.tipo === 'ingreso') prev.ingresos += Number(c.total ?? 0);
        if (c.tipo === 'egreso')  prev.egresos  += Number(c.total ?? 0);
        cfdiMap.set(c.empresa_id, prev);
      }

      const susMap = new Map();
      for (const s of (susRes.data ?? [])) {
        susMap.set(s.empresa_id, s);
      }

      const enriquecidas = emps.map(e => ({
        ...e,
        cfdisMes:    cfdiMap.get(e.id)?.count    ?? 0,
        ingresosMes: cfdiMap.get(e.id)?.ingresos ?? 0,
        egresosMes:  cfdiMap.get(e.id)?.egresos  ?? 0,
        suscripcion: susMap.get(e.id) ?? null,
      }));

      setEmpresas(enriquecidas);
    } catch (e) {
      console.error('Error cargando mis empresas:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const onRefresh = () => { setRefreshing(true); cargarDatos(); };

  const filtradas = empresas.filter(e => {
    if (!filtro.trim()) return true;
    const q = filtro.trim().toLowerCase();
    return e.nombre.toLowerCase().includes(q) || e.rfc.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={C.blanco} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Mis Empresas</Text>
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
        <Text style={styles.headerTitle}>Mis Empresas</Text>
        <Text style={styles.headerBadge}>{empresas.length}</Text>
      </View>

      {/* Buscador */}
      <View style={styles.buscadorBox}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.buscadorInput}
          placeholder="Buscar por nombre o RFC..."
          placeholderTextColor="#9CA3AF"
          value={filtro}
          onChangeText={setFiltro}
        />
        {filtro.length > 0 && (
          <TouchableOpacity onPress={() => setFiltro('')}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.azul} />}
      >
        {empresas.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitulo}>Sin empresas cliente</Text>
            <Text style={styles.emptySub}>
              Para dar de alta tu primera empresa cliente, ve al panel web de ContaFlow AI.
            </Text>
          </View>
        ) : filtradas.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={36} color="#D1D5DB" />
            <Text style={styles.emptyTitulo}>Sin resultados</Text>
            <Text style={styles.emptySub}>Prueba con otro nombre o RFC.</Text>
          </View>
        ) : (
          filtradas.map(e => {
            const sus = e.suscripcion;
            const statusKey = sus?.status ?? 'vencida';
            const statusCfg = STATUS_LABEL[statusKey] ?? STATUS_LABEL.vencida;

            let vigencia = null;
            if (sus?.status === 'trial' && sus.trial_ends_at) {
              const d = diasHasta(sus.trial_ends_at);
              vigencia = d != null ? `${d} día${d !== 1 ? 's' : ''} de trial` : null;
            } else if (sus?.status === 'activa' && sus.periodo_fin) {
              const d = diasHasta(sus.periodo_fin);
              vigencia = d != null ? `renueva en ${d} día${d !== 1 ? 's' : ''}` : null;
            }

            return (
              <View key={e.id} style={[styles.card, !e.activa && styles.cardInactiva]}>
                {/* Header card */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardNombre} numberOfLines={1}>{e.nombre}</Text>
                    <Text style={styles.cardRfc}>{e.rfc}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                    <Text style={[styles.statusBadgeTxt, { color: statusCfg.text }]}>
                      {statusCfg.label}
                    </Text>
                  </View>
                </View>

                {/* Meta */}
                {(e.giro || e.regimen_fiscal) && (
                  <Text style={styles.cardMeta} numberOfLines={2}>
                    {e.giro ?? 'Sin giro'}
                    {e.regimen_fiscal ? ` · ${e.regimen_fiscal}` : ''}
                  </Text>
                )}

                {/* Stats del mes */}
                <View style={styles.cardStats}>
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatVal}>{e.cfdisMes}</Text>
                    <Text style={styles.cardStatLbl}>CFDIs mes</Text>
                  </View>
                  <View style={styles.cardStat}>
                    <Text style={[styles.cardStatVal, { color: C.verde }]}>{fmt(e.ingresosMes)}</Text>
                    <Text style={styles.cardStatLbl}>Ingresos</Text>
                  </View>
                  <View style={styles.cardStat}>
                    <Text style={[styles.cardStatVal, { color: C.rojo }]}>{fmt(e.egresosMes)}</Text>
                    <Text style={styles.cardStatLbl}>Egresos</Text>
                  </View>
                </View>

                {/* Flags bottom */}
                <View style={styles.cardFooter}>
                  <View style={styles.cardFlag}>
                    <Ionicons
                      name={e.fiel_disponible ? 'shield-checkmark-outline' : 'shield-outline'}
                      size={13}
                      color={e.fiel_disponible ? C.verde : '#9CA3AF'}
                    />
                    <Text style={[
                      styles.cardFlagTxt,
                      { color: e.fiel_disponible ? C.verde : '#9CA3AF' },
                    ]}>
                      {e.fiel_disponible ? 'e.firma configurada' : 'Sin e.firma'}
                    </Text>
                  </View>
                  {vigencia && (
                    <Text style={styles.cardVigencia}>{vigencia}</Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gris },
  header: {
    backgroundColor: C.azul,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 6 },
  headerTitle: { flex: 1, color: C.blanco, fontSize: 18, fontWeight: '700' },
  headerBadge: {
    color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  buscadorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.blanco, margin: 14, marginBottom: 6,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  buscadorInput: { flex: 1, fontSize: 14, color: C.texto },

  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingTop: 6, gap: 10, paddingBottom: 28 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitulo: { fontSize: 16, fontWeight: '600', color: C.texto },
  emptySub: { fontSize: 13, color: C.gris2, textAlign: 'center', paddingHorizontal: 30 },

  card: {
    backgroundColor: C.blanco, borderRadius: 14, padding: 14, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardInactiva: { opacity: 0.55 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardNombre: { fontSize: 15, fontWeight: '700', color: C.texto },
  cardRfc: { fontSize: 11, color: C.gris2, fontFamily: 'monospace', marginTop: 2 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeTxt: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

  cardMeta: { fontSize: 11, color: C.gris2, lineHeight: 16 },

  cardStats: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: '#F5F5F5',
    paddingTop: 10,
  },
  cardStat: { flex: 1, alignItems: 'center' },
  cardStatVal: { fontSize: 13, fontWeight: '700', color: C.texto },
  cardStatLbl: { fontSize: 10, color: C.gris2, marginTop: 2 },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 8,
  },
  cardFlag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardFlagTxt: { fontSize: 11, fontWeight: '500' },
  cardVigencia: { fontSize: 11, color: C.gris2 },
});
