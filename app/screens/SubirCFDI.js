import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = {
  azul: '#1B3A6B',
  verde: '#00A651',
  blanco: '#FFFFFF',
  gris: '#F5F5F5',
  texto: '#333333',
};

export default function SubirCFDI({ onBack }) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.blanco} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>SubirCFDI</Text>
      </View>
      <View style={styles.body}>
        <Ionicons name="document-attach-outline" size={64} color="#C0CBD8" />
        <Text style={styles.title}>SubirCFDI</Text>
        <Text style={styles.sub}>En construcción</Text>
        <Text style={styles.desc}>Esta pantalla estará disponible próximamente</Text>
      </View>
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
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 6,
  },
  headerTitle: { color: C.blanco, fontSize: 18, fontWeight: '700' },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  title: { fontSize: 22, fontWeight: '700', color: C.texto, marginTop: 16 },
  sub: { fontSize: 16, color: C.verde, fontWeight: '600' },
  desc: { fontSize: 13, color: '#999', textAlign: 'center', marginTop: 4 },
});
