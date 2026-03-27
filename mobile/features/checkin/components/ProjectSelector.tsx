import React, { useMemo } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { MapPin, CheckCircle, XCircle } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Text } from "../../../components/atoms/Text";
import { Card } from "../../../components/atoms/Card";
import { PressScale } from "../../../components/animations/PressScale";
import { COLORS } from "../../../lib/constants";
import { calculateDistance, formatDistance, MAX_CHECKIN_DISTANCE } from "../utils";
import type { Project } from "../../../types";

interface ProjectWithDistance extends Project {
  distance: number;
  withinRange: boolean;
}

interface Props {
  projects: Project[];
  userLatitude: number;
  userLongitude: number;
  isLoading?: boolean;
  onSelect: (project: Project) => void;
}

/**
 * Project coordinates are not yet part of the Project model,
 * so we use a placeholder. In production you'd store lat/lng
 * per project and read them here.
 *
 * For now, we compute distance if the project has lat/lng fields,
 * otherwise show "distance unknown".
 */
function getProjectCoords(project: Project): { lat: number; lng: number } | null {
  const p = project as any;
  if (typeof p.latitude === "number" && typeof p.longitude === "number") {
    return { lat: p.latitude, lng: p.longitude };
  }
  if (typeof p.site_latitude === "number" && typeof p.site_longitude === "number") {
    return { lat: p.site_latitude, lng: p.site_longitude };
  }
  return null;
}

export default function ProjectSelector({
  projects,
  userLatitude,
  userLongitude,
  isLoading,
  onSelect,
}: Props) {
  const projectsWithDistance: ProjectWithDistance[] = useMemo(() => {
    return projects
      .map((p) => {
        const coords = getProjectCoords(p);
        if (!coords) {
          // No coords available -- allow check-in (distance unknown)
          return { ...p, distance: 0, withinRange: true };
        }
        const dist = calculateDistance(
          userLatitude,
          userLongitude,
          coords.lat,
          coords.lng
        );
        return { ...p, distance: dist, withinRange: dist <= MAX_CHECKIN_DISTANCE };
      })
      // Sort: within-range first, then by distance ascending
      .sort((a, b) => {
        if (a.withinRange && !b.withinRange) return -1;
        if (!a.withinRange && b.withinRange) return 1;
        return a.distance - b.distance;
      });
  }, [projects, userLatitude, userLongitude]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={COLORS.gold} />
        <Text variant="caption" style={{ color: COLORS.mutedForeground, marginTop: 8 }}>
          Loading projects...
        </Text>
      </View>
    );
  }

  if (projectsWithDistance.length === 0) {
    return (
      <View style={styles.centered}>
        <MapPin size={28} color={COLORS.mutedForeground} />
        <Text variant="label" style={{ color: COLORS.text, marginTop: 10 }}>
          No projects found
        </Text>
        <Text
          variant="caption"
          style={{ color: COLORS.mutedForeground, marginTop: 4, textAlign: "center" }}
        >
          You have no assigned projects to check in to
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text
        variant="label"
        weight="semibold"
        style={{ color: COLORS.mutedForeground, marginBottom: 10 }}
      >
        SELECT A PROJECT
      </Text>

      {projectsWithDistance.map((project, index) => {
        const coords = getProjectCoords(project);
        const hasCoords = coords !== null;
        const isInRange = project.withinRange;

        return (
          <Animated.View
            key={project.id}
            entering={FadeInDown.duration(300).delay(index * 60).springify().damping(18)}
          >
            <PressScale
              onPress={() => {
                if (isInRange) onSelect(project);
              }}
              haptic={isInRange}
              disabled={!isInRange}
            >
              <Card
                padding="sm"
                className="mb-2"
              >
                <View style={styles.projectRow}>
                  {/* Status icon */}
                  <View
                    style={[
                      styles.statusCircle,
                      {
                        backgroundColor: isInRange
                          ? COLORS.success + "15"
                          : COLORS.destructive + "15",
                      },
                    ]}
                  >
                    {isInRange ? (
                      <CheckCircle size={18} color={COLORS.success} />
                    ) : (
                      <XCircle size={18} color={COLORS.destructive} />
                    )}
                  </View>

                  {/* Project info */}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text
                      variant="label"
                      weight="semibold"
                      style={{
                        color: isInRange ? COLORS.text : COLORS.mutedForeground,
                      }}
                    >
                      {(project.client as any)?.lead?.name ||
                        (project.client as any)?.user?.full_name ||
                        `Project`}
                    </Text>
                    <Text
                      variant="caption"
                      style={{ color: COLORS.mutedForeground, marginTop: 2 }}
                      numberOfLines={1}
                    >
                      {(project.client as any)?.address || "No address"}
                    </Text>
                  </View>

                  {/* Distance badge */}
                  <View
                    style={[
                      styles.distanceBadge,
                      {
                        backgroundColor: isInRange
                          ? COLORS.success + "15"
                          : COLORS.destructive + "10",
                      },
                    ]}
                  >
                    {hasCoords ? (
                      <Text
                        variant="caption"
                        weight="semibold"
                        style={{
                          color: isInRange ? COLORS.success : COLORS.destructive,
                          fontSize: 11,
                        }}
                      >
                        {formatDistance(project.distance)}
                      </Text>
                    ) : (
                      <Text
                        variant="caption"
                        weight="semibold"
                        style={{ color: COLORS.success, fontSize: 11 }}
                      >
                        Ready
                      </Text>
                    )}
                  </View>
                </View>

                {/* Sub-text */}
                {hasCoords && (
                  <Text
                    variant="caption"
                    style={{
                      color: isInRange ? COLORS.success : COLORS.destructive,
                      marginTop: 4,
                      marginLeft: 42,
                      fontSize: 11,
                    }}
                  >
                    {isInRange
                      ? "Ready to check in"
                      : `Too far (${formatDistance(project.distance)})`}
                  </Text>
                )}
              </Card>
            </PressScale>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  centered: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  projectRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  distanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
});
