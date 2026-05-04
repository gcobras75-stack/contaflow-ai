import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';

const C = {
  azul: '#1B3A6B',
  verde: '#00A651',
  blanco: '#FFFFFF',
  gris: '#F5F5F5',
  texto: '#333333',
  rojo: '#EF4444',
  morado: '#7C3AED',
};

const TIPOS = [
  { ext: 'PDF', icon: 'document-outline', color: '#EF4444' },
  { ext: 'Excel', icon: 'grid-outline', color: '#16A34A' },
  { ext: 'CSV', icon: 'list-outline', color: '#2563EB' },
];

const BANCOS_MX = [
  'BBVA', 'Santander', 'Banamex', 'HSBC', 'Banorte',
  'Scotiabank', 'Inbursa', 'Azteca', 'BanBajío', 'Otro',
];

const WEB_BASE = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://contaflow.mx';

export default function SubirEstadoCuenta({ onBack }) {
  const [etapa, setEtapa] = useState('inicio');
  const [archivo, setArchivo] = useState(null);
  const [bancoSel, setBancoSel] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [analisisIA, setAnalisisIA] = useState('');

  const seleccionarArchivo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/csv', 'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setArchivo({ uri: asset.uri, nombre: asset.name, size: asset.size, mimeType: asset.mimeType });
      inferirPeriodo(asset.name);
      setEtapa('banco');
    } catch {
      mostrarError('No se pudo abrir el selector de archivos.');
    }
  };

  const tomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para fotografiar el estado.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setArchivo({ uri: asset.uri, nombre: `estado_${Date.now()}.jpg`, size: asset.fileSize, mimeType: 'image/jpeg' });
    inferirPeriodo('');
    setEtapa('banco');
  };

  const inferirPeriodo = (nombre) => {
    const match = nombre.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|\d{2}[-_]\d{4}|\d{4}[-_]\d{2})/i);
    if (match) setPeriodo(match[0]);
    else {
      const now = new Date();
      setPeriodo(`${now.toLocaleString('es-MX', { month: 'long' })} ${now.getFullYear()}`);
    }
  };

  const subirArchivo = async () => {
    if (!bancoSel) {
      Alert.alert('Selecciona banco', 'Por favor selecciona el banco del estado de cuenta.');
      return;
    }
    setEtapa('subiendo');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: usuario } = await supabase
        .from('usuarios').select('empresa_id').eq('id', user.id).single();

      const extension = archivo.nombre.split('.').pop() ?? 'bin';
      const filePath = `estados-cuenta/${usuario?.empresa_id ?? user.id}/${Date.now()}.${extension}`;

      const fileContent = await fetch(archivo.uri);
      const blob = await fileContent.blob();

      const { error: storageErr } = await supabase.storage
        .from('archivos-contaflow')
        .upload(filePath, blob, { contentType: archivo.mimeType, upsert: false });

      if (storageErr && storageErr.message !== 'The resource already exists') {
        console.warn('Storage error:', storageErr.message);
      }

      const archivoUrl = storageErr ? null : filePath;

      setEtapa('procesando');

      const { error: dbErr } = await supabase.from('estados_cuenta').insert({
        empresa_id: usuario?.empresa_id ?? null,
        banco: bancoSel,
        periodo: periodo,
        archivo_url: archivoUrl,
        status: 'pendiente',
      });

      if (dbErr) {
        mostrarError(`Error al registrar: ${dbErr.message}`);
        return;
      }

      // Análisis IA
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: usr } = await supabase
          .from('usuarios').select('empresa_id').eq('id', user.id).single();

        const resIA = await fetch(`${WEB_BASE}/api/analizar-estado`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token ?? ''}`,
          },
          body: JSON.stringify({
            empresa_id: usuario?.empresa_id ?? usr?.empresa_id,
            banco: bancoSel,
            periodo,
          }),
        });
        const jsonIA = await resIA.json();
        if (jsonIA.analisis) setAnalisisIA(jsonIA.analisis);
      } catch {
        // Análisis opcional, no bloquear el flujo
      }

      setEtapa('exito');
    } catch {
      mostrarError('Error de conexión al subir el archivo.');
    }
  };

  const mostrarError = (msg) => { setErrorMsg(msg); setEtapa('error'); };
  const reiniciar = () => { setEtapa('inicio'); setArchivo(null); setBancoSel(''); setErrorMsg(''); setAnalisisIA(''); };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.blanco} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Estado de Cuenta</Text>
      </View>

      {etapa === 'inicio' && (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.iconCircle}>
            <Ionicons name="card-outline" size={40} color={C.azul} />
          </View>
          <Text style={styles.title}>Estado de Cuenta</Text>
          <Text style={styles.subtitle}>Sube tu estado de cuenta bancario</Text>
          <View style={styles.tiposRow}>
            {TIPOS.map(t => (
              <View key={t.ext} style={styles.tipoChip}>
                <Ionicons name={t.icon} size={16} color={t.color} />
                <Text style={[styles.tipoTxt, { color: t.color }]}>{t.ext}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.btnPrimary} onPress={seleccionarArchivo}>
            <Ionicons name="folder-open-outline" size={22} color={C.blanco} />
            <Text style={styles.btnPrimaryTxt}>Subir PDF / Excel / CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={tomarFoto}>
            <Ionicons name="camera-outline" size={22} color={C.azul} />
            <Text style={styles.btnSecondaryTxt}>Tomar foto del estado</Text>
          </TouchableOpacity>
          <View style={styles.infoBox}>
            <Ionicons name="sparkles-outline" size={16} color={C.morado} />
            <Text style={styles.infoTxt}>
              Claude AI analizará el estado y extraerá todos los movimientos para la conciliación.
            </Text>
          </View>
        </ScrollView>
      )}

      {etapa === 'banco' && (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={[styles.iconCircle, { backgroundColor: '#F0F4FF' }]}>
            <Ionicons name="checkmark-circle" size={36} color={C.azul} />
          </View>
          <Text style={styles.title}>Archivo seleccionado</Text>
          <View style={styles.card}>
            <View style={styles.rowIcon}>
              <Ionicons name="document-attach-outline" size={18} color="#6B7280" />
              <Text style={styles.archivoNombre} numberOfLines={1}>{archivo?.nombre}</Text>
            </View>
          </View>
          <Text style={[styles.title, { fontSize: 16, alignSelf: 'flex-start' }]}>Selecciona el banco</Text>
          <View style={styles.bancosGrid}>
            {BANCOS_MX.map(b => (
              <TouchableOpacity
                key={b}
                style={[styles.bancoChip, bancoSel === b && styles.bancoChipSel]}
                onPress={() => setBancoSel(b)}
              >
                <Text style={[styles.bancoTxt, bancoSel === b && styles.bancoTxtSel]}>{b}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.btnPrimary, !bancoSel && styles.btnDisabled]}
            onPress={subirArchivo}
            disabled={!bancoSel}
          >
            <Ionicons name="cloud-upload-outline" size={22} color={C.blanco} />
            <Text style={styles.btnPrimaryTxt}>Subir estado de cuenta</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={reiniciar}>
            <Text style={styles.btnSecondaryTxt}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {etapa === 'subiendo' && (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={C.azul} />
          <Text style={styles.loadingTxt}>Subiendo archivo a Supabase...</Text>
        </View>
      )}

      {etapa === 'procesando' && (
        <View style={styles.centrado}>
          <View style={styles.aiCircle}>
            <Ionicons name="sparkles" size={36} color={C.morado} />
          </View>
          <Text style={styles.title}>Procesando con IA...</Text>
          <ActivityIndicator size="small" color={C.morado} />
          <Text style={styles.subtitle}>Claude AI está analizando los movimientos del estado de cuenta.</Text>
        </View>
      )}

      {etapa === 'exito' && (
        <ScrollView contentContainerStyle={[styles.body, { alignItems: 'stretch' }]}>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Ionicons name="checkmark-done-circle" size={72} color={C.verde} />
            <Text style={[styles.title, { color: C.verde }]}>Estado registrado</Text>
            <Text style={styles.exitoSub}>
              Banco: {bancoSel}{'  ·  '}Período: {periodo}
            </Text>
          </View>

          {analisisIA ? (
            <View style={styles.analisisBox}>
              <View style={styles.analisisHeader}>
                <Ionicons name="sparkles" size={16} color={C.morado} />
                <Text style={styles.analisisTitulo}>Análisis IA · CPC Ricardo Morales</Text>
              </View>
              <Text style={styles.analisisTxt}>{analisisIA}</Text>
            </View>
          ) : (
            <View style={[styles.analisisBox, { alignItems: 'center' }]}>
              <ActivityIndicator size="small" color={C.morado} />
              <Text style={[styles.analisisTxt, { textAlign: 'center', color: '#6B7280' }]}>
                Analizando estado de cuenta con IA...
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.btnPrimary} onPress={reiniciar}>
            <Ionicons name="add-circle-outline" size={22} color={C.blanco} />
            <Text style={styles.btnPrimaryTxt}>Subir otro estado</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBack} style={{ alignSelf: 'center', marginTop: 4 }}>
            <Text style={styles.link}>Volver al inicio</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {etapa === 'error' && (
        <View style={styles.centrado}>
          <Ionicons name="alert-circle" size={64} color={C.rojo} />
          <Text style={[styles.title, { color: C.rojo }]}>Ocurrió un error</Text>
          <Text style={styles.errorMsg}>{errorMsg}</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={reiniciar}>
            <Text style={styles.btnPrimaryTxt}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      )}
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
  body: { padding: 20, alignItems: 'center', gap: 14, flexGrow: 1 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EEF2FA', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  aiCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  title: { fontSize: 22, fontWeight: '700', color: C.texto },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  tiposRow: { flexDirection: 'row', gap: 10 },
  tipoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.blanco, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#E0E0E8',
  },
  tipoTxt: { fontSize: 12, fontWeight: '600' },
  btnPrimary: {
    width: '100%', backgroundColor: C.verde, borderRadius: 12,
    paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnPrimaryTxt: { color: C.blanco, fontWeight: '700', fontSize: 15 },
  btnSecondary: {
    width: '100%', backgroundColor: C.blanco, borderRadius: 12,
    paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: '#E0E0E8',
  },
  btnSecondaryTxt: { color: C.azul, fontWeight: '600', fontSize: 15 },
  link: { color: C.azul, fontWeight: '600', fontSize: 14 },
  infoBox: {
    flexDirection: 'row', backgroundColor: '#FAF5FF',
    borderRadius: 10, padding: 12, gap: 8, width: '100%',
  },
  infoTxt: { color: '#4B5563', fontSize: 12, flex: 1, lineHeight: 18 },
  card: {
    backgroundColor: C.blanco, borderRadius: 14, padding: 14, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  rowIcon: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  archivoNombre: { fontSize: 13, color: C.texto, flex: 1, fontWeight: '500' },
  bancosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  bancoChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.blanco, borderWidth: 1, borderColor: '#E0E0E8',
  },
  bancoChipSel: { backgroundColor: C.azul, borderColor: C.azul },
  bancoTxt: { fontSize: 13, fontWeight: '500', color: C.texto },
  bancoTxtSel: { color: C.blanco },
  loadingTxt: { color: C.azul, fontWeight: '600', marginTop: 12 },
  exitoSub: { color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  errorMsg: { color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  analisisBox: {
    backgroundColor: C.blanco, borderRadius: 12, padding: 14, gap: 10,
    borderLeftWidth: 3, borderLeftColor: C.morado,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  analisisHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  analisisTitulo: { fontSize: 12, fontWeight: '700', color: C.morado },
  analisisTxt: { fontSize: 13, color: C.texto, lineHeight: 20 },
});
