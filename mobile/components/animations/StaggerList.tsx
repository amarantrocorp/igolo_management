import React from "react";
import Animated, { FadeInRight } from "react-native-reanimated";

interface StaggerListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  delay?: number;
  keyExtractor?: (item: T, index: number) => string;
  className?: string;
}

export function StaggerList<T>({
  items,
  renderItem,
  delay = 100,
  keyExtractor,
  className,
}: StaggerListProps<T>) {
  return (
    <>
      {items.map((item, index) => (
        <Animated.View
          key={keyExtractor ? keyExtractor(item, index) : String(index)}
          entering={FadeInRight.duration(400)
            .delay(index * delay)
            .springify()
            .damping(18)}
          className={className}
        >
          {renderItem(item, index)}
        </Animated.View>
      ))}
    </>
  );
}
