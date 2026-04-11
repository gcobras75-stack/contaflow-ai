import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const C = {
  azul: '#1B3A6B',
  verde: '#00A651',
  blanco: '#FFFFFF',
  gris: '#F5F5F5',
  texto: '#333333',
  rojo: '#EF4444',
  amarillo: '#F59E0B',
};

const WEB_BASE = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://contaflow-ai.vercel.app';

const PERIODOS = [
  { label: 'Mes actual',        dias: 30  },
  { label: 'Últimos 3 meses',   dias: 90  },
  { label: 'Últimos 6 meses',   dias: 180 },
  { label: 'Último año',        dias: 365 },
];

export default function SyncSAT({ onBack }) {
  const [periodoDias, setPeriodoDias] = useState(30);
  const [tipo, setTipo]               = useState('ambos');
  const [sincronizando, setSincronizando] = useState(false);
  const [paso, setPaso]               = useState('');
  const [resultado, setResultado]     = useState(null);
  const [sinFiel, setSinFiel]         = useState(false);

  const sincronizar = async () => {
    setSincronizando(true);
    setResultado(null);
    setPaso('Conectando con el SAT...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSincronizando(false); return; }

      const { data: usr } = await supabase
        .from('usuarios').select('empresa_id').eq('id', user.id).single();
      if (!usr?.empresa_id) { setSincronizando(false); return; }

      // Verificar FIEL
      const { data: emp } = await supabase
        .from('empresas_clientes')
        .select('fiel_disponible, nombre')
        .eq('id', usr.empresa_id)
        .single();

      if (!emp?.fiel_disponible) {
        setSinFiel(true);
        setSincronizando(false);
        return;
      }

      const hoy      = new Date().toISOString().slice(0, 10);
      const inicio   = new Date(Date.now() - periodoDias * 86400000).toISOString().slice(0, 10);

      setPaso('Solicitando descarga al SAT (puede tardar 1–2 min)...');

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${WEB_BASE}/api/descargar-sat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          empresa_id:   usr.empresa_id,
          fecha_inicio: inicio,
          fecha_fin:    hoy,
          tipo,
        }),
      });

      const json = await res.json();
      setResultado({
        ok:         !json.error,
        importados: json.importados ?? 0,
        duplicados: json.duplicados ?? 0,
        errores:    json.errores ?? [],
        error:      json.error,
        empresa:    emp.nombre,
      });
    } catch {
      setResultado({ ok: false, error: 'Error de conexión', importados: 0, duplicados: 0, errores: [] });
    } finally {
      setPaso('');
      setSincronizando(false);
    }
  };

  if (sinFiel) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={C.blanco} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Sincronizar SAT</Text>
        </View>
        <View style={styles.centrado}>
          <Ionicons name="key-outline" size={56} color={C.amarillo} />
          <Text style={styles.titulo}>FIEL no configurada</Text>
          <Text style={styles.subtitulo}>
            Tu despacho contable debe configurar tu e.firma (FIEL) desde el panel web de ContaFlow para poder sincronizar con el SAT.
          </Text>
          <TouchableOpacity style={styles.btnSecondary} onPress={onBack}>
            <Text style={styles.btnSecondaryTxt}>Volver</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Sincronizar con SAT</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.infoBox}>
          <Ionicons name="cloud-download-outline" size={18} color={C.azul} />
          <Text style={styles.infoTxt}>
            Descarga tus facturas directamente del portal del SAT usando tu e.firma.
          </Text>
        </View>

        {/* Período */}
        <Text style={styles.seccionLabel}>Período a descargar</Text>
        <View style={styles.opcionesGrid}>
          {PERIODOS.map(p => (
            <TouchableOpacity
              key={p.dias}
              style={[styles.opcionBtn, periodoDias === p.dias && styles.opcionBtnSel]}
              onPress={() => setPeriodoDias(p.dias)}
            >
              <Text style={[styles.opcionTxt, periodoDias === p.dias && styles.opcionTxtSel]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tipo */}
        <Text style={styles.seccionLabel}>Tipo de facturas</Text>
        <View style={styles.tipoRow}>
          {[
            { val: 'ambos',     label: 'Todas'     },
            { val: 'emitidos',  label: 'Emitidas'  },
            { val: 'recibidos', label: 'Recibidas' },
          ].map(t => (
            <TouchableOpacity
              key={t.val}
              style={[styles.tipoBtn, tipo === t.val && styles.tipoBtnSel]}
              onPress={() => setTipo(t.val)}
            >
              <Text style={[styles.tipoTxt, tipo === t.val && styles.tipoTxtSel]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.avisoBox}>
          <Ionicons name="time-outline" size={14} color={C.amarillo} />
          <Text style={styles.avisoTxt}>
            El SAT puede tardar 1–2 minutos en preparar los paquetes. No cierres la app.
          </Text>
        </View>

        {/* Botón */}
        <TouchableOpacity
          style={[styles.btnPrimary, sincronizando && styles.btnDisabled]}
          onPress={sincronizar}
          disabled={sincronizando}
        >
          {sincronizando ? (
            <>
              <ActivityIndicator size="small" color={C.blanco} />
              <Text style={styles.btnTxt}>{paso || 'Descargando...'}</Text>
            </>
          ) : (
            <>
              <Ionicons name="sync-outline" size={20} color={C.blanco} />
              <Text style={styles.btnTxt}>Sincronizar ahora</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Resultado */}
        {resultado && (
          <View style={[styles.resultadoBox, resultado.ok ? styles.resultadoOk : styles.resultadoErr]}>
            {resultado.ok ? (
              <>
                <Ionicons name="checkmark-circle" size={24} color={C.verde} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultadoTitulo}>Sincronización completada</Text>
                  <Text style={styles.resultadoSub}>
                    {resultado.importados} facturas nuevas
                    {resultado.duplicados > 0 ? ` · ${resultado.duplicados} ya existían` : ''}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Ionicons name="alert-circle" size={24} color={C.rojo} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultadoTitulo, { color: C.rojo }]}>Error en sincronización</Text>
                  <Text style={styles.resultadoSub}>{resultado.error}</Text>
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gris },
  header: {
    backgroundColor: C.azul, paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 6 },
  headerTitle: { color: C.blanco, fontSize: 18, fontWeight: '700' },
  body: { padding: 16, gap: 12 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  infoBox: {
    flexDirection: 'row', backgroundColor: '#EEF2FA',
    borderRadius: 12, padding: 12, gap: 8, alignItems: 'center',
  },
  infoTxt: { color: C.azul, fontSize: 13, flex: 1, lineHeight: 18 },
  seccionLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  opcionesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcionBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.blanco, borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  opcionBtnSel: { backgroundColor: C.azul, borderColor: C.azul },
  opcionTxt: { fontSize: 13, fontWeight: '500', color: C.texto },
  opcionTxtSel: { color: C.blanco },
  tipoRow: { flexDirection: 'row', gap: 8 },
  tipoBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: C.blanco, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center',
  },
  tipoBtnSel: { backgroundColor: C.azul, borderColor: C.azul },
  tipoTxt: { fontSize: 13, fontWeight: '500', color: C.texto },
  tipoTxtSel: { color: C.blanco },
  avisoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  avisoTxt: { fontSize: 11, color: '#92400E', flex: 1, lineHeight: 16 },
  btnPrimary: {
    backgroundColor: C.verde, borderRadius: 14, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnTxt: { color: C.blanco, fontWeight: '700', fontSize: 15 },
  btnSecondary: {
    backgroundColor: C.blanco, borderRadius: 14, paddingVertical: 14,
    width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
  },
  btnSecondaryTxt: { color: C.azul, fontWeight: '600', fontSize: 15 },
  titulo: { fontSize: 20, fontWeight: '700', color: C.texto, textAlign: 'center' },
  subtitulo: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21 },
  resultadoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: 14,
  },
  resultadoOk: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  resultadoErr: { backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3' },
  resultadoTitulo: { fontSize: 14, fontWeight: '700', color: C.texto },
  resultadoSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
