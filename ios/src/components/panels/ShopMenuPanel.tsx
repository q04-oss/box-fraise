import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePanel } from '../../context/PanelContext';
import { useColors, fonts, SPACING } from '../../theme';
import {
  fetchMenuItems, createMenuItemForShop, updateMenuItemForShop, deleteMenuItemForShop,
} from '../../lib/api';

const CATEGORIES = ['amuse', 'starter', 'main', 'dessert', 'drink', 'side'];
const TAG_HINT = 'Suggested: high-protein · low-sugar · high-fiber · light · indulgent · vegan · anti-inflammatory';

export default function ShopMenuPanel() {
  const { goBack, panelData } = usePanel();
  const c = useColors();
  const insets = useSafeAreaInsets();

  // All hooks before any conditional return
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [category, setCategory] = useState('main');
  const [tagsStr, setTagsStr] = useState('');

  const businessId: number | null = panelData?.businessId ?? panelData?.business_id ?? null;

  const loadItems = async () => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    try { setItems(await fetchMenuItems(businessId)); } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadItems(); }, []);

  const openAdd = () => {
    setEditingItem(null);
    setName('');
    setDescription('');
    setPriceStr('');
    setCategory('main');
    setTagsStr('');
    setAdding(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setName(item.name ?? '');
    setDescription(item.description ?? '');
    setPriceStr(item.price_cents ? (item.price_cents / 100).toFixed(2) : '');
    setCategory(item.category ?? 'main');
    setTagsStr(Array.isArray(item.tags) ? item.tags.join(', ') : '');
    setAdding(true);
  };

  const cancelForm = () => {
    setAdding(false);
    setEditingItem(null);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    setSaving(true);
    try {
      const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
      const price = priceStr.trim() ? Math.round(parseFloat(priceStr) * 100) : undefined;
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        price_cents: price,
        category,
        tags,
      };
      if (editingItem) {
        const updated = await updateMenuItemForShop(editingItem.id, payload);
        setItems(prev => prev.map(i => i.id === editingItem.id ? updated : i));
      } else {
        const created = await createMenuItemForShop(payload);
        setItems(prev => [...prev, created]);
      }
      setAdding(false);
      setEditingItem(null);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save item.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (item: any) => {
    Alert.alert(`Remove "${item.name}"?`, 'This will hide the item from the menu.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          await deleteMenuItemForShop(item.id).catch(() => {});
          setItems(prev => prev.filter(i => i.id !== item.id));
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.panelBg, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity
          onPress={adding ? cancelForm : goBack}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={[styles.backBtnText, { color: c.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text, fontFamily: fonts.dmMono }]}>MENU</Text>
        {!adding ? (
          <TouchableOpacity onPress={openAdd} style={styles.addBtn} activeOpacity={0.7}>
            <Text style={[styles.addBtnText, { color: c.accent }]}>+</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.addBtn} />
        )}
      </View>

      {/* Add / Edit form */}
      {adding && (
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[styles.fieldLabel, { color: c.muted }]}>ITEM NAME</Text>
          <TextInput
            style={[styles.input, { color: c.text, borderColor: c.border }]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Strawberry mille-feuille"
            placeholderTextColor={c.muted}
          />

          <Text style={[styles.fieldLabel, { color: c.muted }]}>DESCRIPTION</Text>
          <TextInput
            style={[styles.input, styles.inputMulti, { color: c.text, borderColor: c.border }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional detail…"
            placeholderTextColor={c.muted}
            multiline
          />

          <Text style={[styles.fieldLabel, { color: c.muted }]}>PRICE (CA$)</Text>
          <TextInput
            style={[styles.input, { color: c.text, borderColor: c.border }]}
            value={priceStr}
            onChangeText={setPriceStr}
            placeholder="0.00"
            placeholderTextColor={c.muted}
            keyboardType="decimal-pad"
          />

          <Text style={[styles.fieldLabel, { color: c.muted }]}>CATEGORY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catPill,
                  { borderColor: c.border, backgroundColor: category === cat ? c.accent : 'transparent' },
                ]}
                onPress={() => setCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.catPillText,
                  { color: category === cat ? (c.ctaText ?? '#fff') : c.muted, fontFamily: fonts.dmMono },
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.fieldLabel, { color: c.muted }]}>TAGS</Text>
          <TextInput
            style={[styles.input, { color: c.text, borderColor: c.border }]}
            value={tagsStr}
            onChangeText={setTagsStr}
            placeholder="high-protein, low-sugar, vegan"
            placeholderTextColor={c.muted}
          />
          <Text style={[styles.tagHint, { color: c.muted, fontFamily: fonts.dmSans }]}>{TAG_HINT}</Text>

          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: c.accent }, saving && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={[styles.saveBtnText, { color: c.ctaText ?? '#fff', fontFamily: fonts.dmMono }]}>
                {saving ? 'SAVING…' : editingItem ? 'SAVE CHANGES' : 'ADD ITEM'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: c.border }]}
              onPress={cancelForm}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: c.muted, fontFamily: fonts.dmSans }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      )}

      {/* Items list */}
      {!adding && (
        <>
          {loading ? (
            <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {items.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={[styles.emptyTitle, { color: c.text, fontFamily: fonts.playfair }]}>No items yet</Text>
                  <Text style={[styles.emptyHint, { color: c.muted, fontFamily: fonts.dmSans }]}>
                    Tap + to add your first menu item. Tags help Dorotka recommend dishes based on each guest's health data.
                  </Text>
                </View>
              ) : (
                items.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.itemRow, { borderBottomColor: c.border, backgroundColor: c.card }]}
                    onPress={() => openEdit(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.itemInfo}>
                      <View style={styles.itemTopRow}>
                        <Text style={[styles.itemName, { color: c.text, fontFamily: fonts.dmSans }]}>{item.name}</Text>
                        <View style={[styles.catBadge, { borderColor: c.border }]}>
                          <Text style={[styles.catBadgeText, { color: c.muted, fontFamily: fonts.dmMono }]}>{item.category}</Text>
                        </View>
                      </View>
                      {item.price_cents ? (
                        <Text style={[styles.itemPrice, { color: c.muted, fontFamily: fonts.dmMono }]}>
                          CA${(item.price_cents / 100).toFixed(2)}
                        </Text>
                      ) : null}
                      {Array.isArray(item.tags) && item.tags.length > 0 && (
                        <Text style={[styles.itemTags, { color: c.accent, fontFamily: fonts.dmSans }]}>
                          {(item.tags as string[]).join(' · ')}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemove(item)}
                      style={styles.removeBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.removeBtnText, { color: c.muted, fontFamily: fonts.dmSans }]}>remove</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
              <View style={{ height: SPACING.xl }} />
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  backBtnText: { fontSize: 22 },
  title: { fontSize: 14, letterSpacing: 2 },
  addBtn: { width: 40, alignItems: 'flex-end' },
  addBtnText: { fontSize: 26, lineHeight: 30 },
  scroll: { flex: 1, paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  fieldLabel: { fontSize: 11, letterSpacing: 1.5, marginBottom: 6, marginTop: SPACING.md },
  input: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, marginBottom: 2,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  catRow: { flexDirection: 'row', marginVertical: SPACING.sm },
  catPill: {
    borderRadius: 20, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14, paddingVertical: 7, marginRight: 8,
  },
  catPillText: { fontSize: 12, letterSpacing: 0.8 },
  tagHint: { fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: SPACING.sm, opacity: 0.8 },
  formActions: { gap: 10, marginTop: SPACING.md },
  saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 13, letterSpacing: 1.5 },
  cancelBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  cancelBtnText: { fontSize: 14 },
  empty: { alignItems: 'center', paddingTop: 60, gap: SPACING.sm },
  emptyTitle: { fontSize: 22 },
  emptyHint: { fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: SPACING.md },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 12, marginBottom: 6,
  },
  itemInfo: { flex: 1 },
  itemTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  itemName: { fontSize: 15 },
  catBadge: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  catBadgeText: { fontSize: 10, letterSpacing: 1 },
  itemPrice: { fontSize: 13, marginTop: 2 },
  itemTags: { fontSize: 12, marginTop: 3, opacity: 0.9 },
  removeBtn: { paddingLeft: SPACING.sm, paddingVertical: 4 },
  removeBtnText: { fontSize: 13 },
});
