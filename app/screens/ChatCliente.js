import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const C = {
  azul:    '#1B3A6B',
  verde:   '#00A651',
  blanco:  '#FFFFFF',
  gris:    '#F5F5F5',
  texto:   '#333333',
  gris2:   '#6B7280',
  borde:   '#E5E7EB',
  morado:  '#7C3AED',
};

const WEB_BASE = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://contaflow.mx';

const SUGERENCIAS = [
  '¿Cuánto voy a pagar de impuestos este mes? 💰',
  '¿Qué gastos puedo deducir en mi negocio? 🧾',
  '¿Cómo funciona el RESICO? 📋',
  '¿Cuándo son mis próximas declaraciones? 📅',
  '¿Puedo deducir la gasolina y mi celular? 🚗📱',
  '¿Qué pasa si no declaro a tiempo? ⚠️',
];

function AvatarAsesor() {
  return (
    <View style={styles.avatarCircle}>
      <Text style={styles.avatarEmoji}>🤖</Text>
    </View>
  );
}

export default function ChatCliente({ onBack }) {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [cargando, setCargando]   = useState(false);
  const [empresa, setEmpresa]     = useState(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const scrollRef                 = useRef(null);

  useEffect(() => {
    inicializar();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const inicializar = async () => {
    await cargarEmpresa();
    await cargarHistorialPersistente();
    setCargandoHistorial(false);
  };

  const cargarEmpresa = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: usr } = await supabase
      .from('usuarios').select('empresa_id, nombre').eq('id', user.id).single();
    if (usr?.empresa_id) {
      const { data: emp } = await supabase
        .from('empresas_clientes')
        .select('nombre, giro, regimen_fiscal')
        .eq('id', usr.empresa_id)
        .single();
      setEmpresa(emp);
    }
  };

  const cargarHistorialPersistente = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`${WEB_BASE}/api/chat-cliente`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (Array.isArray(json.mensajes) && json.mensajes.length > 0) {
        setMessages(json.mensajes);
      }
    } catch {
      // silencioso
    }
  };

  const enviar = async (texto) => {
    const pregunta = (texto ?? input).trim();
    if (!pregunta || cargando) return;
    setInput('');

    setMessages(prev => [...prev, { role: 'user', content: pregunta }]);
    setCargando(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${WEB_BASE}/api/chat-cliente`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ content: pregunta }),
      });
      const json = await res.json();

      if (res.status === 429) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⏸️ Has alcanzado el límite de 20 mensajes por hora. Inténtalo más tarde.',
        }]);
      } else if (json.respuesta || json.reply) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: json.respuesta ?? json.reply,
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Hubo un error, intenta de nuevo.${json.error ? ' (' + json.error + ')' : ''}`,
        }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error de conexión. Verifica tu internet.' }]);
    } finally {
      setCargando(false);
    }
  };

  const limpiarHistorial = () => {
    Alert.alert(
      '¿Limpiar historial?',
      'Se borrarán todas tus conversaciones anteriores con el Asesor ContaFlow.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const res = await fetch(`${WEB_BASE}/api/chat-cliente`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
              });
              if (res.ok) {
                setMessages([]);
              } else {
                const json = await res.json().catch(() => ({}));
                Alert.alert('Error', json.error ?? 'No se pudo limpiar');
              }
            } catch {
              Alert.alert('Error', 'Sin conexión');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.root}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.blanco} />
        </TouchableOpacity>
        <AvatarAsesor />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerNombre}>Asesor ContaFlow</Text>
          <Text style={styles.headerSub}>
            {cargandoHistorial
              ? 'Cargando historial...'
              : empresa?.regimen_fiscal
                ? empresa.regimen_fiscal.replace('Régimen ', '')
                : 'Experto en leyes fiscales mexicanas'}
          </Text>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={limpiarHistorial} style={styles.backBtn}>
            <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.chat}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >

          {/* Bienvenida */}
          {messages.length === 0 && (
            <View style={styles.bienvenida}>
              <View style={styles.bienvenidaAvatar}>
                <Text style={{ fontSize: 36 }}>🤖</Text>
              </View>
              <Text style={styles.bienvenidaTitulo}>
                Hola{empresa ? `, soy tu asesor para` : ''} 👋
              </Text>
              {empresa && (
                <Text style={styles.bienvenidaEmpresa}>{empresa.nombre}</Text>
              )}
              <Text style={styles.bienvenidaSub}>
                Pregúntame cualquier cosa sobre impuestos, deducciones,
                declaraciones o tu negocio. Te respondo en lenguaje sencillo.
              </Text>

              {/* Sugerencias */}
              <View style={styles.sugerencias}>
                {SUGERENCIAS.map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.sugerenciaBtn}
                    onPress={() => enviar(s)}
                  >
                    <Text style={styles.sugerenciaTxt}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Mensajes */}
          {messages.map((msg, i) => (
            <View
              key={i}
              style={[
                styles.msgRow,
                msg.role === 'user' ? styles.msgRowUser : styles.msgRowBot,
              ]}
            >
              {msg.role === 'assistant' && (
                <View style={styles.msgAvatar}>
                  <Text style={{ fontSize: 14 }}>🤖</Text>
                </View>
              )}
              <View style={[
                styles.msgBurbuja,
                msg.role === 'user' ? styles.burbujaUser : styles.burbujaBot,
              ]}>
                <Text style={[
                  styles.msgTxt,
                  msg.role === 'user' && { color: C.blanco },
                ]}>
                  {msg.content}
                </Text>
              </View>
            </View>
          ))}

          {/* Indicador escribiendo */}
          {cargando && (
            <View style={[styles.msgRow, styles.msgRowBot]}>
              <View style={styles.msgAvatar}>
                <Text style={{ fontSize: 14 }}>🤖</Text>
              </View>
              <View style={styles.burbujaBot}>
                <ActivityIndicator size="small" color={C.gris2} />
              </View>
            </View>
          )}

        </ScrollView>

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Escribe tu pregunta..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
            onSubmitEditing={() => enviar()}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || cargando) && styles.sendBtnDisabled]}
            onPress={() => enviar()}
            disabled={!input.trim() || cargando}
          >
            <Ionicons name="send" size={18} color={C.blanco} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.gris },

  header: {
    backgroundColor: C.azul,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  backBtn:      { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 6 },
  avatarCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji:  { fontSize: 20 },
  headerNombre: { color: C.blanco, fontSize: 15, fontWeight: '700' },
  headerSub:    { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 1 },
  onlineDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: C.verde },

  chat:        { flex: 1 },
  chatContent: { padding: 16, gap: 12, paddingBottom: 8 },

  bienvenida:       { alignItems: 'center', gap: 10, paddingVertical: 8 },
  bienvenidaAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EEF2FA', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  bienvenidaTitulo:  { fontSize: 18, fontWeight: '700', color: C.texto, textAlign: 'center' },
  bienvenidaEmpresa: { fontSize: 14, fontWeight: '600', color: C.azul, textAlign: 'center' },
  bienvenidaSub:     { fontSize: 13, color: C.gris2, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },

  sugerencias:   { width: '100%', gap: 8, marginTop: 8 },
  sugerenciaBtn: {
    backgroundColor: C.blanco, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.borde,
  },
  sugerenciaTxt: { fontSize: 13, color: C.azul, fontWeight: '500' },

  msgRow:     { flexDirection: 'row', gap: 8, maxWidth: '90%' },
  msgRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgRowBot:  { alignSelf: 'flex-start' },

  msgAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#EEF2FA', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 2,
  },

  msgBurbuja: { borderRadius: 16, padding: 12, maxWidth: '85%' },
  burbujaUser: { backgroundColor: C.azul, borderBottomRightRadius: 4 },
  burbujaBot:  { backgroundColor: C.blanco, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.borde },

  msgTxt: { fontSize: 14, color: C.texto, lineHeight: 20 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    backgroundColor: C.blanco, paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: C.borde,
  },
  input: {
    flex: 1, backgroundColor: C.gris, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: C.texto, maxHeight: 100,
    borderWidth: 1, borderColor: C.borde,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.azul, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#9CA3AF' },
});
