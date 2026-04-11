import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';

const C = {
  azul:     '#1B3A6B',
  verde:    '#00A651',
  blanco:   '#FFFFFF',
  gris:     '#F5F5F5',
  texto:    '#333333',
  rojo:     '#EF4444',
  gris2:    '#6B7280',
  borde:    '#E5E7EB',
};

const TIPOS = [
  { val: 'factura_fisica', label: 'Factura',        icon: 'receipt-outline',       color: '#3B82F6' },
  { val: 'nota',           label: 'Nota / Ticket',  icon: 'document-text-outline', color: '#8B5CF6' },
  { val: 'estado_cuenta',  label: 'Estado de Cuenta', icon: 'card-outline',        color: '#F59E0B' },
  { val: 'comprobante',    label: 'Comprobante',    icon: 'checkmark-circle-outline', color: '#10B981' },
  { val: 'contrato',       label: 'Contrato',       icon: 'document-attach-outline', color: '#EF4444' },
  { val: 'otro',           label: 'Otro',           icon: 'ellipsis-horizontal-circle-outline', color: '#6B7280' },
];

export default function SubirDocumento({ onBack, tipoPreseleccionado = null }) {
  const [etapa, setEtapa]         = useState(tipoPreseleccionado ? 'captura' : 'tipo');
  const [tipo, setTipo]           = useState(tipoPreseleccionado);
  const [archivo, setArchivo]     = useState(null);     // { uri, nombre, base64, esImagen }
  const [descripcion, setDescripcion] = useState('');
  const [errorMsg, setErrorMsg]   = useState('');

  const tipoSeleccionado = TIPOS.find(t => t.val === tipo);

  // ── Selección fuente ───────────────────────────────────────
  const tomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara para tomar fotos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setArchivo({ uri: asset.uri, nombre: `doc_${Date.now()}.jpg`, base64: asset.base64, esImagen: true });
      setEtapa('descripcion');
    }
  };

  const seleccionarGaleria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setArchivo({ uri: asset.uri, nombre: `doc_${Date.now()}.jpg`, base64: asset.base64, esImagen: true });
      setEtapa('descripcion');
    }
  };

  const seleccionarPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setArchivo({ uri: asset.uri, nombre: asset.name, base64, esImagen: false });
      setEtapa('descripcion');
    } catch {
      Alert.alert('Error', 'No se pudo abrir el archivo.');
    }
  };

  // ── Subir a Supabase ────────────────────────────────────────
  const subirDocumento = async () => {
    if (!archivo) return;
    setEtapa('subiendo');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setEtapa('error'); setErrorMsg('Sesión expirada.'); return; }

      const { data: usr } = await supabase
        .from('usuarios').select('empresa_id').eq('id', user.id).single();
      if (!usr?.empresa_id) { setEtapa('error'); setErrorMsg('Sin empresa vinculada.'); return; }

      // Subir archivo al bucket
      const ext        = archivo.esImagen ? 'jpg' : 'pdf';
      const path       = `${usr.empresa_id}/${tipo}/${Date.now()}.${ext}`;
      const mimeType   = archivo.esImagen ? 'image/jpeg' : 'application/pdf';
      const byteArray  = Uint8Array.from(atob(archivo.base64), c => c.charCodeAt(0));

      const { error: uploadError } = await supabase.storage
        .from('documentos-cliente')
        .upload(path, byteArray, { contentType: mimeType, upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documentos-cliente')
        .getPublicUrl(path);

      // Guardar en BD
      const { error: dbError } = await supabase.from('documentos').insert({
        empresa_id:  usr.empresa_id,
        tipo,
        archivo_url: publicUrl,
        descripcion: descripcion.trim() || null,
        fecha_doc:   new Date().toISOString().slice(0, 10),
        status:      'pendiente',
      });

      if (dbError) throw dbError;
      setEtapa('exito');
    } catch (e) {
      setEtapa('error');
      setErrorMsg(e?.message ?? 'Error al subir el documento.');
    }
  };

  const reiniciar = () => {
    setEtapa('tipo');
    setTipo(null);
    setArchivo(null);
    setDescripcion('');
    setErrorMsg('');
  };

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={etapa === 'tipo' ? onBack : reiniciar} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.blanco} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subir documento</Text>
      </View>

      {/* ── PASO 1: Elegir tipo ── */}
      {etapa === 'tipo' && (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.pasoLabel}>¿Qué tipo de documento es?</Text>
          <View style={styles.tiposGrid}>
            {TIPOS.map(t => (
              <TouchableOpacity
                key={t.val}
                style={[styles.tipoCard, tipo === t.val && { borderColor: t.color, borderWidth: 2.5 }]}
                onPress={() => setTipo(t.val)}
              >
                <View style={[styles.tipoIcono, { backgroundColor: t.color + '18' }]}>
                  <Ionicons name={t.icon} size={26} color={t.color} />
                </View>
                <Text style={styles.tipoLabel}>{t.label}</Text>
                {tipo === t.val && (
                  <View style={[styles.tipoCheck, { backgroundColor: t.color }]}>
                    <Ionicons name="checkmark" size={12} color={C.blanco} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {tipo && (
            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: tipoSeleccionado?.color }]}
              onPress={() => setEtapa('captura')}
            >
              <Ionicons name="arrow-forward" size={20} color={C.blanco} />
              <Text style={styles.btnTxt}>Continuar</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* ── PASO 2: Elegir fuente ── */}
      {etapa === 'captura' && (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.tipoBadge}>
            <Ionicons name={tipoSeleccionado?.icon} size={16} color={tipoSeleccionado?.color} />
            <Text style={[styles.tipoBadgeTxt, { color: tipoSeleccionado?.color }]}>
              {tipoSeleccionado?.label}
            </Text>
          </View>
          <Text style={styles.pasoLabel}>¿Cómo quieres subir el documento?</Text>

          <TouchableOpacity style={styles.opcionBtn} onPress={tomarFoto}>
            <View style={[styles.opcionIcono, { backgroundColor: '#EEF2FA' }]}>
              <Ionicons name="camera" size={28} color={C.azul} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.opcionTitulo}>Tomar foto</Text>
              <Text style={styles.opcionSub}>Abre la cámara para fotografiar el documento</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.opcionBtn} onPress={seleccionarGaleria}>
            <View style={[styles.opcionIcono, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="images" size={28} color={C.verde} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.opcionTitulo}>Desde galería</Text>
              <Text style={styles.opcionSub}>Selecciona una foto que ya tomaste</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.opcionBtn} onPress={seleccionarPDF}>
            <View style={[styles.opcionIcono, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="document-attach" size={28} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.opcionTitulo}>Archivo PDF</Text>
              <Text style={styles.opcionSub}>Sube un PDF desde tu teléfono</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── PASO 3: Descripción opcional ── */}
      {etapa === 'descripcion' && (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.archivoPreview}>
            <Ionicons name="document-text" size={32} color={tipoSeleccionado?.color} />
            <View style={{ flex: 1 }}>
              <Text style={styles.archivoNombre} numberOfLines={1}>{archivo?.nombre}</Text>
              <Text style={styles.archivoTipo}>{tipoSeleccionado?.label}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={C.verde} />
          </View>

          <Text style={styles.pasoLabel}>Agrega una nota (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Factura de gasolina, compra de materiales, etc."
            placeholderTextColor="#9CA3AF"
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity style={styles.btnPrimary} onPress={subirDocumento}>
            <Ionicons name="cloud-upload-outline" size={20} color={C.blanco} />
            <Text style={styles.btnTxt}>Enviar a mi contador</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} onPress={subirDocumento}>
            <Text style={styles.btnSecondaryTxt}>Subir sin nota</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Subiendo ── */}
      {etapa === 'subiendo' && (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={C.azul} />
          <Text style={styles.cargandoTxt}>Enviando documento...</Text>
          <Text style={styles.cargandoSub}>Tu contador lo recibirá en segundos</Text>
        </View>
      )}

      {/* ── Éxito ── */}
      {etapa === 'exito' && (
        <View style={styles.centrado}>
          <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="checkmark-circle" size={52} color={C.verde} />
          </View>
          <Text style={styles.exitoTitulo}>¡Documento enviado!</Text>
          <Text style={styles.exitoSub}>
            Tu contador recibió el documento y lo revisará pronto.
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={reiniciar}>
            <Ionicons name="add" size={20} color={C.blanco} />
            <Text style={styles.btnTxt}>Subir otro documento</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={onBack}>
            <Text style={styles.btnSecondaryTxt}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Error ── */}
      {etapa === 'error' && (
        <View style={styles.centrado}>
          <View style={[styles.iconCircle, { backgroundColor: '#FFF1F2' }]}>
            <Ionicons name="alert-circle" size={52} color={C.rojo} />
          </View>
          <Text style={[styles.exitoTitulo, { color: C.rojo }]}>Error al subir</Text>
          <Text style={styles.exitoSub}>{errorMsg}</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={reiniciar}>
            <Text style={styles.btnTxt}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: C.gris },
  header:     {
    backgroundColor: C.azul, paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn:    { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 6 },
  headerTitle:{ color: C.blanco, fontSize: 18, fontWeight: '700' },
  body:       { padding: 20, gap: 14 },
  centrado:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 },

  pasoLabel:  { fontSize: 16, fontWeight: '700', color: C.texto, marginBottom: 4 },

  tiposGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tipoCard:   {
    width: '47%', backgroundColor: C.blanco, borderRadius: 14,
    padding: 16, alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: C.borde,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  tipoIcono:  { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tipoLabel:  { fontSize: 13, fontWeight: '600', color: C.texto, textAlign: 'center' },
  tipoCheck:  {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },

  tipoBadge:  {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.blanco, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start', borderWidth: 1, borderColor: C.borde,
  },
  tipoBadgeTxt: { fontSize: 13, fontWeight: '600' },

  opcionBtn:  {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.blanco, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.borde,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  opcionIcono:{ width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  opcionTitulo:{ fontSize: 15, fontWeight: '700', color: C.texto },
  opcionSub:  { fontSize: 12, color: C.gris2, marginTop: 2 },

  archivoPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.blanco, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: C.borde,
  },
  archivoNombre: { fontSize: 14, fontWeight: '600', color: C.texto },
  archivoTipo:   { fontSize: 12, color: C.gris2, marginTop: 2 },

  input: {
    backgroundColor: C.blanco, borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: C.borde,
    fontSize: 14, color: C.texto, textAlignVertical: 'top', minHeight: 80,
  },

  btnPrimary: {
    backgroundColor: C.azul, borderRadius: 14, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, width: '100%',
  },
  btnTxt:     { color: C.blanco, fontWeight: '700', fontSize: 15 },
  btnSecondary: {
    backgroundColor: C.blanco, borderRadius: 14, paddingVertical: 14,
    width: '100%', alignItems: 'center', borderWidth: 1.5, borderColor: C.borde,
  },
  btnSecondaryTxt: { color: C.azul, fontWeight: '600', fontSize: 15 },

  cargandoTxt:  { fontSize: 18, fontWeight: '700', color: C.texto, marginTop: 12 },
  cargandoSub:  { fontSize: 13, color: C.gris2 },
  iconCircle:   { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  exitoTitulo:  { fontSize: 22, fontWeight: '700', color: C.texto, textAlign: 'center' },
  exitoSub:     { fontSize: 14, color: C.gris2, textAlign: 'center', lineHeight: 21 },
});
