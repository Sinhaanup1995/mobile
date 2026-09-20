import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  LayoutChangeEvent,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { apiFetch } from "../../../src/lib/api";
import { useAuth } from "../../../src/lib/auth-context";
import { colors, radius } from "../../../src/lib/theme";

type ProjectSummary = {
  id: string;
  name: string;
  city: string;
  minPrice: string | null;
  maxPrice: string | null;
  developer: { name: string };
};

// Standard price steps for Indian real estate
export const PRICE_STEPS = [
  0,          // ₹0
  2500000,    // ₹25 L
  5000000,    // ₹50 L
  7500000,    // ₹75 L
  10000000,   // ₹1 Cr
  15000000,   // ₹1.5 Cr
  20000000,   // ₹2 Cr
  25000000,   // ₹2.5 Cr
  30000000,   // ₹3 Cr
  40000000,   // ₹4 Cr
  50000000,   // ₹5 Cr+
];

export function formatStepPrice(amount: number, isMaxPlus = false) {
  if (amount === 0) return "₹0";
  if (amount >= 50000000 && isMaxPlus) return "₹5 Cr+";
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `₹${Number.isInteger(cr) ? cr : cr.toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    const l = amount / 100000;
    return `₹${Number.isInteger(l) ? l : l.toFixed(1)} L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatPrice(value: string | null) {
  if (!value) return null;
  const amount = Number(value);
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

const PRESETS = [
  { label: "All", low: 0, high: PRICE_STEPS.length - 1 },
  { label: "< 50L", low: 0, high: 2 },
  { label: "50L – 1Cr", low: 2, high: 4 },
  { label: "1Cr – 2Cr", low: 4, high: 6 },
  { label: "2Cr+", low: 6, high: PRICE_STEPS.length - 1 },
];

const THUMB_SIZE = 28;

type PriceRangeSliderProps = {
  lowIndex: number;
  highIndex: number;
  onChange: (low: number, high: number) => void;
};

function PriceRangeSlider({ lowIndex, highIndex, onChange }: PriceRangeSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);

  const lowIndexRef = useRef(lowIndex);
  lowIndexRef.current = lowIndex;

  const highIndexRef = useRef(highIndex);
  highIndexRef.current = highIndex;

  const trackWidthRef = useRef(trackWidth);
  trackWidthRef.current = trackWidth;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const dragStartLowIndex = useRef(0);
  const dragStartHighIndex = useRef(0);

  const lowPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartLowIndex.current = lowIndexRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        if (trackWidthRef.current <= THUMB_SIZE) return;
        const effectiveW = trackWidthRef.current - THUMB_SIZE;
        const startX = (dragStartLowIndex.current / (PRICE_STEPS.length - 1)) * effectiveW;
        const currentX = startX + gestureState.dx;
        const ratio = Math.max(0, Math.min(1, currentX / effectiveW));
        let newIdx = Math.round(ratio * (PRICE_STEPS.length - 1));
        if (newIdx >= highIndexRef.current) {
          newIdx = highIndexRef.current - 1;
        }
        if (newIdx < 0) newIdx = 0;
        if (newIdx !== lowIndexRef.current) {
          onChangeRef.current(newIdx, highIndexRef.current);
        }
      },
    })
  ).current;

  const highPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartHighIndex.current = highIndexRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        if (trackWidthRef.current <= THUMB_SIZE) return;
        const effectiveW = trackWidthRef.current - THUMB_SIZE;
        const startX = (dragStartHighIndex.current / (PRICE_STEPS.length - 1)) * effectiveW;
        const currentX = startX + gestureState.dx;
        const ratio = Math.max(0, Math.min(1, currentX / effectiveW));
        let newIdx = Math.round(ratio * (PRICE_STEPS.length - 1));
        if (newIdx <= lowIndexRef.current) {
          newIdx = lowIndexRef.current + 1;
        }
        if (newIdx >= PRICE_STEPS.length) newIdx = PRICE_STEPS.length - 1;
        if (newIdx !== highIndexRef.current) {
          onChangeRef.current(lowIndexRef.current, newIdx);
        }
      },
    })
  ).current;

  const handleLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const effectiveW = Math.max(1, trackWidth - THUMB_SIZE);
  const lowX = (lowIndex / (PRICE_STEPS.length - 1)) * effectiveW;
  const highX = (highIndex / (PRICE_STEPS.length - 1)) * effectiveW;

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderTitle}>Drag thumbs to adjust</Text>
        <Text style={styles.sliderValueText}>
          {formatStepPrice(PRICE_STEPS[lowIndex])} –{" "}
          {formatStepPrice(PRICE_STEPS[highIndex], highIndex === PRICE_STEPS.length - 1)}
        </Text>
      </View>

      {/* Dragging Track */}
      <View style={styles.trackWrapper} onLayout={handleLayout}>
        <View style={styles.trackBackground} />
        <View
          style={[
            styles.trackActive,
            {
              left: lowX + THUMB_SIZE / 2,
              width: Math.max(0, highX - lowX),
            },
          ]}
        />

        {/* Low Thumb */}
        <View
          {...lowPan.panHandlers}
          style={[
            styles.thumb,
            {
              left: lowX,
            },
          ]}
        >
          <View style={styles.thumbInner} />
        </View>

        {/* High Thumb */}
        <View
          {...highPan.panHandlers}
          style={[
            styles.thumb,
            {
              left: highX,
            },
          ]}
        >
          <View style={styles.thumbInner} />
        </View>
      </View>

      <View style={styles.scaleRow}>
        <Text style={styles.scaleText}>₹0</Text>
        <Text style={styles.scaleText}>₹1 Cr</Text>
        <Text style={styles.scaleText}>₹2.5 Cr</Text>
        <Text style={styles.scaleText}>₹5 Cr+</Text>
      </View>
    </View>
  );
}

export default function ProjectsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);

  // Price range slider state
  const [lowIndex, setLowIndex] = useState(0);
  const [highIndex, setHighIndex] = useState(PRICE_STEPS.length - 1);
  const [showFilter, setShowFilter] = useState(true);

  const lowPrice = PRICE_STEPS[lowIndex];
  const highPrice = PRICE_STEPS[highIndex];
  const isFiltered = lowIndex !== 0 || highIndex !== PRICE_STEPS.length - 1;

  function resetPriceFilter() {
    setLowIndex(0);
    setHighIndex(PRICE_STEPS.length - 1);
  }

  const load = useCallback(async (text = "") => {
    try {
      const result = await apiFetch<{ projects: ProjectSummary[] }>(
        `/projects${text ? `?q=${encodeURIComponent(text)}` : ""}`,
      );
      setProjects(result.projects);
    } catch {
      // Keep the previous list on transient errors.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(query);
      // Only refresh with the latest query on focus, not on every keystroke.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  function search(text: string) {
    setQuery(text);
    load(text);
  }

  // Filter projects by selected price range
  const filteredProjects = projects.filter((project) => {
    const pMin = project.minPrice ? Number(project.minPrice) : 0;
    const pMax = project.maxPrice ? Number(project.maxPrice) : Infinity;

    const effectiveMax = highIndex === PRICE_STEPS.length - 1 ? Infinity : highPrice;

    return pMin <= effectiveMax && pMax >= lowPrice;
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Projects</Text>
        {user?.role === "EMPLOYEE" ? (
          <TouchableOpacity style={styles.addButton} onPress={() => router.push("/(app)/projects/new")}>
            <Text style={styles.addButtonText}>+ Propose</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TextInput
        style={styles.input}
        value={query}
        onChangeText={search}
        placeholder="Search by name, city or developer"
        placeholderTextColor={colors.muted}
      />

      {/* Price Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowFilter((prev) => !prev)}
        >
          <Text style={styles.filterToggleText}>
            Price: {formatStepPrice(lowPrice)} – {formatStepPrice(highPrice, highIndex === PRICE_STEPS.length - 1)}
          </Text>
          <Text style={styles.filterIconText}>{showFilter ? "▲ Hide" : "▼ Filter"}</Text>
        </TouchableOpacity>

        {isFiltered ? (
          <TouchableOpacity style={styles.resetButton} onPress={resetPriceFilter}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Expandable Price Range Filter Card */}
      {showFilter ? (
        <View style={styles.filterCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
            {PRESETS.map((preset) => {
              const isActive = lowIndex === preset.low && highIndex === preset.high;
              return (
                <TouchableOpacity
                  key={preset.label}
                  style={[styles.presetChip, isActive && styles.presetChipActive]}
                  onPress={() => {
                    setLowIndex(preset.low);
                    setHighIndex(preset.high);
                  }}
                >
                  <Text style={[styles.presetChipText, isActive && styles.presetChipTextActive]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <PriceRangeSlider
            lowIndex={lowIndex}
            highIndex={highIndex}
            onChange={(low, high) => {
              setLowIndex(low);
              setHighIndex(high);
            }}
          />
        </View>
      ) : null}

      <FlatList
        data={filteredProjects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.resultsCount}>
            Showing {filteredProjects.length} of {projects.length} projects
          </Text>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No listed projects match your search and price filter.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/projects/${item.id}`)}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>
              {item.developer.name} · {item.city}
            </Text>
            {item.minPrice || item.maxPrice ? (
              <Text style={styles.price}>
                {formatPrice(item.minPrice)} – {formatPrice(item.maxPrice)}
              </Text>
            ) : null}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 60, paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  title: { color: colors.ink, fontFamily: "Manrope_700Bold", fontSize: 20 },
  addButton: { backgroundColor: colors.navy700, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { color: colors.white, fontFamily: "Manrope_600SemiBold", fontSize: 13 },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontFamily: "Manrope_400Regular",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  filterBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  filterToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  filterToggleText: {
    color: colors.ink,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
  },
  filterIconText: {
    color: colors.navy700,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
  },
  resetButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(168,50,42,0.1)",
    borderRadius: radius.sm,
  },
  resetButtonText: {
    color: colors.red,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
  },
  filterCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 12,
  },
  presetScroll: {
    flexDirection: "row",
    marginBottom: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: 8,
    backgroundColor: colors.bg,
  },
  presetChipActive: {
    backgroundColor: colors.navy700,
    borderColor: colors.navy700,
  },
  presetChipText: {
    color: colors.muted,
    fontFamily: "Manrope_500Medium",
    fontSize: 11,
  },
  presetChipTextActive: {
    color: colors.white,
    fontFamily: "Manrope_700Bold",
  },
  sliderContainer: {
    marginTop: 6,
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sliderTitle: {
    color: colors.muted,
    fontFamily: "Manrope_500Medium",
    fontSize: 11,
  },
  sliderValueText: {
    color: colors.navy700,
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  trackWrapper: {
    height: 36,
    justifyContent: "center",
    position: "relative",
  },
  trackBackground: {
    height: 6,
    backgroundColor: colors.line,
    borderRadius: 3,
  },
  trackActive: {
    position: "absolute",
    height: 6,
    backgroundColor: colors.navy700,
    borderRadius: 3,
  },
  thumb: {
    position: "absolute",
    top: 4,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.navy700,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  thumbInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.navy700,
  },
  scaleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  scaleText: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
  },
  resultsCount: {
    color: colors.muted,
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    marginBottom: 8,
  },
  list: { paddingBottom: 24 },
  emptyText: { color: colors.muted, fontFamily: "Manrope_400Regular", fontSize: 13, marginTop: 20 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: { color: colors.ink, fontFamily: "Manrope_600SemiBold", fontSize: 14 },
  cardSubtitle: { color: colors.muted, fontFamily: "Manrope_400Regular", fontSize: 12, marginTop: 4 },
  price: { color: colors.blue, fontFamily: "Manrope_600SemiBold", fontSize: 13, marginTop: 8 },
});

