import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const C = {
  azul:    '#1B3A6B',
  verde:   '#00A651',
  blanco:  '#FFFFFF',
  gris:    '#F5F5F5',
  texto:   '#333333',
  amarillo:'#F59E0B',
  rojo:    '#EF4444',
  gris2:   '#6B7280',
};

const fmt = (n) =>
  Number(n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export default function DashboardEmpresa({ onLogout, onNavigate }) {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usuario, setUsuario]       = useState(null);
  const [empresa, setEmpresa]       = useState(null);
  const [stats, setStats]           = useState({
    docsPendientes:    0,
    cfdisEsteMes:      0,
    proximaObligacion: null,
    totalIngresos:     0,
    totalEgresos:      0,
  });
  const [suspendida, setSuspendida] = useState(false);

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

      // Verificar si la suscripción de la empresa está suspendida
      const { data: sus } = await supabase
        .from('suscripciones')
        .select('status')
        .eq('empresa_id', usr.empresa_id)
        .single();
      if (sus?.status === 'suspendida') {
        setSuspendida(true);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Datos de la empresa
      const { data: emp } = await supabase
        .from('empresas_clientes')
        .select('nombre, rfc, giro, regimen_fiscal, fiel_disponible')
        .eq('id', usr.empresa_id)
        .single();
      setEmpresa(emp);

      const ahora     = new Date();
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();

      // CFDIs del mes
      const { data: cfdis } = await supabase
        .from('cfdis')
        .select('tipo, total, status')
        .eq('empresa_id', usr.empresa_id)
        .gte('created_at', inicioMes);

      // Documentos pendientes de revisión
      const { count: docsPendientes } = await supabase
        .from('documentos')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', usr.empresa_id)
        .eq('status', 'pendiente');

      const cfdisEsteMes = cfdis?.length ?? 0;
      let totalIngresos  = 0;
      let totalEgresos   = 0;
      cfdis?.forEach(c => {
        if (c.tipo === 'ingreso') totalIngresos += Number(c.total ?? 0);
        if (c.tipo === 'egreso')  totalEgresos  += Number(c.total ?? 0);
      });

      // Próxima obligación fiscal: día 17 del mes siguiente
      const mesProx = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 17);
      const diasPara = Math.ceil((mesProx.getTime() - ahora.getTime()) / 86400000);

      setStats({
        docsPendientes: docsPendientes ?? 0,
        cfdisEsteMes,
        proximaObligacion: { fecha: mesProx, diasPara },
        totalIngresos,
        totalEgresos,
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
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={C.azul} />
        </View>
      </SafeAreaView>
    );
  }

  // Pantalla de suspensión
  if (suspendida) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: '#0F172A' }]}>
        <View style={styles.centrado}>
          <View style={styles.suspView}>
            <View style={styles.suspIcono}>
              <Ionicons name="warning-outline" size={36} color="#F87171" />
            </View>
            <Text style={styles.suspTitulo}>Cuenta suspendida</Text>
            <Text style={styles.suspMsg}>
              El acceso ha sido suspendido por falta de pago de la suscripción mensual.
            </Text>
            <Text style={styles.suspPasos}>
              Contacta a tu contador para regularizar el pago. Una vez pagado, el acceso se restaura automáticamente.
            </Text>
            <TouchableOpacity
              style={styles.suspBtnReintentar}
              onPress={() => { setSuspendida(false); setLoading(true); cargarDatos(); }}
            >
              <Text style={styles.suspBtnReintentarTxt}>Ya pagué — Reintentar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.suspBtnLogout} onPress={onLogout}>
              <Text style={styles.suspBtnLogoutTxt}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const nombre = usuario?.nombre?.split(' ')[0] ?? 'Bienvenido';

  return (
    <SafeAreaView style={styles.root}>

      {/* ── Header ───────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSaludo}>Hola, {nombre} 👋</Text>
          {empresa && (
            <Text style={styles.headerEmpresa} numberOfLines={1}>{empresa.nombre}</Text>
          )}
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={C.blanco} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.azul} />}
      >

        {/* ── Sin empresa vinculada ─────────────────────────── */}
        {!usuario?.empresa_id && (
          <View style={styles.alertaBox}>
            <Ionicons name="information-circle-outline" size={20} color="#92400E" />
            <Text style={styles.alertaTxt}>
              Tu cuenta no está vinculada a ninguna empresa. Contacta a tu contador.
            </Text>
          </View>
        )}

        {/* ── TAREA 1: Botón azul "Ver mis estadísticas" ───── */}
        <TouchableOpacity
          style={styles.btnEstadisticas}
          onPress={() => onNavigate?.('GraficasEmpresa')}
          activeOpacity={0.85}
        >
          <View style={styles.btnEstadisticasIcono}>
            <Ionicons name="bar-chart-outline" size={28} color={C.blanco} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.btnEstadisticasTitulo}>Ver mis estadísticas</Text>
            <Text style={styles.btnEstadisticasSub}>Ingresos, tendencias y salud fiscal</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        {/* ── Próxima obligación fiscal ─────────────────────── */}
        {stats.proximaObligacion && (
          <View style={[styles.obligacionBox,
            stats.proximaObligacion.diasPara <= 7 ? styles.obligacionUrgente : styles.obligacionNormal]}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={stats.proximaObligacion.diasPara <= 7 ? C.rojo : C.amarillo}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.obligacionTitulo}>Próxima declaración</Text>
              <Text style={styles.obligacionFecha}>
                {stats.proximaObligacion.fecha.toLocaleDateString('es-MX', {
                  day: 'numeric', month: 'long',
                })}
                {' · '}
                {stats.proximaObligacion.diasPara > 0
                  ? `en ${stats.proximaObligacion.diasPara} días`
                  : 'hoy'}
              </Text>
            </View>
          </View>
        )}

        {/* ── Tarjetas resumen ──────────────────────────────── */}
        <Text style={styles.seccion}>Resumen del mes</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="arrow-up-circle-outline" size={22} color={C.verde} />
            <Text style={styles.statVal}>{fmt(stats.totalIngresos)}</Text>
            <Text style={styles.statLbl}>Ingresos</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="arrow-down-circle-outline" size={22} color={C.rojo} />
            <Text style={styles.statVal}>{fmt(stats.totalEgresos)}</Text>
            <Text style={styles.statLbl}>Egresos</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="document-text-outline" size={22} color={C.azul} />
            <Text style={styles.statVal}>{stats.cfdisEsteMes}</Text>
            <Text style={styles.statLbl}>Facturas del mes</Text>
          </View>
          <View style={[styles.statCard, stats.docsPendientes > 0 && styles.statCardAlerta]}>
            <Ionicons
              name="time-outline"
              size={22}
              color={stats.docsPendientes > 0 ? C.amarillo : C.gris2}
            />
            <Text style={[styles.statVal, stats.docsPendientes > 0 && { color: C.amarillo }]}>
              {stats.docsPendientes}
            </Text>
            <Text style={styles.statLbl}>Docs en revisión</Text>
          </View>
        </View>

        {/* ── MIS DOCUMENTOS ────────────────────────────────── */}
        <Text style={styles.seccion}>Mis documentos</Text>

        <MenuItem
          icon="document-text-outline"
          color="#3B82F6"
          label="Mis facturas (CFDIs)"
          sub="Historial de facturas electrónicas"
          onPress={() => onNavigate?.('Historial')}
        />
        <MenuItem
          icon="card-outline"
          color={C.amarillo}
          label="Estado de cuenta"
          sub="Subir estado de cuenta bancario"
          onPress={() => onNavigate?.('SubirEstadoCuenta')}
        />
        <MenuItem
          icon="receipt-outline"
          color="#8B5CF6"
          label="Subir CFDI (XML)"
          sub="Facturas electrónicas en formato XML"
          onPress={() => onNavigate?.('SubirCFDI')}
        />

        {/* TAREA 2: Subir nota */}
        <MenuItem
          icon="document-text-outline"
          color="#F97316"
          label="Subir nota"
          sub="Notas, tickets, recibos simples"
          onPress={() => onNavigate?.('SubirDocumentoNota')}
        />

        {/* ── TAREA 3: MI ASESOR FISCAL ────────────────────── */}
        <Text style={styles.seccion}>Mi asesor fiscal</Text>

        <TouchableOpacity
          style={styles.btnAsesorFiscal}
          onPress={() => onNavigate?.('ChatCliente')}
          activeOpacity={0.85}
        >
          <View style={styles.btnAsesorFiscalIcono}>
            <Text style={{ fontSize: 22 }}>🤖</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.btnAsesorFiscalTitulo}>Chat con tu Contador</Text>
            <Text style={styles.btnAsesorFiscalSub}>Pregunta sobre tus impuestos</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.azul} />
        </TouchableOpacity>

        {/* ── MI EMPRESA ────────────────────────────────────── */}
        <Text style={styles.seccion}>Mi empresa</Text>

        <MenuItem
          icon="cloud-download-outline"
          color={C.azul}
          label="Sincronizar con el SAT"
          sub="Descargar mis facturas del portal SAT"
          onPress={() => onNavigate?.('SyncSAT')}
          disabled={!empresa?.fiel_disponible}
          disabledNote={!empresa?.fiel_disponible ? 'Tu contador debe configurar la e.firma' : null}
        />
        <MenuItem
          icon="document-attach-outline"
          color="#10B981"
          label="Constancia Fiscal (CSF)"
          sub="Subir o actualizar mi Constancia de Situación Fiscal"
          onPress={() => onNavigate?.('SubirCSF')}
        />
        <MenuItem
          icon="person-outline"
          color={C.gris2}
          label="Mi Perfil"
          onPress={() => onNavigate?.('Perfil')}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Componentes ────────────────────────────────────────────

const MenuItem = ({ icon, color, label, sub, onPress, disabled, disabledNote }) => (
  <TouchableOpacity
    style={[styles.menuItem, disabled && styles.menuItemDisabled]}
    onPress={disabled ? null : onPress}
    activeOpacity={disabled ? 1 : 0.7}
  >
    <View style={[styles.menuIcono, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={22} color={disabled ? '#9CA3AF' : color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.menuLabel, disabled && { color: '#9CA3AF' }]}>{label}</Text>
      {(sub || disabledNote) && (
        <Text style={[styles.menuSub, disabledNote && { color: C.amarillo }]}>
          {disabledNote ?? sub}
        </Text>
      )}
    </View>
    {!disabled && <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.gris },
  centrado:{ flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:  { flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 32 },

  header: {
    backgroundColor: C.azul,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
    flexDirection: 'row', alignItems: 'center',
  },
  headerSaludo:  { color: C.blanco, fontSize: 20, fontWeight: '700' },
  headerEmpresa: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  logoutBtn:     { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 8 },

  alertaBox: {
    flexDirection: 'row', backgroundColor: '#FEF3C7',
    borderRadius: 12, padding: 14, gap: 10, alignItems: 'flex-start',
  },
  alertaTxt: { color: '#92400E', fontSize: 13, flex: 1, lineHeight: 19 },

  // ── Botón azul estadísticas (reemplaza verde)
  btnEstadisticas: {
    backgroundColor: C.azul, borderRadius: 18, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: C.azul, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  btnEstadisticasIcono: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  btnEstadisticasTitulo: { color: C.blanco, fontSize: 16, fontWeight: '700' },
  btnEstadisticasSub:    { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },

  // Próxima obligación
  obligacionBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: 14, borderWidth: 1,
  },
  obligacionNormal:  { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  obligacionUrgente: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' },
  obligacionTitulo:  { fontSize: 12, fontWeight: '700', color: C.gris2, textTransform: 'uppercase', letterSpacing: 0.5 },
  obligacionFecha:   { fontSize: 14, fontWeight: '600', color: C.texto, marginTop: 2 },

  // Stats
  seccion:  { fontSize: 12, fontWeight: '700', color: C.gris2, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: C.blanco, borderRadius: 14, padding: 14,
    alignItems: 'flex-start', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statCardAlerta: { backgroundColor: '#FFFBEB' },
  statVal:  { fontSize: 17, fontWeight: '700', color: C.texto },
  statLbl:  { fontSize: 11, color: C.gris2 },

  // ── Asesor fiscal (TAREA 3) — fondo azul claro
  btnAsesorFiscal: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1, borderColor: '#BFDBFE',
    borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  btnAsesorFiscalIcono: {
    width: 42, height: 42, borderRadius: 11,
    backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center',
  },
  btnAsesorFiscalTitulo: { color: '#1E3A8A', fontSize: 14, fontWeight: '700' },
  btnAsesorFiscalSub:    { color: '#3B82F6', fontSize: 11, marginTop: 2 },

  // Menú
  menuItem: {
    backgroundColor: C.blanco, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  menuItemDisabled: { opacity: 0.6 },
  menuIcono: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '600', color: C.texto },
  menuSub:   { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  // Suspensión
  suspView: {
    margin: 24, padding: 32, borderRadius: 20,
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
    alignItems: 'center',
  },
  suspIcono: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#7F1D1D30', borderWidth: 2, borderColor: '#7F1D1D',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  suspTitulo:  { fontSize: 20, fontWeight: '700', color: '#F1F5F9', marginBottom: 12, textAlign: 'center' },
  suspMsg:     { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  suspPasos:   { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  suspBtnReintentar: {
    backgroundColor: '#1D4ED8', borderRadius: 12, paddingVertical: 14,
    paddingHorizontal: 24, width: '100%', alignItems: 'center', marginBottom: 10,
  },
  suspBtnReintentarTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  suspBtnLogout: {
    borderRadius: 12, paddingVertical: 13, paddingHorizontal: 24,
    width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#334155',
  },
  suspBtnLogoutTxt: { color: '#64748B', fontWeight: '500', fontSize: 14 },
});
