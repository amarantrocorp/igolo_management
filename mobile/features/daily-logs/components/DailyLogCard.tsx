import React, { useState, useCallback } from "react";
import { View, Text, Pressable, Image, ScrollView } from "react-native";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Eye } from "lucide-react-native";
import { COLORS } from "../../../lib/constants";
import type { DailyLog } from "../../../types";

interface DailyLogCardProps {
  log: DailyLog;
  sprintName?: string;
}

export default function DailyLogCard({ log, sprintName }: DailyLogCardProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const photos = log.image_urls ?? log.images ?? [];
  const formattedDate = format(new Date(log.date), "MMM dd, yyyy");
  const truncatedNotes =
    log.notes.length > 100 && !expanded
      ? log.notes.slice(0, 100) + "..."
      : log.notes;

  return (
    <Pressable onPress={toggleExpanded}>
      <View
        className="mx-4 mb-3 rounded-xl p-4"
        style={{
          backgroundColor: COLORS.background,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        {/* Header row */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1">
            <Text
              className="text-xs font-medium"
              style={{ color: COLORS.mutedForeground }}
            >
              {formattedDate}
            </Text>
            {sprintName ? (
              <Text
                className="text-sm font-semibold mt-0.5"
                style={{ color: COLORS.text }}
              >
                {sprintName}
              </Text>
            ) : null}
          </View>
          <View className="flex-row items-center gap-2">
            {log.visible_to_client && (
              <View
                className="flex-row items-center px-2 py-1 rounded-full"
                style={{ backgroundColor: "#DBEAFE" }}
              >
                <Eye size={12} color="#2563EB" />
                <Text
                  className="text-xs font-medium ml-1"
                  style={{ color: "#2563EB" }}
                >
                  Client
                </Text>
              </View>
            )}
            {expanded ? (
              <ChevronUp size={18} color={COLORS.mutedForeground} />
            ) : (
              <ChevronDown size={18} color={COLORS.mutedForeground} />
            )}
          </View>
        </View>

        {/* Notes */}
        <Text className="text-sm leading-5" style={{ color: COLORS.text }}>
          {truncatedNotes}
        </Text>

        {/* Photo thumbnails */}
        {photos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3"
            contentContainerStyle={{ gap: 8 }}
          >
            {photos.map((url, index) => (
              <Image
                key={`${url}-${index}`}
                source={{ uri: url }}
                style={{ width: 64, height: 64, borderRadius: 8 }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        )}

        {/* Expanded: blockers */}
        {expanded && log.blockers ? (
          <View
            className="mt-3 p-3 rounded-lg"
            style={{ backgroundColor: "#FEF2F2" }}
          >
            <Text
              className="text-xs font-semibold mb-1"
              style={{ color: COLORS.destructive }}
            >
              Blockers
            </Text>
            <Text
              className="text-sm"
              style={{ color: COLORS.destructive }}
            >
              {log.blockers}
            </Text>
          </View>
        ) : null}

        {/* Created by */}
        {log.created_by && (
          <Text
            className="text-xs mt-2"
            style={{ color: COLORS.mutedForeground }}
          >
            Logged by {log.created_by}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
