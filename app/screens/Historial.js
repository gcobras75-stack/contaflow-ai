import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl, Modal,
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

const STATUS_CONFIG = {
  pendiente:  { color: C.amarillo, bg: '#FFFBEB', label: 'Pendiente',  icon: 'time-outline' },
  aprobado:   { color: C.verde,    bg: '#F0FDF4', label: 'Aprobado',   icon: 'checkmark-circle-outline' },
  rechazado:  { color: C.rojo,     bg: '#FFF1F2', label: 'Rechazado',  icon: 'close-circle-outline' },
};

const MESES = ['Todos', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const TIPOS = ['Todos', 'ingreso', 'egreso', 'nomina', 'traslado'];

export default function Historial({ onBack }) {
  const [cfdis, setCfdis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroMes, setFiltroMes] = useState('Todos');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [cfdiSelec, setCfdiSelec] = useState(null);

  const cargarCFDIs = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: usuario } = await supabase
        .from('usuarios').select('empresa_id').eq('id', user.id).single();

      let query = supabase
        .from('cfdis')
        .select('*')
        .order('created_at', { ascending: false });

      if (usuario?.empresa_id) {
        query = query.eq('empresa_id', usuario.empresa_id);
      }

      const { data, error } = await query;
      if (!error) setCfdis(data ?? []);
    } catch (e) {
      console.error('Error cargando CFDIs:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { cargarCFDIs(); }, [cargarCFDIs]);

  const onRefresh = () => { setRefreshing(true); cargarCFDIs(); };

  const cfdisFiltrados = cfdis.filter(c => {
    if (filtroMes !== 'Todos') {
      const mes = new Date(c.created_at).getMonth() + 1;
      if (mes !== MESES.indexOf(filtroMes)) return false;
    }
    if (filtroTipo !== 'Todos' && c.tipo !== filtroTipo) return false;
    if (filtroStatus !== 'Todos' && c.status !== filtroStatus) return false;
    return true;
  });

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.blanco} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Historial de CFDIs</Text>
        <Text style={styles.headerCount}>{cfdisFiltrados.length}</Text>
      </View>

      {/* Filtros */}
      <View style={styles.filtrosWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtrosRow}>
          {['Todos', 'pendiente', 'aprobado', 'rechazado'].map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, filtroStatus === s && styles.chipSel]}
              onPress={() => setFiltroStatus(s)}
            >
              {s !== 'Todos' && (
                <View style={[styles.dot, { backgroundColor: STATUS_CONFIG[s]?.color }]} />
              )}
              <Text style={[styles.chipTxt, filtroStatus === s && styles.chipTxtSel]}>
                {s === 'Todos' ? 'Todos' : STATUS_CONFIG[s]?.label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.sep} />
          {TIPOS.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, filtroTipo === t && styles.chipSel]}
              onPress={() => setFiltroTipo(t)}
            >
              <Text style={[styles.chipTxt, filtroTipo === t && styles.chipTxtSel]}>
                {t === 'Todos' ? 'Tipo: todos' : t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={C.azul} />
        </View>
      ) : cfdisFiltrados.length === 0 ? (
        <View style={styles.centrado}>
          <Ionicons name="document-outline" size={56} color="#D1D5DB" />
          <Text style={styles.emptyTxt}>
            {cfdis.length === 0 ? 'Sin CFDIs registrados' : 'Sin resultados para los filtros'}
          </Text>
          <Text style={styles.emptySub}>
            {cfdis.length === 0 ? 'Sube tu primer CFDI desde el menú principal' : 'Cambia los filtros para ver más resultados'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.lista}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.azul} />}
        >
          {cfdisFiltrados.map(cfdi => {
            const cfg = STATUS_CONFIG[cfdi.status] ?? STATUS_CONFIG.pendiente;
            return (
              <TouchableOpacity
                key={cfdi.id}
                style={[styles.cfdiCard, { borderLeftColor: cfg.color }]}
                onPress={() => setCfdiSelec(cfdi)}
                activeOpacity={0.75}
              >
                <View style={styles.cfdiTop}>
                  <View style={[styles.tipoBadge, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon} size={13} color={cfg.color} />
                    <Text style={[styles.tipoBadgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  <Text style={styles.cfdiTipo}>{cfdi.tipo?.toUpperCase()}</Text>
                </View>
                <Text style={styles.cfdiUUID} numberOfLines={1}>
                  {cfdi.uuid_sat ?? 'Sin UUID'}
                </Text>
                <View style={styles.cfdiBottom}>
                  <Text style={styles.cfdiDate}>{cfdi.fecha_emision ?? cfdi.created_at?.slice(0, 10)}</Text>
                  <Text style={styles.cfdiTotal}>{fmt(cfdi.total)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* Modal detalle */}
      <Modal visible={!!cfdiSelec} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle CFDI</Text>
              <TouchableOpacity onPress={() => setCfdiSelec(null)}>
                <Ionicons name="close" size={24} color={C.texto} />
              </TouchableOpacity>
            </View>
            {cfdiSelec && (
              <ScrollView>
                <DetailRow label="UUID" value={cfdiSelec.uuid_sat} mono />
                <DetailRow label="Tipo" value={cfdiSelec.tipo?.toUpperCase()} />
                <DetailRow label="Fecha emisión" value={cfdiSelec.fecha_emision} />
                <DetailRow label="Status" value={STATUS_CONFIG[cfdiSelec.status]?.label ?? cfdiSelec.status} />
                <View style={styles.modalDivider} />
                <DetailRow label="Subtotal" value={fmt(cfdiSelec.subtotal)} />
                <DetailRow label="IVA" value={fmt(cfdiSelec.iva)} />
                <DetailRow label="Total" value={fmt(cfdiSelec.total)} bold />
                <DetailRow label="Registrado" value={cfdiSelec.created_at?.slice(0, 10)} />
              </ScrollView>
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setCfdiSelec(null)}>
              <Text style={styles.modalCloseTxt}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const DetailRow = ({ label, value, mono, bold }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, mono && styles.mono, bold && styles.bold]}>{value ?? '—'}</Text>
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
  headerCount: {
    color: C.blanco, fontSize: 12, fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3,
  },
  filtrosWrap: { backgroundColor: C.blanco, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  filtrosRow: { flexDirection: 'row', padding: 12, gap: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: C.gris, borderWidth: 1, borderColor: '#E0E0E8',
  },
  chipSel: { backgroundColor: C.azul, borderColor: C.azul },
  chipTxt: { fontSize: 12, fontWeight: '500', color: C.texto },
  chipTxtSel: { color: C.blanco },
  dot: { width: 7, height: 7, borderRadius: 4 },
  sep: { width: 1, height: 20, backgroundColor: '#E0E0E8', marginHorizontal: 4 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  emptyTxt: { fontSize: 17, fontWeight: '600', color: C.texto },
  emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  lista: { flex: 1, padding: 12 },
  cfdiCard: {
    backgroundColor: C.blanco, borderRadius: 12, padding: 14, marginBottom: 8,
    borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cfdiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  tipoBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  tipoBadgeTxt: { fontSize: 11, fontWeight: '600' },
  cfdiTipo: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  cfdiUUID: { fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', marginBottom: 6 },
  cfdiBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cfdiDate: { fontSize: 12, color: '#6B7280' },
  cfdiTotal: { fontSize: 16, fontWeight: '700', color: C.azul },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: C.blanco, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '75%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.texto },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  detailLabel: { fontSize: 13, color: '#6B7280', flex: 1 },
  detailValue: { fontSize: 13, color: C.texto, flex: 2, textAlign: 'right' },
  mono: { fontFamily: 'monospace', fontSize: 10 },
  bold: { fontWeight: '700', fontSize: 15 },
  modalDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },
  modalClose: { backgroundColor: C.azul, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  modalCloseTxt: { color: C.blanco, fontWeight: '700', fontSize: 15 },
});
