import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Image,
  Dimensions,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  FadeInDown,
  FadeInUp,
  FadeIn as ReanimatedFadeIn,
} from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { mediumHaptic } from "../../lib/haptics";
import {
  Clock,
  Calendar,
  IndianRupee,
  ChevronRight,
  Briefcase,
  ArrowRight,
} from "lucide-react-native";
import { useAuth } from "../../features/auth/hooks";
import {
  useClientProjects,
  useClientUpdates,
} from "../../features/client-portal/hooks";
import { getFriendlyPhaseName } from "../../features/client-portal/constants";
import ProgressRing from "../../features/client-portal/components/ProgressRing";
import PhaseCard from "../../features/client-portal/components/PhaseCard";
import { COLORS } from "../../lib/constants";
import { formatINR, formatDate } from "../../lib/format";
import type { Project, Sprint } from "../../types";
import { differenceInDays, parseISO } from "date-fns";

const SCREEN_WIDTH = Dimensions.get("window").width;
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ---------- Helpers ----------

function getOverallProgress(sprints: Sprint[]): number {
  if (!sprints || sprints.length === 0) return 0;
  const completed = sprints.filter((s) => s.status === "COMPLETED").length;
  const active = sprints.find((s) => s.status === "ACTIVE");
  const activePct = active ? (active.completion_percentage ?? 0) / 100 : 0;
  return Math.round(((completed + activePct) / sprints.length) * 100);
}

function getActiveSprint(sprints: Sprint[]): Sprint | undefined {
  return sprints.find((s) => s.status === "ACTIVE");
}

function getDaysRemaining(endDate: string): number {
  try {
    return Math.max(0, differenceInDays(parseISO(endDate), new Date()));
  } catch {
    return 0;
  }
}

function getPaymentPct(wallet: Project["wallet"]): number {
  if (!wallet || wallet.total_agreed_value <= 0) return 0;
  return Math.round((wallet.total_received / wallet.total_agreed_value) * 100);
}

// ---------- Animated Wave Emoji ----------

function WaveEmoji() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(20, { duration: 150 }),
          withTiming(-10, { duration: 150 }),
          withTiming(15, { duration: 120 }),
          withTiming(-5, { duration: 120 }),
          withTiming(0, { duration: 200 })
        ),
        3,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.Text style={[{ fontSize: 24 }, animatedStyle]}>
      {"\uD83D\uDC4B"}
    </Animated.Text>
  );
}

// ---------- Quick Stat Card ----------

function QuickStatCard({
  icon: Icon,
  label,
  value,
  valueColor,
  index,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  valueColor?: string;
  index: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(400 + index * 100).springify().damping(18)}
      style={[styles.statCard]}
    >
      <View style={styles.statIconWrap}>
        <Icon size={14} color={COLORS.gold} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[styles.statValue, { color: valueColor ?? COLORS.text }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </Animated.View>
  );
}

// ---------- Recent Photos ----------

function RecentPhotosPreview({
  projectId,
}: {
  projectId: string;
}) {
  const { data: updates } = useClientUpdates(projectId);
  const router = useRouter();

  const photos = useMemo(() => {
    if (!updates) return [];
    const allPhotos: string[] = [];
    for (const log of updates) {
      const imgs = log.image_urls ?? log.images ?? [];
      allPhotos.push(...imgs);
      if (allPhotos.length >= 4) break;
    }
    return allPhotos.slice(0, 4);
  }, [updates]);

  if (photos.length === 0) return null;

  const photoSize = (SCREEN_WIDTH - 48 - 24) / 4;

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(700).springify().damping(18)}
      style={styles.photosSection}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Site Photos</Text>
        <Pressable
          onPress={() => router.push("/(tabs)/client-timeline")}
          style={styles.viewAllBtn}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <ChevronRight size={14} color={COLORS.gold} />
        </Pressable>
      </View>
      <View style={styles.photosGrid}>
        {photos.map((uri, idx) => (
          <Animated.View
            key={`preview-${idx}`}
            entering={FadeInDown.duration(300).delay(750 + idx * 80)}
          >
            <Image
              source={{ uri }}
              style={[
                styles.photoThumb,
                { width: photoSize, height: photoSize },
              ]}
              resizeMode="cover"
            />
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

// ---------- Payment CTA Button ----------

function PaymentCTA() {
  const router = useRouter();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  };

  const handlePress = () => {
    mediumHaptic();
    router.push("/(tabs)/payments");
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(800).springify().damping(18)}
      style={styles.ctaContainer}
    >
      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={animatedStyle}
      >
        <LinearGradient
          colors={[COLORS.gold, "#B89D6A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaGradient}
        >
          <Text style={styles.ctaText}>Make a Payment</Text>
          <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
  );
}

// ---------- Project Selector ----------

function ProjectSelectorCard({
  project,
  onSelect,
  isSelected,
}: {
  project: Project;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const progress = getOverallProgress(project.sprints ?? []);
  const activeSprint = getActiveSprint(project.sprints ?? []);

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.selectorCard,
        isSelected && styles.selectorCardSelected,
      ]}
    >
      <View style={styles.selectorTop}>
        <Text style={styles.selectorName} numberOfLines={1}>
          {project.client?.lead?.name ?? "My Project"}
        </Text>
        <ChevronRight size={16} color={COLORS.mutedForeground} />
      </View>
      {activeSprint && (
        <Text style={styles.selectorPhase}>
          {getFriendlyPhaseName(activeSprint.name)}
        </Text>
      )}
      <View style={styles.selectorBottom}>
        <Text style={styles.selectorValue}>
          {formatINR(project.total_project_value)}
        </Text>
        <Text style={styles.selectorPct}>{progress}%</Text>
      </View>
      <View style={styles.selectorTrack}>
        <View
          style={[styles.selectorFill, { width: `${progress}%` }]}
        />
      </View>
    </Pressable>
  );
}

// ---------- No Projects ----------

function NoProjectsState() {
  return (
    <Animated.View
      entering={ReanimatedFadeIn.duration(600).delay(300)}
      style={styles.emptyContainer}
    >
      <View style={styles.emptyIcon}>
        <Briefcase size={36} color={COLORS.gold} />
      </View>
      <Text style={styles.emptyTitle}>Welcome to Igolo Interior</Text>
      <Text style={styles.emptyDesc}>
        Your project dashboard will appear here once your designer sets up your
        project. Sit tight!
      </Text>
    </Animated.View>
  );
}

// ---------- Main Screen ----------

export default function ClientHomeScreen() {
  const { user } = useAuth();
  const { data: projects, isLoading, refetch, isRefetching } = useClientProjects();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </SafeAreaView>
    );
  }

  const hasProjects = projects && projects.length > 0;
  const hasMultiple = projects && projects.length > 1;
  const activeProject = hasProjects ? projects[selectedIndex] ?? projects[0] : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="light" />
      <AnimatedScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={COLORS.gold}
            colors={[COLORS.gold]}
          />
        }
      >
        {/* Hero Section */}
        <HeroSection name={user?.full_name} scrollY={scrollY} />

        {!hasProjects ? (
          <NoProjectsState />
        ) : (
          <>
            {hasMultiple && (
              <View style={styles.projectsSection}>
                <Text style={styles.sectionLabel}>YOUR PROJECTS</Text>
                {projects!.map((project, idx) => (
                  <ProjectSelectorCard
                    key={project.id}
                    project={project}
                    onSelect={() => setSelectedIndex(idx)}
                    isSelected={idx === selectedIndex}
                  />
                ))}
              </View>
            )}

            {activeProject && <ProjectDashboard project={activeProject} />}
          </>
        )}
      </AnimatedScrollView>
    </SafeAreaView>
  );
}

// ---------- Hero Section ----------

function HeroSection({
  name,
  scrollY,
}: {
  name?: string;
  scrollY: any;
}) {
  const heroStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [0, 120], [0, -30], "clamp");
    const opacity = interpolate(scrollY.value, [0, 100], [1, 0.6], "clamp");
    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  const firstName = name?.split(" ")[0] ?? "there";

  return (
    <Animated.View style={heroStyle}>
      <LinearGradient
        colors={[COLORS.primary, "#1a2744"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGradient}
      >
        <Animated.View
          entering={FadeInDown.duration(500).delay(100).springify().damping(18)}
        >
          <View style={styles.greetingRow}>
            <Text style={styles.greetingText}>Hello, </Text>
            <Text style={styles.greetingName}>{firstName}</Text>
            <Text style={styles.greetingText}>! </Text>
            <WaveEmoji />
          </View>
          <Text style={styles.greetingSubtext}>
            Your project at a glance
          </Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

// ---------- Project Dashboard ----------

function ProjectDashboard({ project }: { project: Project }) {
  const router = useRouter();
  const sprints = project.sprints ?? [];
  const progress = getOverallProgress(sprints);
  const activeSprint = getActiveSprint(sprints);
  const daysRemaining = getDaysRemaining(project.expected_end_date);
  const paymentPct = getPaymentPct(project.wallet);

  const nextMilestone = activeSprint
    ? getFriendlyPhaseName(activeSprint.name)
    : "Handover";

  return (
    <>
      {/* Progress Ring */}
      <Animated.View
        entering={FadeInDown.duration(500).delay(200).springify().damping(18)}
        style={styles.ringSection}
      >
        <ProgressRing percentage={progress} variant="lg" delay={400} />
      </Animated.View>

      {/* Current Phase */}
      {activeSprint && (
        <Animated.View
          entering={FadeInDown.duration(400).delay(300).springify().damping(18)}
          style={styles.phaseSection}
        >
          <Text style={styles.sectionLabel}>CURRENT PHASE</Text>
          <PhaseCard sprint={activeSprint} />
        </Animated.View>
      )}

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <QuickStatCard
          icon={Clock}
          label="Days Left"
          value={`${daysRemaining}`}
          valueColor={daysRemaining < 7 ? "#EF4444" : COLORS.text}
          index={0}
        />
        <QuickStatCard
          icon={Calendar}
          label="Next Phase"
          value={nextMilestone}
          index={1}
        />
        <QuickStatCard
          icon={IndianRupee}
          label="Payments"
          value={`${paymentPct}% Paid`}
          valueColor={paymentPct >= 100 ? "#22C55E" : COLORS.gold}
          index={2}
        />
      </View>

      {/* Recent Photos */}
      <RecentPhotosPreview projectId={project.id} />

      {/* Payment CTA */}
      <PaymentCTA />

      {/* Project Info Footer */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(900).springify().damping(18)}
        style={styles.infoFooter}
      >
        <View style={styles.infoCard}>
          <InfoRow label="Project Value" value={formatINR(project.total_project_value)} />
          <InfoRow label="Start Date" value={formatDate(project.start_date)} />
          <InfoRow label="Expected Completion" value={formatDate(project.expected_end_date)} />
        </View>
      </Animated.View>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  // Hero
  heroGradient: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  greetingText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  greetingName: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.gold,
  },
  greetingSubtext: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginTop: 4,
  },
  // Ring
  ringSection: {
    alignItems: "center",
    marginTop: -12,
    marginBottom: 4,
  },
  // Phase
  phaseSection: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.mutedForeground,
    letterSpacing: 1.2,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.gold + "12",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: COLORS.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  // Photos
  photosSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.gold,
    marginRight: 2,
  },
  photosGrid: {
    flexDirection: "row",
    gap: 8,
  },
  photoThumb: {
    borderRadius: 12,
    backgroundColor: COLORS.muted,
  },
  // CTA
  ctaContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Info Footer
  infoFooter: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary + "06",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.mutedForeground,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  // Selector
  projectsSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  selectorCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  selectorCardSelected: {
    borderColor: COLORS.gold + "40",
    backgroundColor: COLORS.gold + "06",
  },
  selectorTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  selectorName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  selectorPhase: {
    fontSize: 12,
    color: COLORS.gold,
    marginBottom: 8,
  },
  selectorBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  selectorValue: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  selectorPct: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.gold,
  },
  selectorTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.muted,
    overflow: "hidden",
  },
  selectorFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: COLORS.gold,
  },
  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.gold + "15",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    textAlign: "center",
    lineHeight: 21,
  },
});
